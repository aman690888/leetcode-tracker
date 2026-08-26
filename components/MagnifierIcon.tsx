"use client";

import React, { useState } from "react";

interface Props {
  size?: number;
  color?: string;
  isHovered?: boolean;
  className?: string;
}

export default function MagnifierIcon({
  size = 18,
  color = "currentColor",
  isHovered = false,
  className = "",
}: Props) {
  const [internalHover, setInternalHover] = useState(false);
  const active = isHovered || internalHover;

  return (
    <span
      className={className}
      onMouseEnter={() => setInternalHover(true)}
      onMouseLeave={() => setInternalHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}px`,
        height: `${size}px`,
        overflow: "visible",
        cursor: "pointer",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        stroke={color}
        strokeWidth={2.6666666666666665}
        strokeMiterlimit="10"
        style={{ overflow: "visible" }}
      >
        <g
          className="itshover-magnifier-group"
          style={{
            transformOrigin: "13px 13px",
            transformBox: "fill-box",
            animation: active ? "itshoverMagnifier 1s ease-in-out infinite" : "none",
            transition: "transform 0.2s ease-out",
          }}
        >
          <path
            d="m21.393,18.565l7.021,7.021c.781.781.781,2.047,0,2.828h0c-.781.781-2.047.781-2.828,0l-7.021-7.021"
            strokeLinecap="round"
          />
          <circle cx="13" cy="13" r="10" strokeLinecap="square" />
        </g>
      </svg>

      <style>{`
        @keyframes itshoverMagnifier {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(1.5px, -1.5px) rotate(-6deg);
          }
          50% {
            transform: translate(0, -2.5px) rotate(6deg);
          }
          75% {
            transform: translate(-1.5px, -1.5px) rotate(-6deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }
      `}</style>
    </span>
  );
}
