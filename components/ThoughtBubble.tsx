import { COACH_ACCENT_BORDER, COACH_ACCENT_BG, COACH_ACCENT_DOT } from "@/lib/theme";

// The Coach page's "thinking" indicator: a rounded-rectangle bubble (styled
// like a real reply bubble) with three bouncing dots inside, used while a
// reply is in flight.
export function ThoughtBubble({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-2xl border ${COACH_ACCENT_BORDER} ${COACH_ACCENT_BG} px-4 py-3 ${className}`}
    >
      <span className={`h-1.5 w-1.5 animate-bounce rounded-full ${COACH_ACCENT_DOT}`} style={{ animationDelay: "0ms" }} />
      <span
        className={`h-1.5 w-1.5 animate-bounce rounded-full ${COACH_ACCENT_DOT}`}
        style={{ animationDelay: "150ms" }}
      />
      <span
        className={`h-1.5 w-1.5 animate-bounce rounded-full ${COACH_ACCENT_DOT}`}
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
