"use client";

import { useState } from "react";
import type { Goal, TrajectoryPoint } from "@/lib/data";
import { FAINT, INK, MUTED } from "@/lib/theme";

const WIDTH = 640;
const HEIGHT = 320;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

const FAINT_FILL = "fill-[#8A939B] dark:fill-[#67727C]";
const MUTED_FILL = "fill-[#67727C] dark:fill-[#9AA6B0]";
const INK_FILL = "fill-[#26313D] dark:fill-[#EDF1F4]";

export default function TrajectoryChart({ goal, trajectory }: { goal: Goal; trajectory: TrajectoryPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const values = trajectory.flatMap((p) => [p.ideal, p.actual ?? p.ideal]);
  const minValue = Math.floor(Math.min(...values) / 5) * 5 - 5;
  const maxValue = Math.ceil(Math.max(...values) / 5) * 5 + 5;

  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const xAt = (index: number) => PADDING.left + (index / (trajectory.length - 1)) * plotW;
  const yAt = (value: number) => {
    const frac = (value - minValue) / (maxValue - minValue);
    return PADDING.top + plotH - frac * plotH;
  };

  const idealPath = trajectory.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(p.ideal)}`).join(" ");

  const actualPoints = trajectory
    .map((p, i) => (p.actual !== null ? { i, value: p.actual } : null))
    .filter((p): p is { i: number; value: number } => p !== null);
  const actualPath = actualPoints
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${xAt(p.i)},${yAt(p.value)}`)
    .join(" ");
  const lastActual = actualPoints[actualPoints.length - 1];
  const goalPoint = trajectory[trajectory.length - 1];

  const yTicks = [minValue, (minValue + maxValue) / 2, maxValue];
  const hovered = hoverIndex !== null ? trajectory[hoverIndex] : null;

  return (
    <div className="[--chart-bg:#fff] [--series-actual:#7C9270] [--series-ideal:#33465C] dark:[--chart-bg:#1E2630] dark:[--series-actual:#A9BFA0] dark:[--series-ideal:#6E8CB0]">
      <div className={`mb-4 flex items-center gap-5 text-sm font-medium ${MUTED}`}>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 rounded-full bg-(--series-actual)" />
          Actual
        </span>
        <span className="flex items-center gap-2">
          <svg width="20" height="2" className="overflow-visible">
            <line x1="0" y1="1" x2="20" y2="1" stroke="var(--series-ideal)" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          Target pace
        </span>
      </div>

      <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${goal.metric} trajectory versus target pace`}
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
              {Math.round(tick * 10) / 10}
            </text>
          </g>
        ))}

        <path d={idealPath} fill="none" stroke="var(--series-ideal)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
        <path d={actualPath} fill="none" stroke="var(--series-actual)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {trajectory.map(
          (p, i) =>
            i !== trajectory.length - 1 && (
              <circle
                key={`ideal-dot-${p.label}`}
                cx={xAt(i)}
                cy={yAt(p.ideal)}
                r="3"
                fill="var(--series-ideal)"
                stroke="var(--chart-bg)"
                strokeWidth="1.5"
              />
            )
        )}
        {actualPoints.map(
          ({ i, value }) =>
            i !== lastActual?.i && (
              <circle
                key={`actual-dot-${i}`}
                cx={xAt(i)}
                cy={yAt(value)}
                r="3"
                fill="var(--series-actual)"
                stroke="var(--chart-bg)"
                strokeWidth="1.5"
              />
            )
        )}

        <circle
          cx={xAt(trajectory.length - 1)}
          cy={yAt(goalPoint.ideal)}
          r="5"
          fill="var(--series-ideal)"
          stroke="var(--chart-bg)"
          strokeWidth="2"
        />
        <text
          x={xAt(trajectory.length - 1) - 6}
          y={yAt(goalPoint.ideal) - 12}
          textAnchor="end"
          className={`${MUTED_FILL} text-[11px] font-medium`}
        >
          Goal: {goalPoint.ideal} {goal.unit}
        </text>

        {lastActual && (
          <>
            <circle
              cx={xAt(lastActual.i)}
              cy={yAt(lastActual.value)}
              r="5"
              fill="var(--series-actual)"
              stroke="var(--chart-bg)"
              strokeWidth="2"
            />
            <text x={xAt(lastActual.i) + 9} y={yAt(lastActual.value) + 4} className={`${INK_FILL} text-[11px] font-semibold`}>
              {lastActual.value} {goal.unit} today
            </text>
          </>
        )}

        {trajectory.map((p, i) => (
          <rect
            key={p.label}
            x={xAt(i) - plotW / (trajectory.length - 1) / 2}
            y={PADDING.top}
            width={plotW / (trajectory.length - 1)}
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
              hoverIndex! < trajectory.length * 0.2
                ? "translateX(0%)"
                : hoverIndex! > trajectory.length * 0.8
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
          }}
        >
          <span className={`font-semibold ${INK}`}>{hovered.label}</span>
          <div>
            target pace {hovered.ideal} {goal.unit}
          </div>
          {hovered.actual !== null && (
            <div>
              actual {hovered.actual} {goal.unit}
            </div>
          )}
        </div>
      )}
      </div>

      <div className={`mt-2 flex justify-between text-xs ${FAINT}`}>
        <span>{trajectory[0].label}</span>
        <span>{lastActual ? trajectory[lastActual.i].label : ""}</span>
        <span>{trajectory[trajectory.length - 1].label}</span>
      </div>
    </div>
  );
}
