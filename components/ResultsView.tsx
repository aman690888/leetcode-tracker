"use client";

/**
 * components/ResultsView.tsx
 * Summary stats + progress bar + grouped problem list.
 */

import { useState } from "react";
import { TrackResponse } from "@/types";
import ProblemGroup from "./ProblemGroup";

// ── Warning banner shown when running without auth cookies ─────────────────────
function LimitedModeBanner({
  message,
  onOpenSettings,
}: {
  message: string;
  onOpenSettings: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      padding:      "10px 14px",
      marginBottom: "24px",
      background:   "rgba(227, 179, 65, 0.07)",
      border:       "1px solid rgba(227, 179, 65, 0.25)",
      borderLeft:   "3px solid var(--amber)",
      borderRadius: "4px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
        <span style={{ color: "var(--amber)", fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>⚠</span>
        <span style={{
          flex:       1,
          fontFamily: "var(--font-mono)",
          fontSize:   "12px",
          color:      "var(--text-secondary)",
          lineHeight: "1.6",
        }}>
          {message}
        </span>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss warning"
          style={{
            background: "none",
            border:     "none",
            color:      "var(--text-muted)",
            cursor:     "pointer",
            fontSize:   "16px",
            flexShrink: 0,
            padding:    "0 2px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {/* Inline CTA to open settings */}
      <div style={{ marginTop: "6px", paddingLeft: "23px" }}>
        <button
          onClick={onOpenSettings}
          style={{
            background:    "none",
            border:        "none",
            padding:       0,
            fontFamily:    "var(--font-mono)",
            fontSize:      "11px",
            color:         "var(--blue)",
            cursor:        "pointer",
            textDecoration: "underline",
            textUnderlineOffset: "2px",
          }}
        >
          ⚙ Add session cookies for full history →
        </button>
      </div>
    </div>
  );
}

interface Props {
  data: TrackResponse;
  onOpenSettings: () => void;
}

export default function ResultsView({ data, onOpenSettings }: Props) {
  const [showCompleted, setShowCompleted] = useState(false);
  const {
    totalSolved, totalAssigned, percentage, groups,
    username, fetchedAt, solveMode, solveModeWarning,
  } = data;

  const pending     = totalAssigned - totalSolved;
  const fetchedTime = new Date(fetchedAt).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });

  // Filter groups based on toggle
  const visibleGroups = showCompleted
    ? groups
    : groups.filter((g) => g.problems.some((p) => !p.solved));

  const allDone = pending === 0;

  return (
    <div>
      {/* ── Limited-mode warning banner ────────────────────────────────────── */}
      {solveMode === "limited" && solveModeWarning && (
        <LimitedModeBanner message={solveModeWarning} onOpenSettings={onOpenSettings} />
      )}
      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: "32px" }}>
        {/* Stats row */}
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "32px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}>
          <Stat
            value={totalSolved.toString()}
            label="solved"
            valueColor="var(--green)"
          />
          <Stat
            value={totalAssigned.toString()}
            label="assigned"
            valueColor="var(--text-primary)"
          />
          <Stat
            value={`${pending}`}
            label="pending"
            valueColor={allDone ? "var(--green)" : "var(--amber)"}
          />
          <Stat
            value={`${percentage}%`}
            label="complete"
            valueColor="var(--text-primary)"
          />
        </div>

        {/* Progress bar */}
        <div style={{
          height: "4px",
          background: "var(--bg-elevated)",
          borderRadius: "2px",
          overflow: "hidden",
        }}>
          <div
            className="fill-bar"
            style={{
              height: "100%",
              width: `${percentage}%`,
              background: allDone ? "var(--green)" : "var(--amber)",
              borderRadius: "2px",
            }}
          />
        </div>

        {/* Meta row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}>
            @{username} · fetched {fetchedTime}
          </span>

          {/* Show/hide completed toggle */}
          {!allDone && (
            <button
              onClick={() => setShowCompleted((v) => !v)}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                padding: "3px 10px",
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--text-secondary)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }}
            >
              {showCompleted ? "hide completed" : "show completed"}
            </button>
          )}
        </div>
      </section>

      {/* ── All done state ────────────────────────────────────────────────── */}
      {allDone && (
        <div style={{
          padding: "24px",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          background: "var(--bg-surface)",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            color: "var(--green)",
            marginBottom: "4px",
          }}>
            All {totalAssigned} problems solved.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
            Nothing left to do here.
          </p>
        </div>
      )}

      {/* ── Divider + label ──────────────────────────────────────────────── */}
      {!allDone && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}>
            {showCompleted ? "all problems" : "pending only"}
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>
      )}

      {/* ── Problem groups ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {visibleGroups.map((group, i) => (
          <ProblemGroup
            key={`${group.label}-${group.kind}-${i}`}
            group={group}
            showCompleted={showCompleted}
          />
        ))}
      </div>
    </div>
  );
}

// ── Stat block ─────────────────────────────────────────────────────────────────
function Stat({
  value,
  label,
  valueColor,
}: {
  value: string;
  label: string;
  valueColor: string;
}) {
  return (
    <div>
      <div style={{
        fontSize: "32px",
        fontWeight: 700,
        lineHeight: 1,
        color: valueColor,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: "11px",
        color: "var(--text-muted)",
        marginTop: "4px",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}>
        {label}
      </div>
    </div>
  );
}
