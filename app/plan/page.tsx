"use client";

import { useState } from "react";
import Link from "next/link";
import { Quicksand, Caveat } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { WEEKLY_PLAN, TODAYS_WORKOUT, type PlanDay } from "@/lib/data";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"] });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

const INK = "text-[#26313D] dark:text-[#EDF1F4]";
const MUTED = "text-[#67727C] dark:text-[#9AA6B0]";
const FAINT = "text-[#8A939B] dark:text-[#67727C]";

const todayIndex = WEEKLY_PLAN.findIndex((d) => d.day === TODAYS_WORKOUT.day);
const daysBeforeToday = WEEKLY_PLAN.slice(0, todayIndex);
const daysAfterToday = WEEKLY_PLAN.slice(todayIndex + 1);

export default function Plan() {
  const { onboarding } = useAppState();
  const { goal } = onboarding;
  const [checked, setChecked] = useState<boolean[]>(() => TODAYS_WORKOUT.exercises.map(() => false));

  function toggleExercise(index: number) {
    setChecked((prev) => prev.map((done, i) => (i === index ? !done : done)));
  }

  return (
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>This week&apos;s plan</p>
        <h1 className="mt-1 text-3xl font-bold text-[#26313D] sm:text-4xl dark:text-[#EDF1F4]">
          {onboarding.daysPerWeek}-day split, built for {onboarding.goalType.toLowerCase()}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#67727C] sm:text-base dark:text-[#9AA6B0]">
          Working toward {goal.metric.toLowerCase()}: {goal.currentValue} → {goal.targetValue} {goal.unit} by{" "}
          {new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
        </p>

        <div className="mt-8 flex flex-1 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-center">
          <div className="flex flex-wrap justify-center gap-4 sm:w-56 sm:flex-none sm:flex-col sm:justify-center">
            {daysBeforeToday.map((day) => (
              <SmallDayCard key={day.day} day={day} edge="left" />
            ))}
          </div>

          <TodayCard day={TODAYS_WORKOUT} checked={checked} onToggle={toggleExercise} />

          <div className="flex flex-wrap justify-center gap-4 sm:w-56 sm:flex-none sm:flex-col sm:justify-center">
            {daysAfterToday.map((day) => (
              <SmallDayCard key={day.day} day={day} edge="right" />
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function TodayCard({
  day,
  checked,
  onToggle,
}: {
  day: PlanDay;
  checked: boolean[];
  onToggle: (index: number) => void;
}) {
  return (
    <div className="flex flex-1 flex-col rounded-3xl border-2 border-[#33465C] bg-white p-6 shadow-md shadow-black/10 sm:w-[26rem] sm:flex-none sm:px-6 sm:py-8 dark:border-[#6E8CB0] dark:bg-[#1E2630] dark:shadow-black/30">
      <span className={`text-lg text-[#33465C] dark:text-[#6E8CB0] ${caveat.className}`}>Today</span>
      <h2 className="mt-0.5 text-3xl font-bold text-[#33465C] dark:text-[#6E8CB0]">{day.day}</h2>
      <p className="mt-1 text-base text-[#33465C]/80 dark:text-[#6E8CB0]/80">{day.focus}</p>

      {!day.isRestDay && (
        <ul className="mt-5 space-y-1">
          {day.exercises.map((ex, i) => (
            <li
              key={ex.name}
              className="flex items-center gap-3 border-b border-[#33465C]/10 py-2.5 last:border-0 dark:border-[#6E8CB0]/15"
            >
              <ExerciseCheckbox checked={checked[i] ?? false} onToggle={() => onToggle(i)} />
              <span
                className={`flex-1 text-sm font-medium text-[#33465C] dark:text-[#6E8CB0] ${
                  checked[i] ? "opacity-40 line-through" : ""
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

      <div className="mt-6 flex flex-col">
        <span className={`text-base text-[#33465C]/70 dark:text-[#6E8CB0]/70 ${caveat.className}`}>
          Coach&apos;s notes
        </span>
        <textarea
          defaultValue="Nice pace on squats last week — try adding 5 lbs to your working sets today. Keep the core braced through the RDLs and don't rush the lunges."
          className="mt-2 h-24 resize-none rounded-2xl border border-dashed border-[#33465C]/25 bg-transparent p-3 text-sm text-[#33465C] placeholder:text-[#33465C]/40 focus:border-solid focus:border-[#33465C]/50 focus:outline-none dark:border-[#6E8CB0]/25 dark:text-[#6E8CB0] dark:placeholder:text-[#6E8CB0]/40 dark:focus:border-[#6E8CB0]/50"
        />
      </div>

      <div className="flex-1" />

      <Link
        href="/log"
        className="flex items-center justify-between rounded-full bg-[#33465C] px-6 py-3.5 text-sm font-bold text-[#F4F6F7] transition-colors hover:bg-[#263548] dark:bg-[#6E8CB0] dark:text-[#141A21] dark:hover:bg-[#86A3C4]"
      >
        <span>Start workout</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function ExerciseCheckbox({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={checked ? "Mark exercise not done" : "Mark exercise done"}
      className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors ${
        checked
          ? "border-[#33465C] bg-[#33465C] dark:border-[#6E8CB0] dark:bg-[#6E8CB0]"
          : "border-[#33465C]/30 dark:border-[#6E8CB0]/40"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path
            d="M4.5 10.3 Q6.7 13.2 8.4 13.8 Q12 8 15.5 5.2"
            className="fill-none stroke-white dark:stroke-[#141A21]"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function SmallDayCard({ day, edge }: { day: PlanDay; edge: "left" | "right" }) {
  return (
    <div className="group relative w-full sm:w-52">
      <div
        className={`rounded-2xl border px-6 py-6 shadow-sm transition-all group-hover:shadow-md ${
          day.isRestDay
            ? "border-[#CDD3D6] bg-[#F4F6F7] shadow-black/0 dark:border-[#2B333A] dark:bg-[#1B222B]"
            : "border-[#A9BFA0]/60 bg-[#A9BFA0]/15 shadow-black/5 dark:border-[#7C9270]/50 dark:bg-[#4E5E48]/20"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-xl font-semibold ${INK}`}>{day.day.slice(0, 3)}</span>
          <span className={`text-sm ${FAINT}`}>{day.isRestDay ? "Rest" : `${day.exercises.length}x`}</span>
        </div>
        <p className={`mt-1 text-base ${MUTED}`}>{day.focus}</p>
      </div>

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
