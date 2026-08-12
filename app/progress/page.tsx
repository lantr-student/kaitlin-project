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

const TOGGLE_ACTIVE =
  "rounded-full bg-[#33465C] px-3 py-1 text-xs font-semibold text-[#F4F6F7] dark:bg-[#6E8CB0] dark:text-[#141A21]";
const TOGGLE_INACTIVE =
  "rounded-full px-3 py-1 text-xs font-semibold text-[#33465C]/60 transition-colors hover:text-[#33465C] dark:text-[#9AA6B0]/70 dark:hover:text-[#9AA6B0]";

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
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>Your progress</p>
        <h1 className={`mt-1 text-2xl font-bold sm:text-3xl ${INK}`}>
          {goal.metric}: {stats.actualToday} → {goal.targetValue} {goal.unit}
        </h1>
        <p
          className={`mt-2 text-sm font-semibold sm:text-base ${
            stats.behindPace ? "text-[#8A6D1E] dark:text-[#E3CE7A]" : "text-[#5C7A52] dark:text-[#A9BFA0]"
          }`}
        >
          {stats.paceGap} {goal.unit} {stats.behindPace ? "behind" : "ahead of"} target pace
        </p>

        {workoutCompleted && (
          <div
            className={`mt-4 rounded-xl border border-[#A9BFA0]/50 bg-[#A9BFA0]/15 px-4 py-2.5 text-sm font-medium dark:border-[#7C9270]/40 dark:bg-[#4E5E48]/20 ${INK}`}
          >
            Today&apos;s workout is logged — nice consistency.
          </div>
        )}

        <section className="mt-8 rounded-3xl border-2 border-[#33465C]/15 bg-white p-8 shadow-sm shadow-black/5 dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={`text-xl ${INK} ${caveat.className}`}>
                {chartView === "trajectory" ? "Goal trajectory" : "Weekly consistency"}
              </h2>
              <p className={`mb-5 text-sm ${FAINT}`}>
                {chartView === "trajectory"
                  ? "Actual progress vs. the pace needed to hit your target on time."
                  : "Workouts completed each week along your journey."}
              </p>
            </div>
            <div className="flex flex-none rounded-full border-2 border-[#33465C]/15 p-1 dark:border-[#6E8CB0]/20">
              <button
                type="button"
                onClick={() => setChartView("trajectory")}
                className={chartView === "trajectory" ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
              >
                Trajectory
              </button>
              <button
                type="button"
                onClick={() => setChartView("consistency")}
                className={chartView === "consistency" ? TOGGLE_ACTIVE : TOGGLE_INACTIVE}
              >
                Consistency
              </button>
            </div>
          </div>
          {chartView === "trajectory" ? (
            <TrajectoryChart goal={goal} trajectory={trajectory} />
          ) : (
            <ConsistencyBarChart points={weeklyConsistency} />
          )}
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<FireIcon className="h-6 w-6 text-[#C1622E] dark:text-[#E0916A]" />}
            label="Days consistent"
            value={String(activity.streakDays)}
          />
          <StatTile
            icon={<DumbbellIcon className="h-4 w-8" />}
            label={`to ${goalShortName} goal`}
            value={`${goalPercent}%`}
          />
          <StatTile
            icon={<CheckIcon className={`h-6 w-6 ${DONE_TEXT}`} />}
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
