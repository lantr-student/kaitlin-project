"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { WEEKLY_PLAN, TODAYS_WORKOUT } from "@/lib/data";

export default function Plan() {
  const { onboarding } = useAppState();
  const { goal } = onboarding;

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-8 pt-10 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">This week&apos;s plan</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {onboarding.daysPerWeek}-day split, built for {onboarding.goalType.toLowerCase()}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
          Working toward {goal.metric.toLowerCase()}: {goal.currentValue} → {goal.targetValue} {goal.unit} by{" "}
          {new Date(`${goal.targetDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
        </p>

        <Link
          href="/log"
          className="mt-6 flex max-w-2xl items-center justify-between rounded-xl bg-blue-600 px-5 py-4 text-white transition-colors hover:bg-blue-700"
        >
          <span>
            <span className="block text-xs font-medium text-blue-100">Today · {TODAYS_WORKOUT.day}</span>
            <span className="block text-base font-semibold">Start {TODAYS_WORKOUT.focus}</span>
          </span>
          <span aria-hidden className="text-xl">→</span>
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WEEKLY_PLAN.map((day) => (
            <div
              key={day.day}
              className={`rounded-xl border px-4 py-3.5 ${
                day.isRestDay
                  ? "border-dashed border-zinc-200 dark:border-zinc-800"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{day.day}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {day.isRestDay ? "Rest" : `${day.exercises.length} exercises`}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{day.focus}</p>
              {!day.isRestDay && (
                <ul className="mt-2 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
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
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
