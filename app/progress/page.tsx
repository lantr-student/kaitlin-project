"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TrajectoryChart from "@/components/TrajectoryChart";
import { useAppState } from "@/components/AppStateProvider";
import { buildTrajectory, computeProgressStats } from "@/lib/data";

export default function Progress() {
  const { onboarding, activity, workoutCompleted } = useAppState();
  const { goal } = onboarding;

  const trajectory = buildTrajectory(goal);
  const stats = computeProgressStats(goal, trajectory);

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-8 pt-10 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Your goal</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {goal.metric}: {stats.actualToday} → {goal.targetValue} {goal.unit}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
          {stats.daysRemaining} days left ·{" "}
          <span className={stats.behindPace ? "font-medium text-amber-600 dark:text-amber-400" : "font-medium text-emerald-600 dark:text-emerald-400"}>
            {stats.paceGap} {goal.unit} {stats.behindPace ? "behind" : "ahead of"} target pace
          </span>
        </p>

        {workoutCompleted && (
          <div className="mt-4 max-w-2xl rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Today&apos;s workout is logged — nice consistency.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <h2 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Goal trajectory</h2>
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
              Actual progress vs. the pace needed to hit your target on time.
            </p>
            <TrajectoryChart goal={goal} trajectory={trajectory} />
          </section>

          <div className="flex flex-col gap-5">
            <section className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <StatCard label="Day streak" value={String(activity.streakDays)} />
              <StatCard label="This month" value={`${activity.workoutsThisMonth}/${activity.plannedThisMonth}`} />
              <StatCard label="Weeks left" value={String(stats.weeksRemaining)} />
            </section>

            <Link
              href="/coach"
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <span>
                <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">Talk to your coach</span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">See the reasoning behind this week&apos;s adjustments</span>
              </span>
              <span aria-hidden className="text-xl text-zinc-400">→</span>
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:items-center lg:justify-between lg:text-left">
      <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500 lg:mt-0 dark:text-zinc-400">{label}</div>
    </div>
  );
}
