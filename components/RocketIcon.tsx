"use client";

import { useState } from "react";

interface RocketIconProps {
  size?: number;
  className?: string;
  isLaunching?: boolean;
}

export default function RocketIcon({ size = 20, className = "", isLaunching = false }: RocketIconProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        overflow: "visible",
        position: "relative",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth={2 * (32 / 24)}
        strokeMiterlimit="10"
        style={{
          overflow: "visible",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isLaunching || hovered ? "translate(2px, -2px) scale(1.12)" : "none",
        }}
      >
        <g
          className="rocket-upper"
          style={{
            transformOrigin: "center",
            transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: isLaunching ? "translate(6px, -6px)" : hovered ? "translate(3px, -3px)" : "none",
          }}
        >
          {/* Left fin */}
          <path
            d="m13.299,9h-3.891c-.892,0-1.738.397-2.308,1.083l-5.1,6.139,6.31,1.51"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Bottom fin */}
          <path
            d="m23,18.701v3.891c0,.892-.397,1.738-1.083,2.308l-6.139,5.1-1.51-6.31"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Main rocket fuselage */}
          <path
            d="m14.268,23.69c7.986-2.194,14.642-9.015,15.732-21.69-12.675,1.09-19.496,7.746-21.69,15.732l5.958,5.958Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trajectory lines */}
          <path
            d="m19,5c4.111,1.389,6.778,4.056,8,8"
            strokeLinecap="round"
          />

          {/* Astronaut window */}
          <circle
            cx="19"
            cy="13"
            r="2"
            fill="currentColor"
          />
        </g>

        {/* Thrust Flame */}
        <path
          className="rocket-flame"
          d="m2,30s.707-4.95,2.121-6.364c1.172-1.172,3.071-1.172,4.243,0s1.172,3.071,0,4.243c-1.414,1.414-6.364,2.121-6.364,2.121Z"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transformOrigin: "bottom left",
            color: "#f59e0b",
            stroke: isLaunching || hovered ? "#ec4899" : "#f59e0b",
            opacity: isLaunching ? 1 : hovered ? 0.95 : 0.6,
            filter: isLaunching || hovered ? "drop-shadow(0 0 6px #ec4899)" : "none",
            transition: "all 0.3s ease",
          }}
        />
      </svg>
    </span>
  );
}
