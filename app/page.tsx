"use client";

/**
 * app/page.tsx
 * Main page — client component.
 * Syncs username to URL query param (?user=...) for shareability.
 * Loads LeetCode session creds from localStorage and sends them as
 * request headers to /api/track — never stored server-side.
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
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [creds,         setCreds]         = useState<StoredCreds | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved creds from localStorage on mount
  useEffect(() => {
    setCreds(loadCreds());
  }, []);

  const runTrack = useCallback(async (user: string, currentCreds: StoredCreds | null) => {
    const trimmed = user.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setData(null);

    // Sync username to URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("user", trimmed);
    router.replace(`?${params.toString()}`, { scroll: false });

    // Build request headers — session creds from localStorage take priority
    // over server-side env vars.  Values are never logged.
    const headers: Record<string, string> = {};
    if (currentCreds?.session && currentCreds?.csrf) {
      headers["x-leetcode-session"] = currentCreds.session;
      headers["x-leetcode-csrf"]    = currentCreds.csrf;
    }

    try {
      const res  = await fetch(`/api/track?username=${encodeURIComponent(trimmed)}`, { headers });
      const json = await res.json();
      if (!res.ok) {
        setError((json as TrackError).error ?? "Something went wrong.");
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

  // Auto-run on load if user param in URL
  useEffect(() => {
    if (initialUser) {
      const saved = loadCreds();
      setCreds(saved);
      runTrack(initialUser, saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runTrack(inputVal, creds);
  }

  function handleCredsChange(newCreds: StoredCreds | null) {
    setCreds(newCreds);
  }

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

          {/* Settings gear — always visible */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Session config"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize:   "12px",
              color:      creds ? "var(--green)" : "var(--text-muted)",
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
              if (!creds) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = creds ? "var(--green)" : "var(--text-muted)";
            }}
          >
            ⚙{" "}
            <span style={{ fontSize: "11px" }}>
              {creds ? "session ●" : "config"}
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

        {/* ── Search form ──────────────────────────────────────────────────── */}
        <section style={{ marginBottom: data || error ? "40px" : "0" }}>
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
                Enter your LeetCode username to see which assigned problems you&apos;ve solved.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{
              display:    "flex",
              alignItems: "center",
              border:     "1px solid var(--border)",
              borderRadius: "6px",
              background: "var(--bg-surface)",
              overflow:   "hidden",
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

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div style={{
            padding:      "14px 16px",
            background:   "rgba(248, 81, 73, 0.08)",
            border:       "1px solid rgba(248, 81, 73, 0.3)",
            borderRadius: "6px",
            fontFamily:   "var(--font-mono)",
            fontSize:     "13px",
            color:        "var(--red)",
          }}>
            <span style={{ opacity: 0.6 }}>error: </span>{error}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {data && !loading && (
          <ResultsView
            data={data}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
      </main>

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
      display:     "inline-block",
      width:       "8px",
      height:      "13px",
      background:  "var(--green)",
      verticalAlign: "middle",
      animation:   "blink 1s step-end infinite",
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
