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
import { logUsageEvent } from "@/lib/usage-logger";
import { TrackError, TrackResponse } from "@/types";

export const runtime = "nodejs";

// ── TEMPORARY DEBUG HELPERS ────────────────────────────────────────────────────

/**
 * Normalizes a slug to a canonical form for comparison purposes.
 * LeetCode API returns lowercase-hyphenated slugs — so does our parser,
 * but edge cases (trailing slash, query params, whitespace, casing) can cause misses.
 */
function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()          // force lowercase
    .trim()                 // strip surrounding whitespace
    .replace(/\/$/, "")    // strip trailing slash
    .replace(/\?.*$/, ""); // strip URL query params (e.g. ?envType=...)
}

/**
 * Computes Levenshtein edit distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Calculates slug similarity using word-token Jaccard overlap and normalized Levenshtein distance.
 * Prevents false positives from simple character-frequency collisions.
 */
function slugSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const tokensA = new Set(a.split("-").filter(Boolean));
  const tokensB = new Set(b.split("-").filter(Boolean));

  let sharedTokens = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) sharedTokens++;
  }
  const totalUniqueTokens = new Set([...tokensA, ...tokensB]).size;
  const jaccard = totalUniqueTokens > 0 ? sharedTokens / totalUniqueTokens : 0;

  const maxLen = Math.max(a.length, b.length);
  const levDist = levenshtein(a, b);
  const levSim = maxLen > 0 ? 1 - levDist / maxLen : 0;

  // Only consider as a meaningful candidate if it shares significant word tokens (>= 50%) or high edit similarity (>= 80%)
  if (jaccard >= 0.5 || levSim >= 0.8) {
    return Math.max(jaccard, levSim);
  }
  return 0;
}

// ── Route handler ─────────────────────────────────────────────────────────────
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
    const e = err as Error & { code?: string; status?: number };
    if (e.code === "USER_NOT_FOUND" || e.status === 404 || e.message?.includes("404")) {
      console.warn(`[DEBUG-LC] Username not found on LeetCode: ${username}`);
      return NextResponse.json(
        {
          error: "LeetCode username not found — please check the spelling",
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
    const e = err as Error & { code?: string; status?: number };
    if (e.code === "USER_NOT_FOUND" || e.status === 404 || e.message?.includes("404")) {
      console.warn(`[DEBUG-LC] Username not found on LeetCode: ${username}`);
      return NextResponse.json(
        {
          error: "LeetCode username not found — please check the spelling",
          code: "USER_NOT_FOUND",
        } satisfies TrackError,
        { status: 404 }
      );
    }
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

  // --- TEMPORARY DEBUG LOG: slug normalization analysis ---
  // Build a normalized lookup map: normalizedSlug → original raw slug from LeetCode API
  const solvedNormMap = new Map<string, string>();
  for (const raw of solvedSlugs) {
    solvedNormMap.set(normalizeSlug(raw), raw);
  }
  console.log(
    `[DEBUG-MATCH] Solved slugs from LeetCode API: ${solvedSlugs.size} raw, ` +
    `${solvedNormMap.size} normalized (diff=${solvedSlugs.size - solvedNormMap.size} collisions)`
  );

  // Collect all sheet slugs for comparison
  const allSheetSlugs: { raw: string; normalized: string }[] = [];
  for (const group of groups) {
    for (const p of group.problems) {
      allSheetSlugs.push({ raw: p.slug, normalized: normalizeSlug(p.slug) });
    }
  }
  console.log("[DEBUG-MATCH] Sheet slugs (raw → normalized):", JSON.stringify(
    allSheetSlugs.map((s) => ({ raw: s.raw, norm: s.normalized }))
  ));

  // 4. Mark each problem solved / pending — with debug diagnostics for misses
  let totalAssigned = 0;
  let totalSolved   = 0;

  const solvedNormedSet = new Set(solvedNormMap.keys());

  for (const group of groups) {
    let solvedCount = 0;
    for (const p of group.problems) {
      const rawSlug    = p.slug;
      const normSlug   = normalizeSlug(rawSlug);

      // Try exact match first, then normalized match
      const exactHit   = solvedSlugs.has(rawSlug);
      const normHit    = solvedNormedSet.has(normSlug);
      p.solved = exactHit || normHit;

      // --- TEMPORARY DEBUG LOG: per-problem match trace ---
      if (!p.solved) {
        // Closest-match among solved slugs for near-miss detection (word overlap & edit distance)
        let bestScore = 0;
        let bestMatch = "";
        for (const s of solvedNormedSet) {
          const score = slugSimilarity(normSlug, s);
          if (score > bestScore) { bestScore = score; bestMatch = s; }
        }

        const matchInfo = bestScore > 0
          ? `closestMatch="${bestMatch}" (similarity=${bestScore.toFixed(2)})`
          : `no close match found`;

        console.log(
          `[DEBUG-MISS] "${rawSlug}" (norm: "${normSlug}") — ` +
          `exactHit=${exactHit}, normHit=${normHit}, ${matchInfo}`
        );
      } else if (!exactHit && normHit) {
        // It only matched after normalization — this is the bug indicator
        const rawFromApi = solvedNormMap.get(normSlug);
        console.log(
          `[DEBUG-NORMFIX] "${rawSlug}" matched via normalization only. ` +
          `Raw from sheet: "${rawSlug}", raw from API: "${rawFromApi}", normalized: "${normSlug}"`
        );
      }

      if (p.solved) solvedCount++;
    }
    group.solvedCount = solvedCount;
    totalAssigned += group.problems.length;
    totalSolved   += solvedCount;
  }

  console.log(`[DEBUG-MATCH] Final: ${totalSolved}/${totalAssigned} solved.`);

  // Fire-and-forget persistent usage logging with calculation result (never blocks response)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const userAgent = req.headers.get("user-agent")?.trim() || "unknown";

  logUsageEvent({
    username,
    action: "fetch_progress",
    result: `${totalSolved}/${totalAssigned}`,
    ip,
    userAgent,
  }).catch((err) => {
    console.error("[usage-logger] failed to record log:", err?.message || err);
  });

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
