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
}

interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in seconds
}

let tokenCache: CachedToken | null = null;

/**
 * Resolves service account credentials from env vars or local service-account.json file.
 */
function getCredentials(): ServiceAccountCredentials | null {
  // 1. Check direct env vars (recommended for Vercel production)
  const email =
    process.env.GOOGLE_CLIENT_EMAIL?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key =
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (email && key) {
    return {
      client_email: email,
      private_key: key.replace(/\\n/g, "\n"),
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
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
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
          private_key: parsed.private_key,
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

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  const signature = signer.sign(creds.private_key, "base64");
  const encodedSignature = signature
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signInput}.${encodedSignature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `Failed to obtain Google access token: ${tokenJson.error || tokenRes.statusText}`
    );
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
 * Intended to be called fire-and-forget.
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
    // If not configured, silently skip
    return;
  }

  const timestamp = getISTIsoTimestamp();
  const username = params.username.trim();
  const action = params.action || "fetch_progress";
  const result = params.result || "—";
  const ip = params.ip || "unknown";
  const userAgent = params.userAgent || "unknown";

  const accessToken = await getAccessToken();

  const appendUrl =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/` +
    `UsageLogs!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(appendUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [[timestamp, username, action, result, ip, userAgent]],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Sheets API append failed (${res.status}): ${errText}`);
  }
}

/**
 * Fetches all usage log rows from the "UsageLogs" tab in USAGE_LOG_SHEET_ID.
 */
export async function getUsageLogs(): Promise<UsageLogRow[]> {
  const sheetId = process.env.USAGE_LOG_SHEET_ID?.trim();
  if (!sheetId) {
    throw new Error("USAGE_LOG_SHEET_ID environment variable is not configured.");
  }

  const accessToken = await getAccessToken();

  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/UsageLogs!A2:F`;

  const res = await fetch(getUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text();
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
