"use client";

import BorderGlow from "./BorderGlow";
import { useState } from "react";
import { DayGroup, Problem } from "@/types";
import { getProblemMeta } from "./problemMeta";

interface Props {
  groups: DayGroup[];
}

export default function QuestHeatmapGrid({ groups }: Props) {
  const [hoveredProblem, setHoveredProblem] = useState<{
    problem: Problem;
    dayLabel: string;
    idx: number;
  } | null>(null);

  const allProblems: Array<{ problem: Problem; dayLabel: string }> = [];
  groups.forEach((g) => {
    g.problems.forEach((p) => {
      allProblems.push({ problem: p, dayLabel: g.label });
    });
  });

  const total = allProblems.length;
  const solved = allProblems.filter((x) => x.problem.solved).length;

  return (
    <BorderGlow
      borderRadius="14px"
      glowColor="rgba(56, 189, 248, 0.7)"
      glowRadius={160}
      style={{
        backgroundColor: "rgba(10, 14, 28, 0.42)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        padding: "16px",
        marginBottom: "16px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px" }}>🗺️</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Quest Matrix
          </span>
          <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "ui-monospace, monospace" }}>
            ({solved}/{total})
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "10.5px", color: "#94a3b8" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "#10b981" }} />
            Solved
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)" }} />
            Pending
          </span>
        </div>
      </div>

      {/* Matrix Grid (Compact 10-column or responsive for sidebar) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(20px, 1fr))",
          gap: "5px",
        }}
      >
        {allProblems.map(({ problem, dayLabel }, idx) => {
          const isSolved = problem.solved;
          return (
            <a
              key={`matrix-${dayLabel}-${problem.slug}-${problem.id || idx}-${idx}`}
              href={problem.url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={(e) => {
                setHoveredProblem({ problem, dayLabel, idx: idx + 1 });
                e.currentTarget.style.transform = "scale(1.3)";
                e.currentTarget.style.zIndex = "20";
                e.currentTarget.style.boxShadow = isSolved ? "0 0 12px rgba(16, 185, 129, 0.7)" : "0 0 12px rgba(245, 158, 11, 0.7)";
              }}
              onMouseLeave={(e) => {
                setHoveredProblem(null);
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.zIndex = "1";
                e.currentTarget.style.boxShadow = "none";
              }}
              style={{
                aspectRatio: "1/1",
                borderRadius: "4px",
                backgroundColor: isSolved ? "#10b981" : "rgba(245, 158, 11, 0.12)",
                border: isSolved ? "1px solid #10b981" : "1px solid rgba(245, 158, 11, 0.35)",
                boxShadow: isSolved ? "0 0 6px rgba(16, 185, 129, 0.4)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "9px",
                fontWeight: 700,
                color: isSolved ? "#ffffff" : "#f59e0b",
                textDecoration: "none",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              {idx + 1}
            </a>
          );
        })}
      </div>

      {/* Tooltip Bar */}
      <div
        style={{
          marginTop: "10px",
          padding: "8px 10px",
          backgroundColor: "rgba(10, 12, 18, 0.9)",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: "11px",
          color: hoveredProblem ? "#f8fafc" : "#64748b",
          minHeight: "34px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "6px",
        }}
      >
        {hoveredProblem ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "6px" }}>
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              <span style={{ color: hoveredProblem.problem.solved ? "#10b981" : "#f59e0b", fontWeight: 700, marginRight: "4px" }}>
                #{hoveredProblem.idx} {hoveredProblem.problem.solved ? "✓" : "⏳"}
              </span>
              <span style={{ fontWeight: 600 }}>{hoveredProblem.problem.title}</span>
            </div>
            {(() => {
              const meta = getProblemMeta(hoveredProblem.problem.slug, hoveredProblem.problem.title);
              return (
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: "3px",
                    backgroundColor:
                      meta.difficulty === "Easy"
                        ? "rgba(34, 197, 94, 0.12)"
                        : meta.difficulty === "Medium"
                        ? "rgba(245, 158, 11, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                    color:
                      meta.difficulty === "Easy"
                        ? "#4ade80"
                        : meta.difficulty === "Medium"
                        ? "#fbbf24"
                        : "#f87171",
                    flexShrink: 0,
                  }}
                >
                  {meta.difficulty}
                </span>
              );
            })()}
          </div>
        ) : (
          <span>Hover over any tile to preview problem</span>
        )}
      </div>
    </BorderGlow>
  );
}
