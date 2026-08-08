"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_ONBOARDING, PROGRESS_ACTIVITY, TODAYS_WORKOUT, type OnboardingAnswers } from "@/lib/data";

type SetProgress = { done: boolean; reps: string; weight: string };

type AppState = {
  onboarding: OnboardingAnswers;
  hasOnboarded: boolean;
  completeOnboarding: (answers: OnboardingAnswers) => void;
  setProgress: SetProgress[][];
  toggleSet: (exerciseIndex: number, setIndex: number) => void;
  updateSetField: (exerciseIndex: number, setIndex: number, field: "reps" | "weight", value: string) => void;
  exerciseDone: boolean[];
  toggleExercise: (exerciseIndex: number) => void;
  workoutStarted: boolean;
  workoutCompleted: boolean;
  activity: {
    streakDays: number;
    weekStreak: number;
    workoutsThisWeek: number;
    plannedThisWeek: number;
    workoutsThisMonth: number;
    plannedThisMonth: number;
  };
};

const AppStateContext = createContext<AppState | null>(null);

function makeInitialSetProgress(): SetProgress[][] {
  return TODAYS_WORKOUT.exercises.map((exercise) =>
    Array.from({ length: exercise.sets }, () => ({
      done: false,
      reps: exercise.reps,
      weight: exercise.targetWeight ? String(exercise.targetWeight) : "",
    }))
  );
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [onboarding, setOnboarding] = useState<OnboardingAnswers>(DEFAULT_ONBOARDING);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [setProgress, setSetProgress] = useState<SetProgress[][]>(makeInitialSetProgress);

  const exerciseDone = useMemo(
    () => setProgress.map((sets) => sets.length > 0 && sets.every((set) => set.done)),
    [setProgress]
  );
  const workoutCompleted = exerciseDone.length > 0 && exerciseDone.every(Boolean);
  const workoutStarted = setProgress.some((sets) => sets.some((set) => set.done));

  const value = useMemo<AppState>(
    () => ({
      onboarding,
      hasOnboarded,
      completeOnboarding: (answers) => {
        setOnboarding(answers);
        setHasOnboarded(true);
      },
      setProgress,
      toggleSet: (exerciseIndex, setIndex) => {
        setSetProgress((prev) =>
          prev.map((sets, ei) =>
            ei !== exerciseIndex
              ? sets
              : sets.map((set, si) => (si !== setIndex ? set : { ...set, done: !set.done }))
          )
        );
      },
      updateSetField: (exerciseIndex, setIndex, field, value) => {
        setSetProgress((prev) =>
          prev.map((sets, ei) =>
            ei !== exerciseIndex
              ? sets
              : sets.map((set, si) => (si !== setIndex ? set : { ...set, [field]: value }))
          )
        );
      },
      exerciseDone,
      toggleExercise: (exerciseIndex) => {
        setSetProgress((prev) =>
          prev.map((sets, ei) =>
            ei !== exerciseIndex ? sets : sets.map((set) => ({ ...set, done: !exerciseDone[exerciseIndex] }))
          )
        );
      },
      workoutStarted,
      workoutCompleted,
      activity: {
        streakDays: PROGRESS_ACTIVITY.streakDays + (workoutCompleted ? 1 : 0),
        weekStreak: PROGRESS_ACTIVITY.weekStreak,
        workoutsThisWeek: PROGRESS_ACTIVITY.workoutsThisWeek + (workoutCompleted ? 1 : 0),
        plannedThisWeek: PROGRESS_ACTIVITY.plannedThisWeek,
        workoutsThisMonth: PROGRESS_ACTIVITY.workoutsThisMonth + (workoutCompleted ? 1 : 0),
        plannedThisMonth: PROGRESS_ACTIVITY.plannedThisMonth,
      },
    }),
    [onboarding, hasOnboarded, setProgress, exerciseDone, workoutStarted, workoutCompleted]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
