"use client";

import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { buildCoachTranscript, buildTrajectory, computeProgressStats } from "@/lib/data";

export default function Coach() {
  const { onboarding, activity } = useAppState();
  const { goal } = onboarding;

  const trajectory = buildTrajectory(goal);
  const stats = computeProgressStats(goal, trajectory);
  const transcript = buildCoachTranscript(goal, stats, activity);

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-8 pt-10 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Coach</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">This week&apos;s check-in</h1>
        <p className="mt-2 text-sm text-zinc-500 sm:text-base dark:text-zinc-400">
          Every recommendation shows what the coach observed and why — not just what to do.
        </p>

        <div className="mt-6 space-y-4">
          {transcript.map((turn, i) =>
            turn.from === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm text-white">
                  {turn.text}
                </div>
              </div>
            ) : (
              <div key={i} className="rounded-2xl rounded-tl-sm border border-zinc-200 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs text-white">S</span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Spotter Coach</span>
                </div>

                <ReasoningRow label="Observed" text={turn.observation} />
                <ReasoningRow label="Because" text={turn.reasoning} />
                <ReasoningRow label="So" text={turn.recommendation} emphasize />
              </div>
            )
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function ReasoningRow({ label, text, emphasize }: { label: string; text: string; emphasize?: boolean }) {
  return (
    <div className="mt-2 first:mt-0">
      <span className="mr-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <span className={`text-sm ${emphasize ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-300"}`}>
        {text}
      </span>
    </div>
  );
}
