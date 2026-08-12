"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { CheckIcon } from "@/components/Checkbox";
import { DumbbellIcon, FireIcon } from "@/components/icons";
import { StatTile } from "@/components/StatTile";
import TrajectoryChart from "@/components/TrajectoryChart";
import { useAppState } from "@/components/AppStateProvider";
import { buildTrajectory, computeProgressStats, goalProgressPercent } from "@/lib/data";
import { quicksand, caveat, DONE_TEXT, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

export default function Progress() {
  const { onboarding, activity, workoutCompleted } = useAppState();
  const { goal } = onboarding;

  const trajectory = buildTrajectory(goal);
  const stats = computeProgressStats(goal, trajectory);
  const goalPercent = goalProgressPercent(goal);

  return (
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>Your progress</p>
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
          <StatTile icon={<FireIcon className="h-6 w-6" />} label="Day streak" value={String(activity.streakDays)} />
          <StatTile
            icon={<DumbbellIcon className="h-4 w-8" />}
            label="Goal progress"
            value={`${goalPercent}%`}
          />
          <StatTile
            icon={<CheckIcon className={`h-5 w-5 ${DONE_TEXT}`} />}
            label="Weeks left"
            value={String(stats.weeksRemaining)}
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
