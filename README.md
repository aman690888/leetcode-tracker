# tracker.sh

**Tracks which LeetCode problems assigned in class you've actually solved.**

Pulls the live assignment sheet straight from Google Sheets, cross-references it against your authenticated LeetCode submission history, and shows an accurate breakdown of what's done and what's still pending — grouped by date, with a progress bar.

🔗 **Live: [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app)**

---

## 👤 Author & Open Source

Created by **[Aman Rawat](https://github.com/aman690888)**.

This is an open-source personal project designed to simplify DSA homework tracking. Contributions, issues, and forks are welcome under the [MIT License](LICENSE).

---

## Getting Started (2-Step Guide)

To ensure **100% accurate results** across your entire homework history, the tracker requires connecting your LeetCode session cookies.

### Step 1: Connect Session Cookies (1-Minute Setup)

Cookies are saved **strictly in your own browser** (`localStorage`) and never stored on any server.

1. Open [leetcode.com](https://leetcode.com) in your browser (logged in).
2. Press **F12** to open DevTools.
3. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
4. In the left sidebar: **Storage → Cookies → `https://leetcode.com`**.
5. Copy the value of **`LEETCODE_SESSION`** (long string starting with `eyJ...`).
6. Copy the value of **`csrftoken`** (~64 characters).
7. On [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app), click **⚙ Configure Session Cookies →** (or the **⚙ config** button in the header), paste both values, and click **save**.

The `⚙ config` button will show a green dot (`⚙ session ●`) indicating your browser is ready.

---

### Step 2: Track Your Assignments

1. Enter your LeetCode username in the terminal input.
2. Click **run →**.
3. Your full assignment breakdown will appear with live solved status.

---

## Reading the Results

At the top you'll see four numbers:

- **solved** — how many assigned problems you've AC'd on LeetCode
- **assigned** — total problems in the sheet
- **pending** — what's left (`assigned − solved`)
- **complete %** — progress bar fills green when done, amber when not

Below that, problems are grouped by date. Each group shows:
- A **left border**: amber if anything is still pending in that group, green if it's all done
- Each problem row: a **green dot** (solved) or grey dot (pending), the problem title, its LC number, and an arrow link that opens the problem on LeetCode in a new tab
- Solved problems get a strikethrough

By default you see **pending problems only**. Hit **"show completed"** (top-right of the results) to see everything.

The **↺ refresh** button in the header re-runs the check without re-entering your username. The URL also updates to `?user=yourusername` so you can bookmark it.

---

## How It Works

```
Google Sheets API v4
      │
      ▼  (Cached 3 mins in server RAM + Next.js Data Cache)
  Parse assignments
  (dynamic column detection, extracts title + LC slug + URL)
      │
      ▼  LeetCode GraphQL API (Authenticated)
  problemsetQuestionList { filters: { status: "AC" } }
  (uses student's private session cookies from localStorage)
      │
      ▼
  Match assignment slugs vs solved slugs
      │
      ▼
  Return grouped results → render in UI
```

### Scaling & Caching
To comfortably support multiple students checking assignments simultaneously without hitting Google Sheets API rate limits:
- **Two-Tier 3-Minute Cache**: Assignment sheet data is cached in server memory and Next.js Data Cache for 3 minutes. Concurrently visiting students share the cached sheet instantly (0ms latency, zero extra API calls).
- **Graceful Rate-Limit Fallback**: If Google Sheets API ever encounters temporary rate limits, the server automatically serves the cached sheet seamlessly.

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** for styling
- **Google Sheets API v4** for reading assignments with two-tier caching
- **LeetCode GraphQL API** (Authenticated) for full solved history
- **Browser localStorage** for client-side session cookie persistence
- **Vercel** for serverless hosting

---

## Environment Variables

Configured in Vercel's project settings (**Settings → Environment Variables**):

| Variable | Required | What it is |
|---|---|---|
| `GOOGLE_SHEETS_API_KEY` | ✅ | Google Cloud API key restricted to Sheets API. |
| `SHEET_ID` | ✅ | Spreadsheet ID from the Google Sheet URL. |
| `SHEET_RANGE` | ✅ | Sheet tab name or range (e.g. `Sheet1` or `Sheet1!A:E`). |
| `LEETCODE_SESSION` | Optional | Server-side fallback session cookie (local dev only). |
| `LEETCODE_CSRF_TOKEN` | Optional | Server-side fallback CSRF token (local dev only). |

---

## Troubleshooting

**"Session expired or invalid" error**
LeetCode session cookies expire every 1–3 weeks. Click the **⚙ Refresh Session Cookies →** button in the error box to paste fresh cookies from DevTools.

**"Assigned: 0 / Solved: 0 / 0%" with no error message**
1. Check that `GOOGLE_SHEETS_API_KEY`, `SHEET_ID`, and `SHEET_RANGE` are set in Vercel.
2. If you just edited env vars, trigger a **Redeploy** in Vercel.
3. Verify that `SHEET_RANGE` matches the actual tab name at the bottom of the Google Sheet.

**"No LeetCode account found for X" error**
Check spelling and capitalization — LeetCode usernames are case-sensitive.
