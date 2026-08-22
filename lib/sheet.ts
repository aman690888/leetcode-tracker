/**
 * lib/sheet.ts
 * Fetches the teacher's live Google Sheet as CSV and parses assignments.
 * Column detection is fully dynamic — no hardcoded column indices.
 */

import { DayGroup, Problem } from "@/types";

// ── Regex patterns ────────────────────────────────────────────────────────────
const URL_RE      = /https:\/\/leetcode\.com\/problems\/([\w-]+)\//;
const ID_PAREN_RE = /\((\d{1,5})\)/;
const ID_LC_RE    = /(?:LeetCode\s+|LC[-\s]?)(\d{1,5})/i;
// Strips "N." / "N. LeetCode ID –" prefix and "(ID)" suffix to get display title
const TITLE_RE    = /^\d+[.)]\s*(?:LeetCode\s+\d+\s*[–\-]\s*)?(.+?)(?:\s*\(\d{1,5}\))?\s*$/;
// Noise lines that aren't actual problem entries
const NOISE_RE    = /^\s*(home\s*work|weekend\s*home|total\s*:|note\s*:|📝|📚|\u{1F4DD}|\u{1F4DA})/iu;

// ── Minimal hand-rolled CSV parser (handles quoted multi-line cells) ──────────
function parseCSV(raw: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  let lineIdx = 0;
  const allLines = raw.split(/\r?\n/);

  while (lineIdx < allLines.length) {
    const { fields, consumed } = readRow(allLines, lineIdx);
    if (lineIdx === 0) {
      headers = fields;
    } else if (fields.some((f) => f.trim())) {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = fields[i] ?? ""; });
      rows.push(row);
    }
    lineIdx += consumed;
  }
  return rows;
}

function readRow(
  lines: string[],
  start: number
): { fields: string[]; consumed: number } {
  const fields: string[] = [];
  let field = "";
  let inQuote = false;
  // Build a mutable "virtual" text we extend as we consume more lines
  let text = lines[start] ?? "";
  let lineCount = 1;
  let ci = 0;

  while (ci <= text.length) {
    const ch = text[ci];

    if (inQuote) {
      if (ch === undefined) {
        // Cell continues on next line
        const next = lines[start + lineCount];
        if (next !== undefined) {
          text += "\n" + next;
          lineCount++;
          // don't advance ci — re-read the \n we just appended
        } else {
          // EOF inside quote — close gracefully
          fields.push(field);
          return { fields, consumed: lineCount };
        }
        continue;
      }
      if (ch === '"') {
        if (text[ci + 1] === '"') { field += '"'; ci += 2; continue; }
        inQuote = false; ci++; continue;
      }
      field += ch; ci++; continue;
    }

    // Not in quote
    if (ch === '"') { inQuote = true; ci++; continue; }
    if (ch === ",") { fields.push(field); field = ""; ci++; continue; }
    if (ch === undefined) { fields.push(field); break; }
    field += ch; ci++;
  }

  return { fields, consumed: lineCount };
}

// ── Column detection ──────────────────────────────────────────────────────────
function findCol(headers: string[], ...kws: string[]): string | undefined {
  for (const kw of kws) {
    const found = headers.find((h) => h.trim().toLowerCase().includes(kw));
    if (found) return found;
  }
  return undefined;
}

// ── Problem cell parser ───────────────────────────────────────────────────────
function extractProblems(cell: string): Omit<Problem, "solved">[] {
  const lines = cell.split(/\r?\n/).map((l) => l.replace(/,\s*$/, "").trim());
  const results: Omit<Problem, "solved">[] = [];
  let pendingTitle: string | null = null;
  let pendingId: string | null    = null;

  for (const line of lines) {
    if (!line || NOISE_RE.test(line)) { pendingTitle = null; pendingId = null; continue; }

    const urlMatch = URL_RE.exec(line);
    if (urlMatch) {
      const slug = urlMatch[1];
      const fallback = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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

    // Title line — extract display name + problem number
    const idM = ID_PAREN_RE.exec(line) ?? ID_LC_RE.exec(line);
    if (idM) pendingId = idM[1];

    const titleM = TITLE_RE.exec(line);
    if (titleM) pendingTitle = titleM[1].trim();
  }

  return results;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function fetchAssignments(): Promise<DayGroup[]> {
  const csvUrlRaw = process.env.SHEET_CSV_URL;
  // Trim any accidental whitespace or invisible chars that may appear in Vercel env vars
  const csvUrl = csvUrlRaw?.trim();

  // --- TEMPORARY DEBUG LOGS (START) ---
  console.log("[DEBUG] SHEET_CSV_URL raw length:", csvUrlRaw?.length ?? 0);
  console.log("[DEBUG] SHEET_CSV_URL trimmed:", csvUrl ? csvUrl.slice(0, 80) + "..." : "NOT SET");
  // --- TEMPORARY DEBUG LOGS (END) ---

  if (!csvUrl) throw new Error("SHEET_CSV_URL environment variable is not set.");

  let res: Response;
  try {
    res = await fetch(csvUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; lc-tracker/1.0)",
        "Accept": "text/csv, text/plain, */*",
      },
      redirect: "follow",  // explicitly follow Google's 307 redirect
      cache: "no-store",
    });
  } catch (fetchErr: unknown) {
    const e = fetchErr as Error;
    console.error("[DEBUG] fetch() threw:", e.message);
    throw new Error(`Sheet network error: ${e.message}`);
  }

  // --- TEMPORARY DEBUG LOGS (START) ---
  // 1. HTTP status + whether a redirect happened
  console.log("[DEBUG] 1. Sheet fetch HTTP status:", res.status, res.statusText);
  console.log("[DEBUG]    Redirected:", res.redirected);
  console.log("[DEBUG]    Final URL (first 80):", res.url?.slice(0, 80));
  // --- TEMPORARY DEBUG LOGS (END) ---

  if (!res.ok) {
    throw new Error(`Sheet fetch failed: HTTP ${res.status}. Make sure the sheet is shared publicly.`);
  }

  const rawText = await res.text();

  // --- TEMPORARY DEBUG LOGS (START) ---
  // 2. First 300 chars of raw body — reveals if it's CSV or an HTML page
  const preview = rawText.slice(0, 300);
  const looksLikeHtml = preview.trimStart().startsWith("<");
  console.log("[DEBUG] 2. Body length:", rawText.length);
  console.log("[DEBUG]    Looks like HTML:", looksLikeHtml);
  console.log("[DEBUG]    Raw preview (first 300):", JSON.stringify(preview));
  // --- TEMPORARY DEBUG LOGS (END) ---

  if (looksLikeHtml) {
    throw new Error("Sheet fetch returned an HTML page instead of CSV. Check sheet sharing permissions (must be 'Anyone with the link can view').");
  }

  const rows = parseCSV(rawText);

  // --- TEMPORARY DEBUG LOGS (START) ---
  // 3. Number of rows successfully parsed + headers detected
  console.log("[DEBUG] 3. Number of parsed CSV rows:", rows.length);
  if (rows.length > 0) {
    console.log("[DEBUG]    Parsed CSV headers:", JSON.stringify(Object.keys(rows[0])));
  }
  // --- TEMPORARY DEBUG LOGS (END) ---

  if (rows.length === 0) return [];

  const headers     = Object.keys(rows[0]);
  const dayCol      = findCol(headers, "week day", "weekday", "day");
  const dateCol     = findCol(headers, "date");
  const weekCol     = findCol(headers, "days", "week");
  const problemCol  = findCol(headers, "problem");
  const weekendCol  = findCol(headers, "weekend");
  const effectiveWe = weekendCol !== problemCol ? weekendCol : undefined;

  const groups: DayGroup[] = [];

  for (const row of rows) {
    const dayVal  = (row[dayCol  ?? ""] ?? "").trim();
    const dateVal = (row[dateCol ?? ""] ?? "").trim();
    const weekVal = (row[weekCol ?? ""] ?? "").trim();
    if (!dayVal && !dateVal) continue;

    const label = [dayVal, dateVal].filter(Boolean).join(", ");

    for (const [kind, col] of [
      ["daily",   problemCol],
      ["weekend", effectiveWe],
    ] as Array<["daily" | "weekend", string | undefined]>) {
      if (!col) continue;
      const cell = (row[col] ?? "").trim();
      if (!cell) continue;
      const raw = extractProblems(cell);
      if (!raw.length) continue;

      groups.push({
        label,
        week: weekVal,
        kind,
        problems:    raw.map((p) => ({ ...p, solved: false })),
        solvedCount: 0,
        totalCount:  raw.length,
      });
    }
  }

  return groups;
}
