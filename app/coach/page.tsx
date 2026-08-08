"use client";

import { useState, type FormEvent } from "react";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { SmileyFaceIcon } from "@/components/icons";
import { buildCoachTranscript, buildTrajectory, computeProgressStats, type CoachTurn } from "@/lib/data";
import { quicksand, caveat, FAINT_BG, FAINT_PLACEHOLDER, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

export default function Coach() {
  const { onboarding, activity } = useAppState();
  const { goal } = onboarding;

  const trajectory = buildTrajectory(goal);
  const stats = computeProgressStats(goal, trajectory);

  const [messages, setMessages] = useState<CoachTurn[]>(() => buildCoachTranscript(goal, stats, activity));
  const [draft, setDraft] = useState("");

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "user", text }]);
    setDraft("");
  };

  return (
    <div className={`flex h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 pt-10 sm:pt-14">
        <div className="flex-none">
          <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>Coach</p>
          <h1 className={`mt-1 text-2xl font-bold sm:text-3xl ${INK}`}>This week&apos;s check-in</h1>
          <p className={`mt-2 text-sm sm:text-base ${MUTED}`}>
            A quick, honest read on how the week&apos;s going and what&apos;s next.
          </p>
        </div>

        <div className="mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto">
          {messages.map((turn, i) =>
            turn.from === "user" ? (
              <UserBubble key={i} text={turn.text} />
            ) : (
              <div
                key={i}
                className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#A9BFA0]/60 bg-[#A9BFA0]/15 p-4 sm:p-5 dark:border-[#7C9270]/50 dark:bg-[#4E5E48]/20"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#33465C] dark:bg-[#6E8CB0]">
                    <SmileyFaceIcon className="h-3.5 w-3.5 text-[#F4F6F7] dark:text-[#141A21]" />
                  </span>
                  <span className={`text-xs font-semibold ${FAINT}`}>Spotter Coach</span>
                </div>

                <p className={`text-sm ${INK}`}>{turn.text}</p>
              </div>
            )
          )}
        </div>

        <form onSubmit={handleSend} className="flex flex-none items-center gap-2 py-4">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your coach…"
            className={`flex-1 rounded-full border-2 border-[#33465C]/15 bg-white px-4 py-2.5 text-sm text-[#26313D] focus:border-[#33465C]/40 focus:outline-none dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:text-[#EDF1F4] dark:focus:border-[#6E8CB0]/50 ${FAINT_PLACEHOLDER}`}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className={`${PRIMARY_BUTTON} flex-none disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <span>Send</span>
          </button>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div
        className={`max-w-[85%] rounded-2xl rounded-tr-sm border border-[#33465C]/10 px-4 py-2.5 text-sm ${INK} dark:border-[#6E8CB0]/15 ${FAINT_BG}`}
      >
        {text}
      </div>
    </div>
  );
}
