# tracker.sh

**Tracks which LeetCode problems assigned in class you've actually solved.**

Pulls the live assignment sheet straight from Google Sheets, cross-references it against your LeetCode submission history, and shows a clean breakdown of what's done and what's still pending — grouped by date, with a progress bar.

🔗 **Live: [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app)**

---

## 👤 Author & Open Source

Created by **[Aman Rawat](https://github.com/aman690888)**.

This is an open-source personal project designed to simplify DSA homework tracking. Contributions, issues, and forks are welcome under the [MIT License](LICENSE). The assignment extraction engine and LeetCode GraphQL integration were built and refined to handle live Google Sheets API v4 parsing with zero bot-detection issues and multi-user privacy.

---

## Using it day-to-day

### Basic usage

1. Open [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app)
2. Type your LeetCode username in the terminal-style input and press **run →**
3. That's it — results appear in a few seconds

### For classmates

- **No login or setup is required to get started.** Just type your LeetCode username and hit run.
- By default, the tool will check your **~20 most recent solved submissions** publicly.
- **Session cookies are optional**: If you want the tracker to check your *entire* historical solve history (beyond the 20 most recent problems), you can optionally add your own session cookies in **⚙ config**. Cookies are stored **only in your own browser** (`localStorage`) and never shared with anyone else.

---

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

### Getting full solve history (optional)

By default the app checks your **~20 most recent** accepted submissions on LeetCode. If you solved an assignment problem a while back, it might still show as pending in the basic mode.

To unlock 100% full-history matching, you can add your LeetCode session cookies. They are saved **strictly in your browser's local storage** (`localStorage`) and sent as request headers only for your queries.

**Steps (takes ~1 minute, lasts 1–3 weeks until cookies expire):**

1. Open [leetcode.com](https://leetcode.com) in your browser, make sure you're logged in
2. Press **F12** to open DevTools
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. In the left sidebar: **Storage → Cookies → `https://leetcode.com`**
5. Find the cookie named **`LEETCODE_SESSION`** — copy its full value (long string starting with `eyJ...`)
6. Find the cookie named **`csrftoken`** — copy its value too (~64 chars)
7. In the tracker app, click **⚙ config** in the top-right header
8. Paste the two values into their fields and click **save**

The `⚙ config` button turns **green** with a dot when cookies are active.

---

### The amber warning banner

If you see a banner like:

> ⚠ No session cookies configured — showing recent solves only (~20)...

or

> ⚠ Session cookies appear expired — showing recent solves only (~20)...

It simply means the tracker is operating in public fallback mode (~20 recent submissions). If you're okay with recent-only matching, you can dismiss it with **×**. If you want full history, click the inline link **⚙ Add session cookies for full history →** and paste fresh cookies.

---

## How it works

```
Google Sheets API v4
      │
      ▼  (Cached 3 mins in server RAM + Next.js Data Cache)
  Parse assignments
  (dynamic column detection, extracts title + LC slug + URL)
      │
      ├─── LeetCode GraphQL API (authenticated) ──────────────────────┐
      │    problemsetQuestionList { filters: { status: "AC" } }        │
      │    (uses student's private session cookies from localStorage) │
      │                                                                │
      └─── LeetCode GraphQL API (fallback, no auth) ──────────────────┘
           recentAcSubmissionList (last ~20 public AC solves)
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

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** for styling
- **Google Sheets API v4** for reading assignments with two-tier caching
- **LeetCode GraphQL API** for fetching solved problems
- **Browser localStorage** for client-side session cookie persistence
- **Vercel** for serverless hosting

---

## Environment variables

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

**"Assigned: 0 / Solved: 0 / 0%" with no error message**
1. Check that `GOOGLE_SHEETS_API_KEY`, `SHEET_ID`, and `SHEET_RANGE` are set in Vercel.
2. If you just edited env vars, trigger a **Redeploy** in Vercel.
3. Verify that `SHEET_RANGE` matches the actual tab name at the bottom of the Google Sheet.

**The amber warning banner is showing**
Session cookies are either unconfigured or have expired. You can continue using the tool with recent solves, or click **⚙ Add session cookies for full history →** to paste fresh cookies.

**"No LeetCode account found for X" error**
Check spelling and capitalization — LeetCode usernames are case-sensitive.

**The ⚙ config button is green but results still show amber banner**
Your saved session cookies expired on LeetCode. Re-copy fresh cookies from DevTools and save them in the settings panel.
