"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Checkbox, CheckIcon } from "@/components/Checkbox";
import { StickyNote } from "@/components/StickyNote";
import { ProgressRing } from "@/components/ProgressRing";
import { useAppState } from "@/components/AppStateProvider";
import { TODAYS_WORKOUT } from "@/lib/data";
import { quicksand, caveat, ACTIVE_STROKE, DONE_STROKE, DONE_TEXT, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

export default function LogWorkout() {
  const { setProgress, toggleSet, updateSetField, exerciseDone, weeklyPlan } = useAppState();
  const activeTodaysWorkout = weeklyPlan ? weeklyPlan[2] : TODAYS_WORKOUT;
  const lastRow = Math.ceil(activeTodaysWorkout.exercises.length / 2) - 1;

  const totalSets = setProgress.reduce((sum, sets) => sum + sets.length, 0);
  const doneSets = setProgress.reduce((sum, sets) => sum + sets.filter((s) => s.done).length, 0);
  const overallProgress = totalSets ? doneSets / totalSets : 0;
  const workoutComplete = totalSets > 0 && doneSets === totalSets;

  return (
    <div className={`flex min-h-dvh flex-col sm:h-dvh bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-6 sm:overflow-hidden sm:px-6 sm:pt-10">
        <div className="flex flex-none items-center justify-between gap-3">
          <div className="flex-none">
            <p className={`text-lg leading-none text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>
              {activeTodaysWorkout.day} · Today
            </p>
            <h1 className={`mt-1 text-xl font-bold sm:text-2xl ${INK}`}>{activeTodaysWorkout.focus}</h1>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
            <div className="flex min-w-0 items-start gap-5 overflow-x-auto">
              {activeTodaysWorkout.exercises.map((exercise, exerciseIndex) => {
                const sets = setProgress[exerciseIndex] ?? [];
                const doneCount = sets.filter((s) => s.done).length;
                const complete = exerciseDone[exerciseIndex] ?? false;
                return (
                  <div key={exercise.name} className="flex w-20 flex-none flex-col items-center gap-1">
                    <ProgressRing
                      size={36}
                      strokeWidth={4}
                      percentage={sets.length ? (doneCount / sets.length) * 100 : 0}
                      color={complete ? DONE_STROKE : ACTIVE_STROKE}
                    >
                      {complete ? (
                        <CheckIcon className={`h-3.5 w-3.5 ${DONE_TEXT}`} />
                      ) : (
                        <span className={`text-[10px] font-semibold ${MUTED}`}>
                          {doneCount}/{sets.length}
                        </span>
                      )}
                    </ProgressRing>
                    <span className={`text-center text-[10px] leading-tight ${FAINT}`}>{exercise.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-none items-center gap-2.5 border-l border-[#33465C]/10 pl-4 dark:border-[#6E8CB0]/15">
              <ProgressRing
                size={54}
                strokeWidth={5}
                percentage={overallProgress * 100}
                color={workoutComplete ? DONE_STROKE : ACTIVE_STROKE}
              >
                {workoutComplete ? (
                  <CheckIcon className={`h-5 w-5 ${DONE_TEXT}`} />
                ) : (
                  <span className={`text-sm font-bold ${INK}`}>{Math.round(overallProgress * 100)}%</span>
                )}
              </ProgressRing>
              <div className="flex flex-col items-start leading-tight">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${FAINT}`}>Workout</span>
                <span className={`whitespace-nowrap text-sm ${MUTED}`}>
                  {doneSets} of {totalSets} sets
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 pb-4 sm:min-h-0 sm:flex-1 sm:grid-cols-2 sm:grid-rows-3 sm:gap-4 sm:pb-6">
          {activeTodaysWorkout.exercises.map((exercise, exerciseIndex) => {
            const isLastRow = Math.floor(exerciseIndex / 2) === lastRow;
            const openLeft = exerciseIndex % 2 === 1;
            return (
              <NotebookSection
                key={exercise.name}
                index={exerciseIndex}
                title={exercise.name}
                rest={exercise.rest}
                formTip={exercise.formTip}
                openLeft={openLeft}
                openUp={isLastRow}
                done={exerciseDone[exerciseIndex] ?? false}
              >
                <div
                  className={`grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-2 gap-y-1 text-[10px] font-medium uppercase tracking-wide ${FAINT}`}
                >
                  <span>Set</span>
                  <span>Reps</span>
                  <span>Weight</span>
                  <span>Done</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {setProgress[exerciseIndex]?.map((set, setIndex) => (
                    <div key={setIndex} className="grid h-7 grid-cols-[auto_1fr_1fr_auto] items-center gap-x-2">
                      <span className={`w-4 text-sm ${MUTED}`}>{setIndex + 1}</span>
                      <input
                        value={set.reps}
                        onChange={(e) => updateSetField(exerciseIndex, setIndex, "reps", e.target.value)}
                        className="w-full border-0 border-b border-dashed border-[#33465C]/25 bg-transparent px-0.5 py-0.5 text-sm text-[#33465C] focus:border-solid focus:border-[#33465C]/60 focus:outline-none dark:border-[#6E8CB0]/25 dark:text-[#6E8CB0] dark:focus:border-[#6E8CB0]/60"
                      />
                      <input
                        value={set.weight}
                        onChange={(e) => updateSetField(exerciseIndex, setIndex, "weight", e.target.value)}
                        placeholder="lbs"
                        className="w-full border-0 border-b border-dashed border-[#33465C]/25 bg-transparent px-0.5 py-0.5 text-sm text-[#33465C] placeholder:text-[#33465C]/40 focus:border-solid focus:border-[#33465C]/60 focus:outline-none dark:border-[#6E8CB0]/25 dark:text-[#6E8CB0] dark:placeholder:text-[#6E8CB0]/40 dark:focus:border-[#6E8CB0]/60"
                      />
                      <Checkbox checked={set.done} onToggle={() => toggleSet(exerciseIndex, setIndex)} label="set" />
                    </div>
                  ))}
                </div>
              </NotebookSection>
            );
          })}

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <StickyNote label="Coach's notes" text={activeTodaysWorkout.coachNote} />

            <Link href="/coach" className={`${PRIMARY_BUTTON} flex-none`}>
              <span>Talk to coach</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function NotebookSection({
  index,
  title,
  rest,
  formTip,
  openLeft,
  openUp,
  done,
  children,
}: {
  index: number;
  title: string;
  rest: string;
  formTip: string;
  openLeft: boolean;
  openUp: boolean;
  done: boolean;
  children: ReactNode;
}) {
  const tilt = index % 2 === 0 ? "sm:-rotate-[0.4deg]" : "sm:rotate-[0.4deg]";

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 border-[#33465C]/15 bg-white p-6 shadow-sm shadow-black/5 transition-transform dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:shadow-black/20 ${tilt}`}
    >
      {/* clipped layer so the rotated "done" stamp doesn't poke past the rounded corners */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {done && (
          <span
            aria-hidden
            className={`absolute inset-0 flex rotate-[8deg] items-center justify-center whitespace-nowrap text-7xl font-bold text-[#7C9270] dark:text-[#A9BFA0] ${caveat.className}`}
          >
            done ✓
          </span>
        )}
      </div>

      <div className="relative flex flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h2 className={`text-2xl leading-tight ${INK} ${caveat.className}`}>{title}</h2>
            <ExerciseTipButton tip={formTip} openLeft={openLeft} openUp={openUp} />
          </div>
          <span className={`whitespace-nowrap text-[11px] ${FAINT}`}>Rest {rest}</span>
        </div>
        <div className="mt-1 flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

function ExerciseTipButton({ tip, openLeft, openUp }: { tip: string; openLeft: boolean; openUp: boolean }) {
  return (
    <div className="group relative flex-none">
      <button
        type="button"
        aria-label="Exercise tips"
        className="flex h-5 w-5 items-center justify-center rounded-full text-[#8A939B] transition-colors hover:text-[#E8CD6B] focus:outline-none focus-visible:text-[#E8CD6B] dark:text-[#67727C] dark:hover:text-[#E8CD6B] dark:focus-visible:text-[#E8CD6B]"
      >
        <LightbulbIcon className="h-4 w-4" />
      </button>

      <div
        className={`invisible absolute z-20 w-56 rounded-2xl bg-white p-4 opacity-0 shadow-lg shadow-black/10 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:bg-[#1E2630] ${
          openUp ? "bottom-full mb-2" : "top-full mt-2"
        } right-0 ${openLeft ? "" : "sm:right-auto sm:left-0"}`}
      >
        <p className={`text-sm font-semibold ${INK}`}>Form tips</p>
        <p className={`mt-1 text-xs ${MUTED}`}>{tip}</p>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#33465C] px-3 py-2 text-xs font-bold text-[#F4F6F7] transition-colors hover:bg-[#263548] dark:bg-[#6E8CB0] dark:text-[#141A21] dark:hover:bg-[#86A3C4]"
        >
          <span aria-hidden>▶</span>
          <span>Watch demo</span>
        </button>
      </div>
    </div>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
