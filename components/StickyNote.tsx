"use client";

import { caveat } from "@/lib/theme";

const NOTE_TEXT = "text-base leading-snug text-[#5A4A1E] dark:text-[#E9DBA0]";

export function StickyNote({
  label,
  text,
  tilt = "right",
}: {
  label: string;
  text: string;
  tilt?: "left" | "right";
}) {
  return (
    <div
      className={`flex ${
        tilt === "left" ? "-rotate-1" : "rotate-1"
      } flex-col items-center gap-1 rounded-lg border border-[#EDDFA9] bg-[#FDF6D9] px-4 py-3 text-center shadow-sm shadow-black/10 dark:border-[#4E4630] dark:bg-[#332E20]`}
    >
      <span className={`text-xs text-[#5A4A1E]/70 dark:text-[#E9DBA0]/70 ${caveat.className}`}>{label}</span>
      <p className={`max-h-40 max-w-56 overflow-y-auto ${NOTE_TEXT} ${caveat.className}`}>{text}</p>
    </div>
  );
}
