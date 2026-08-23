"use client";

/**
 * app/page.tsx
 * Main page — client component.
 * Syncs username to URL query param (?user=...) for shareability.
 * Requires LeetCode session cookies in localStorage before allowing queries.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TrackError, TrackResponse } from "@/types";
import ResultsView from "@/components/ResultsView";
import SettingsPanel, {
  loadCreds,
  type StoredCreds,
} from "@/components/SettingsPanel";

// ── Inner component (needs useSearchParams inside Suspense) ───────────────────
function TrackerInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const initialUser  = searchParams.get("user") ?? "";
  const [username,      setUsername]      = useState(initialUser);
  const [inputVal,      setInputVal]      = useState(initialUser);
  const [loading,       setLoading]       = useState(false);
  const [data,          setData]          = useState<TrackResponse | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [isAuthError,   setIsAuthError]   = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [creds,         setCreds]         = useState<StoredCreds | null>(null);
  const [hydrated,      setHydrated]      = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved creds from localStorage on mount
  useEffect(() => {
    const saved = loadCreds();
    setCreds(saved);
    setHydrated(true);
  }, []);

  const runTrack = useCallback(async (user: string, currentCreds: StoredCreds | null) => {
    const trimmed = user.trim();
    if (!trimmed) return;

    if (!currentCreds?.session || !currentCreds?.csrf) {
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    setError(null);
    setIsAuthError(false);
    setData(null);

    // Sync username to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("user", trimmed);
    router.replace(`?${params.toString()}`, { scroll: false });

    // Build request headers from localStorage
    const headers: Record<string, string> = {
      "x-leetcode-session": currentCreds.session,
      "x-leetcode-csrf":    currentCreds.csrf,
    };

    try {
      const res  = await fetch(`/api/track?username=${encodeURIComponent(trimmed)}`, { headers });
      const json = await res.json();
      if (!res.ok) {
        const errJson = json as TrackError;
        setError(errJson.error ?? "Something went wrong.");
        if (errJson.code === "AUTH_EXPIRED" || errJson.code === "AUTH_REQUIRED") {
          setIsAuthError(true);
        }
      } else {
        setData(json as TrackResponse);
        setUsername(trimmed);
      }
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  }, [router, searchParams]);

  // Auto-run on load if user param in URL AND creds exist
  useEffect(() => {
    if (initialUser) {
      const saved = loadCreds();
      setCreds(saved);
      if (saved?.session && saved?.csrf) {
        runTrack(initialUser, saved);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runTrack(inputVal, creds);
  }

  function handleCredsChange(newCreds: StoredCreds | null) {
    setCreds(newCreds);
    if (newCreds?.session && newCreds?.csrf && inputVal.trim()) {
      runTrack(inputVal, newCreds);
    }
  }

  const hasCreds = Boolean(creds?.session && creds?.csrf);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom:   "1px solid var(--border)",
        padding:        "12px 24px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "16px",
      }}>
        <span style={{
          fontFamily:    "var(--font-mono)",
          fontSize:      "13px",
          color:         "var(--text-muted)",
          letterSpacing: "0.02em",
        }}>
          <span style={{ color: "var(--green)" }}>~/</span>tracker.sh
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {data && !loading && (
            <button
              onClick={() => runTrack(username, creds)}
              disabled={loading}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize:   "12px",
                color:      "var(--blue)",
                background: "none",
                border:     "none",
                cursor:     "pointer",
                padding:    "4px 0",
                transition: "color 0.15s",
              }}
            >
              ↺ refresh
            </button>
          )}

          {/* Settings gear */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Session config"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize:   "12px",
              color:      hasCreds ? "var(--green)" : "var(--amber)",
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    "4px 0",
              transition: "color 0.15s",
              display:    "flex",
              alignItems: "center",
              gap:        "5px",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = hasCreds ? "var(--green)" : "var(--amber)";
            }}
          >
            ⚙{" "}
            <span style={{ fontSize: "11px" }}>
              {hasCreds ? "session ●" : "config !"}
            </span>
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main style={{
        flex:      1,
        maxWidth:  "760px",
        width:     "100%",
        margin:    "0 auto",
        padding:   "40px 24px 80px",
      }}>

        {/* ── Header Title ─────────────────────────────────────────────────── */}
        {!data && !loading && !error && (
          <div style={{ marginBottom: "28px" }}>
            <h1 style={{
              fontSize:      "22px",
              fontWeight:    600,
              color:         "var(--text-primary)",
              marginBottom:  "6px",
              letterSpacing: "-0.01em",
            }}>
              DSA Assignment Tracker
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              Track assigned class problems against your full LeetCode solved history.
            </p>
          </div>
        )}

        {/* ── State 1: Setup required card when no cookies configured ──────── */}
        {hydrated && !hasCreds && (
          <section style={{
            background:   "var(--bg-surface)",
            border:       "1px solid var(--border)",
            borderLeft:   "3px solid var(--amber)",
            borderRadius: "6px",
            padding:      "24px",
            marginBottom: "32px",
          }}>
            <div style={{
              display:       "flex",
              alignItems:    "center",
              gap:           "8px",
              fontFamily:    "var(--font-mono)",
              fontSize:      "12px",
              color:         "var(--amber)",
              marginBottom:  "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              <span>$ auth required</span>
            </div>

            <h2 style={{
              fontSize:     "16px",
              fontWeight:   600,
              color:        "var(--text-primary)",
              marginBottom: "8px",
            }}>
              LeetCode session setup required
            </h2>

            <p style={{
              fontSize:     "13px",
              color:        "var(--text-secondary)",
              lineHeight:   "1.6",
              marginBottom: "20px",
            }}>
              To accurately track your complete solve history across all assignments,
              connect your LeetCode session cookies. This takes 1 minute and is stored
              only in your own browser.
            </p>

            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                background:   "var(--green)",
                color:        "#0d1117",
                border:       "none",
                borderRadius: "4px",
                fontWeight:   600,
                fontSize:     "13px",
                fontFamily:   "var(--font-mono)",
                padding:      "10px 20px",
                cursor:       "pointer",
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "8px",
                transition:   "opacity 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              ⚙ Configure Session Cookies →
            </button>

            <div style={{
              marginTop:  "16px",
              fontSize:   "11px",
              fontFamily: "var(--font-mono)",
              color:      "var(--text-muted)",
            }}>
              ⏱ 1-min setup · 🔒 Stored in browser localStorage only · 🔄 No password needed
            </div>
          </section>
        )}

        {/* ── State 2: Search form (unlocked when cookies configured) ───────── */}
        {hasCreds && (
          <section style={{ marginBottom: data || error ? "40px" : "0" }}>
            <form onSubmit={handleSubmit}>
              <div style={{
                display:      "flex",
                alignItems:   "center",
                border:       "1px solid var(--border)",
                borderRadius: "6px",
                background:   "var(--bg-surface)",
                overflow:     "hidden",
              }}>
                {/* Terminal prompt prefix */}
                <span style={{
                  fontFamily:  "var(--font-mono)",
                  fontSize:    "13px",
                  color:       "var(--text-muted)",
                  padding:     "0 12px",
                  borderRight: "1px solid var(--border)",
                  whiteSpace:  "nowrap",
                  userSelect:  "none",
                  lineHeight:  "42px",
                }}>
                  $ user
                </span>

                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="your-leetcode-username"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  style={{
                    flex:       1,
                    background: "transparent",
                    border:     "none",
                    outline:    "none",
                    color:      "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                    fontSize:   "13px",
                    padding:    "0 14px",
                    height:     "42px",
                    minWidth:   0,
                  }}
                />

                <button
                  type="submit"
                  disabled={loading || !inputVal.trim()}
                  style={{
                    height:     "42px",
                    padding:    "0 18px",
                    background: loading ? "var(--bg-elevated)" : "var(--green)",
                    color:      loading ? "var(--text-muted)" : "#0d1117",
                    border:     "none",
                    fontWeight: 600,
                    fontSize:   "13px",
                    cursor:     loading || !inputVal.trim() ? "default" : "pointer",
                    transition: "background 0.15s",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {loading ? "running..." : "run →"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && (
          <div style={{
            color:      "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            fontSize:   "13px",
            display:    "flex",
            alignItems: "center",
            gap:        "8px",
          }}>
            <Blink />fetching sheet &amp; LeetCode data...
          </div>
        )}

        {/* ── Error / Auth Expired State ────────────────────────────────────── */}
        {error && !loading && (
          <div style={{
            padding:      "16px",
            background:   isAuthError ? "rgba(227, 179, 65, 0.08)" : "rgba(248, 81, 73, 0.08)",
            border:       `1px solid ${isAuthError ? "rgba(227, 179, 65, 0.3)" : "rgba(248, 81, 73, 0.3)"}`,
            borderLeft:   `3px solid ${isAuthError ? "var(--amber)" : "var(--red)"}`,
            borderRadius: "6px",
            marginBottom: "24px",
          }}>
            <div style={{
              fontFamily:   "var(--font-mono)",
              fontSize:     "13px",
              color:        isAuthError ? "var(--amber)" : "var(--red)",
              marginBottom: isAuthError ? "12px" : "0",
            }}>
              <span style={{ opacity: 0.7 }}>error: </span>{error}
            </div>

            {isAuthError && (
              <button
                onClick={() => setSettingsOpen(true)}
                style={{
                  background:   "none",
                  border:       "1px solid var(--amber)",
                  borderRadius: "4px",
                  color:        "var(--amber)",
                  fontFamily:   "var(--font-mono)",
                  fontSize:     "12px",
                  padding:      "6px 14px",
                  cursor:       "pointer",
                  transition:   "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(227,179,65,0.15)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
              >
                ⚙ Refresh Session Cookies →
              </button>
            )}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {data && !loading && (
          <ResultsView data={data} />
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop:      "1px solid var(--border)",
        padding:        "16px 24px",
        marginTop:      "auto",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        flexWrap:       "wrap",
        gap:            "12px",
        fontSize:       "12px",
        fontFamily:     "var(--font-mono)",
        color:          "var(--text-muted)",
      }}>
        <span>
          tracker.sh <span style={{ color: "var(--border)" }}>·</span> open source
        </span>
        <span>
          built by{" "}
          <a
            href="https://github.com/aman690888"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color:          "var(--text-secondary)",
              textDecoration: "none",
              transition:     "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--blue)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)"; }}
          >
            Aman Rawat ↗
          </a>
        </span>
      </footer>

      {/* ── Settings panel ──────────────────────────────────────────────────── */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onCredsChange={handleCredsChange}
      />
    </div>
  );
}

// Blinking cursor
function Blink() {
  return (
    <span style={{
      display:       "inline-block",
      width:         "8px",
      height:        "13px",
      background:    "var(--green)",
      verticalAlign: "middle",
      animation:     "blink 1s step-end infinite",
    }} />
  );
}

// Wrap in Suspense — required for useSearchParams
export default function Page() {
  return (
    <Suspense>
      <TrackerInner />
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </Suspense>
  );
}
