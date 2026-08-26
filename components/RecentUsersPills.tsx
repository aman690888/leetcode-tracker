"use client";

import { useEffect, useState } from "react";

interface Props {
  currentUsername: string;
  onSelectUser: (user: string) => void;
}

const STORAGE_KEY = "lc_recent_usernames";

export function saveRecentUser(username: string) {
  if (typeof window === "undefined" || !username.trim()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(
      (u) => u.toLowerCase() !== username.trim().toLowerCase()
    );
    const updated = [username.trim(), ...filtered].slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function removeRecentUser(username: string) {
  if (typeof window === "undefined" || !username.trim()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const list: string[] = JSON.parse(raw);
    const updated = list.filter(
      (u) => u.toLowerCase() !== username.trim().toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RecentUsersPills({ currentUsername, onSelectUser }: Props) {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecents(parsed);
          return;
        }
      }
    } catch {}
    setRecents([]);
  }, [currentUsername]);

  function handleRemove(e: React.MouseEvent, user: string) {
    e.stopPropagation();
    removeRecentUser(user);
    setRecents((prev) => prev.filter((u) => u !== user));
  }

  // If no username has ever been entered on this device, hide the section completely
  if (!recents || recents.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px",
        marginTop: "10px",
        paddingLeft: "2px",
      }}
    >
      <span
        style={{
          fontSize: "10.5px",
          fontWeight: 600,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginRight: "2px",
        }}
      >
        ⏱️ Recent:
      </span>

      {recents.map((user) => {
        const isCurrent = user.toLowerCase() === currentUsername.toLowerCase();
        return (
          <div
            key={user}
            onClick={() => onSelectUser(user)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 8px 3px 6px",
              borderRadius: "999px",
              backgroundColor: isCurrent ? "rgba(255, 255, 255, 0.12)" : "rgba(10, 14, 28, 0.42)",
              backdropFilter: "blur(16px) saturate(180%)",
              WebkitBackdropFilter: "blur(16px) saturate(180%)",
              border: isCurrent ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid rgba(255, 255, 255, 0.08)",
              color: isCurrent ? "#ffffff" : "#cbd5e1",
              fontSize: "11.5px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!isCurrent) {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isCurrent) {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.backgroundColor = "rgba(10, 14, 28, 0.42)";
              }
            }}
          >
            {/* Subtle avatar circle */}
            <span
              style={{
                width: "15px",
                height: "15px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "8.5px",
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {user.charAt(0).toUpperCase()}
            </span>
            <span>{user}</span>

            {/* Remove from history button */}
            <button
              type="button"
              onClick={(e) => handleRemove(e, user)}
              title="Remove from recent history"
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                fontSize: "10px",
                cursor: "pointer",
                padding: "0 2px",
                marginLeft: "2px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
