/**
 * app/api/track/route.ts
 * GET /api/track?username=<username>
 *
 * Requires authenticated LeetCode session cookies (from client request headers).
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

  // 2. Fetch sheet assignments via Sheets API v4
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

  // 3. Fetch solved slugs (strict auth)
  let solvedSlugs: Set<string>;
  try {
    solvedSlugs = await fetchSolvedSlugs(username, clientCreds);
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === "AUTH_REQUIRED") {
      return NextResponse.json(
        {
          error: "LeetCode session cookies are required to fetch solved problems.",
          code: "AUTH_REQUIRED",
        } satisfies TrackError,
        { status: 401 }
      );
    }
    if (e.code === "AUTH_EXPIRED") {
      return NextResponse.json(
        {
          error: "Session expired or invalid — please refresh your cookies in settings.",
          code: "AUTH_EXPIRED",
        } satisfies TrackError,
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: `Could not fetch submissions: ${e.message}`, code: "LEETCODE_FETCH_FAILED" } satisfies TrackError,
      { status: 502 }
    );
  }

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
  } satisfies TrackResponse);
}
