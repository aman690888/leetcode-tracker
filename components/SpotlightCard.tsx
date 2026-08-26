"use client";

import React, { useRef, useState, useCallback } from "react";

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  spotlightColor?: string;
  glowColor?: string;
  className?: string;
  onClick?: () => void;
}

export default function SpotlightCard({
  children,
  style = {},
  spotlightColor = "rgba(255, 255, 255, 0.04)",
  glowColor = "rgba(56, 189, 248, 0.75)",
  className = "",
  onClick,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);

  // High-performance DOM property updates for 0-rerender 120 FPS tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--sy", `${e.clientY - rect.top}px`);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--sx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--sy", `${e.clientY - rect.top}px`);
    }
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "14px",
        backgroundColor: "rgba(10, 14, 28, 0.42)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
        transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s, box-shadow 0.2s",
        ...style,
      }}
      className={className}
    >
      {/* 🌟 ReactBits Laser Border Glow Perimeter */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: "1px",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity,
            background: `radial-gradient(180px circle at var(--sx, -999px) var(--sy, -999px), ${glowColor} 0%, rgba(129, 140, 248, 0.35) 40%, transparent 75%)`,
            transition: "opacity 0.25s ease-out",
          }}
        />
      </div>

      {/* 🔦 Interior Subtle Spotlight Glow */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity,
          background: `radial-gradient(350px circle at var(--sx, -999px) var(--sy, -999px), ${spotlightColor}, transparent 70%)`,
          transition: "opacity 0.25s ease",
          zIndex: 1,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
