"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TrajectoryChart from "@/components/TrajectoryChart";
import { useAppState } from "@/components/AppStateProvider";
import { buildTrajectory, computeProgressStats } from "@/lib/data";
import { quicksand, caveat, INK, MUTED, FAINT } from "@/lib/theme";

export default function Progress() {
  const { onboarding, activity, workoutCompleted } = useAppState();
  const { goal } = onboarding;

  const trajectory = buildTrajectory(goal);
  const stats = computeProgressStats(goal, trajectory);

  return (
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>Your goal</p>
        <h1 className={`mt-1 text-2xl font-bold sm:text-3xl ${INK}`}>
          {goal.metric}: {stats.actualToday} → {goal.targetValue} {goal.unit}
        </h1>
        <p className={`mt-2 text-sm sm:text-base ${MUTED}`}>
          {stats.daysRemaining} days left ·{" "}
          <span
            className={
              stats.behindPace
                ? "font-semibold text-[#8A6D1E] dark:text-[#E3CE7A]"
                : "font-semibold text-[#5C7A52] dark:text-[#A9BFA0]"
            }
          >
            {stats.paceGap} {goal.unit} {stats.behindPace ? "behind" : "ahead of"} target pace
          </span>
        </p>

        {workoutCompleted && (
          <div
            className={`mt-4 rounded-xl border border-[#A9BFA0]/50 bg-[#A9BFA0]/15 px-4 py-2.5 text-sm font-medium dark:border-[#7C9270]/40 dark:bg-[#4E5E48]/20 ${INK}`}
          >
            Today&apos;s workout is logged — nice consistency.
          </div>
        )}

        <section className="mt-8 rounded-3xl border-2 border-[#33465C]/15 bg-white p-8 shadow-sm shadow-black/5 dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:shadow-black/20">
          <h2 className={`text-xl ${INK} ${caveat.className}`}>Goal trajectory</h2>
          <p className={`mb-5 text-sm ${FAINT}`}>Actual progress vs. the pace needed to hit your target on time.</p>
          <TrajectoryChart goal={goal} trajectory={trajectory} />
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Day streak" value={String(activity.streakDays)} />
          <StatTile label="This month" value={`${activity.workoutsThisMonth}/${activity.plannedThisMonth}`} />
          <StatTile label="Weeks left" value={String(stats.weeksRemaining)} />

          <Link
            href="/coach"
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-[#33465C] px-3 py-4 text-center transition-colors hover:bg-[#263548] dark:bg-[#6E8CB0] dark:hover:bg-[#86A3C4]"
          >
            <span className="text-base font-bold text-[#F4F6F7] dark:text-[#141A21]">Talk to coach</span>
            <span aria-hidden className="text-lg text-[#F4F6F7] dark:text-[#141A21]">
              →
            </span>
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#33465C]/15 bg-white px-3 py-4 text-center dark:border-[#6E8CB0]/20 dark:bg-[#1E2630]">
      <div className={`text-3xl font-bold tabular-nums ${INK}`}>{value}</div>
      <div className={`text-xs ${FAINT}`}>{label}</div>
    </div>
  );
}
