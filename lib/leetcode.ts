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
  const limit = 100; // LeetCode silently caps at 100 per page regardless of limit param
  let   skip  = 0;
  let   total = Infinity;
  let   page  = 0;

  // --- TEMPORARY DEBUG LOG ---
  console.log("[DEBUG-LC] Starting authenticated solved-slug fetch. limit-per-page:", limit);

  // Loop until we have collected all problems (compare slugs.size vs declared total,
  // NOT skip vs total — the API may return fewer items per page than requested)
  while (skip === 0 || slugs.size < total) {
    page++;
    // eslint-disable-next-line no-await-in-loop
    const raw = (await gql(
      AC_PROBLEMS_AUTH_QUERY,
      { categorySlug: "", limit, skip, filters: { status: "AC" } },
      authHeaders(creds)
    )) as { data?: { problemsetQuestionList?: AcPage } };

    const pageData = raw?.data?.problemsetQuestionList;
    if (!pageData) {
      const err = new Error("Session expired or invalid — please refresh your cookies in settings.");
      (err as Error & { code: string }).code = "AUTH_EXPIRED";
      throw err;
    }

    // --- TEMPORARY DEBUG LOG ---
    console.log(
      `[DEBUG-LC] Page ${page}: skip=${skip}, API total=${pageData.total}, ` +
      `returned=${pageData.questions.length}, collected so far=${slugs.size + pageData.questions.length}`
    );

    if (skip === 0) {
      total = pageData.total;
      console.log(`[DEBUG-LC] Declared total from API: ${total}`);
    } else if (pageData.total !== total) {
      console.warn(`[DEBUG-LC] ⚠ total changed mid-pagination: was ${total}, now ${pageData.total}`);
      total = pageData.total;
    }

    const sizeBefore = slugs.size;
    for (const q of pageData.questions) slugs.add(q.titleSlug);

    const newSlugsThisPage = slugs.size - sizeBefore;

    if (newSlugsThisPage === 0) {
      if (page === 1 && total > 0) {
        // API claims this account has solved problems (total > 0) but returned
        // 0 items on page 1 — this is a real auth/session failure, not a
        // genuine empty account. Surface it clearly instead of returning 0.
        console.error(
          `[DEBUG-LC] ✗ Page 1 returned 0 slugs but API declared total=${total}. ` +
          `Likely expired session cookies — throwing AUTH_EXPIRED.`
        );
        const err = new Error(
          "Session expired or invalid — please refresh your cookies in settings."
        );
        (err as Error & { code: string }).code = "AUTH_EXPIRED";
        throw err;
      }

      // Two legitimate break cases:
      //   (a) page === 1 && total === 0 → genuine new/empty account
      //   (b) page > 1 → mid-pagination stall (rare, avoids infinite loop)
      if (page === 1) {
        console.log(`[DEBUG-LC] Account has 0 solved problems (new account or no AC submissions).`);
      } else {
        console.warn(
          `[DEBUG-LC] ⚠ Page ${page} returned 0 new slugs (mid-pagination stall) — ` +
          `stopping. Collected ${slugs.size}/${total}.`
        );
      }
      break;
    }

    skip += limit;
  }

  // --- TEMPORARY DEBUG LOG ---
  console.log(`[DEBUG-LC] Pagination complete: ${page} page(s), ${slugs.size}/${total} slugs fetched.`);
  console.log("[DEBUG-LC] All solved slugs (raw from API):", JSON.stringify([...slugs].sort()));

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
