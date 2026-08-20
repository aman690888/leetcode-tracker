"use client";

/**
 * components/ProblemGroup.tsx
 * One date/week group with its problem rows — clean, scannable checklist style.
 */

import { DayGroup } from "@/types";

interface Props {
  group: DayGroup;
  showCompleted: boolean;
}

export default function ProblemGroup({ group, showCompleted }: Props) {
  const { label, week, kind, problems, solvedCount, totalCount } = group;
  const allDone   = solvedCount === totalCount;
  const pendingCt = totalCount - solvedCount;

  const visibleProblems = showCompleted
    ? problems
    : problems.filter((p) => !p.solved);

  if (visibleProblems.length === 0) return null;

  const accentColor = allDone ? "var(--green)" : "var(--amber)";

  return (
    <div style={{
      borderLeft: `2px solid ${accentColor}`,
      paddingLeft: "16px",
    }}>
      {/* Group header */}
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "10px",
        flexWrap: "wrap",
      }}>
        <div>
          <span style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}>
            {label}
          </span>
          {" "}
          <span style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
          }}>
            · {week}{kind === "weekend" ? " · weekend hw" : ""}
          </span>
        </div>

        {/* Solved / total badge */}
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: allDone ? "var(--green)" : "var(--amber)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {allDone ? `all ${totalCount} done` : `${pendingCt} pending`}
        </span>
      </div>

      {/* Problem rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {visibleProblems.map((p, i) => (
          <a
            key={p.slug + i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "7px 10px",
              borderRadius: "4px",
              textDecoration: "none",
              transition: "background 0.1s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            {/* Status dot */}
            <span style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: p.solved ? "var(--green)" : "var(--text-muted)",
              flexShrink: 0,
              transition: "background 0.15s",
            }} />

            {/* Problem title */}
            <span style={{
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: p.solved ? "var(--text-muted)" : "var(--text-primary)",
              textDecoration: p.solved ? "line-through" : "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}>
              {p.title}
            </span>

            {/* Problem ID + link arrow */}
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}>
              {p.id && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}>
                  {p.id}
                </span>
              )}
              <span style={{
                fontSize: "11px",
                color: "var(--blue)",
                opacity: 0.7,
              }}>
                ↗
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
