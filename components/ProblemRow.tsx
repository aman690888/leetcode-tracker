"use client";

import { useState } from "react";
import { Problem } from "@/types";
import { getProblemMeta } from "./problemMeta";

interface Props {
  problem: Problem;
  index: number;
}

export default function CosmicProblemRow({ problem, index }: Props) {
  const [copied, setCopied] = useState(false);
  const { id, title, url, solved, slug } = problem;
  const meta = getProblemMeta(slug, title);

  function copyLink(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const diffColor =
    meta.difficulty === "Easy"
      ? { bg: "rgba(34, 197, 94, 0.08)", border: "rgba(34, 197, 94, 0.2)", text: "#4ade80" }
      : meta.difficulty === "Medium"
      ? { bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)", text: "#fbbf24" }
      : { bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)", text: "#f87171" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 12px",
        borderRadius: "8px",
        backgroundColor: solved ? "rgba(16, 185, 129, 0.02)" : "rgba(255, 255, 255, 0.015)",
        border: solved ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(255, 255, 255, 0.05)",
        marginBottom: "6px",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = solved ? "rgba(16, 185, 129, 0.06)" : "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.borderColor = solved ? "rgba(16, 185, 129, 0.4)" : "rgba(56, 189, 248, 0.35)";
        e.currentTarget.style.boxShadow = solved ? "0 0 14px rgba(16, 185, 129, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)" : "0 0 14px rgba(56, 189, 248, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = solved ? "rgba(16, 185, 129, 0.02)" : "rgba(255, 255, 255, 0.015)";
        e.currentTarget.style.borderColor = solved ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexWrap: "nowrap" }}>
        {/* Status indicator */}
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: solved ? "#10b981" : "transparent",
            border: solved ? "none" : "1.5px solid rgba(245, 158, 11, 0.4)",
            color: "#ffffff",
            fontSize: "10px",
            fontWeight: 800,
          }}
        >
          {solved ? "✓" : ""}
        </div>

        {/* Problem ID Pill */}
        {id && (
          <span
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "11px",
              fontWeight: 600,
              color: "#94a3b8",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "1px 5px",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          >
            #{id}
          </span>
        )}

        {/* Title */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "12.5px",
            fontWeight: 500,
            color: solved ? "#64748b" : "#f1f5f9",
            textDecoration: solved ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = solved ? "#64748b" : "#f1f5f9")}
        >
          {title}
        </a>

        {/* Difficulty Badge */}
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 600,
            padding: "1px 5px",
            borderRadius: "4px",
            backgroundColor: diffColor.bg,
            border: `1px solid ${diffColor.border}`,
            color: diffColor.text,
            flexShrink: 0,
          }}
        >
          {meta.difficulty}
        </span>

        {/* Topic Tag */}
        <span
          style={{
            fontSize: "9.5px",
            fontWeight: 500,
            padding: "1px 5px",
            borderRadius: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            color: "#94a3b8",
            flexShrink: 0,
          }}
        >
          {meta.topic}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <button
          onClick={copyLink}
          style={{
            background: "none",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            color: copied ? "#10b981" : "#64748b",
            fontSize: "10.5px",
            cursor: "pointer",
            padding: "2px 6px",
            borderRadius: "4px",
            transition: "all 0.15s",
          }}
        >
          {copied ? "copied" : "copy"}
        </button>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 600,
            color: solved ? "#10b981" : "#ffffff",
            background: solved
              ? "rgba(16, 185, 129, 0.08)"
              : "rgba(255, 255, 255, 0.08)",
            border: solved
              ? "1px solid rgba(16, 185, 129, 0.2)"
              : "1px solid rgba(255, 255, 255, 0.14)",
            padding: "3px 8px",
            borderRadius: "5px",
            textDecoration: "none",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!solved) {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.14)";
            }
          }}
          onMouseLeave={(e) => {
            if (!solved) {
              e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
            }
          }}
        >
          {solved ? "Review ↗" : "Solve ↗"}
        </a>
      </div>
    </div>
  );
}
