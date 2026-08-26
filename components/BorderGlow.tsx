"use client";

import React, { useRef, useState, useCallback } from "react";

interface BorderGlowProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;
  secondaryColor?: string;
  glowRadius?: number;
  borderWidth?: number;
  borderRadius?: string;
  ambientOpacity?: number;
  activeOpacity?: number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function BorderGlow({
  children,
  className = "",
  style = {},
  glowColor = "rgba(56, 189, 248, 0.75)",
  secondaryColor = "rgba(129, 140, 248, 0.4)",
  glowRadius = 180,
  borderWidth = 1,
  borderRadius = "12px",
  ambientOpacity = 0,
  activeOpacity = 1,
  onClick,
}: BorderGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // High-performance DOM property updates for 0-rerender 120 FPS cursor tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--gy", `${e.clientY - rect.top}px`);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--gx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--gy", `${e.clientY - rect.top}px`);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        position: "relative",
        borderRadius,
        ...style,
      }}
    >
      {/* ReactBits Glowing Border Perimeter Mask */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          padding: `${borderWidth}px`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          overflow: "hidden",
          zIndex: 10,
        }}
      >
        {/* Dynamic GPU-accelerated Radial Border Beam */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: isHovered ? activeOpacity : ambientOpacity,
            background: `radial-gradient(${glowRadius}px circle at var(--gx, -999px) var(--gy, -999px), ${glowColor} 0%, ${secondaryColor} 45%, transparent 75%)`,
            transition: "opacity 0.25s ease-out",
          }}
        />
      </div>

      {/* Main Content Layer */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", borderRadius: "inherit" }}>
        {children}
      </div>
    </div>
  );
}
