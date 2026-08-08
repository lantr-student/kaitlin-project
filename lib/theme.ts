import { Quicksand, Caveat } from "next/font/google";

export const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"] });
export const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

export const INK = "text-[#26313D] dark:text-[#EDF1F4]";
export const MUTED = "text-[#67727C] dark:text-[#9AA6B0]";
export const FAINT = "text-[#8A939B] dark:text-[#67727C]";
// Same faint hex pair as FAINT, as a background tint and a placeholder color.
export const FAINT_BG = "bg-[#8A939B]/20 dark:bg-[#67727C]/25";
export const FAINT_PLACEHOLDER = "placeholder:text-[#8A939B] dark:placeholder:text-[#67727C]";

// Shared "done" vs "in-progress" indicator colors — checkmarks and completion rings
// on the log, plan, and progress pages all use this same sage/navy pair.
export const DONE_TEXT = "text-[#7C9270] dark:text-[#A9BFA0]";
export const DONE_STROKE = "stroke-[#7C9270] dark:stroke-[#A9BFA0]";
export const ACTIVE_STROKE = "stroke-[#33465C] dark:stroke-[#6E8CB0]";

// Shared style for every primary, navigational call-to-action button in the app.
export const PRIMARY_BUTTON =
  "flex items-center justify-between gap-2 rounded-full bg-[#33465C] px-6 py-3.5 text-sm font-bold text-[#F4F6F7] transition-colors hover:bg-[#263548] dark:bg-[#6E8CB0] dark:text-[#141A21] dark:hover:bg-[#86A3C4]";
