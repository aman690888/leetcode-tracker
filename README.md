# tracker.sh

**Tracks which LeetCode problems assigned in class I've actually solved.**

Pulls the live assignment sheet straight from Google Sheets, cross-references it against my LeetCode submission history, and shows a clean breakdown of what's done and what's still pending — grouped by date, with a progress bar.

🔗 **Live: [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app)**

---

## Using it day-to-day

### Basic usage

1. Open [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app)
2. Type your LeetCode username in the terminal-style input and press **run →**
3. That's it — results appear in a few seconds

### Reading the results

At the top you'll see four numbers:

- **solved** — how many assigned problems you've AC'd on LeetCode
- **assigned** — total problems in the sheet
- **pending** — what's left (`assigned − solved`)
- **complete %** — progress bar fills green when done, amber when not

Below that, problems are grouped by date. Each group shows:
- A **left border**: amber if anything is still pending in that group, green if it's all done
- Each problem row: a **green dot** (solved) or grey dot (pending), the problem title, its LC number, and an arrow link that opens the problem on LeetCode in a new tab
- Solved problems get a strikethrough — satisfying to see grow

By default you see **pending problems only**. Hit **"show completed"** (top-right of the results) to see everything.

The **↺ refresh** button in the header re-runs the check without re-entering your username. The URL also updates to `?user=yourusername` so you can bookmark it.

---

### Getting full solve history (important — do this)

By default the app can only see your **~20 most recent** accepted submissions on LeetCode. If you solved something more than a few days ago it might still show as pending even though it's done.

To fix this you need to give the app your LeetCode session cookies. They're stored **only in your browser** (localStorage) and sent directly to the API — nothing is written to any server.

**Steps (takes 2 minutes, needs to be repeated every 1–3 weeks when cookies expire):**

1. Open [leetcode.com](https://leetcode.com) in your browser, make sure you're logged in
2. Press **F12** to open DevTools
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. In the left sidebar: **Storage → Cookies → `https://leetcode.com`**
5. Find the cookie named **`LEETCODE_SESSION`** — click it, copy the full value from the bottom panel (it's a long string starting with `eyJ...`, around 300 characters)
6. Find the cookie named **`csrftoken`** — copy its value too (shorter, around 64 characters)
7. Back in the tracker app, click **⚙ config** in the top-right corner of the header
8. Paste the two values into their respective fields, click **save**

The `⚙ config` button turns **green** with a dot when cookies are saved. The next time you run a search, it uses your full history.

> **The `show` / `hide` toggles** in the settings panel let you reveal the field values to confirm they pasted correctly — they're masked by default.

---

### The amber warning banner

If you see a banner like:

> ⚠ No session cookies configured — showing recent solves only (~20)...

or

> ⚠ Session cookies appear expired — showing recent solves only (~20)...

It means the tracker is running without auth and can only see your recent submissions. Problems you solved more than ~20 submissions ago will incorrectly show as pending.

**Fix:** click **⚙ Add session cookies for full history →** (the link inside the banner) and follow the steps above. If you already have cookies saved and still see this, they've expired — just repeat the process to get fresh ones.

---

## How it works

```
Google Sheets API v4
      │
      │  values.get({sheetId, range})
      │  → JSON array of rows
      ▼
  Parse assignments
  (dynamic column detection, problem cell parsing,
   extracts title + LC slug + URL from each row)
      │
      ├─── LeetCode GraphQL API (authenticated) ──────────────────────┐
      │    problemsetQuestionList { filters: { status: "AC" } }        │
      │    paginated 500/page until all solved slugs fetched           │
      │    (uses session cookies sent from your browser)               │
      │                                                                │
      └─── LeetCode GraphQL API (fallback, no auth) ──────────────────┘
           recentAcSubmissionList (last ~20 only)
                    │
                    ▼
         Match assignment slugs vs solved slugs
                    │
                    ▼
         Return grouped results → render in UI
```

The sheet is re-fetched on every request (no caching) so new problems the teacher adds show up immediately. The LeetCode query is also uncached — a refresh always reflects your latest submissions.

---

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** for styling
- **Google Sheets API v4** for reading the assignment sheet
- **LeetCode GraphQL API** for fetching solved problems
- **Browser localStorage** for storing session cookies client-side
- **Vercel** for deployment

---

## Environment variables

These live in Vercel's project settings (Settings → Environment Variables). You should never need to change them unless you're moving to a different sheet or rotating the API key.

| Variable | Required | What it is |
|---|---|---|
| `GOOGLE_SHEETS_API_KEY` | ✅ | Google Cloud API key restricted to Sheets API. Get one at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials. Enable "Google Sheets API" in the project first. |
| `SHEET_ID` | ✅ | The spreadsheet ID — the long string between `/d/` and `/edit` in the sheet URL. |
| `SHEET_RANGE` | ✅ | Sheet tab name or range, e.g. `Sheet1` or `Sheet1!A:E`. If the tab gets renamed, update this. |
| `LEETCODE_SESSION` | Optional | Server-side fallback session cookie. Not needed for normal use — the browser localStorage approach (via ⚙ config) takes priority and is easier to maintain. |
| `LEETCODE_CSRF_TOKEN` | Optional | Server-side fallback CSRF token. Same note as above. |

---

## Known limitations

### Session cookies need periodic refresh

LeetCode session cookies expire roughly every 1–3 weeks. When they expire, the tracker silently falls back to showing only your 20 most recent AC submissions, and the amber warning banner appears. This is expected — just re-paste fresh cookies from DevTools via the ⚙ config panel.

There's no way around this. LeetCode has no public OAuth for third-party apps, so there's no persistent login method. The cookie approach is the only way to get full submission history without scraping.

### This is a single-user tool

The session cookies you paste belong to your LeetCode account. The "full history" mode always reflects the account whose cookies are saved — regardless of what username is typed in the search box. If you share the URL with a classmate and they type their username, they'll see assignments matched against your solve history, not theirs.

This is fine for personal use. Making it properly multi-user would require each person to paste their own cookies, which this UI doesn't currently support.

---

## Troubleshooting

**"Assigned: 0 / Solved: 0 / 0%" with no error message**

The sheet data isn't being fetched. Check:
1. Are `GOOGLE_SHEETS_API_KEY`, `SHEET_ID`, and `SHEET_RANGE` all set in Vercel → Settings → Environment Variables?
2. After adding/changing env vars, you must **redeploy** (Vercel doesn't pick up env var changes automatically for existing deployments — go to Deployments → ⋯ → Redeploy)
3. Is `SHEET_RANGE` correct? If the tab isn't named `Sheet1`, the API returns empty. Check the actual tab name at the bottom of the Google Sheet.

**The amber warning banner is showing**

Session cookies are either not configured or have expired. Click the **⚙ Add session cookies for full history →** link in the banner and repaste fresh cookies. See [Getting full solve history](#getting-full-solve-history-important--do-this) above.

**"No LeetCode account found for X" error**

The username doesn't exist on LeetCode, or was typed incorrectly. LeetCode usernames are case-sensitive.

**Some solved problems still showing as pending after adding cookies**

Wait a few minutes — LeetCode's GraphQL API sometimes has a short delay between a submission being accepted and it appearing in query results. Hit **↺ refresh** and they should update.

**The ⚙ config button is green but results still show amber banner**

Your saved cookies expired. The green dot means cookies are saved in localStorage, not that they're valid. Re-extract fresh cookies from DevTools and re-save.
