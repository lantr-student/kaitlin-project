import Link from "next/link";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl font-bold text-white">
          S
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          Spotter
        </h1>
        <p className="mt-5 text-xl leading-relaxed text-zinc-600 dark:text-zinc-300">
          A training plan that adjusts to you — and shows its work.
        </p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Set one real goal with a date. Spotter builds your weekly sessions, tracks
          whether you&apos;re on pace, and explains every adjustment it makes along
          the way — no black box, just a coach you can actually follow.
        </p>

        <Link
          href="/onboarding"
          className="mt-10 inline-flex w-full max-w-xs items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Get started
        </Link>
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
          Prototype build — no account needed, nothing you enter is saved.
        </p>
      </div>
    </main>
  );
}
