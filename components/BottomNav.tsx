"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FAINT } from "@/lib/theme";

const TABS = [
  { href: "/plan", label: "Plan" },
  { href: "/log", label: "Log" },
  { href: "/progress", label: "Progress" },
  { href: "/coach", label: "Coach" },
  { href: "/profile", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 inset-x-0 border-t border-[#33465C]/15 bg-white/95 backdrop-blur dark:border-[#6E8CB0]/20 dark:bg-[#1E2630]/95">
      <div className="mx-auto flex max-w-4xl items-stretch justify-around px-6 sm:justify-center sm:gap-10">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 items-center justify-center py-3.5 text-xs font-medium transition-colors sm:flex-none sm:px-2 sm:text-sm ${
                active ? "text-[#33465C] dark:text-[#6E8CB0]" : `${FAINT} hover:text-[#33465C] dark:hover:text-[#6E8CB0]`
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
