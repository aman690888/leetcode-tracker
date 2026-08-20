# tracker.sh — LeetCode Assignment Tracker

A Next.js web app that tracks your DSA homework progress against your live LeetCode solved submissions.

## Features

- **Live sheet** — re-fetches your teacher's Google Sheet on every request (no stale data)
- **Dynamic parsing** — column structure re-inspected each time; handles sheet edits automatically
- **Authenticated LeetCode** — uses your session cookies to fetch your **full** solved history (not just recent 20)
- **Graceful fallback** — if session is missing/expired, shows recent solves + a warning banner instead of crashing
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

Edit `.env.local` with three values:

#### `SHEET_CSV_URL` (required)
The Google Sheets CSV export URL. Sheet must be shared as **"Anyone with the link can view"**.

```
SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0
```

#### `LEETCODE_SESSION` + `LEETCODE_CSRF_TOKEN` (strongly recommended)

These enable **full solved-history matching** instead of only the ~20 most recent submissions.

**How to extract them:**

1. Open [leetcode.com](https://leetcode.com) while logged in
2. Press `F12` → **Application** tab → **Storage → Cookies → `https://leetcode.com`**
3. Find and copy the **Value** of each cookie:

| Cookie name | Looks like |
|---|---|
| `LEETCODE_SESSION` | Long JWT string starting with `eyJ...` (~300 chars) |
| `csrftoken` | Shorter alphanumeric string (~64 chars) |

4. Paste into `.env.local`:

```
LEETCODE_SESSION=eyJ0eXAiOiJKV1Q...
LEETCODE_CSRF_TOKEN=abc123xyz...
```

5. Restart the dev server (`npm run dev`)

> **Security:** `.env.local` is covered by `.gitignore` (line 34: `.env*`). These values never appear in code, logs, or committed files. For Vercel deployment, add them in **Project Settings → Environment Variables**.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your LeetCode username, press **run →**.

## Deploying to Vercel

1. Push this directory to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add all three env vars in **Project Settings → Environment Variables**
4. Deploy — no other config needed

## Known constraints

### Authenticated mode is tied to the session owner

When `LEETCODE_SESSION` is set, the tracker fetches solved problems for **whoever owns that session** — not necessarily the username entered in the UI. For your own personal use (tracking your own assignments), this is exactly correct. If you share this deployment with classmates and they enter their own usernames, their results will still reflect your solved problems.

This is a deliberate trade-off for a personal tool. If you need true per-user tracking, each user would need to provide their own session cookies.

### Session cookies expire

LeetCode sessions typically expire every few weeks. When expired, the tracker automatically falls back to recent-submissions mode and shows a warning banner. Re-extract the cookies from DevTools and update `.env.local` (and Vercel env vars) to restore full-history mode.

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

lib/
  sheet.ts            Google Sheet CSV fetch + dynamic parser
  leetcode.ts         LeetCode GraphQL — auth fetch with fallback

types/
  index.ts            Shared TypeScript types
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SHEET_CSV_URL` | ✅ Yes | Full CSV export URL of the Google Sheet |
| `LEETCODE_SESSION` | Recommended | LeetCode session cookie for full history |
| `LEETCODE_CSRF_TOKEN` | Recommended | LeetCode CSRF token (paired with session) |
