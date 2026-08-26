"use client";

import { useState } from "react";
import { DayGroup } from "@/types";
import SpotlightCard from "./SpotlightCard";
import ProblemRow from "./ProblemRow";

interface Props {
  group: DayGroup;
  searchFilter: string;
  statusFilter: "all" | "pending";
}

export default function CosmicDayCard({ group, searchFilter, statusFilter }: Props) {
  const { label, week, kind, problems, solvedCount } = group;
  const total = problems.length;
  const isAllSolved = solvedCount === total && total > 0;
  const [open, setOpen] = useState(true);

  const filteredProblems = problems.filter((p) => {
    if (statusFilter === "pending" && p.solved) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchId = p.id ? p.id.includes(q) : false;
      const matchSlug = p.slug.toLowerCase().includes(q);
      return matchTitle || matchId || matchSlug;
    }

    return true;
  });

  if (filteredProblems.length === 0) return null;

  const sortedProblems = [...filteredProblems].sort((a, b) => {
    if (!a.solved && b.solved) return -1;
    if (a.solved && !b.solved) return 1;
    return 0;
  });

  const pct = total > 0 ? Math.round((solvedCount / total) * 100) : 0;

  return (
    <div style={{ marginBottom: "12px" }}>
      <SpotlightCard
        style={{
          border: isAllSolved ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "rgba(10, 14, 28, 0.36)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
        spotlightColor="rgba(255, 255, 255, 0.05)"
      >
        {/* Header */}
        <div
          onClick={() => setOpen(!open)}
          style={{
            padding: "11px 14px",
            borderBottom: open ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: isAllSolved
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(255, 255, 255, 0.06)",
                border: isAllSolved
                  ? "1px solid rgba(16, 185, 129, 0.25)"
                  : "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                color: isAllSolved ? "#10b981" : "#94a3b8",
              }}
            >
              {isAllSolved ? "✓" : "⚡"}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#f8fafc", margin: 0 }}>
                  {label}
                </h3>
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: isAllSolved ? "#10b981" : "#f59e0b",
                    backgroundColor: isAllSolved ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                    border: isAllSolved ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(245, 158, 11, 0.2)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {isAllSolved ? "Completed" : `${total - solvedCount} Pending`}
                </span>
              </div>
              <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                {kind === "weekend" ? "Weekend Sprint" : `Weekday Milestone • ${week || "Daily"}`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: isAllSolved ? "#10b981" : "#cbd5e1",
                }}
              >
                {solvedCount}/{total} ({pct}%)
              </div>
              <div
                style={{
                  width: "60px",
                  height: "3.5px",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  marginTop: "3px",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: isAllSolved ? "#10b981" : "#94a3b8",
                    borderRadius: "2px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <span style={{ color: "#64748b", fontSize: "11px" }}>
              {open ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {/* Problems List */}
        {open && (
          <div style={{ padding: "8px 12px 4px 12px" }}>
            {sortedProblems.map((p, idx) => (
              <ProblemRow key={`${group.label}-${p.slug}-${p.id || idx}-${idx}`} problem={p} index={idx} />
            ))}
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}
