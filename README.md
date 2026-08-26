# tracker.sh — DSA Assignment Tracker

**Tracks which LeetCode problems assigned in class you've actually solved.**

Pulls the live curriculum straight from Google Sheets, cross-references it against your authenticated LeetCode submission history, and renders a sleek, real-time dashboard featuring an interactive **Quest Matrix**, **Total Mastery analytics**, and **isolated milestone problem feeds**.

🔗 **Live Deployment: [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app)**

---

## 👤 Author & Open Source

Created with passion by **[Aman Rawat](https://github.com/aman690888)**.

This is an open-source personal project designed to simplify DSA homework tracking. Contributions, issues, and forks are welcome under the [MIT License](LICENSE).

---

## ✨ Features & Architecture

- 🌌 **KokonutUI Celestial Beams Canvas:** Smooth, GPU-accelerated drifting celestial light beams background with automatic lifecycle management and visibility throttling.
- ✨ **ReactBits Laser Border Glow:** Interactive mouse-following perimeter border illumination with zero-overhead CSS custom property tracking.
- 💎 **Refined Glassmorphism Cards:** Frosted dark glass containers (`backdrop-filter: blur(24px) saturate(180%)`) with luminous depth and hairline borders.
- 🗺️ **Interactive Quest Matrix:** Visual heatmap grid representing every problem in the curriculum with instant hover preview tooltips, difficulty indicators, and direct LeetCode links.
- 🔒 **Viewport-Locked Isolated Feed:** Two-column split layout where the header, search controls, and sticky stats stay locked in place while the milestone problem feed scrolls independently.
- 🔍 **itshover.com Magnifier Icon:** Pure vector SVG search icon featuring physics-inspired wobble micro-interactions.
- ⚡ **Real-Time Search & Tab Filtering:** Instant text search across problem titles, IDs, and tags, with quick toggling between "Pending" and "All" problems.
- ⏱️ **Device-Only Recent Students History:** Privacy-first, local-device handle memory with 1-click handle switching and quick dismissal.
- 🔐 **Zero-Knowledge Session Persistence:** Client-side only `localStorage` session cookie caching for private LeetCode GraphQL authentication.

---

## 🚀 Getting Started (2-Step Guide)

To ensure **100% accurate results** across your entire homework history, the tracker connects to your LeetCode session cookies.

### Step 1: Connect Session Cookies (1-Minute Setup)

Cookies are saved **strictly in your own browser** (`localStorage`) and never stored on any external server.

1. Open [leetcode.com](https://leetcode.com) in your browser (logged in).
2. Press **F12** to open DevTools.
3. Go to the **Application** tab (Chrome/Edge/Brave) or **Storage** tab (Firefox).
4. In the left sidebar: **Storage → Cookies → `https://leetcode.com`**.
5. Copy the value of **`LEETCODE_SESSION`** (long string starting with `eyJ...`).
6. Copy the value of **`csrftoken`** (~64 characters).
7. On [aman-lctracker.vercel.app](https://aman-lctracker.vercel.app), click the **Session Status** button in the header, paste both values, and click **Save**.

The button will show a green dot (`● Session Connected`) indicating your browser is ready.

---

### Step 2: Track Your Assignments

1. Enter your LeetCode username in the search input (or click a recently searched handle).
2. Click **Track →** (or press `Enter`).
3. Your full assignment breakdown will load instantly with live solved status and progress analytics.

---

## 🗺️ Reading the Dashboard

### 1. Left Sticky Column
- **Total Mastery Card:** Displays your overall completion percentage, circular progress ring, and counts of solved, assigned, and pending problems.
- **Quest Matrix Card:** Interactive matrix grid of all assigned problems in the curriculum. Green squares indicate solved problems, amber squares indicate pending problems.

### 2. Right Milestone Feed
- **Filter Controls:** Live search bar and "Pending" / "All" toggle tabs to quickly focus on remaining tasks.
- **Day Cards:** Curriculum assignments grouped by day/milestone with status badges, difficulty chips, and direct links to LeetCode.
- **Compact Problem Rows:** One-click problem titles that open the corresponding LeetCode question in a new tab.

---

## 🛠️ How It Works

```
Google Sheets API v4
      │
      ▼  (Cached 3 mins in server memory + Next.js Data Cache)
  Parse curriculum sheet
  (dynamic column detection, extracts title + LC slug + URL)
      │
      ▼  LeetCode GraphQL API (Authenticated)
  problemsetQuestionList { filters: { status: "AC" } }
  (uses student's private session cookies from localStorage)
      │
      ▼
  Cross-reference assignment slugs vs solved slugs
      │
      ▼
  Return unified telemetry → Render modern glassmorphic dashboard
```

---

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, TypeScript)
- **Styling & Effects:** Tailwind CSS v4, ReactBits BorderGlow, KokonutUI Canvas Beams
- **APIs:** Google Sheets API v4 (Two-tier cached), LeetCode GraphQL API
- **Client Storage:** Browser `localStorage` for private cookie and recent user management
- **Deployment:** Vercel Serverless Platform

---

## ⚙️ Environment Variables

Configured in Vercel project settings or `.env.local`:

| Variable | Required | What it is |
|---|---|---|
| `GOOGLE_SHEETS_API_KEY` | ✅ | Google Cloud API key with access to Sheets API. |
| `SHEET_ID` | ✅ | Spreadsheet ID from the Google Sheet URL. |
| `SHEET_RANGE` | ✅ | Sheet tab name or range (e.g. `Sheet1` or `Sheet1!A:E`). |
| `LEETCODE_SESSION` | Optional | Fallback session cookie for local development. |
| `LEETCODE_CSRF_TOKEN` | Optional | Fallback CSRF token for local development. |

---

## 📄 License

Distributed under the [MIT License](LICENSE).
