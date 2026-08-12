"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { CheckIcon } from "@/components/Checkbox";
import ConsistencyBarChart from "@/components/ConsistencyBarChart";
import { DumbbellIcon, FireIcon } from "@/components/icons";
import { StatTile } from "@/components/StatTile";
import TrajectoryChart from "@/components/TrajectoryChart";
import { useAppState } from "@/components/AppStateProvider";
import { buildTrajectory, buildWeeklyConsistency, computeProgressStats, goalProgressPercent } from "@/lib/data";
import { quicksand, caveat, DONE_TEXT, INK, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

const TOGGLE_LABEL_ACTIVE = "text-[#F4F6F7] dark:text-[#141A21]";
const TOGGLE_LABEL_INACTIVE =
  "text-[#33465C]/60 hover:text-[#33465C] dark:text-[#9AA6B0]/70 dark:hover:text-[#9AA6B0]";

export default function Progress() {
  const { onboarding, activity, workoutCompleted } = useAppState();
  const { goal } = onboarding;
  const [chartView, setChartView] = useState<"trajectory" | "consistency">("trajectory");

  const trajectory = buildTrajectory(goal);
  const stats = computeProgressStats(goal, trajectory);
  const goalPercent = goalProgressPercent(goal);
  const goalShortName = goal.metric.split(" ")[0].toLowerCase();
  const weeklyConsistency = buildWeeklyConsistency(goal, activity.plannedThisWeek, activity.workoutsThisWeek);

  return (
    <div className={`flex min-h-dvh flex-col sm:h-dvh bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pt-6 pb-6 sm:overflow-hidden sm:px-6 sm:pt-10 sm:pb-6">
        <div className="flex-none">
          <p className={`text-lg leading-none text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>
            Your progress
          </p>
          <h1 className={`mt-1 text-xl font-bold sm:text-2xl ${INK}`}>
            {goal.metric}: {stats.actualToday} → {goal.targetValue} {goal.unit}
          </h1>
          <p
            className={`mt-1 text-sm font-semibold ${
              stats.behindPace ? "text-[#8A6D1E] dark:text-[#E3CE7A]" : "text-[#5C7A52] dark:text-[#A9BFA0]"
            }`}
          >
            {stats.paceGap} {goal.unit} {stats.behindPace ? "behind" : "ahead of"} target pace
          </p>

          {workoutCompleted && (
            <div
              className={`mt-2 rounded-xl border border-[#A9BFA0]/50 bg-[#A9BFA0]/15 px-4 py-2 text-sm font-medium dark:border-[#7C9270]/40 dark:bg-[#4E5E48]/20 ${INK}`}
            >
              Today&apos;s workout is logged — nice consistency.
            </div>
          )}
        </div>

        <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-3xl border-2 border-[#33465C]/15 bg-white p-5 shadow-sm shadow-black/5 dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:shadow-black/20">
          <div className="flex flex-none flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-xl ${INK} ${caveat.className}`}>
                {chartView === "trajectory" ? "Goal trajectory" : "Weekly consistency"}
              </h2>
              <p className={`mb-2 text-xs ${FAINT}`}>
                {chartView === "trajectory"
                  ? "Actual progress vs. the pace needed to hit your target on time."
                  : "Workouts completed each week along your journey."}
              </p>
            </div>
            <div className="relative flex flex-none rounded-full border-2 border-[#33465C]/15 p-1 dark:border-[#6E8CB0]/20">
              <span
                aria-hidden
                className={`absolute inset-y-1 left-1 w-24 rounded-full bg-[#33465C] transition-transform duration-200 ease-out dark:bg-[#6E8CB0] ${
                  chartView === "consistency" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <button
                type="button"
                onClick={() => setChartView("trajectory")}
                className={`relative z-10 w-24 rounded-full py-1 text-xs font-semibold transition-colors ${
                  chartView === "trajectory" ? TOGGLE_LABEL_ACTIVE : TOGGLE_LABEL_INACTIVE
                }`}
              >
                Trajectory
              </button>
              <button
                type="button"
                onClick={() => setChartView("consistency")}
                className={`relative z-10 w-24 rounded-full py-1 text-xs font-semibold transition-colors ${
                  chartView === "consistency" ? TOGGLE_LABEL_ACTIVE : TOGGLE_LABEL_INACTIVE
                }`}
              >
                Consistency
              </button>
            </div>
          </div>
          <div className="mt-1 sm:min-h-0 sm:flex-1">
            {chartView === "trajectory" ? (
              <TrajectoryChart goal={goal} trajectory={trajectory} />
            ) : (
              <ConsistencyBarChart points={weeklyConsistency} />
            )}
          </div>
        </section>

        <div className="mt-3 flex-none grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            compact
            icon={<FireIcon className="h-5 w-5 text-[#C1622E] dark:text-[#E0916A]" />}
            label="Days consistent"
            value={String(activity.streakDays)}
          />
          <StatTile
            compact
            icon={<DumbbellIcon className="h-3.5 w-7" />}
            label={`to ${goalShortName} goal`}
            value={`${goalPercent}%`}
          />
          <StatTile
            compact
            icon={<CheckIcon className={`h-5 w-5 ${DONE_TEXT}`} />}
            label="Workouts completed"
            value={String(activity.totalWorkoutDays)}
          />

          <Link href="/coach" className={`${PRIMARY_BUTTON} self-center justify-self-center`}>
            <span>Talk to coach</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
