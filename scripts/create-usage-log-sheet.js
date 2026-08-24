/**
 * scripts/create-usage-log-sheet.js
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTE: This is a ONE-TIME automation script.
 * Run once to initialize your usage logging Google Spreadsheet and share it
 * with your personal Google account. It can be deleted or ignored afterward.
 *
 * How to run:
 *   1. Edit `MY_EMAIL` below with your personal Google email address.
 *   2. Provide your Service Account credentials using ANY of the following:
 *      - In `.env.local`: `GOOGLE_CLIENT_EMAIL` & `GOOGLE_PRIVATE_KEY`
 *      - In `.env.local`: `GOOGLE_SERVICE_ACCOUNT_KEY` (raw or base64 JSON)
 *      - As a JSON file: `service-account.json` or `credentials.json` in project root
 *   3. Run from the `leetcode-tracker` directory:
 *        node scripts/create-usage-log-sheet.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── 1. CONFIGURATION (EDIT BEFORE RUNNING) ───────────────────────────────────

// 👇 Put your personal Google account email here:
const MY_EMAIL = "ar3655185@gmail.com";

// Optional: explicit path to service account credentials JSON file.
const CUSTOM_CREDENTIALS_PATH = "";

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom zero-dependency .env loader (Next.js auto-loads .env.local, but standalone Node does not).
 */
function loadLocalEnv() {
  const candidateFiles = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
  ];

  for (const envPath of candidateFiles) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();

        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        val = val.replace(/\\n/g, "\n");

        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

/**
 * Loads credentials from environment variables or local JSON files.
 */
function resolveCredentials() {
  loadLocalEnv();

  // 1. Check environment variables: GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY
  const clientEmail =
    process.env.GOOGLE_CLIENT_EMAIL?.trim() ||
    process.env.CLIENT_EMAIL?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();

  const privateKey =
    process.env.GOOGLE_PRIVATE_KEY?.trim() ||
    process.env.PRIVATE_KEY?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (clientEmail && privateKey) {
    return {
      source: "Environment Variables (.env.local: GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY)",
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  // 2. Check environment variable: GOOGLE_SERVICE_ACCOUNT_KEY (JSON string or base64)
  const rawKeyJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

  if (rawKeyJson) {
    try {
      let parsed;
      if (rawKeyJson.startsWith("{")) {
        parsed = JSON.parse(rawKeyJson);
      } else {
        const decoded = Buffer.from(rawKeyJson, "base64").toString("utf-8");
        parsed = JSON.parse(decoded);
      }
      if (parsed.client_email && parsed.private_key) {
        return {
          source: "Environment Variable (.env.local: GOOGLE_SERVICE_ACCOUNT_KEY)",
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // Invalid JSON string
    }
  }

  // 3. Check custom path or local candidate files
  if (CUSTOM_CREDENTIALS_PATH && fs.existsSync(CUSTOM_CREDENTIALS_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CUSTOM_CREDENTIALS_PATH, "utf-8"));
      if (parsed.client_email && parsed.private_key) {
        return {
          source: `File: ${CUSTOM_CREDENTIALS_PATH}`,
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
      }
    } catch {}
  }

  const candidatePaths = [
    path.resolve(process.cwd(), "service-account.json"),
    path.resolve(process.cwd(), "credentials.json"),
    path.resolve(process.cwd(), "google-credentials.json"),
    path.resolve(process.cwd(), "service_account.json"),
    path.resolve(__dirname, "../service-account.json"),
    path.resolve(__dirname, "../credentials.json"),
    path.resolve(__dirname, "../google-credentials.json"),
    path.resolve(__dirname, "../service_account.json"),
    path.resolve(__dirname, "service-account.json"),
    path.resolve(__dirname, "credentials.json"),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (parsed.client_email && parsed.private_key) {
          return {
            source: `File: ${p}`,
            client_email: parsed.client_email,
            private_key: parsed.private_key,
          };
        }
      } catch {}
    }
  }

  return null;
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getServiceAccountAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claimSet));
  const signInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signInput);
  const signature = signer.sign(credentials.private_key, "base64");
  const encodedSignature = signature
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signInput}.${encodedSignature}`;

  console.log("🔑 Authenticating Service Account via Google OAuth2...");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `Failed to obtain OAuth2 access token: ${tokenJson.error_description || tokenJson.error || JSON.stringify(tokenJson)}`
    );
  }

  return tokenJson.access_token;
}

async function main() {
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("  🚀 Google Sheet Setup Automation: LC Tracker Usage Logs");
  console.log("─────────────────────────────────────────────────────────────────\n");

  if (!MY_EMAIL || MY_EMAIL === "PUT_YOUR_EMAIL_HERE" || !MY_EMAIL.includes("@")) {
    console.error("❌ ERROR: Please edit scripts/create-usage-log-sheet.js and set MY_EMAIL to your Google account email before running.\n");
    process.exit(1);
  }

  const credentials = resolveCredentials();
  if (!credentials) {
    console.error("❌ ERROR: Could not find Google Service Account credentials.");
    console.error("─────────────────────────────────────────────────────────────────");
    console.error("Note: The existing assignment reader in lib/sheet.ts uses an API Key");
    console.error("(GOOGLE_SHEETS_API_KEY), which only has read access to public sheets.");
    console.error("\nTo create and share a new sheet, a Service Account is required.");
    console.error("Please provide your Service Account using ANY of these methods:\n");
    console.error("  Option 1 (.env.local):");
    console.error("    GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com");
    console.error("    GOOGLE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\"");
    console.error("\n  Option 2 (.env.local):");
    console.error("    GOOGLE_SERVICE_ACCOUNT_KEY='{\"client_email\":\"...\",\"private_key\":\"...\"}'");
    console.error("\n  Option 3 (JSON file):");
    console.error("    Place your downloaded JSON key file as `service-account.json` in this folder.");
    console.error("─────────────────────────────────────────────────────────────────\n");
    process.exit(1);
  }

  console.log(`📄 Credentials source: ${credentials.source}`);
  console.log(`👤 Service Account: ${credentials.client_email}`);

  const accessToken = await getServiceAccountAccessToken(credentials);
  console.log("✅ Authenticated successfully with Sheets & Drive scopes.\n");

  // 1. Create Spreadsheet
  console.log("📊 Creating new Google Spreadsheet 'LC Tracker Usage Logs' with tab 'UsageLogs'...");
  const createSheetRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "LC Tracker Usage Logs",
      },
      sheets: [
        {
          properties: {
            title: "UsageLogs",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  const sheetData = await createSheetRes.json();
  if (!createSheetRes.ok || !sheetData.spreadsheetId) {
    throw new Error(`Sheets API spreadsheets.create failed: ${JSON.stringify(sheetData)}`);
  }

  const spreadsheetId = sheetData.spreadsheetId;
  console.log(`✅ Spreadsheet created (ID: ${spreadsheetId})\n`);

  // 2. Write Header Row
  console.log("✍️  Writing header row [Timestamp, Username, Action, Result, IP, UserAgent]...");
  const headerRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/UsageLogs!A1:F1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [["Timestamp", "Username", "Action", "Result", "IP", "UserAgent"]],
      }),
    }
  );

  const headerJson = await headerRes.json();
  if (!headerRes.ok) {
    throw new Error(`Failed to write header row: ${JSON.stringify(headerJson)}`);
  }
  console.log("✅ Header row written.\n");

  // 3. Share with personal email
  console.log(`👥 Sharing spreadsheet with '${MY_EMAIL}' (role: writer)...`);
  const shareRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "writer",
        type: "user",
        emailAddress: MY_EMAIL,
      }),
    }
  );

  const shareJson = await shareRes.json();
  if (!shareRes.ok) {
    throw new Error(`Drive API permissions.create failed: ${JSON.stringify(shareJson)}`);
  }
  console.log(`✅ Shared successfully with ${MY_EMAIL} as writer.\n`);

  // 4. Output ID
  console.log("─────────────────────────────────────────────────────────────────");
  console.log(`✅ Sheet created! Add this to your .env as USAGE_LOG_SHEET_ID=${spreadsheetId}`);
  console.log(`🔗 Open Sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log("─────────────────────────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n❌ Execution failed:", err.message || err);
  process.exit(1);
});
