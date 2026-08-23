/**
 * lib/leetcode.ts
 *
 * Authenticated LeetCode GraphQL fetch for accurate, full-history solved problems.
 * Queries `questionList` with `filters:{status:"AC"}` and paginates through all pages.
 *
 * Session cookies (LEETCODE_SESSION + csrftoken) are MANDATORY.
 * Fallback to recent-submissions is intentionally removed to prevent inaccurate tracking.
 *
 * Credentials are NEVER logged and NEVER persisted server-side.
 */

const GRAPHQL_URL = "https://leetcode.com/graphql";

// ── Base GraphQL request builder ───────────────────────────────────────────────
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
    }
  }
`;

/**
 * Authenticated query: returns all AC problems for the session owner.
 * LeetCode uses this exact query on its own problem-list page ("Solved" filter).
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
export function resolveCreds(clientOverride?: Creds): Creds | null {
  if (clientOverride?.session && clientOverride?.csrf) return clientOverride;
  const session = process.env.LEETCODE_SESSION?.trim();
  const csrf    = process.env.LEETCODE_CSRF_TOKEN?.trim();
  if (session && csrf) return { session, csrf };
  return null;
}

function authHeaders(creds: Creds): Record<string, string> {
  return {
    Cookie:        `LEETCODE_SESSION=${creds.session}; csrftoken=${creds.csrf}`,
    "x-csrftoken": creds.csrf,
  };
}

// ── Authenticated full-history fetch ───────────────────────────────────────────
async function fetchAllSolvedAuth(creds: Creds): Promise<Set<string>> {
  const slugs = new Set<string>();
  const limit = 500;
  let   skip  = 0;
  let   total = Infinity;

  while (skip < total) {
    // eslint-disable-next-line no-await-in-loop
    const raw = (await gql(
      AC_PROBLEMS_AUTH_QUERY,
      { categorySlug: "", limit, skip, filters: { status: "AC" } },
      authHeaders(creds)
    )) as { data?: { problemsetQuestionList?: AcPage } };

    const page = raw?.data?.problemsetQuestionList;
    if (!page) {
      const err = new Error("Session expired or invalid — please refresh your cookies in settings.");
      (err as Error & { code: string }).code = "AUTH_EXPIRED";
      throw err;
    }

    total = page.total;
    for (const q of page.questions) slugs.add(q.titleSlug);
    skip += limit;
    if (skip > total + limit) break;
  }

  return slugs;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Verifies the user exists. Throws { code: "USER_NOT_FOUND" } if not. */
export async function verifyUser(username: string): Promise<void> {
  const raw = (await gql(PROFILE_QUERY, { username })) as {
    data?: { matchedUser?: { username: string } };
  };
  if (!raw?.data?.matchedUser) {
    const err = new Error(`No LeetCode account found for "${username}". Double-check the username.`);
    (err as Error & { code: string }).code = "USER_NOT_FOUND";
    throw err;
  }
}

/**
 * Returns full set of solved problem slugs for the authenticated session.
 * Throws AUTH_REQUIRED if no credentials are provided.
 * Throws AUTH_EXPIRED if credentials fail authentication.
 */
export async function fetchSolvedSlugs(
  username: string,
  clientCreds?: Creds
): Promise<Set<string>> {
  const creds = resolveCreds(clientCreds);

  if (!creds) {
    const err = new Error("LeetCode session cookies are required to fetch solved problems.");
    (err as Error & { code: string }).code = "AUTH_REQUIRED";
    throw err;
  }

  try {
    const slugs = await fetchAllSolvedAuth(creds);
    return slugs;
  } catch (err: unknown) {
    const e = err as Error & { code?: string };
    if (e.code === "AUTH_EXPIRED") throw e;

    const authErr = new Error("Session expired or invalid — please refresh your cookies in settings.");
    (authErr as Error & { code: string }).code = "AUTH_EXPIRED";
    throw authErr;
  }
}
