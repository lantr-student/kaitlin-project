// The Coach page's "thinking" indicator: a rounded-rectangle bubble (styled
// like a real reply bubble) with three bouncing dots inside, used while a
// reply is in flight.
export function ThoughtBubble({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-1 rounded-2xl border border-[#A9BFA0]/60 bg-[#A9BFA0]/15 px-4 py-3 dark:border-[#7C9270]/50 dark:bg-[#4E5E48]/20 ${className}`}
    >
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7C9270] dark:bg-[#A9BFA0]"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7C9270] dark:bg-[#A9BFA0]"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7C9270] dark:bg-[#A9BFA0]"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}
