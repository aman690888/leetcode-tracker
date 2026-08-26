"use client";

import { useEffect, useState } from "react";
import { loadCreds, saveCreds, clearCreds, type StoredCreds } from "./SettingsPanel";
import SpotlightCard from "./SpotlightCard";

interface Props {
  open: boolean;
  onClose: () => void;
  onCredsChange: (creds: StoredCreds | null) => void;
}

export default function AnimatedSettingsModal({ open, onClose, onCredsChange }: Props) {
  const [session, setSession] = useState("");
  const [csrf, setCsrf] = useState("");
  const [showValues, setShowValues] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const current = loadCreds();
      if (current) {
        setSession(current.session);
        setCsrf(current.csrf);
        setSaved(true);
      } else {
        setSession("");
        setCsrf("");
        setSaved(false);
      }
    }
  }, [open]);

  if (!open) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const s = session.trim();
    const c = csrf.trim();
    if (!s || !c) return;

    const creds: StoredCreds = { session: s, csrf: c };
    saveCreds(creds);
    setSaved(true);
    onCredsChange(creds);
    onClose();
  }

  function handleClear() {
    clearCreds();
    setSession("");
    setCsrf("");
    setSaved(false);
    onCredsChange(null);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "16px",
        animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: "500px" }}>
        <SpotlightCard
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.2)",
          }}
          spotlightColor="rgba(236, 72, 153, 0.2)"
        >
          {/* Header */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  boxShadow: "0 0 14px rgba(99, 102, 241, 0.5)",
                }}
              >
                ✨
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                  Connect LeetCode Session
                </h2>
                <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0 0" }}>
                  {saved ? "Active in browser cache" : "Authenticate GraphQL solve stream"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "20px",
                lineHeight: 1,
                padding: "4px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSave} style={{ padding: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#cbd5e1",
                    marginBottom: "6px",
                  }}
                >
                  LEETCODE_SESSION Cookie
                </label>
                <input
                  type={showValues ? "text" : "password"}
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "rgba(3, 7, 18, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    fontFamily: "ui-monospace, monospace",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow = "0 0 12px rgba(99, 102, 241, 0.4)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#cbd5e1",
                    marginBottom: "6px",
                  }}
                >
                  csrftoken Cookie
                </label>
                <input
                  type={showValues ? "text" : "password"}
                  value={csrf}
                  onChange={(e) => setCsrf(e.target.value)}
                  placeholder="uF1B0..."
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "rgba(3, 7, 18, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    fontFamily: "ui-monospace, monospace",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#ec4899";
                    e.currentTarget.style.boxShadow = "0 0 12px rgba(236, 72, 153, 0.4)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "16px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showValues}
                  onChange={(e) => setShowValues(e.target.checked)}
                  style={{ accentColor: "#6366f1" }}
                />
                Show token strings
              </label>

              {saved && (
                <button
                  type="button"
                  onClick={handleClear}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#f43f5e",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  Clear & Disconnect
                </button>
              )}
            </div>

            {/* Quick Helper */}
            <div
              style={{
                marginTop: "18px",
                padding: "12px 16px",
                backgroundColor: "rgba(3, 7, 18, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "8px",
                fontSize: "11.5px",
                color: "#94a3b8",
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>Instructions: </span>
              F12 on leetcode.com → Application tab → Cookies → Copy <code style={{ color: "#ec4899" }}>LEETCODE_SESSION</code> & <code style={{ color: "#6366f1" }}>csrftoken</code>.
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "9px 16px",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#94a3b8",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "9px 22px",
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Save & Synchronize ✨
              </button>
            </div>
          </form>
        </SpotlightCard>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
