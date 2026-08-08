"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Checkbox } from "@/components/Checkbox";
import { StickyNote } from "@/components/StickyNote";
import { ProgressRing } from "@/components/ProgressRing";
import { useAppState } from "@/components/AppStateProvider";
import { WEEKLY_PLAN, TODAYS_WORKOUT, goalProgressPercent, type PlanDay } from "@/lib/data";
import { quicksand, caveat, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

const todayIndex = WEEKLY_PLAN.findIndex((d) => d.day === TODAYS_WORKOUT.day);

// Colors for the homepage metric rings — distinct from the rest of the app's navy/sage palette.
const RING_WEEKLY = "stroke-[#4A6FA5] dark:stroke-[#8CAAD9]";
const RING_STREAK = "stroke-[#C1622E] dark:stroke-[#E0916A]";
const RING_GOAL = "stroke-[#7A5DA8] dark:stroke-[#B29BD9]";

export default function Plan() {
  const { onboarding, exerciseDone, toggleExercise, workoutStarted, activity } = useAppState();
  const { goal } = onboarding;
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const selectedDay = WEEKLY_PLAN[selectedDayIndex];
  const isSelectedToday = selectedDayIndex === todayIndex;

  const weeklyPercent = activity.plannedThisWeek ? (activity.workoutsThisWeek / activity.plannedThisWeek) * 100 : 0;
  const streakPercent = Math.min(activity.weekStreak / 4, 1) * 100;
  const goalPercent = goalProgressPercent(goal);
  const goalShortName = goal.metric.split(" ")[0].toLowerCase();

  const daysBeforeSelected = WEEKLY_PLAN.slice(0, selectedDayIndex);
  const daysAfterSelected = WEEKLY_PLAN.slice(selectedDayIndex + 1);

  return (
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div>
            <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>This week&apos;s plan</p>
            <h1 className="mt-1 text-3xl font-bold text-[#26313D] sm:text-4xl dark:text-[#EDF1F4]">
              {onboarding.daysPerWeek}-day split to {onboarding.goalType.toLowerCase()}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#67727C] sm:text-base dark:text-[#9AA6B0]">
              Working toward {goal.metric.toLowerCase()}: {goal.currentValue} → {goal.targetValue} {goal.unit} by{" "}
              {new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex flex-none gap-5">
            <MetricRing
              percentage={weeklyPercent}
              color={RING_WEEKLY}
              value={`${activity.workoutsThisWeek}/${activity.plannedThisWeek}`}
              label="This week"
            />
            <MetricRing
              percentage={streakPercent}
              color={RING_STREAK}
              value={String(activity.weekStreak)}
              label="Wk streak"
            />
            <MetricRing percentage={goalPercent} color={RING_GOAL} value={`${goalPercent}%`} label={`To ${goalShortName}`} />
          </div>
        </div>

        <div className="mt-8 flex flex-1 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-center">
          <div className="flex flex-wrap justify-center gap-4 sm:w-56 sm:flex-none sm:flex-col sm:justify-center">
            {daysBeforeSelected.map((day, i) => (
              <SmallDayCard
                key={day.day}
                day={day}
                edge="left"
                isToday={i === todayIndex}
                onSelect={() => setSelectedDayIndex(i)}
              />
            ))}
          </div>

          <DayCard
            key={selectedDay.day}
            day={selectedDay}
            isToday={isSelectedToday}
            checked={exerciseDone}
            onToggle={toggleExercise}
            workoutStarted={workoutStarted}
          />

          <div className="flex flex-wrap justify-center gap-4 sm:w-56 sm:flex-none sm:flex-col sm:justify-center">
            {daysAfterSelected.map((day, i) => {
              const dayIndex = selectedDayIndex + 1 + i;
              return (
                <SmallDayCard
                  key={day.day}
                  day={day}
                  edge="right"
                  isToday={dayIndex === todayIndex}
                  onSelect={() => setSelectedDayIndex(dayIndex)}
                />
              );
            })}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function MetricRing({
  percentage,
  color,
  value,
  label,
}: {
  percentage: number;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex w-16 flex-none flex-col items-center gap-1">
      <ProgressRing percentage={percentage} color={color}>
        <span className={`text-[10px] font-bold ${INK}`}>{value}</span>
      </ProgressRing>
      <span className={`text-center text-[10px] leading-tight ${FAINT}`}>{label}</span>
    </div>
  );
}

function DayCard({
  day,
  isToday,
  checked,
  onToggle,
  workoutStarted,
}: {
  day: PlanDay;
  isToday: boolean;
  checked: boolean[];
  onToggle: (index: number) => void;
  workoutStarted: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-3xl border-2 border-[#33465C] bg-white p-6 shadow-md shadow-black/10 sm:w-[26rem] sm:flex-none sm:px-6 sm:py-8 dark:border-[#6E8CB0] dark:bg-[#1E2630] dark:shadow-black/30">
      <span className={`text-lg text-[#33465C] dark:text-[#6E8CB0] ${caveat.className} ${isToday ? "" : "invisible"}`}>
        Today
      </span>
      <h2 className="mt-0.5 text-3xl font-bold text-[#33465C] dark:text-[#6E8CB0]">{day.day}</h2>
      <p className="mt-1 text-base text-[#33465C]/80 dark:text-[#6E8CB0]/80">{day.focus}</p>

      {day.isRestDay ? (
        <p className={`mt-6 text-sm ${MUTED}`}>Rest day — no exercises scheduled. Focus on mobility and recovery.</p>
      ) : (
        <ul className="mt-5 space-y-1">
          {day.exercises.map((ex, i) => (
            <li
              key={ex.name}
              className="flex items-center gap-3 border-b border-[#33465C]/10 py-2.5 last:border-0 dark:border-[#6E8CB0]/15"
            >
              {isToday ? (
                <Checkbox checked={checked[i] ?? false} onToggle={() => onToggle(i)} label="exercise" size="sm" />
              ) : (
                <span className="flex h-5 w-5 flex-none items-center justify-center text-sm text-[#33465C]/40 dark:text-[#6E8CB0]/40">
                  •
                </span>
              )}
              <span
                className={`flex-1 text-sm font-medium text-[#33465C] dark:text-[#6E8CB0] ${
                  isToday && checked[i] ? "opacity-40 line-through" : ""
                }`}
              >
                {ex.name}
              </span>
              <span className="text-sm tabular-nums text-[#33465C]/70 dark:text-[#6E8CB0]/70">
                {ex.sets} × {ex.reps}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex-[3]" />

      <div className="mb-4 flex flex-col items-center">
        <StickyNote label="Coach's notes" text={day.coachNote} tilt="left" editable />
      </div>

      <div className="flex-1" />

      {isToday && (
        <Link href="/log" className={PRIMARY_BUTTON}>
          <span>{workoutStarted ? "Continue workout" : "Start workout"}</span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

function SmallDayCard({
  day,
  edge,
  isToday,
  onSelect,
}: {
  day: PlanDay;
  edge: "left" | "right";
  isToday: boolean;
  onSelect: () => void;
}) {
  const shade = isToday
    ? "border-[#3E6FA6] bg-[#E7EEF6] dark:border-[#6E9BD1] dark:bg-[#182636]"
    : day.isRestDay
      ? "border-[#CDD3D6] bg-[#F4F6F7] shadow-black/0 dark:border-[#2B333A] dark:bg-[#1B222B]"
      : "border-[#A9BFA0]/60 bg-[#A9BFA0]/15 shadow-black/5 dark:border-[#7C9270]/50 dark:bg-[#4E5E48]/20";

  return (
    <div className="group relative w-full sm:w-52">
      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-2xl border px-6 py-6 text-left shadow-sm transition-all group-hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#33465C] dark:focus-visible:ring-[#6E8CB0] ${shade}`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-xl font-semibold ${INK}`}>{day.day.slice(0, 3)}</span>
          <span className={`text-sm ${FAINT}`}>{day.isRestDay ? "Rest" : `${day.exercises.length}x`}</span>
        </div>
        <p className={`mt-1 text-base ${MUTED}`}>{day.focus}</p>
      </button>

      <div
        className={`invisible absolute top-1/2 z-10 w-56 -translate-y-1/2 rounded-2xl bg-white p-4 opacity-0 shadow-lg shadow-black/10 transition-all group-hover:visible group-hover:opacity-100 dark:bg-[#1E2630] ${
          edge === "left" ? "right-full mr-2" : "left-full ml-2"
        }`}
      >
        <div className="flex items-baseline justify-between">
          <span className={`text-sm font-semibold ${INK}`}>{day.day}</span>
          <span className={`text-xs ${FAINT}`}>{day.isRestDay ? "Rest" : `${day.exercises.length} exercises`}</span>
        </div>
        <p className={`mt-0.5 text-sm ${MUTED}`}>{day.focus}</p>
        {!day.isRestDay && (
          <ul className={`mt-2 space-y-1 text-xs ${MUTED}`}>
            {day.exercises.map((ex) => (
              <li key={ex.name} className="flex justify-between">
                <span>{ex.name}</span>
                <span className="tabular-nums">
                  {ex.sets} × {ex.reps}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
