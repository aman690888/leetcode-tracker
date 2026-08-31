"use client";

import BorderGlow from "@/components/BorderGlow";
import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrackError, TrackResponse } from "@/types";
import { loadCreds, type StoredCreds } from "@/components/SettingsPanel";
import BeamsBackground from "@/components/BeamsBackground";
import ShimmerButton from "@/components/ShimmerButton";
import AnimatedSettingsModal from "@/components/AnimatedSettingsModal";
import ResultsView from "@/components/ResultsView";
import RecentUsersPills, { saveRecentUser } from "@/components/RecentUsersPills";
import RocketIcon from "@/components/RocketIcon";
import MagnifierIcon from "@/components/MagnifierIcon";

function MainTrackerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialUser = searchParams.get("user") ?? "";
  const [username, setUsername] = useState(initialUser);
  const [inputVal, setInputVal] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);
  const [isUserNotFoundError, setIsUserNotFoundError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creds, setCreds] = useState<StoredCreds | null>(null);

  useEffect(() => {
    const saved = loadCreds();
    setCreds(saved);
  }, []);

  const runTrack = useCallback(
    async (user: string, currentCreds: StoredCreds | null) => {
      const trimmed = user.trim();
      if (!trimmed) return;

      if (!currentCreds?.session || !currentCreds?.csrf) {
        setSettingsOpen(true);
        return;
      }

      setLoading(true);
      setError(null);
      setIsAuthError(false);
      setIsUserNotFoundError(false);

      router.replace(`?user=${encodeURIComponent(trimmed)}`, { scroll: false });
      saveRecentUser(trimmed);

      const headers: Record<string, string> = {
        "x-leetcode-session": currentCreds.session,
        "x-leetcode-csrf": currentCreds.csrf,
      };

      try {
        const res = await fetch(`/api/track?username=${encodeURIComponent(trimmed)}`, { headers });
        let json: (TrackResponse & TrackError) | null = null;
        try {
          json = await res.json();
        } catch {
          // Response body was not valid JSON
        }

        if (!res.ok) {
          if (res.status === 404 || json?.code === "USER_NOT_FOUND") {
            const msg = json?.error || "LeetCode username not found — please check the spelling";
            setError(msg);
            setIsUserNotFoundError(true);
          } else {
            const errJson = json as TrackError | null;
            setError(errJson?.error ?? "Failed to fetch student progress.");
            if (errJson?.code === "AUTH_EXPIRED" || errJson?.code === "AUTH_REQUIRED") {
              setIsAuthError(true);
            }
          }
        } else if (json) {
          setData(json as TrackResponse);
          setUsername(trimmed);
          setInputVal(trimmed);
        }
      } catch {
        setError("Network error — could not reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    if (initialUser) {
      const saved = loadCreds();
      setCreds(saved);
      if (saved?.session && saved?.csrf) {
        runTrack(initialUser, saved);
      }
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runTrack(inputVal, creds);
  }

  function handleSelectRecent(selectedUser: string) {
    setInputVal(selectedUser);
    runTrack(selectedUser, creds);
  }

  function handleCredsChange(newCreds: StoredCreds | null) {
    setCreds(newCreds);
    if (newCreds?.session && newCreds?.csrf && inputVal.trim()) {
      runTrack(inputVal, newCreds);
    }
  }

  const hasCreds = Boolean(creds?.session && creds?.csrf);
  const hasResults = Boolean(data && !loading);

  return (
    <div
      style={{
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        backgroundColor: "#030712",
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* ── Beams Background ──────────────────────────────────────────────── */}
      <BeamsBackground />

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header
        style={{
          flexShrink: 0,
          zIndex: 40,
          backgroundColor: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "-0.01em", color: "#f8fafc" }}>
              DSA ASSIGNMENT TRACKER
            </div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8" }}>
              Live LeetCode & Google Sheets Telemetry
            </div>
          </div>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            backgroundColor: hasCreds ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
            border: hasCreds ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "6px",
            color: hasCreds ? "#10b981" : "#f59e0b",
            fontSize: "11.5px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ fontSize: "10px" }}>{hasCreds ? "●" : "○"}</span>
          {hasCreds ? "Session Connected" : "Connect Session"}
        </button>
      </header>

      {/* ── Main Dynamic Stage (Locked to Viewport Height) ─────────────────── */}
      <main
        style={{
          width: "100%",
          maxWidth: hasResults ? "1140px" : "600px",
          margin: "0 auto",
          padding: hasResults ? "16px 20px 16px 20px" : "0 20px",
          position: "relative",
          zIndex: 10,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: hasResults ? "flex-start" : "center",
          overflow: "hidden",
          transition: "max-width 0.4s cubic-bezier(0.16, 1, 0.3, 1), padding 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Centered Hero Stage (Visible when no data loaded) */}
        {!hasResults && !loading && (
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
              animation: "fadeIn 0.5s ease",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                marginBottom: "14px",
                boxShadow: "0 0 24px rgba(255, 255, 255, 0.1)",
              }}
            >
              ⚡
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "#ffffff",
                margin: "0 0 8px 0",
              }}
            >
              Track DSA Assignments
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#94a3b8",
                margin: 0,
                maxWidth: "440px",
                marginInline: "auto",
                lineHeight: 1.5,
              }}
            >
              Search any student handle to load the interactive problem matrix, pending tasks, and curriculum progress.
            </p>
          </div>
        )}

        {/* Search Bar Container (Static Header on top) */}
        <div
          style={{
            marginBottom: hasResults ? "12px" : "28px",
            width: "100%",
            flexShrink: 0,
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px" }}>
            <BorderGlow
              borderRadius="10px"
              glowColor={isUserNotFoundError ? "rgba(239, 68, 68, 0.85)" : "rgba(56, 189, 248, 0.75)"}
              glowRadius={160}
              style={{ position: "relative", flex: 1 }}
            >
              <input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  if (error) setError(null);
                  if (isUserNotFoundError) setIsUserNotFoundError(false);
                }}
                placeholder="Enter LeetCode username..."
                disabled={loading}
                aria-invalid={isUserNotFoundError ? "true" : undefined}
                aria-describedby={error ? "username-error-msg" : undefined}
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 16px 0 40px",
                  backgroundColor: "rgba(10, 14, 28, 0.45)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: isUserNotFoundError
                    ? "1px solid rgba(239, 68, 68, 0.55)"
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  color: "#f8fafc",
                  fontSize: "13.5px",
                  outline: "none",
                  boxShadow: isUserNotFoundError
                    ? "0 0 16px rgba(239, 68, 68, 0.25)"
                    : "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = isUserNotFoundError
                    ? "rgba(239, 68, 68, 0.85)"
                    : "rgba(255, 255, 255, 0.35)";
                  e.currentTarget.style.boxShadow = isUserNotFoundError
                    ? "0 0 0 1px rgba(239, 68, 68, 0.5)"
                    : "0 0 0 1px rgba(255, 255, 255, 0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isUserNotFoundError
                    ? "rgba(239, 68, 68, 0.55)"
                    : "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.boxShadow = isUserNotFoundError
                    ? "0 0 16px rgba(239, 68, 68, 0.25)"
                    : "none";
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <MagnifierIcon size={16} color={isUserNotFoundError ? "#f87171" : "#64748b"} />
              </span>
            </BorderGlow>

            <ShimmerButton
              type="submit"
              variant="primary"
              disabled={loading || !inputVal.trim()}
              style={{
                height: "42px",
                padding: "0 18px",
                borderRadius: "10px",
              }}
            >
              <RocketIcon isLaunching={loading} size={15} />
              <span>{loading ? "Tracking..." : "Track"}</span>
            </ShimmerButton>
          </form>

          {/* ⚠️ Clear Error Banner near username input */}
          {error && (
            <div
              id="username-error-msg"
              role="alert"
              aria-live="assertive"
              style={{
                marginTop: "10px",
                padding: "10px 14px",
                backgroundColor: isUserNotFoundError ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.08)",
                border: isUserNotFoundError ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(239, 68, 68, 0.25)",
                borderRadius: "8px",
                color: isUserNotFoundError ? "#fca5a5" : "#f87171",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                animation: "fadeIn 0.2s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <span style={{ fontSize: "14px", flexShrink: 0 }}>
                  {isUserNotFoundError ? "🔍" : "⚠️"}
                </span>
                <span style={{ lineHeight: 1.4 }}>
                  {error}
                </span>
              </div>
              {isAuthError && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "5px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Re-Authenticate
                </button>
              )}
            </div>
          )}

          {/* ⏱️ Recent Students Quick-Switch Pills */}
          <RecentUsersPills
            currentUsername={username}
            onSelectUser={handleSelectRecent}
          />
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "13.5px",
              flex: 1,
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "2px solid rgba(255, 255, 255, 0.1)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                margin: "0 auto 12px auto",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Querying LeetCode GraphQL & Aligning Matrix...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Populated Results View (Takes remaining viewport height with internal scroll) */}
        {hasResults && (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", animation: "fadeIn 0.3s ease" }}>
            <ResultsView
              data={data!}
              onRefresh={() => runTrack(username, creds)}
              loading={loading}
            />
          </div>
        )}
      </main>

      <AnimatedSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onCredsChange={handleCredsChange}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default function TrackerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#94a3b8" }}>Loading Tracker...</div>}>
      <MainTrackerInner />
    </Suspense>
  );
}
