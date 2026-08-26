"use client";

import React, { useState } from "react";

interface Props {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  variant?: "primary" | "secondary" | "glass";
  background?: string;
}

export default function ShimmerButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  style = {},
  variant = "primary",
  background,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Monochromatic Luxury CTA styling (Linear/Vercel style)
  const isPrimary = variant === "primary";
  const defaultBg = isPrimary
    ? "#ffffff"
    : "rgba(255, 255, 255, 0.06)";
  const defaultColor = isPrimary ? "#09090b" : "#f1f5f9";
  const defaultBorder = isPrimary
    ? "none"
    : "1px solid rgba(255, 255, 255, 0.12)";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setPressed(false);
        setHovered(false);
      }}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        overflow: "hidden",
        borderRadius: "12px",
        background: background || defaultBg,
        color: defaultColor,
        fontWeight: 600,
        fontSize: "13.5px",
        border: defaultBorder,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        padding: "10px 20px",
        boxShadow: isPrimary && !disabled
          ? (hovered ? "0 0 20px rgba(255, 255, 255, 0.25), 0 2px 8px rgba(0,0,0,0.4)" : "0 2px 10px rgba(0, 0, 0, 0.3)")
          : (hovered ? "0 0 15px rgba(255, 255, 255, 0.08)" : "none"),
        transform: pressed ? "scale(0.97)" : hovered ? "translateY(-1px)" : "none",
        transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        ...style,
      }}
    >
      {/* Refined silver light sweep */}
      {!disabled && hovered && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: "-100%",
            width: "50%",
            height: "100%",
            background: isPrimary
              ? "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.08), transparent)"
              : "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)",
            transform: "skewX(-20deg)",
            animation: "shimmerSweep 1.2s infinite",
            pointerEvents: "none",
          }}
        />
      )}

      <span style={{ position: "relative", zIndex: 2, display: "inline-flex", alignItems: "center", gap: "8px" }}>
        {children}
      </span>

      <style>{`
        @keyframes shimmerSweep {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </button>
  );
}
