"use client";

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className}>
      <path
        d="M4.5 10.3 Q6.7 13.2 8.4 13.8 Q12 8 15.5 5.2"
        className="fill-none stroke-current"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Checkbox({
  checked,
  onToggle,
  label,
  size = "md",
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={`Mark ${label} ${checked ? "not done" : "done"}`}
      className={`flex ${dimension} flex-none items-center justify-center rounded-md border-2 transition-colors ${
        checked
          ? "border-[#33465C] bg-[#33465C] dark:border-[#6E8CB0] dark:bg-[#6E8CB0]"
          : "border-[#33465C]/30 dark:border-[#6E8CB0]/40"
      }`}
    >
      {checked && <CheckIcon className="h-3 w-3 text-white dark:text-[#141A21]" />}
    </button>
  );
}
