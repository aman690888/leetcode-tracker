/**
 * app/api/track/route.ts
 * GET /api/track?username=<username>
 *
 * Credential priority (highest → lowest):
 *   1. x-leetcode-session / x-leetcode-csrf request headers (from client localStorage)
 *   2. LEETCODE_SESSION / LEETCODE_CSRF_TOKEN env vars (local dev fallback)
 *   3. No auth → recent-submissions fallback with warning
 *
 * Client-supplied credentials are used for this request only.
 * They are NEVER logged, NEVER persisted server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAssignments } from "@/lib/sheet";
import { verifyUser, fetchSolvedSlugs, type Creds } from "@/lib/leetcode";
import { TrackError, TrackResponse } from "@/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest
): Promise<NextResponse<TrackResponse | TrackError>> {
  const username = req.nextUrl.searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json(
      { error: "username query param is required.", code: "UNKNOWN" } satisfies TrackError,
      { status: 400 }
    );
  }

  // Read client-supplied auth headers (localStorage → fetch headers on client)
  // Values used for this request only — never logged, never written anywhere
  const clientSession = req.headers.get("x-leetcode-session")?.trim();
  const clientCsrf    = req.headers.get("x-leetcode-csrf")?.trim();
  const clientCreds: Creds | undefined =
    clientSession && clientCsrf
      ? { session: clientSession, csrf: clientCsrf }
      : undefined;

  // 1. Verify LeetCode user exists
  try {
    await verifyUser(username);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          error: `No LeetCode account found for "${username}". Double-check the username.`,
          code: "USER_NOT_FOUND",
        } satisfies TrackError,
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Could not reach LeetCode: ${e.message}`, code: "LEETCODE_FETCH_FAILED" } satisfies TrackError,
      { status: 502 }
    );
  }

  // 2. Fetch sheet assignments
  let groups;
  try {
    groups = await fetchAssignments();
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json(
      { error: `Could not load the assignment sheet: ${e.message}`, code: "SHEET_FETCH_FAILED" } satisfies TrackError,
      { status: 502 }
    );
  }

  // 3. Fetch solved slugs — client creds take priority over env vars
  let solvedResult: Awaited<ReturnType<typeof fetchSolvedSlugs>>;
  try {
    solvedResult = await fetchSolvedSlugs(username, clientCreds);
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json(
      { error: `Could not fetch submissions: ${e.message}`, code: "LEETCODE_FETCH_FAILED" } satisfies TrackError,
      { status: 502 }
    );
  }

  const { slugs: solvedSlugs, mode: solveMode, warning: solveModeWarning } = solvedResult;

  // 4. Mark each problem solved / pending
  let totalAssigned = 0;
  let totalSolved   = 0;

  for (const group of groups) {
    let solvedCount = 0;
    for (const p of group.problems) {
      p.solved = solvedSlugs.has(p.slug);
      if (p.solved) solvedCount++;
    }
    group.solvedCount = solvedCount;
    totalAssigned += group.problems.length;
    totalSolved   += solvedCount;
  }

  const percentage = totalAssigned > 0
    ? Math.round((totalSolved / totalAssigned) * 100)
    : 0;

  return NextResponse.json({
    username,
    totalAssigned,
    totalSolved,
    percentage,
    groups,
    fetchedAt: new Date().toISOString(),
    solveMode,
    ...(solveModeWarning ? { solveModeWarning } : {}),
  } satisfies TrackResponse);
}
