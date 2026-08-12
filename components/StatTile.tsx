import type { ReactNode } from "react";
import { FAINT, INK } from "@/lib/theme";

export function StatTile({
  icon,
  label,
  value,
  compact = false,
}: {
  icon?: ReactNode;
  label: string;
  value: string;
  /** Smaller padding/text — for spots where the tile is a secondary element, not the main focus. */
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#33465C]/15 bg-white text-center dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] ${
        compact ? "px-2.5 py-3" : "px-3 py-4"
      }`}
    >
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className={`font-bold tabular-nums ${INK} ${compact ? "text-2xl" : "text-3xl"}`}>{value}</span>
      </div>
      <div className={`text-xs ${FAINT}`}>{label}</div>
    </div>
  );
}
