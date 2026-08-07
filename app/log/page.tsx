"use client";

import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { TODAYS_WORKOUT } from "@/lib/data";

export default function LogWorkout() {
  const router = useRouter();
  const { setProgress, toggleSet, updateSetField, completeWorkout, workoutCompleted } = useAppState();

  const totalSets = setProgress.reduce((sum, sets) => sum + sets.length, 0);
  const doneSets = setProgress.reduce((sum, sets) => sum + sets.filter((s) => s.done).length, 0);

  function handleComplete() {
    completeWorkout();
    router.push("/progress");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-8 pt-10 sm:pt-14">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {TODAYS_WORKOUT.day} · Today
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">{TODAYS_WORKOUT.focus}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {doneSets} of {totalSets} sets logged
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {TODAYS_WORKOUT.exercises.map((exercise, exerciseIndex) => (
            <div key={exercise.name} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{exercise.name}</h2>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Rest {exercise.rest}</span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight</span>
                  <span>Done</span>
                </div>
                {setProgress[exerciseIndex]?.map((set, setIndex) => (
                  <div key={setIndex} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-2">
                    <span className="w-5 text-sm text-zinc-500 dark:text-zinc-400">{setIndex + 1}</span>
                    <input
                      value={set.reps}
                      onChange={(e) => updateSetField(exerciseIndex, setIndex, "reps", e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <input
                      value={set.weight}
                      onChange={(e) => updateSetField(exerciseIndex, setIndex, "weight", e.target.value)}
                      placeholder="lbs"
                      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSet(exerciseIndex, setIndex)}
                      aria-label={set.done ? "Mark set not done" : "Mark set done"}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
                        set.done
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-zinc-300 text-transparent hover:border-zinc-400 dark:border-zinc-600"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleComplete}
          disabled={workoutCompleted}
          className="mt-8 w-full max-w-sm rounded-full bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {workoutCompleted ? "Workout logged ✓" : "Complete workout"}
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
