import type { ReactNode } from "react";
import { FAINT, INK } from "@/lib/theme";

export function StatTile({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-[#33465C]/15 bg-white px-3 py-4 text-center dark:border-[#6E8CB0]/20 dark:bg-[#1E2630]">
      <div className="flex items-center justify-center gap-1.5">
        {icon}
        <span className={`text-3xl font-bold tabular-nums ${INK}`}>{value}</span>
      </div>
      <div className={`text-xs ${FAINT}`}>{label}</div>
    </div>
  );
}
