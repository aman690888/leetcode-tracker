"use client";

import { useEffect, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({
  value,
  duration = 1200,
  suffix = "",
  prefix = "",
  style = {},
}: Props) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startVal = 0;
    const targetVal = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * easeOut);

      setDisplayVal(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayVal(targetVal);
      }
    };

    requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <span style={{ fontFamily: "inherit", ...style }}>
      {prefix}
      {displayVal}
      {suffix}
    </span>
  );
}
