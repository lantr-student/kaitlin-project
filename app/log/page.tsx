"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { Checkbox, CheckIcon } from "@/components/Checkbox";
import { StickyNote } from "@/components/StickyNote";
import { ProgressRing } from "@/components/ProgressRing";
import { PencilIcon } from "@/components/icons";
import { useAppState } from "@/components/AppStateProvider";
import { alternatesForMuscleGroup, type Exercise, type SetProgress } from "@/lib/data";
import { quicksand, caveat, ACTIVE_STROKE, DONE_STROKE, DONE_TEXT, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

export default function LogWorkout() {
  const { setProgress, toggleSet, updateSetField, exerciseDone, todaysWorkout, onboarding, swapExercise } =
    useAppState();
  const lastRow = Math.ceil(todaysWorkout.exercises.length / 2) - 1;
  const whyText = `Part of today's ${todaysWorkout.focus} work, chosen to help move you toward your ${onboarding.goalType.toLowerCase()} goal.`;

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
              {todaysWorkout.day} · Today
            </p>
            <h1 className={`mt-1 text-xl font-bold sm:text-2xl ${INK}`}>{todaysWorkout.focus}</h1>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
            <div className="flex min-w-0 items-start gap-5 overflow-x-auto">
              {todaysWorkout.exercises.map((exercise, exerciseIndex) => {
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
          {todaysWorkout.exercises.map((exercise, exerciseIndex) => {
            const isLastRow = Math.floor(exerciseIndex / 2) === lastRow;
            const openLeft = exerciseIndex % 2 === 1;
            const muscleGroup = exercise.muscleGroup ?? todaysWorkout.focus;
            return (
              <NotebookSection
                key={exercise.name}
                exercise={exercise}
                sets={setProgress[exerciseIndex] ?? []}
                onToggleSet={(setIndex) => toggleSet(exerciseIndex, setIndex)}
                onUpdateSet={(setIndex, field, value) => updateSetField(exerciseIndex, setIndex, field, value)}
                why={whyText}
                muscleGroup={muscleGroup}
                alternates={alternatesForMuscleGroup(muscleGroup)}
                onSwap={(name) => swapExercise(exerciseIndex, name)}
                openLeft={openLeft}
                openUp={isLastRow}
                done={exerciseDone[exerciseIndex] ?? false}
              />
            );
          })}

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <StickyNote label="Coach's notes" text={todaysWorkout.coachNote} />

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

type DraftSet = { reps: string; weight: string };

// Splits a reps value like "12 each leg" or "45 sec" into an editable leading
// number and a fixed, non-editable clarification suffix.
function splitReps(reps: string): { number: string; suffix: string } {
  const match = reps.match(/^(\d+)(.*)$/);
  return match ? { number: match[1], suffix: match[2] } : { number: reps, suffix: "" };
}

function NotebookSection({
  exercise,
  sets,
  onToggleSet,
  onUpdateSet,
  why,
  muscleGroup,
  alternates,
  onSwap,
  openLeft,
  openUp,
  done,
}: {
  exercise: Exercise;
  sets: SetProgress[];
  onToggleSet: (setIndex: number) => void;
  onUpdateSet: (setIndex: number, field: "reps" | "weight", value: string) => void;
  why: string;
  muscleGroup: string;
  alternates: string[];
  onSwap: (name: string) => void;
  openLeft: boolean;
  openUp: boolean;
  done: boolean;
}) {
  const hasWeight = exercise.targetWeight !== undefined;
  const { suffix: repsSuffix } = splitReps(exercise.reps);
  const gridCols = hasWeight ? "grid-cols-[auto_1fr_1fr_auto]" : "grid-cols-[auto_1fr_auto]";

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftSet[]>([]);

  function startEditing() {
    setDraft(sets.map((s) => ({ reps: splitReps(s.reps).number, weight: s.weight })));
    setIsEditing(true);
  }

  function updateDraft(setIndex: number, field: "reps" | "weight", value: string) {
    setDraft((prev) => prev.map((d, i) => (i !== setIndex ? d : { ...d, [field]: value })));
  }

  function handleSave() {
    draft.forEach((d, i) => {
      onUpdateSet(i, "reps", `${d.reps}${repsSuffix}`);
      if (hasWeight) onUpdateSet(i, "weight", d.weight);
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft([]);
  }

  return (
    <div className="relative flex flex-col rounded-2xl border-2 border-[#33465C]/15 bg-white p-6 shadow-sm shadow-black/5 sm:min-h-0 dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:shadow-black/20">
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

      <div className="relative flex flex-1 flex-col sm:min-h-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h2 className={`text-2xl leading-tight ${INK} ${caveat.className}`}>{exercise.name}</h2>
            <ExerciseMenuButton
              tip={exercise.formTip}
              why={why}
              muscleGroup={muscleGroup}
              alternates={alternates}
              onSwap={onSwap}
              openLeft={openLeft}
              openUp={openUp}
            />
          </div>
          <div className="flex flex-none items-center gap-2">
            <span className={`whitespace-nowrap text-[11px] ${FAINT}`}>Rest {exercise.rest}</span>
            {!isEditing && (
              <button
                type="button"
                onClick={startEditing}
                aria-label="Edit sets"
                className={`flex-none ${MUTED} transition-colors hover:text-[#33465C] dark:hover:text-[#6E8CB0]`}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-1 flex flex-1 flex-col sm:min-h-0">
          <div className={`grid ${gridCols} items-center gap-x-2 gap-y-1 text-[10px] font-medium uppercase tracking-wide ${FAINT}`}>
            <span>Set</span>
            <span>Reps</span>
            {hasWeight && <span>Weight</span>}
            <span>Done</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {sets.map((set, setIndex) => (
              <div key={setIndex} className={`grid h-7 ${gridCols} items-center gap-x-2`}>
                <span className={`w-4 text-sm ${MUTED}`}>{setIndex + 1}</span>
                {isEditing ? (
                  <div className="flex items-baseline gap-1">
                    <input
                      value={draft[setIndex]?.reps ?? ""}
                      onChange={(e) => updateDraft(setIndex, "reps", e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      className="w-8 border-0 border-b border-dashed border-[#33465C]/25 bg-transparent px-0.5 py-0.5 text-sm text-[#33465C] focus:border-solid focus:border-[#33465C]/60 focus:outline-none dark:border-[#6E8CB0]/25 dark:text-[#6E8CB0] dark:focus:border-[#6E8CB0]/60"
                    />
                    {repsSuffix && <span className={`whitespace-nowrap text-xs ${MUTED}`}>{repsSuffix}</span>}
                  </div>
                ) : (
                  <span className={`inline-block border-b border-dashed border-[#33465C]/25 px-0.5 py-0.5 text-sm ${INK} dark:border-[#6E8CB0]/25`}>
                    {set.reps}
                  </span>
                )}
                {hasWeight &&
                  (isEditing ? (
                    <input
                      value={draft[setIndex]?.weight ?? ""}
                      onChange={(e) => updateDraft(setIndex, "weight", e.target.value)}
                      placeholder="lbs"
                      className="w-full border-0 border-b border-dashed border-[#33465C]/25 bg-transparent px-0.5 py-0.5 text-sm text-[#33465C] placeholder:text-[#33465C]/40 focus:border-solid focus:border-[#33465C]/60 focus:outline-none dark:border-[#6E8CB0]/25 dark:text-[#6E8CB0] dark:placeholder:text-[#6E8CB0]/40 dark:focus:border-[#6E8CB0]/60"
                    />
                  ) : (
                    <span className={`inline-block border-b border-dashed border-[#33465C]/25 px-0.5 py-0.5 text-sm ${INK} dark:border-[#6E8CB0]/25`}>
                      {set.weight ? `${set.weight} lbs` : "—"}
                    </span>
                  ))}
                <Checkbox checked={set.done} onToggle={() => onToggleSet(setIndex)} label="set" />
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="mt-2 flex flex-none gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 rounded-full bg-[#33465C] py-1.5 text-xs font-bold text-[#F4F6F7] transition-colors hover:bg-[#263548] dark:bg-[#6E8CB0] dark:text-[#141A21] dark:hover:bg-[#86A3C4]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={`flex-1 rounded-full py-1.5 text-xs font-semibold text-[#33465C] transition-colors hover:bg-[#33465C]/5 dark:text-[#9AA6B0] dark:hover:bg-white/5`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type MenuView = "menu" | "form" | "why" | "swap";

function pickThree(pool: string[]): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function ExerciseMenuButton({
  tip,
  why,
  muscleGroup,
  alternates,
  onSwap,
  openLeft,
  openUp,
}: {
  tip: string;
  why: string;
  muscleGroup: string;
  alternates: string[];
  onSwap: (name: string) => void;
  openLeft: boolean;
  openUp: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("menu");
  const [picks, setPicks] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggleOpen() {
    setOpen((prev) => {
      if (prev) setView("menu");
      return !prev;
    });
  }

  function openSwapView() {
    setPicks(pickThree(alternates));
    setView("swap");
  }

  function handlePickAlternate(name: string) {
    onSwap(name);
    setOpen(false);
    setView("menu");
  }

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        type="button"
        aria-label="Exercise options"
        onClick={toggleOpen}
        className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:text-[#E8CD6B] focus:outline-none focus-visible:text-[#E8CD6B] dark:hover:text-[#E8CD6B] dark:focus-visible:text-[#E8CD6B] ${
          open ? "text-[#E8CD6B] dark:text-[#E8CD6B]" : "text-[#8A939B] dark:text-[#67727C]"
        }`}
      >
        <LightbulbIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`absolute z-20 rounded-2xl bg-white shadow-lg shadow-black/10 dark:bg-[#1E2630] ${
            view === "menu" ? "w-36 p-1.5" : view === "swap" ? "w-max max-w-72 p-4" : "w-56 p-4"
          } ${openUp ? "bottom-full mb-2" : "top-full mt-2"} right-0 ${openLeft ? "" : "sm:right-auto sm:left-0"}`}
        >
          {view === "menu" && (
            <div className="space-y-0.5">
              <MenuOption label="Swap" onClick={openSwapView} />
              <MenuOption label="Why" onClick={() => setView("why")} />
              <MenuOption label="Form" onClick={() => setView("form")} />
            </div>
          )}

          {view === "form" && (
            <div>
              <BackRow onBack={() => setView("menu")} label="Form tips" />
              <p className={`mt-1 text-xs ${MUTED}`}>{tip}</p>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#33465C] px-3 py-2 text-xs font-bold text-[#F4F6F7] transition-colors hover:bg-[#263548] dark:bg-[#6E8CB0] dark:text-[#141A21] dark:hover:bg-[#86A3C4]"
              >
                <span aria-hidden>▶</span>
                <span>Watch demo</span>
              </button>
            </div>
          )}

          {view === "why" && (
            <div>
              <BackRow onBack={() => setView("menu")} label="Why this exercise" />
              <p className={`mt-1 text-xs ${MUTED}`}>{why}</p>
            </div>
          )}

          {view === "swap" && (
            <div>
              <BackRow onBack={() => setView("menu")} label={`Other exercises for ${muscleGroup}`} />
              <div className="mt-2 space-y-0.5">
                {picks.map((name) => (
                  <AlternateOption key={name} label={name} onClick={() => handlePickAlternate(name)} />
                ))}
              </div>
              <button
                type="button"
                onClick={openSwapView}
                className={`mt-2 flex items-center gap-1 text-xs ${MUTED} transition-colors hover:text-[#33465C] dark:hover:text-[#6E8CB0]`}
              >
                <RefreshIcon className="h-3 w-3" />
                <span>Refresh options</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold ${INK} transition-colors hover:bg-[#33465C]/5 dark:hover:bg-white/5`}
    >
      {label}
    </button>
  );
}

function AlternateOption({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-2.5 py-1 text-left text-xs ${MUTED} transition-colors hover:bg-[#33465C]/5 dark:hover:bg-white/5`}
    >
      {label}
    </button>
  );
}

function BackRow({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${MUTED} transition-colors hover:bg-[#33465C]/5 dark:hover:bg-white/5`}
      >
        <span aria-hidden>←</span>
      </button>
      <p className={`text-sm font-semibold ${INK}`}>{label}</p>
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6M4 13a8 8 0 0 0 13.7 4.7L20 15.4M4 4v4.6h4.6M15.4 20H20v-4.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
