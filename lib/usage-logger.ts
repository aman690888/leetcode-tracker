/**
 * lib/usage-logger.ts
 *
 * Persistent usage logging + retrieval using Google Sheets API v4 with Service Account.
 * Writes to USAGE_LOG_SHEET_ID (tab "UsageLogs").
 *
 * Header schema: Timestamp | Username | Action | Result | IP | UserAgent
 *
 * Authentication precedence:
 *   1. Environment vars: GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY (ideal for Vercel)
 *   2. Environment var:  GOOGLE_SERVICE_ACCOUNT_KEY (raw or base64 JSON string)
 *   3. Local file:       service-account.json (at project root)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface UsageLogRow {
  timestamp: string;
  username: string;
  action: string;
  result: string;
  ip: string;
  userAgent: string;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  raw_key_length?: number;
}

interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in seconds
}

let tokenCache: CachedToken | null = null;

/**
 * Normalizes and cleans a private key string from env vars or JSON files.
 * Handles:
 * - Stripping outer quotes (e.g. "..." or '...') if pasted with quotes
 * - Converting literal '\n' sequences into actual newline characters
 * - Normalizing \r\n to \n
 * - Ensuring the key ends with a newline
 */
function formatPrivateKey(rawKey: string): string {
  if (!rawKey) return "";
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\\n/g, "\n").replace(/\r/g, "");
  if (!key.endsWith("\n")) {
    key += "\n";
  }
  return key;
}


/**
 * Resilient fetch wrapper for serverless environments.
 * - Adds Connection: close to avoid dead keep-alive socket reuse.
 * - Implements 10s timeout with exponential backoff retries on transient network disconnects or timeouts.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  timeoutMs = 10000
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Connection")) {
    headers.set("Connection", "close");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      return res;
    } catch (err: unknown) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = attempt * 400 + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Resolves service account credentials from env vars or local service-account.json file.
 */
function getCredentials(): ServiceAccountCredentials | null {
  // 1. Check direct env vars (recommended for Vercel production)
  const email =
    process.env.GOOGLE_CLIENT_EMAIL?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey =
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (email && rawKey) {
    return {
      client_email: email,
      private_key: formatPrivateKey(rawKey),
      raw_key_length: rawKey.length,
    };
  }

  // 2. Check single JSON env var (raw or base64)
  const rawJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawJson) {
    try {
      const parsed = rawJson.startsWith("{")
        ? JSON.parse(rawJson)
        : JSON.parse(Buffer.from(rawJson, "base64").toString("utf-8"));
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: formatPrivateKey(parsed.private_key),
          raw_key_length: parsed.private_key.length,
        };
      }
    } catch {
      // invalid json in env
    }
  }

  // 3. Check local service-account.json file
  const localKeyPath = path.join(process.cwd(), "service-account.json");
  if (fs.existsSync(/* turbopackIgnore: true */ localKeyPath)) {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(/* turbopackIgnore: true */ localKeyPath, "utf-8")
      );
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: formatPrivateKey(parsed.private_key),
          raw_key_length: parsed.private_key.length,
        };
      }
    } catch {
      // skip unparseable
    }
  }

  return null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Gets a cached or fresh OAuth2 access token for the Service Account.
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (tokenCache && tokenCache.expiresAt - now > 300) {
    return tokenCache.token;
  }

  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      "Service account credentials not found. Provide service-account.json or set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claimSet));
  const signInput = `${encodedHeader}.${encodedClaim}`;

  let jwt: string;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signInput);
    const signature = signer.sign(creds.private_key, "base64");
    const encodedSignature = signature
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    jwt = `${signInput}.${encodedSignature}`;
  } catch (signErr: unknown) {
    const msg = signErr instanceof Error ? signErr.message : String(signErr);
    console.warn(`[usage-logger] crypto.sign failed when signing JWT: ${msg}`);
    throw signErr;
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetchWithRetry(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      },
      2,
      10000
    );
  } catch (fetchErr: unknown) {
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    throw new Error(`Token exchange failed: ${msg}`);
  }

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    const errMsg = tokenJson.error_description || tokenJson.error || tokenRes.statusText;
    throw new Error(`Failed to obtain Google access token (${tokenRes.status}): ${errMsg}`);
  }

  tokenCache = {
    token: tokenJson.access_token,
    expiresAt: now + (tokenJson.expires_in ?? 3600),
  };

  return tokenCache.token;
}

/**
 * Returns current timestamp formatted in Indian Standard Time (IST) ISO format.
 * Example: 2026-08-25T01:05:00+05:30
 */
export function getISTIsoTimestamp(): string {
  const d = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(d.getTime() + istOffsetMs);
  return istDate.toISOString().replace("Z", "+05:30");
}

/**
 * Appends a usage log row to the "UsageLogs" tab in USAGE_LOG_SHEET_ID.
 * Intended to be called fire-and-forget (.catch() in caller).
 * Failures never throw or block the main request — logs a clean single-line warning.
 */
export async function logUsageEvent(params: {
  username: string;
  action?: string;
  result?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const sheetId = process.env.USAGE_LOG_SHEET_ID?.trim();
  if (!sheetId) {
    return;
  }

  // ── Token acquisition ──────────────────────────────────────────────────────
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (tokenErr: unknown) {
    const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
    console.warn(`[usage-logger] Skipping analytics log: OAuth2 token request failed (${msg})`);
    return; // fire-and-forget: never block or throw
  }

  // ── Sheets API write ───────────────────────────────────────────────────────
  const timestamp = getISTIsoTimestamp();
  const username = params.username.trim();
  const action = params.action || "fetch_progress";
  const result = params.result || "—";
  const ip = params.ip || "unknown";
  const userAgent = params.userAgent || "unknown";

  const appendUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/` +
    `UsageLogs!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  let res: Response;
  try {
    res = await fetchWithRetry(
      appendUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[timestamp, username, action, result, ip, userAgent]],
        }),
      },
      2,
      10000
    );
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.warn(`[usage-logger] Skipping analytics log: Sheets API call failed (${msg})`);
    return;
  }

  if (!res.ok) {
    // If token was rejected (401/403), invalidate cache for next request
    if (res.status === 401 || res.status === 403) {
      tokenCache = null;
    }
    console.warn(`[usage-logger] Skipping analytics log: Sheets API returned HTTP ${res.status}`);
    return;
  }

  console.log(`[usage-logger] Logged: ${username} | ${action} | ${result}`);
}

/**
 * Fetches all usage log rows from the "UsageLogs" tab in USAGE_LOG_SHEET_ID.
 */
export async function getUsageLogs(): Promise<UsageLogRow[]> {
  const sheetId = process.env.USAGE_LOG_SHEET_ID?.trim();
  if (!sheetId) {
    throw new Error("USAGE_LOG_SHEET_ID environment variable is not configured.");
  }

  let accessToken = await getAccessToken();
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/UsageLogs!A2:F`;

  let res: Response;
  try {
    res = await fetchWithRetry(
      getUrl,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
      2,
      10000
    );

    // Invalidate stale cached token on 401 and retry once
    if (res.status === 401) {
      tokenCache = null;
      accessToken = await getAccessToken();
      res = await fetchWithRetry(
        getUrl,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        },
        2,
        10000
      );
    }
  } catch (networkErr: unknown) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.warn(`[usage-logger] Network error calling Sheets API (getUsageLogs): ${msg}`);
    throw networkErr;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "(could not read body)");
    console.error(
      `[usage-logger] Sheets API returned HTTP ${res.status} (getUsageLogs):`,
      `\n  Body: ${errText}`,
      `\n  sheetId=${sheetId}`
    );
    throw new Error(`Sheets API fetch failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const rawRows = data.values || [];

  return rawRows.map((row) => {
    // Backward-compatibility check:
    // If older row has only 5 columns (Timestamp, Username, Action, IP, UserAgent)
    const isOld5ColFormat =
      row.length === 5 &&
      (row[3]?.includes(".") ||
        row[3]?.includes(":") ||
        row[3] === "unknown" ||
        row[4]?.includes("Mozilla"));

    if (isOld5ColFormat) {
      return {
        timestamp: row[0] || "",
        username: row[1] || "",
        action: row[2] || "",
        result: "—",
        ip: row[3] || "",
        userAgent: row[4] || "",
      };
    }

    return {
      timestamp: row[0] || "",
      username: row[1] || "",
      action: row[2] || "",
      result: row[3] || "—",
      ip: row[4] || "",
      userAgent: row[5] || "",
    };
  });
}
