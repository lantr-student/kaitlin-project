"use client";

import type { ReactNode } from "react";

export function ProgressRing({
  percentage,
  color,
  size = 38,
  strokeWidth = 4,
  trackColor = "stroke-[#33465C]/10 dark:stroke-[#6E8CB0]/15",
  children,
}: {
  /** 0-100 */
  percentage: number;
  /** Tailwind stroke color class(es) for the progress arc, e.g. "stroke-[#3E6FA6] dark:stroke-[#6E9BD1]" */
  color: string;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100) / 100;
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className={trackColor} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-[stroke-dashoffset] duration-300 ${color}`}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
