/**
 * lib/sheet.ts
 *
 * Fetches the teacher's live Google Sheet via the official Sheets API v4.
 * This is a proper authenticated API call — no CSV scraping, no bot-detection issues.
 *
 * Required env vars:
 *   GOOGLE_SHEETS_API_KEY  — API key restricted to Sheets API only
 *   SHEET_ID               — the spreadsheet ID (between /d/ and /edit in the URL)
 *   SHEET_RANGE            — sheet name or range, e.g. "Sheet1" or "Sheet1!A:E"
 *
 * Column detection is fully dynamic — no hardcoded column positions.
 * The first row of the returned values is treated as the header row.
 */

import { DayGroup, Problem } from "@/types";

// ── Regex patterns (identical to original CSV version) ────────────────────────
const URL_RE      = /https:\/\/leetcode\.com\/problems\/([\w-]+)\//;
const ID_PAREN_RE = /\((\d{1,5})\)/;
const ID_LC_RE    = /(?:LeetCode\s+|LC[-\s]?)(\d{1,5})/i;
const TITLE_RE    = /^\d+[.)]\s*(?:LeetCode\s+\d+\s*[–\-]\s*)?(.+?)(?:\s*\(\d{1,5}\))?\s*$/;
const NOISE_RE    = /^\s*(home\s*work|weekend\s*home|total\s*:|note\s*:|📝|📚|\u{1F4DD}|\u{1F4DA})/iu;

// ── Sheets API v4 response shape ──────────────────────────────────────────────
interface SheetsApiResponse {
  range?:          string;
  majorDimension?: string;
  /** Row-major 2-D array of cell values. Absent when sheet is empty. */
  values?: string[][];
  /** Present when the API returns an error (even with HTTP 200 sometimes). */
  error?: { code: number; message: string; status: string };
}

// ── Dynamic column-index finder — no hardcoded positions ─────────────────────
function findColIdx(headers: string[], ...keywords: string[]): number {
  for (const kw of keywords) {
    const idx = headers.findIndex((h) => h.trim().toLowerCase().includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

// ── Problem cell parser (identical logic to original CSV version) ─────────────
function extractProblems(cell: string): Omit<Problem, "solved">[] {
  const lines = cell.split(/\r?\n/).map((l) => l.replace(/,\s*$/, "").trim());
  const results: Omit<Problem, "solved">[] = [];
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
      const slug     = urlMatch[1];
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
  const apiKey  = process.env.GOOGLE_SHEETS_API_KEY?.trim();
  const sheetId = process.env.SHEET_ID?.trim();
  const range   = process.env.SHEET_RANGE?.trim() ?? "Sheet1";

  if (!apiKey)  throw new Error("GOOGLE_SHEETS_API_KEY env var is not set.");
  if (!sheetId) throw new Error("SHEET_ID env var is not set.");

  // Sheets API v4 values.get endpoint — designed for programmatic access
  const apiUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/` +
    `${sheetId}/values/${encodeURIComponent(range)}` +
    `?key=${apiKey}`;

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",   // always re-fetch — no stale data
    });
  } catch (e: unknown) {
    throw new Error(`Sheets API network error: ${(e as Error).message}`);
  }

  const json = (await res.json()) as SheetsApiResponse;

  if (!res.ok || json.error) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Sheets API error: ${msg}`);
  }

  const allRows = json.values ?? [];

  // API returns no values property when the sheet has no data
  if (allRows.length < 2) return [];

  const [headerRow, ...dataRows] = allRows;

  // ── Dynamic column detection ──────────────────────────────────────────────
  const dayIdx     = findColIdx(headerRow, "week day", "weekday", "day");
  const dateIdx    = findColIdx(headerRow, "date");
  const weekIdx    = findColIdx(headerRow, "days", "week");
  const probIdx    = findColIdx(headerRow, "problem");
  const weekendIdx = findColIdx(headerRow, "weekend");
  // Don't treat weekend as its own column if it mapped to the same index as problems
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

  return groups;
}
