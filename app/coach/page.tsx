"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { COACH_ICONS } from "@/components/icons";
import { type CoachTurn } from "@/lib/data";
import { sendChatMessage, ApiError } from "@/lib/api";
import { ThoughtBubble } from "@/components/ThoughtBubble";
import {
  quicksand,
  caveat,
  FAINT_PLACEHOLDER,
  INK,
  PRIMARY_BUTTON,
  ERROR_TEXT,
  ERROR_BG,
  COACH_ACCENT_BORDER,
  COACH_ACCENT_BG,
} from "@/lib/theme";

const HEADLINES = [
  "How's training going?",
  "What's on your mind?",
  "What can I help with?",
  "Got a question? Ask me.",
  "I'm here. What's up?",
  "Let's chat.",
];

export default function Coach() {
  const { coachIcon } = useAppState();
  const CoachIcon = COACH_ICONS.find((c) => c.id === coachIcon)?.Icon ?? COACH_ICONS[0].Icon;

  const [messages, setMessages] = useState<CoachTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // Starts at a fixed pick so server and client render the same thing before this
  // runs, then randomizes on mount (mirrors the Plan page's headline rotation).
  const [headlinePick, setHeadlinePick] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only re-roll to avoid an SSR/client hydration mismatch from Math.random()
    setHeadlinePick(Math.floor(Math.random() * HEADLINES.length));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isSending]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;

    setMessages((prev) => [...prev, { from: "user", text }]);
    setDraft("");
    setSendError(null);
    setIsSending(true);

    try {
      const reply = await sendChatMessage(text);
      setMessages((prev) => [...prev, { from: "coach", text: reply }]);
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`flex h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden px-6 pt-10 sm:pt-14">
        <div className="flex-none">
          <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>Coach</p>
          <h1 className={`mt-1 text-2xl font-bold sm:text-3xl ${INK}`}>{HEADLINES[headlinePick]}</h1>
        </div>

        <div className="mt-6 min-h-0 flex-1 space-y-4 overflow-y-auto">
          {messages.map((turn, i) =>
            turn.from === "user" ? (
              <UserBubble key={i} text={turn.text} />
            ) : (
              <div key={i} className="flex items-end gap-2">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#33465C] dark:bg-[#6E8CB0]">
                  <CoachIcon className="h-3.5 w-3.5 text-[#F4F6F7] dark:text-[#141A21]" />
                </span>
                <div className={`max-w-[85%] rounded-2xl rounded-bl-sm border ${COACH_ACCENT_BORDER} ${COACH_ACCENT_BG} p-4 sm:p-5`}>
                  <p className={`text-sm ${INK}`}>{turn.text}</p>
                </div>
              </div>
            )
          )}
          {isSending && (
            <div className="flex items-end gap-1.5">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#33465C] dark:bg-[#6E8CB0]">
                <CoachIcon className="h-3.5 w-3.5 text-[#F4F6F7] dark:text-[#141A21]" />
              </span>
              <span className="mb-1 h-2 w-2 flex-none rounded-full border border-[#5A7291]/50 bg-[#8FA3B8]/40 dark:border-[#8FA3B8]/60 dark:bg-[#5A7291]/40" />
              <ThoughtBubble />
            </div>
          )}
          {sendError && (
            <div className={`max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${ERROR_BG} ${ERROR_TEXT}`}>
              {sendError}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex flex-none items-center gap-2 py-4">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message your coach…"
            className={`flex-1 rounded-full border-2 border-[#33465C]/15 bg-white px-4 py-2.5 text-base text-[#26313D] focus:border-[#33465C]/40 focus:outline-none sm:text-sm dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:text-[#EDF1F4] dark:focus:border-[#6E8CB0]/50 ${FAINT_PLACEHOLDER}`}
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
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
        className={`max-w-[85%] rounded-2xl rounded-tr-sm border border-[#33465C]/10 bg-white px-4 py-2.5 text-sm shadow-sm shadow-black/5 ${INK} dark:border-[#6E8CB0]/15 dark:bg-[#1E2630] dark:shadow-black/20`}
      >
        {text}
      </div>
    </div>
  );
}
