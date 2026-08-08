import Link from "next/link";
import { Quicksand } from "next/font/google";
import { DumbbellIcon } from "@/components/icons";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"] });

// Background circles/rings, scattered around the edges.
const ACCENT_SHAPES = [
  "-top-10 -left-10 h-40 w-40 rounded-full border-[12px] border-[#33465C]/70 dark:border-[#6E8CB0]/60",
  "top-16 left-24 h-11 w-11 rounded-full bg-[#A9BFA0] dark:bg-[#7C9270]",
  "-top-8 right-10 h-48 w-48 rounded-full bg-[#CDD3D6]/70 dark:bg-[#3B434A]/70",
  "top-28 right-6 h-8 w-8 rounded-full bg-[#33465C] dark:bg-[#6E8CB0]",
  "top-4 right-40 h-20 w-20 rounded-full border-[7px] border-[#A9BFA0] dark:border-[#7C9270]",
  "top-1/2 left-6 h-7 w-7 -translate-y-1/2 rounded-full bg-[#A9BFA0] dark:bg-[#7C9270]",
  "top-[40%] right-10 h-16 w-16 rounded-full border-[6px] border-[#CDD3D6] dark:border-[#3B434A]",
  "bottom-16 left-12 h-28 w-28 rounded-full bg-[#A9BFA0]/80 dark:bg-[#4E5E48]/70",
  "bottom-8 left-40 h-12 w-12 rounded-full border-[6px] border-[#33465C]/60 dark:border-[#6E8CB0]/60",
  "-bottom-12 -right-10 h-44 w-44 rounded-full border-[12px] border-[#A9BFA0] dark:border-[#7C9270]",
  "bottom-24 right-24 h-10 w-10 rounded-full bg-[#CDD3D6] dark:bg-[#3B434A]",
];

// Subtle workout-gear accents, scattered across the whole screen away from the text.
const DUMBBELL_SHAPES = [
  "top-[4%] left-[6%] h-72 w-72 -rotate-[18deg] opacity-[0.08] dark:opacity-[0.1]",
  "top-[8%] right-[8%] h-64 w-64 rotate-[22deg] opacity-[0.07] dark:opacity-[0.09]",
  "top-[40%] -left-6 h-60 w-60 rotate-[10deg] opacity-[0.07] dark:opacity-[0.09]",
  "top-[44%] -right-8 h-80 w-80 -rotate-[14deg] opacity-[0.08] dark:opacity-[0.1]",
  "bottom-[6%] left-[10%] h-72 w-72 rotate-[16deg] opacity-[0.07] dark:opacity-[0.09]",
  "bottom-[5%] right-[6%] h-60 w-60 -rotate-[20deg] opacity-[0.08] dark:opacity-[0.1]",
];

export default function Landing() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#F4F6F7] px-6 py-16 text-center dark:bg-[#141A21]">
      {ACCENT_SHAPES.map((shape, i) => (
        <div key={i} aria-hidden className={`pointer-events-none absolute ${shape}`} />
      ))}
      {DUMBBELL_SHAPES.map((shape, i) => (
        <DumbbellIcon key={i} className={`pointer-events-none absolute ${shape}`} />
      ))}

      <div className={`relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center ${quicksand.className}`}>
        <div className="mb-9 flex h-32 w-32 items-center justify-center rounded-[28%] bg-[#33465C] shadow-sm shadow-[#33465C]/20 dark:bg-[#6E8CB0]">
          <svg viewBox="0 0 64 64" className="h-24 w-24" aria-hidden>
            {/* face */}
            <circle cx="32" cy="32" r="24" className="fill-[#F4F6F7] dark:fill-[#141A21]" />
            {/* eyes */}
            <circle cx="24" cy="29" r="3" className="fill-[#33465C] dark:fill-[#6E8CB0]" />
            <circle cx="40" cy="29" r="3" className="fill-[#33465C] dark:fill-[#6E8CB0]" />
            {/* smile */}
            <path
              d="M21 38 Q32 48 43 38"
              className="fill-none stroke-[#33465C] dark:stroke-[#6E8CB0]"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="text-8xl font-bold tracking-tight text-[#26313D] sm:text-9xl dark:text-[#EDF1F4]">Spotter</h1>
        <p className="mt-7 whitespace-nowrap text-[clamp(1.1rem,4.5vw,1.875rem)] font-medium text-[#67727C] dark:text-[#9AA6B0]">
          Train smarter. Together.
        </p>

        <Link
          href="/onboarding"
          className="mt-20 inline-flex items-center justify-center rounded-full bg-[#33465C] px-10 py-5 text-2xl font-bold whitespace-nowrap text-[#F4F6F7] shadow-lg shadow-[#33465C]/25 transition-all hover:scale-[1.03] hover:bg-[#263548] dark:bg-[#6E8CB0] dark:text-[#141A21] dark:shadow-[#6E8CB0]/25 dark:hover:bg-[#86A3C4]"
        >
          Get started
        </Link>
        <p className="mt-6 text-sm font-medium text-[#8A939B] dark:text-[#67727C]">
          Prototype build — no account needed, nothing you enter is saved.
        </p>
      </div>
    </main>
  );
}
