"use client";

import { useState } from "react";
import type { Goal, TrajectoryPoint } from "@/lib/data";

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

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
    <div className="[--series-actual:#2a78d6] [--series-ideal:#eb6834] dark:[--series-actual:#3987e5] dark:[--series-ideal:#d95926]">
      <div className="mb-3 flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-(--series-actual)" />
          Actual
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="16" height="2" className="overflow-visible">
            <line x1="0" y1="1" x2="16" y2="1" stroke="var(--series-ideal)" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          Target pace
        </span>
      </div>

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
              className="text-zinc-200 dark:text-zinc-800"
            />
            <text
              x={PADDING.left - 8}
              y={yAt(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-zinc-400 dark:fill-zinc-500 text-[10px]"
            >
              {Math.round(tick * 10) / 10}
            </text>
          </g>
        ))}

        <path d={idealPath} fill="none" stroke="var(--series-ideal)" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
        <path d={actualPath} fill="none" stroke="var(--series-actual)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx={xAt(trajectory.length - 1)} cy={yAt(goalPoint.ideal)} r="4" fill="var(--series-ideal)" stroke="var(--color-background,#fff)" strokeWidth="2" />
        <text
          x={xAt(trajectory.length - 1) - 6}
          y={yAt(goalPoint.ideal) - 10}
          textAnchor="end"
          className="fill-zinc-600 dark:fill-zinc-300 text-[10px] font-medium"
        >
          Goal: {goalPoint.ideal} {goal.unit}
        </text>

        {lastActual && (
          <>
            <circle cx={xAt(lastActual.i)} cy={yAt(lastActual.value)} r="4" fill="var(--series-actual)" stroke="var(--color-background,#fff)" strokeWidth="2" />
            <text
              x={xAt(lastActual.i) + 8}
              y={yAt(lastActual.value) + 4}
              className="fill-zinc-700 dark:fill-zinc-200 text-[10px] font-semibold"
            >
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
            className="text-zinc-300 dark:text-zinc-700"
          />
        )}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>{trajectory[0].label}</span>
        <span>{lastActual ? trajectory[lastActual.i].label : ""}</span>
        <span>{trajectory[trajectory.length - 1].label}</span>
      </div>

      {hovered && (
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <span className="font-medium text-zinc-800 dark:text-zinc-100">{hovered.label}</span>
          {" — "}
          target pace {hovered.ideal} {goal.unit}
          {hovered.actual !== null ? `, actual ${hovered.actual} ${goal.unit}` : ""}
        </div>
      )}
    </div>
  );
}
