"use client";

import BorderGlow from "./BorderGlow";
import { useState, useMemo, useEffect } from "react";
import { TrackResponse } from "@/types";
import SpotlightCard from "./SpotlightCard";
import DayCard from "./DayCard";
import AnimatedNumber from "./AnimatedNumber";
import CosmicConfetti from "./CosmicConfetti";
import QuestHeatmapGrid from "./QuestHeatmapGrid";
import MagnifierIcon from "./MagnifierIcon";

interface Props {
  data: TrackResponse;
  onRefresh: () => void;
  loading: boolean;
}

export default function CosmicResultsView({ data, onRefresh, loading }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">("pending");
  const [confettiActive, setConfettiActive] = useState(false);

  const { username, totalAssigned, totalSolved, percentage, groups } = data;
  const pending = totalAssigned - totalSolved;
  const isAllDone = pending === 0 && totalAssigned > 0;

  useEffect(() => {
    setStatusFilter(pending > 0 ? "pending" : "all");
  }, [username, pending]);

  useEffect(() => {
    if (isAllDone) {
      setConfettiActive(true);
    }
  }, [isAllDone]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aPending = a.problems.length - a.solvedCount;
      const bPending = b.problems.length - b.solvedCount;
      if (aPending > 0 && bPending === 0) return -1;
      if (aPending === 0 && bPending > 0) return 1;
      return 0;
    });
  }, [groups]);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Confetti Celebration on 100% */}
      <CosmicConfetti trigger={confettiActive} onComplete={() => setConfettiActive(false)} />

      {/* ── Fixed Split Layout Container ─────────────────────────────────── */}
      <div
        className="preview5-split-container"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 320px) 1fr",
          gap: "20px",
          alignItems: "stretch",
          width: "100%",
          height: "100%",
          minHeight: 0,
          flex: 1,
        }}
      >
        {/* ── Left Column: Fixed Stats & 69-Quest Matrix (Does NOT scroll) ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            height: "100%",
            overflowY: "auto",
            paddingRight: "2px",
          }}
          className="cosmic-sidebar-scroll"
        >
          {/* Card 1: Master Progress */}
          <SpotlightCard
            style={{
              padding: "16px 18px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: "rgba(10, 14, 28, 0.42)",
              flexShrink: 0,
            }}
            spotlightColor="rgba(255, 255, 255, 0.06)"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8" }}>
                Total Mastery
              </span>
              {isAllDone ? (
                <button
                  onClick={() => setConfettiActive(true)}
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#10b981",
                    backgroundColor: "rgba(16, 185, 129, 0.1)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    cursor: "pointer",
                  }}
                >
                  100% 👑
                </button>
              ) : (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "#f59e0b",
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                  }}
                >
                  In Progress
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", color: "#ffffff" }}>
                <AnimatedNumber value={percentage} suffix="%" />
              </span>
              <span style={{ fontSize: "12.5px", color: "#94a3b8", fontFamily: "ui-monospace, monospace" }}>
                (<AnimatedNumber value={totalSolved} />/{totalAssigned})
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "5px",
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                borderRadius: "3px",
                overflow: "hidden",
                marginTop: "10px",
              }}
            >
              <div
                style={{
                  width: `${percentage}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #64748b 0%, #10b981 100%)",
                  borderRadius: "3px",
                  transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#10b981" }}>
                  <AnimatedNumber value={totalSolved} />
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>Solved</div>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: isAllDone ? "#10b981" : "#f59e0b" }}>
                  <AnimatedNumber value={pending} />
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>Pending</div>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#cbd5e1" }}>
                  {totalAssigned}
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8" }}>Total</div>
              </div>
            </div>
          </SpotlightCard>

          {/* 69-Quest Matrix Heatmap (Fixed on Left) */}
          <div style={{ flexShrink: 0 }}>
            <QuestHeatmapGrid groups={groups} />
          </div>
        </div>

        {/* ── Right Column: Dedicated Scroll Container for Questions ───────── */}
        <div
          style={{
            minWidth: 0,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* Static Top Filter Bar (Does NOT scroll away) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "12px",
              flexShrink: 0,
            }}
          >
            <BorderGlow borderRadius="8px" glowColor="rgba(56, 189, 248, 0.6)" glowRadius={140} style={{ position: "relative", minWidth: "180px", flex: 1 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter questions by name, ID or topic..."
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 12px 0 32px",
                  backgroundColor: "rgba(10, 14, 28, 0.40)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12.5px",
                  outline: "none",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <MagnifierIcon size={13} color="#64748b" />
              </span>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  ✕
                </button>
              )}
            </BorderGlow>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(10, 14, 28, 0.40)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                padding: "2px",
              }}
            >
              <button
                onClick={() => setStatusFilter("pending")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: statusFilter === "pending" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: statusFilter === "pending" ? "#f8fafc" : "#71717a",
                  transition: "all 0.15s ease",
                }}
              >
                Pending ({pending})
              </button>
              <button
                onClick={() => setStatusFilter("all")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: statusFilter === "all" ? "rgba(255, 255, 255, 0.1)" : "transparent",
                  color: statusFilter === "all" ? "#f8fafc" : "#71717a",
                  transition: "all 0.15s ease",
                }}
              >
                All ({totalAssigned})
              </button>
            </div>
          </div>

          {/* ── Scrollable Day Cards Feed (ONLY THIS SCROLLS!) ─────────────── */}
          <div
            className="cosmic-feed-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              paddingRight: "6px",
            }}
          >
            {sortedGroups.map((group, idx) => (
              <DayCard
                key={`${group.label}-${group.week || idx}-${idx}`}
                group={group}
                searchFilter={search}
                statusFilter={statusFilter}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slim Custom Scrollbar Styling */}
      <style>{`
        .cosmic-feed-scroll::-webkit-scrollbar,
        .cosmic-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .cosmic-feed-scroll::-webkit-scrollbar-track,
        .cosmic-sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .cosmic-feed-scroll::-webkit-scrollbar-thumb,
        .cosmic-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.14);
          border-radius: 4px;
        }
        .cosmic-feed-scroll::-webkit-scrollbar-thumb:hover,
        .cosmic-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.28);
        }

        @media (max-width: 820px) {
          .preview5-split-container {
            grid-template-columns: 1fr !important;
            height: auto !important;
            overflow: visible !important;
          }
          .cosmic-feed-scroll {
            overflow-y: visible !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
