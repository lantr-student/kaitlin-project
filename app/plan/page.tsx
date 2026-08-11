"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Checkbox, CheckIcon } from "@/components/Checkbox";
import { StickyNote } from "@/components/StickyNote";
import { ProgressRing } from "@/components/ProgressRing";
import { useAppState } from "@/components/AppStateProvider";
import { WEEKLY_PLAN, TODAYS_WORKOUT, goalProgressPercent, type PlanDay } from "@/lib/data";
import { quicksand, caveat, ACTIVE_STROKE, DONE_STROKE, DONE_TEXT, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

const todayIndex = WEEKLY_PLAN.findIndex((d) => d.day === TODAYS_WORKOUT.day);

// Hardcoded until accounts/auth exist.
const FIRST_NAME = "Kaitlin";

function timeOfDayGreeting(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// Past/future phrasing that names the workout explicitly — only used when that day isn't a rest day.
const PAST_WORKOUT_HEADLINES: ((day: string) => string)[] = [
  (day) => `Looking back at ${day}'s workout`,
  (day) => `${day}'s workout`,
  (day) => `Here's what you did ${day}`,
  (day) => `Your ${day} workout`,
  (day) => `Let's look at ${day}`,
];
const FUTURE_WORKOUT_HEADLINES: ((day: string) => string)[] = [
  (day) => `Up next: ${day}'s workout`,
  () => `Here's what's next`,
  (day) => `${day}'s workout is ready`,
  (day) => `Ready for ${day}?`,
  (day) => `Coming up ${day}`,
  (day) => `${day}, let's go`,
  () => `Your next workout`,
];
// Past rest-day phrasing — "Yesterday..." only renders literally when the day actually is yesterday,
// otherwise the weekday name is substituted in.
const PAST_REST_HEADLINES: ((day: string, isYesterday: boolean) => string)[] = [
  () => `How did your rest day go?`,
  () => `How did you recover?`,
  () => `A look back at your recovery`,
  () => `You took a day to recover.`,
  (day, isYesterday) => (isYesterday ? `Yesterday was about recovery.` : `${day} was about recovery.`),
  () => `How did you spend your rest day?`,
  () => `Recovery was on the plan.`,
  () => `Rest was part of the plan`,
];

// Future rest-day phrasing usable for any day out — "tomorrow" swaps to the weekday name otherwise.
const FUTURE_REST_HEADLINES: ((day: string, isTomorrow: boolean) => string)[] = [
  () => `A day to recover.`,
  () => `Recovery is on the plan.`,
  (day, isTomorrow) => (isTomorrow ? `Tomorrow, we recover.` : `${day}, we recover.`),
  () => `Your next day is for recovery.`,
  (day, isTomorrow) => (isTomorrow ? `Take tomorrow to recover.` : `Take ${day} to recover.`),
  () => `A rest day is coming up.`,
];
// Extra phrasing that only makes sense when the rest day is specifically tomorrow.
const FUTURE_REST_TOMORROW_HEADLINES: ((day: string, isTomorrow: boolean) => string)[] = [
  ...FUTURE_REST_HEADLINES,
  () => `Next up: recovery.`,
  () => `We'll take it easy tomorrow.`,
];
const TODAY_REST_HEADLINES = [
  "Today's a rest day",
  "Take it easy today",
  "Recovery day",
  "You've earned a rest day",
  "No workout today — recover well.",
];
const TODAY_WORKOUT_HEADLINES = [
  "Ready to get started?",
  "Ready for today's workout?",
  "Ready when you are.",
  "Time to train.",
  "Let's make today count.",
  "Let's get stronger today.",
  "Up for a workout?",
];

type HeadlinePicks = {
  pastWorkout: number;
  pastRest: number;
  futureWorkout: number;
  futureRestFar: number;
  futureRestTomorrow: number;
  todayRest: number;
  todayWorkout: number;
};

const INITIAL_HEADLINE_PICKS: HeadlinePicks = {
  pastWorkout: 0,
  pastRest: 0,
  futureWorkout: 0,
  futureRestFar: 0,
  futureRestTomorrow: 0,
  todayRest: 0,
  todayWorkout: 0,
};

function randomHeadlinePicks(): HeadlinePicks {
  return {
    pastWorkout: Math.floor(Math.random() * PAST_WORKOUT_HEADLINES.length),
    pastRest: Math.floor(Math.random() * PAST_REST_HEADLINES.length),
    futureWorkout: Math.floor(Math.random() * FUTURE_WORKOUT_HEADLINES.length),
    futureRestFar: Math.floor(Math.random() * FUTURE_REST_HEADLINES.length),
    futureRestTomorrow: Math.floor(Math.random() * FUTURE_REST_TOMORROW_HEADLINES.length),
    todayRest: Math.floor(Math.random() * TODAY_REST_HEADLINES.length),
    todayWorkout: Math.floor(Math.random() * TODAY_WORKOUT_HEADLINES.length),
  };
}

function headlineFor(day: PlanDay, dayIndex: number, todayIdx: number, picks: HeadlinePicks): string {
  const dayOffset = dayIndex - todayIdx;
  if (dayOffset === 0) {
    return day.isRestDay ? TODAY_REST_HEADLINES[picks.todayRest] : TODAY_WORKOUT_HEADLINES[picks.todayWorkout];
  }
  if (dayOffset < 0) {
    if (!day.isRestDay) return PAST_WORKOUT_HEADLINES[picks.pastWorkout](day.day);
    return PAST_REST_HEADLINES[picks.pastRest](day.day, dayOffset === -1);
  }
  if (!day.isRestDay) return FUTURE_WORKOUT_HEADLINES[picks.futureWorkout](day.day);
  const isTomorrow = dayOffset === 1;
  return isTomorrow
    ? FUTURE_REST_TOMORROW_HEADLINES[picks.futureRestTomorrow](day.day, true)
    : FUTURE_REST_HEADLINES[picks.futureRestFar](day.day, false);
}

// Colors for the homepage metric rings — distinct from the rest of the app's navy/sage palette.
const RING_WEEKLY = "stroke-[#4A6FA5] dark:stroke-[#8CAAD9]";
const RING_GOAL = "stroke-[#7A5DA8] dark:stroke-[#B29BD9]";

export default function Plan() {
  const { onboarding, exerciseDone, toggleExercise, workoutStarted, activity, setProgress } = useAppState();
  const { goal } = onboarding;
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const [headlinePicks, setHeadlinePicks] = useState<HeadlinePicks>(INITIAL_HEADLINE_PICKS);
  const selectedDay = WEEKLY_PLAN[selectedDayIndex];
  const isSelectedToday = selectedDayIndex === todayIndex;

  const weeklyPercent = activity.plannedThisWeek ? (activity.workoutsThisWeek / activity.plannedThisWeek) * 100 : 0;
  const totalSets = setProgress.reduce((sum, sets) => sum + sets.length, 0);
  const doneSets = setProgress.reduce((sum, sets) => sum + sets.filter((s) => s.done).length, 0);
  const workoutPercent = totalSets ? (doneSets / totalSets) * 100 : 0;
  const workoutComplete = totalSets > 0 && doneSets === totalSets;
  const goalPercent = goalProgressPercent(goal);
  const goalShortName = goal.metric.split(" ")[0].toLowerCase();

  const daysBeforeSelected = WEEKLY_PLAN.slice(0, selectedDayIndex);
  const daysAfterSelected = WEEKLY_PLAN.slice(selectedDayIndex + 1);

  // Re-rolled once per page load (not per day-card click) — starts at a fixed pick so
  // server and client render the same thing before this runs, then randomizes on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only re-roll to avoid an SSR/client hydration mismatch from Math.random()
    setHeadlinePicks(randomHeadlinePicks());
  }, []);

  const greeting = timeOfDayGreeting(new Date().getHours());
  const headline = headlineFor(selectedDay, selectedDayIndex, todayIndex, headlinePicks);

  return (
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div>
            <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>This week&apos;s plan</p>
            <h1 className="mt-1 text-3xl font-bold text-[#26313D] sm:text-4xl dark:text-[#EDF1F4]">
              Good {greeting}, {FIRST_NAME}
            </h1>
            <p className="mt-1 text-xl font-bold text-[#26313D] sm:text-2xl dark:text-[#EDF1F4]">{headline}</p>
          </div>

          <div className="flex flex-none gap-8 sm:mt-8">
            <MetricRing
              percentage={weeklyPercent}
              color={RING_WEEKLY}
              value={`${activity.workoutsThisWeek}/${activity.plannedThisWeek}`}
              label="days this week"
            />
            <MetricRing
              percentage={workoutPercent}
              color={workoutComplete ? DONE_STROKE : ACTIVE_STROKE}
              value={
                workoutComplete ? (
                  <CheckIcon className={`h-3.5 w-3.5 ${DONE_TEXT}`} />
                ) : (
                  `${Math.round(workoutPercent)}%`
                )
              }
              label="today's workout"
            />
            <MetricRing
              percentage={goalPercent}
              color={RING_GOAL}
              value={`${goalPercent}%`}
              label={`to ${goalShortName} goal`}
            />
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
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-none flex-col items-center gap-1.5">
      <ProgressRing percentage={percentage} color={color} size={60} strokeWidth={5}>
        <span className={`text-xs font-bold ${INK}`}>{value}</span>
      </ProgressRing>
      <span className={`whitespace-nowrap text-center text-xs leading-tight ${FAINT}`}>{label}</span>
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
        <StickyNote label="Coach's notes" text={day.coachNote} tilt="left" />
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
