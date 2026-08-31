/**
 * lib/sheet.ts
 *
 * Fetches the teacher's live Google Sheet via the official Sheets API v4.
 * Uses a two-tier caching strategy (in-memory + Next.js Data Cache) with 3-minute TTL
 * so multiple concurrent students do not overwhelm Google's rate limits.
 *
 * Required env vars:
 *   GOOGLE_SHEETS_API_KEY  — API key restricted to Sheets API only
 *   SHEET_ID               — spreadsheet ID from the URL
 *   SHEET_RANGE            — sheet name or range (defaults to "Sheet1")
 */

import { DayGroup, Problem } from "@/types";

// ── Regex patterns ────────────────────────────────────────────────────────────
const URL_RE      = /https:\/\/leetcode\.com\/problems\/([\w-]+)\//;
const ID_PAREN_RE = /\((\d{1,5})\)/;
const ID_LC_RE    = /(?:LeetCode\s+|LC[-\s]?)(\d{1,5})/i;
const TITLE_RE    = /^\d+[.)]\s*(?:LeetCode\s+\d+\s*[–\-]\s*)?(.+?)(?:\s*\(\d{1,5}\))?\s*$/;
const NOISE_RE    = /^\s*(home\s*work|weekend\s*home|total\s*:|note\s*:|📝|📚|\u{1F4DD}|\u{1F4DA})/iu;

// ── Sheets API v4 response shape ──────────────────────────────────────────────
interface SheetsApiResponse {
  range?:          string;
  majorDimension?: string;
  values?:         string[][];
  error?:          { code: number; message: string; status: string };
}

// ── Server-Side In-Memory Cache (Tier 1) ───────────────────────────────────────
interface CachedAssignments {
  data:      DayGroup[];
  timestamp: number;
}

let memoryCache: CachedAssignments | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Deep-clones DayGroup array so that mutating problem.solved or solvedCount
 * for one student's request never pollutes cached state for other students.
 */
function cloneGroups(groups: DayGroup[]): DayGroup[] {
  return groups.map((g) => ({
    ...g,
    problems: g.problems.map((p) => ({ ...p })),
  }));
}

// ── Dynamic column detection ──────────────────────────────────────────────────
function findColIdx(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.trim().toLowerCase().includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

// ── Problem cell parser ───────────────────────────────────────────────────────
function extractProblems(cell: string): Omit<Problem, "solved">[] {
  const lines = cell.split(/\r?\n/).map((l) => l.replace(/,\s*$/, "").trim());
  const results: Omit<Problem, "solved">[] = [];
  const seenSlugs = new Set<string>();
  let pendingTitle: string | null = null;
  let pendingId:    string | null = null;

  for (const line of lines) {
    if (!line || NOISE_RE.test(line)) {
      pendingTitle = null;
      pendingId    = null;
      continue;
    }

    const urlMatch = URL_RE.exec(line);
    if (urlMatch) {
      const slug = urlMatch[1];
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug);
        const fallback = slug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        results.push({
          slug,
          id:    pendingId,
          title: pendingTitle ?? fallback,
          url:   `https://leetcode.com/problems/${slug}/description/`,
        });
      }
      pendingTitle = null;
      pendingId    = null;
      continue;
    }

    // Title line — extract display name + problem ID
    const idM = ID_PAREN_RE.exec(line) ?? ID_LC_RE.exec(line);
    if (idM) pendingId = idM[1];

    const titleM = TITLE_RE.exec(line);
    if (titleM) pendingTitle = titleM[1].trim();
  }

  return results;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function fetchAssignments(): Promise<DayGroup[]> {
  const now = Date.now();

  // Return fresh in-memory cache if available (0ms response, zero API calls)
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return cloneGroups(memoryCache.data);
  }

  const apiKey  = process.env.GOOGLE_SHEETS_API_KEY?.trim();
  const sheetId = process.env.SHEET_ID?.trim();
  const range   = process.env.SHEET_RANGE?.trim() ?? "Sheet1";

  if (!apiKey)  throw new Error("GOOGLE_SHEETS_API_KEY env var is not set.");
  if (!sheetId) throw new Error("SHEET_ID env var is not set.");

  const apiUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${sheetId}/values/${encodeURIComponent(range)}` +
    `?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      next:    { revalidate: 180 }, // Next.js Data Cache: 3 minutes
    });
  } catch (e: unknown) {
    // If network fails but we have stale cache, serve stale cache instead of breaking
    if (memoryCache) {
      console.warn("[tracker] Sheets network error — serving stale cached assignments.");
      return cloneGroups(memoryCache.data);
    }
    throw new Error(`Sheets API network error: ${(e as Error).message}`);
  }

  const json = (await res.json()) as SheetsApiResponse;

  // Handle Google API rate limits (HTTP 429 or RESOURCE_EXHAUSTED)
  const isRateLimited =
    res.status === 429 ||
    json.error?.code === 429 ||
    json.error?.status === "RESOURCE_EXHAUSTED";

  if (isRateLimited) {
    if (memoryCache) {
      console.warn("[tracker] Sheets API rate limit reached — serving stale cached assignments.");
      return cloneGroups(memoryCache.data);
    }
    throw new Error("Too many people checking right now — Google Sheets API rate limit reached. Please wait a minute and refresh.");
  }

  if (!res.ok || json.error) {
    if (memoryCache) {
      console.warn("[tracker] Sheets API error — serving stale cached assignments.");
      return cloneGroups(memoryCache.data);
    }
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Sheets API error: ${msg}`);
  }

  const allRows = json.values ?? [];
  if (allRows.length < 2) return [];

  const [headerRow, ...dataRows] = allRows;

  // Dynamic column detection
  const dayIdx     = findColIdx(headerRow, "week day", "weekday", "day");
  const dateIdx    = findColIdx(headerRow, "date");
  const weekIdx    = findColIdx(headerRow, "days", "week");
  const probIdx    = findColIdx(headerRow, "problem");
  const weekendIdx = findColIdx(headerRow, "weekend");
  const effectiveWeekendIdx = (weekendIdx !== -1 && weekendIdx !== probIdx) ? weekendIdx : -1;

  const groups: DayGroup[] = [];

  for (const row of dataRows) {
    const dayVal  = (row[dayIdx]  ?? "").trim();
    const dateVal = (row[dateIdx] ?? "").trim();
    const weekVal = (row[weekIdx] ?? "").trim();
    if (!dayVal && !dateVal) continue;

    const label = [dayVal, dateVal].filter(Boolean).join(", ");

    for (const [kind, idx] of [
      ["daily",   probIdx],
      ["weekend", effectiveWeekendIdx],
    ] as Array<["daily" | "weekend", number]>) {
      if (idx < 0) continue;
      const cell = (row[idx] ?? "").trim();
      if (!cell) continue;
      const raw = extractProblems(cell);
      if (!raw.length) continue;

      groups.push({
        label,
        week:        weekVal,
        kind,
        problems:    raw.map((p) => ({ ...p, solved: false })),
        solvedCount: 0,
        totalCount:  raw.length,
      });
    }
  }

  // Update in-memory cache
  memoryCache = {
    data:      groups,
    timestamp: Date.now(),
  };

  return cloneGroups(groups);
}
