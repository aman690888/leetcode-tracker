# tracker.sh — LeetCode Assignment Tracker

A Next.js web app that tracks your DSA homework progress against your live LeetCode solved submissions.

## Features

- **Google Sheets API v4** — fetches the live assignment sheet via a proper authenticated API call (no CSV scraping, no bot-detection issues)
- **Dynamic column detection** — column structure re-inspected each time; handles sheet edits automatically
- **LeetCode GraphQL** — server-side fetch to avoid CORS; no auth required for basic use
- **Full solved-history** — uses your session cookies (stored in browser localStorage) to fetch your complete AC problem list
- **Graceful fallback** — if session is missing/expired, falls back to ~20 recent solves with a warning banner
- **Shareable URLs** — `?user=yourusername` in URL for bookmarking
- **Terminal aesthetic** — dark, monospace, intentional design

## Setup

### 1. Clone and install

```bash
cd leetcode-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with these values:

---

#### `GOOGLE_SHEETS_API_KEY` (required)

A Google API key restricted to the Sheets API.

**How to get one:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Go to **APIs & Services → Library** → search **"Google Sheets API"** → Enable it
4. Go to **APIs & Services → Credentials** → **Create Credentials → API Key**
5. Click **Edit key** → under **API restrictions**, select **Restrict key** → choose **Google Sheets API**
6. Copy the key

The sheet must be shared as **"Anyone with the link can view"** (viewer access is enough for the Sheets API with just an API key — no OAuth needed).

---

#### `SHEET_ID` (required)

The spreadsheet ID — the long string between `/d/` and `/edit` in the Google Sheets URL.

```
https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit
```

---

#### `SHEET_RANGE` (required)

The sheet tab name or cell range to fetch. Examples:
- `Sheet1` — entire first tab
- `Sheet1!A:E` — columns A through E of the first tab
- `DSA Homework!A:F` — a tab named "DSA Homework"

If your sheet tab is named something other than "Sheet1", update this value.

---

#### `LEETCODE_SESSION` + `LEETCODE_CSRF_TOKEN` (strongly recommended)

These enable **full solved-history matching** instead of only the ~20 most recent submissions.

**How to extract them:**
1. Open [leetcode.com](https://leetcode.com) while logged in
2. Press `F12` → **Application** tab → **Storage → Cookies → `https://leetcode.com`**
3. Copy the **Value** of `LEETCODE_SESSION` and `csrftoken`
4. Paste into `.env.local` as `LEETCODE_SESSION=...` and `LEETCODE_CSRF_TOKEN=...`

> **Security:** `.env.local` is covered by `.gitignore` (`.env*`). Session cookies are stored in your **browser localStorage** on the deployed app and sent as request headers — never persisted server-side.

---

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your LeetCode username, press **run →**.

## Deploying to Vercel

1. Push this directory to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add these env vars in **Project Settings → Environment Variables**:
   - `GOOGLE_SHEETS_API_KEY`
   - `SHEET_ID`
   - `SHEET_RANGE`
4. For LeetCode session cookies: use the **⚙ config** button in the deployed app's UI — cookies are saved in your browser's `localStorage` and sent directly with each request (no Vercel env vars needed for these)
5. Deploy

## Project structure

```
app/
  layout.tsx          Root layout
  page.tsx            Main page (client component, URL param sync)
  globals.css         Design tokens + global styles
  api/track/route.ts  GET /api/track?username=... (server-side)

components/
  ResultsView.tsx     Summary stats + progress bar + toggle + warning banner
  ProblemGroup.tsx    Day group with problem checklist rows
  SettingsPanel.tsx   Browser-localStorage session config modal

lib/
  sheet.ts            Google Sheets API v4 fetch + parser
  leetcode.ts         LeetCode GraphQL — auth fetch with fallback

types/
  index.ts            Shared TypeScript types
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_SHEETS_API_KEY` | ✅ Yes | Google API key restricted to Sheets API |
| `SHEET_ID` | ✅ Yes | Spreadsheet ID from the sheet URL |
| `SHEET_RANGE` | ✅ Yes | Tab name or range, e.g. `Sheet1` |
| `LEETCODE_SESSION` | Recommended | LeetCode session cookie (server-side fallback) |
| `LEETCODE_CSRF_TOKEN` | Recommended | LeetCode CSRF token (server-side fallback) |

## Known constraints

### Authenticated LeetCode mode is tied to the session owner

When session cookies are configured (either in browser localStorage via ⚙ config, or in env vars), the tracker fetches solved problems for **whoever owns that session** — not necessarily the username entered in the UI. For personal use this is exactly correct.

### Session cookies expire

LeetCode sessions expire every few weeks. When expired, the app automatically falls back to recent-submissions mode and shows a warning banner with a link to the ⚙ config panel to re-paste fresh cookies.
