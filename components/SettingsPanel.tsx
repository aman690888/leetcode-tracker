"use client";

/**
 * components/SettingsPanel.tsx
 *
 * Lightweight modal for storing LeetCode session cookies in localStorage.
 * Values are NEVER logged, NEVER sent anywhere except this app's own /api/track
 * route as request headers, and NEVER persisted server-side.
 */

import { useEffect, useState } from "react";

export interface StoredCreds {
  session: string;
  csrf: string;
}

export const CREDS_STORAGE_KEY = "lc_tracker_creds";

// ── localStorage helpers (safe for SSR) ───────────────────────────────────────
export function loadCreds(): StoredCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCreds;
    return parsed.session && parsed.csrf ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCreds(creds: StoredCreds): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(creds));
  } catch { /* quota exceeded — silent */ }
}

export function clearCreds(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CREDS_STORAGE_KEY);
  } catch { /* silent */ }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with null when creds are cleared */
  onCredsChange: (creds: StoredCreds | null) => void;
}

export default function SettingsPanel({ open, onClose, onCredsChange }: Props) {
  const [session,     setSession]     = useState("");
  const [csrf,        setCsrf]        = useState("");
  const [showSession, setShowSession] = useState(false);
  const [showCsrf,    setShowCsrf]    = useState(false);
  const [hasSaved,    setHasSaved]    = useState(false);
  const [saved,       setSaved]       = useState(false); // brief success flash

  // Load existing saved values whenever the panel opens
  useEffect(() => {
    if (!open) { setSaved(false); return; }
    const existing = loadCreds();
    if (existing) {
      setSession(existing.session);
      setCsrf(existing.csrf);
      setHasSaved(true);
    } else {
      setSession("");
      setCsrf("");
      setHasSaved(false);
    }
    setShowSession(false);
    setShowCsrf(false);
  }, [open]);

  if (!open) return null;

  const canSave = session.trim().length > 10 && csrf.trim().length > 4;

  function handleSave() {
    const creds: StoredCreds = { session: session.trim(), csrf: csrf.trim() };
    saveCreds(creds);
    onCredsChange(creds);
    setHasSaved(true);
    setSaved(true);
    setTimeout(onClose, 600);
  }

  function handleClear() {
    clearCreds();
    onCredsChange(null);
    setSession("");
    setCsrf("");
    setHasSaved(false);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 40,
          backdropFilter: "blur(1px)",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Session config"
        style={{
          position:  "fixed",
          top:       "50%",
          left:      "50%",
          transform: "translate(-50%, -50%)",
          zIndex:    50,
          width:     "min(480px, calc(100vw - 32px))",
          background: "var(--bg-surface)",
          border:    "1px solid var(--border)",
          borderRadius: "6px",
          overflow:  "hidden",
        }}
      >
        {/* Title bar */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "10px 16px",
          borderBottom:   "1px solid var(--border)",
          background:     "var(--bg-elevated)",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize:   "12px",
            color:      "var(--text-secondary)",
          }}>
            <span style={{ color: "var(--green)" }}>$</span> session config
            {hasSaved && (
              <span style={{
                marginLeft:      "10px",
                display:         "inline-block",
                width:           "6px",
                height:          "6px",
                borderRadius:    "50%",
                background:      "var(--green)",
                verticalAlign:   "middle",
                position:        "relative",
                top:             "-1px",
              }} title="Cookies saved" />
            )}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border:     "none",
              color:      "var(--text-muted)",
              cursor:     "pointer",
              fontSize:   "18px",
              lineHeight: 1,
              padding:    "0 2px",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {/* LEETCODE_SESSION input */}
          <CredField
            label="LEETCODE_SESSION"
            value={session}
            onChange={setSession}
            show={showSession}
            onToggleShow={() => setShowSession((v) => !v)}
            placeholder="eyJ0eXAiOiJKV1Q…"
          />

          {/* CSRFTOKEN input */}
          <CredField
            label="CSRFTOKEN"
            value={csrf}
            onChange={setCsrf}
            show={showCsrf}
            onToggleShow={() => setShowCsrf((v) => !v)}
            placeholder="abc123def456…"
          />

          {/* Instructions */}
          <p style={{
            fontFamily:  "var(--font-mono)",
            fontSize:    "11px",
            color:       "var(--text-muted)",
            lineHeight:  "1.7",
            marginBottom: "20px",
          }}>
            <span style={{ color: "var(--amber)", fontWeight: 600 }}>Required:</span> Enables accurate, full-history solved matching for your account.
            <br />
            Source:{" "}
            <span style={{ color: "var(--text-secondary)" }}>leetcode.com</span>
            {" "}(logged in) → F12 → Application → Cookies →{" "}
            <span style={{ color: "var(--text-secondary)" }}>https://leetcode.com</span>
            <br />
            Stored in <span style={{ color: "var(--text-secondary)" }}>localStorage</span> only.
            Sent only to this app&apos;s own <span style={{ color: "var(--text-secondary)" }}>/api/track</span> route.
          </p>

          {/* Action row */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            gap:            "12px",
          }}>
            {hasSaved ? (
              <DangerBtn onClick={handleClear}>clear saved</DangerBtn>
            ) : <div />}

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saved}
              style={{
                background:   saved ? "var(--bg-elevated)" : canSave ? "var(--green)" : "var(--bg-elevated)",
                border:       "none",
                borderRadius: "4px",
                color:        saved ? "var(--green)" : canSave ? "#0d1117" : "var(--text-muted)",
                fontFamily:   "var(--font-mono)",
                fontSize:     "12px",
                fontWeight:   600,
                padding:      "7px 22px",
                cursor:       canSave && !saved ? "pointer" : "default",
                transition:   "background 0.15s, color 0.15s",
                minWidth:     "72px",
              }}
            >
              {saved ? "saved ✓" : "save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function CredField({
  label, value, onChange, show, onToggleShow, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  placeholder: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{
        display:       "block",
        fontFamily:    "var(--font-mono)",
        fontSize:      "11px",
        color:         "var(--text-muted)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom:  "6px",
      }}>
        {label}
      </label>
      <div style={{
        display:      "flex",
        border:       "1px solid var(--border)",
        borderRadius: "4px",
        overflow:     "hidden",
        transition:   "border-color 0.15s",
      }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          style={{
            flex:       1,
            background: "var(--bg-base)",
            border:     "none",
            outline:    "none",
            color:      "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize:   "12px",
            padding:    "8px 12px",
            minWidth:   0,
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{
            background:  "var(--bg-elevated)",
            border:      "none",
            borderLeft:  "1px solid var(--border)",
            color:       "var(--text-muted)",
            cursor:      "pointer",
            fontFamily:  "var(--font-mono)",
            fontSize:    "11px",
            padding:     "0 12px",
            flexShrink:  0,
            transition:  "color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
        >
          {show ? "hide" : "show"}
        </button>
      </div>
    </div>
  );
}

function DangerBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background:   "none",
        border:       "1px solid var(--border)",
        borderRadius: "4px",
        color:        "var(--text-muted)",
        fontFamily:   "var(--font-mono)",
        fontSize:     "12px",
        padding:      "7px 14px",
        cursor:       "pointer",
        transition:   "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = "var(--red)";
        b.style.borderColor = "rgba(248,81,73,0.5)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = "var(--text-muted)";
        b.style.borderColor = "var(--border)";
      }}
    >
      {children}
    </button>
  );
}
