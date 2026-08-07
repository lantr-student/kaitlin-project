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
  workoutCompleted: boolean;
  completeWorkout: () => void;
  activity: { streakDays: number; workoutsThisMonth: number; plannedThisMonth: number };
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
  const [workoutCompleted, setWorkoutCompleted] = useState(false);

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
      workoutCompleted,
      completeWorkout: () => setWorkoutCompleted(true),
      activity: {
        streakDays: PROGRESS_ACTIVITY.streakDays + (workoutCompleted ? 1 : 0),
        workoutsThisMonth: PROGRESS_ACTIVITY.workoutsThisMonth + (workoutCompleted ? 1 : 0),
        plannedThisMonth: PROGRESS_ACTIVITY.plannedThisMonth,
      },
    }),
    [onboarding, hasOnboarded, setProgress, workoutCompleted]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
