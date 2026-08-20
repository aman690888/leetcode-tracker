/**
 * lib/leetcode.ts
 *
 * Two strategies for fetching solved problems:
 *
 * 1. AUTHENTICATED (full history) — uses a { session, csrf } credential pair.
 *    Priority: client-sent request headers  >  server env vars.
 *    Queries `questionList` with `filters:{status:"AC"}`, paginates all pages.
 *
 * 2. FALLBACK (recent ~20 only) — unauthenticated `recentAcSubmissionList`.
 *    Triggered when no creds are available OR auth returns empty / errors.
 *
 * Credentials are NEVER logged, NEVER persisted server-side.
 */

const GRAPHQL_URL = "https://leetcode.com/graphql";

// ── Base request builder ───────────────────────────────────────────────────────
async function gql(
  query: string,
  variables: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<unknown> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer:        "https://leetcode.com",
      "User-Agent":   "Mozilla/5.0 (compatible; tracker-bot)",
      ...extraHeaders,
    },
    body:  JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error(`LeetCode API returned HTTP ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json();
}

// ── Queries ───────────────────────────────────────────────────────────────────
const PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
    }
  }
`;

/**
 * The same query LeetCode's own problem list uses when you click "Solved".
 * Returns all AC problems for the session owner when auth cookies are present.
 */
const AC_PROBLEMS_AUTH_QUERY = `
  query problemsetQuestionList(
    $categorySlug: String
    $limit: Int
    $skip: Int
    $filters: QuestionListFilterInput
  ) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        titleSlug
      }
    }
  }
`;

/** Unauthenticated fallback — LeetCode caps this at ~20 regardless of limit. */
const RECENT_AC_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      titleSlug
    }
  }
`;

// ── Types ──────────────────────────────────────────────────────────────────────
interface AcPage {
  total: number;
  questions: { titleSlug: string }[];
}

export interface Creds {
  session: string;
  csrf: string;
}

// ── Credential resolution ──────────────────────────────────────────────────────
/**
 * Returns effective creds with client-supplied values taking priority over env.
 * Client values come from localStorage on the browser, sent as request headers
 * — they are never stored server-side.
 */
export function resolveCreds(clientOverride?: Creds): Creds | null {
  if (clientOverride?.session && clientOverride?.csrf) return clientOverride;
  const session = process.env.LEETCODE_SESSION?.trim();
  const csrf    = process.env.LEETCODE_CSRF_TOKEN?.trim();
  if (session && csrf) return { session, csrf };
  return null;
}

function authHeaders(creds: Creds): Record<string, string> {
  // Values are only used here as header strings — never logged
  return {
    Cookie:        `LEETCODE_SESSION=${creds.session}; csrftoken=${creds.csrf}`,
    "x-csrftoken": creds.csrf,
  };
}

// ── Strategy 1: Authenticated full-history ─────────────────────────────────────
async function fetchAllSolvedAuth(creds: Creds): Promise<Set<string>> {
  const slugs = new Set<string>();
  const limit = 500;
  let   skip  = 0;
  let   total = Infinity;

  while (skip < total) {
    // eslint-disable-next-line no-await-in-loop
    const raw = await gql(
      AC_PROBLEMS_AUTH_QUERY,
      { categorySlug: "", limit, skip, filters: { status: "AC" } },
      authHeaders(creds)
    ) as { data?: { problemsetQuestionList?: AcPage } };

    const page = raw?.data?.problemsetQuestionList;
    // Null page = session expired / bad token — signal caller to fall back
    if (!page) return new Set();

    total = page.total;
    for (const q of page.questions) slugs.add(q.titleSlug);
    skip += limit;
    if (skip > total + limit) break; // safety
  }

  return slugs;
}

// ── Strategy 2: Unauthenticated recent submissions ─────────────────────────────
async function fetchRecentAcSlugs(username: string): Promise<Set<string>> {
  const raw = await gql(RECENT_AC_QUERY, { username, limit: 20 }) as {
    data?: { recentAcSubmissionList?: { titleSlug: string }[] };
  };
  return new Set((raw?.data?.recentAcSubmissionList ?? []).map((s) => s.titleSlug));
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Verifies the user exists. Throws { code: "USER_NOT_FOUND" } if not. */
export async function verifyUser(username: string): Promise<void> {
  const raw = await gql(PROFILE_QUERY, { username }) as {
    data?: { matchedUser?: { username: string } };
  };
  if (!raw?.data?.matchedUser) {
    const err = new Error(`LeetCode user "${username}" not found.`);
    (err as Error & { code: string }).code = "USER_NOT_FOUND";
    throw err;
  }
}

export interface SolvedResult {
  slugs:   Set<string>;
  mode:    "full" | "limited";
  warning?: string;
}

/**
 * Returns solved problem slugs, using the best available strategy.
 *
 * @param username   LeetCode username (for fallback query)
 * @param clientCreds  Optional creds from client request headers (highest priority)
 */
export async function fetchSolvedSlugs(
  username:    string,
  clientCreds?: Creds
): Promise<SolvedResult> {
  const creds = resolveCreds(clientCreds);

  // ── Try authenticated fetch ─────────────────────────────────────────────
  if (creds) {
    try {
      const slugs = await fetchAllSolvedAuth(creds);
      if (slugs.size > 0) {
        return { slugs, mode: "full" };
      }
      // 0 results with valid creds: session likely stale — fall through
      console.warn("[tracker] Auth fetch returned 0 AC problems — session may be expired.");
    } catch (err) {
      const e = err as Error & { status?: number };
      console.warn(`[tracker] Auth fetch failed (${e.status ?? e.message}) — falling back.`);
    }
  }

  // ── Fallback: recent submissions ────────────────────────────────────────
  const slugs = await fetchRecentAcSlugs(username);

  const warning = creds
    ? "Session cookies appear expired — showing recent solves only (~20). Update cookies via ⚙ config to restore full history."
    : "No session cookies configured — showing recent solves only (~20). Add cookies via ⚙ config for full history.";

  return { slugs, mode: "limited", warning };
}
