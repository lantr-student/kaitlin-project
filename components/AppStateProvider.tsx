"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_ACCOUNT,
  DEFAULT_ONBOARDING,
  FIRST_NAME,
  PROGRESS_ACTIVITY,
  TODAYS_WORKOUT,
  type Account,
  type OnboardingAnswers,
} from "@/lib/data";
import type { CoachIconId } from "@/components/icons";

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
    longestStreakDays: number;
    workoutsThisWeek: number;
    plannedThisWeek: number;
    workoutsThisMonth: number;
    plannedThisMonth: number;
    totalWorkoutDays: number;
    totalWeightLifted: number;
  };
  coachIcon: CoachIconId;
  setCoachIcon: (id: CoachIconId) => void;
  account: Account;
  updateAccountEmail: (email: string) => void;
  updateAccountPassword: (password: string) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
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
  const [coachIcon, setCoachIcon] = useState<CoachIconId>("smiley");
  const [account, setAccount] = useState<Account>(DEFAULT_ACCOUNT);
  const [displayName, setDisplayName] = useState(FIRST_NAME);

  const exerciseDone = useMemo(
    () => setProgress.map((sets) => sets.length > 0 && sets.every((set) => set.done)),
    [setProgress]
  );
  const workoutCompleted = exerciseDone.length > 0 && exerciseDone.every(Boolean);
  const workoutStarted = setProgress.some((sets) => sets.some((set) => set.done));

  // Real volume from today's actually-logged sets (weight x reps), so completed sets
  // contribute their real numbers rather than a flat placeholder increment.
  const sessionVolume = useMemo(
    () =>
      setProgress.reduce(
        (sum, sets) =>
          sum +
          sets.reduce((setSum, set) => {
            const weight = Number(set.weight);
            const reps = Number(set.reps);
            return set.done && Number.isFinite(weight) && Number.isFinite(reps) ? setSum + weight * reps : setSum;
          }, 0),
        0
      ),
    [setProgress]
  );

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
      activity: (() => {
        const streakDays = PROGRESS_ACTIVITY.streakDays + (workoutCompleted ? 1 : 0);
        return {
          streakDays,
          longestStreakDays: Math.max(PROGRESS_ACTIVITY.longestStreakDays, streakDays),
          workoutsThisWeek: PROGRESS_ACTIVITY.workoutsThisWeek + (workoutCompleted ? 1 : 0),
          plannedThisWeek: PROGRESS_ACTIVITY.plannedThisWeek,
          workoutsThisMonth: PROGRESS_ACTIVITY.workoutsThisMonth + (workoutCompleted ? 1 : 0),
          plannedThisMonth: PROGRESS_ACTIVITY.plannedThisMonth,
          totalWorkoutDays: PROGRESS_ACTIVITY.totalWorkoutDays + (workoutCompleted ? 1 : 0),
          totalWeightLifted: PROGRESS_ACTIVITY.totalWeightLifted + sessionVolume,
        };
      })(),
      coachIcon,
      setCoachIcon,
      account,
      updateAccountEmail: (email) => setAccount((prev) => ({ ...prev, email })),
      updateAccountPassword: (password) => setAccount((prev) => ({ ...prev, password })),
      displayName,
      setDisplayName,
    }),
    [
      onboarding,
      hasOnboarded,
      setProgress,
      exerciseDone,
      workoutStarted,
      workoutCompleted,
      sessionVolume,
      coachIcon,
      account,
      displayName,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
