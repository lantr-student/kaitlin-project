"use client";

import { useState } from "react";
import type { WeeklyConsistencyPoint } from "@/lib/data";
import { FAINT, INK, MUTED } from "@/lib/theme";

const WIDTH = 640;
const HEIGHT = 380;
const PADDING = { top: 10, right: 16, bottom: 28, left: 40 };

const FAINT_FILL = "fill-[#8A939B] dark:fill-[#67727C]";

export default function ConsistencyBarChart({ points }: { points: WeeklyConsistencyPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const planned = points[0]?.planned ?? 4;
  const maxValue = Math.max(planned, ...points.map((p) => p.completed));

  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const slotW = plotW / points.length;
  const barW = Math.max(slotW * 0.55, 2);

  const xAt = (i: number) => PADDING.left + i * slotW + slotW / 2;
  const yAt = (value: number) => PADDING.top + plotH - (value / maxValue) * plotH;

  const yTicks = [0, Math.round(maxValue / 2), maxValue];
  const todayIndex = points.findIndex((p) => p.status === "current");
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="flex flex-col [--chart-bg:#fff] [--series-actual:#7C9270] [--series-ideal:#33465C] sm:h-full dark:[--chart-bg:#1E2630] dark:[--series-actual:#A9BFA0] dark:[--series-ideal:#6E8CB0]">
      <div className={`mb-1 flex flex-none items-center gap-5 text-sm font-medium ${MUTED}`}>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm bg-(--series-actual)" />
          Completed
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border-[1.5px] border-dashed border-(--series-ideal)" />
          Planned
        </span>
      </div>

      <div className="relative sm:min-h-0 sm:flex-1">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full sm:h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Workouts completed per week, past and projected"
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="currentColor"
                strokeWidth="1"
                className="text-[#33465C]/10 dark:text-[#6E8CB0]/15"
              />
              <text
                x={PADDING.left - 8}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className={`${FAINT_FILL} text-[11px]`}
              >
                {tick}
              </text>
            </g>
          ))}

          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={yAt(planned)}
            y2={yAt(planned)}
            stroke="var(--series-ideal)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />

          {points.map((p, i) => {
            const isFuture = p.status === "future";
            const barTop = yAt(p.completed);
            const barHeight = Math.max(PADDING.top + plotH - barTop, 0);
            return (
              <rect
                key={p.label}
                x={xAt(i) - barW / 2}
                y={isFuture ? barTop + 1 : barTop}
                width={barW}
                height={isFuture ? Math.max(barHeight - 2, 0) : barHeight}
                rx={1.5}
                fill={isFuture ? "none" : p.status === "current" ? "var(--series-ideal)" : "var(--series-actual)"}
                stroke={isFuture ? "var(--series-ideal)" : "none"}
                strokeWidth={isFuture ? 1.5 : 0}
                strokeDasharray={isFuture ? "3 3" : undefined}
                opacity={isFuture ? 0.6 : 1}
              />
            );
          })}

          {points.map((p, i) => (
            <rect
              key={`${p.label}-hover`}
              x={xAt(i) - slotW / 2}
              y={PADDING.top}
              width={slotW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
            />
          ))}

          {hoverIndex !== null && (
            <line
              x1={xAt(hoverIndex)}
              x2={xAt(hoverIndex)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke="currentColor"
              strokeWidth="1"
              className="text-[#33465C]/20 dark:text-[#6E8CB0]/25"
            />
          )}
        </svg>

        {hovered && (
          <div
            className={`pointer-events-none absolute top-2 z-10 whitespace-nowrap rounded-lg border border-[#33465C]/15 bg-white/95 px-3 py-2 text-xs shadow-md shadow-black/5 dark:border-[#6E8CB0]/20 dark:bg-[#1E2630]/95 ${MUTED}`}
            style={{
              left: `${(xAt(hoverIndex!) / WIDTH) * 100}%`,
              transform:
                hoverIndex! < points.length * 0.2
                  ? "translateX(0%)"
                  : hoverIndex! > points.length * 0.8
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <span className={`font-semibold ${INK}`}>
              {hovered.label}
              {hovered.status === "current" ? " (this week)" : ""}
            </span>
            <div>
              {hovered.completed}/{hovered.planned} workouts{hovered.status === "future" ? " (planned)" : ""}
            </div>
          </div>
        )}
      </div>

      <div className={`mt-2 flex flex-none justify-between text-xs ${FAINT}`}>
        <span>{points[0]?.label}</span>
        <span>{todayIndex >= 0 ? "This week" : ""}</span>
        <span>{points[points.length - 1]?.label} (goal)</span>
      </div>
    </div>
  );
}
