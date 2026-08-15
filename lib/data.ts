import exerciseLibraryData from "../backend/data/exercises.json";

export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  targetWeight?: number;
  formTip: string;
};

export type SetProgress = { done: boolean; reps: string; weight: string };

export type PlanDay = {
  day: string;
  focus: string;
  isRestDay?: boolean;
  exercises: Exercise[];
  coachNote: string;
};

export type Goal = {
  metric: string;
  unit: string;
  startValue: number;
  currentValue: number;
  targetValue: number;
  startDate: string;
  targetDate: string;
};

export type OnboardingAnswers = {
  goalType: string;
  experience: string;
  daysPerWeek: number;
  equipment: string[];
  goal: Goal;
};

export type TrajectoryPoint = {
  label: string;
  ideal: number;
  actual: number | null;
  isToday?: boolean;
};

export type CoachTurn = { from: "coach" | "user"; text: string };

export type Account = { email: string; password: string };

// Hardcoded until real accounts/auth exist — shared by the Plan greeting and the Profile page.
export const FIRST_NAME = "Kaitlin";

export const DEFAULT_ACCOUNT: Account = {
  email: "kaitlin@example.com",
  password: "TrainHard24!",
};

export const GOAL_TYPES = [
  "Build strength",
  "Build muscle",
  "Lose fat",
  "Improve endurance",
  "Improve Overall Fitness",
];

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbells",
  "Kettlebell",
  "Bench",
  "Squat rack",
  "Pull-up bar",
  "Resistance bands",
  "Cable machine",
  "Leg machine",
  "Cardio machine",
  "Bodyweight only",
];

export const GOAL_METRICS: { metric: string; unit: string; higherIsBetter: boolean }[] = [
  { metric: "Bench Press", unit: "lbs", higherIsBetter: true },
  { metric: "Back Squat", unit: "lbs", higherIsBetter: true },
  { metric: "Deadlift", unit: "lbs", higherIsBetter: true },
  { metric: "5K run time", unit: "min", higherIsBetter: false },
  { metric: "Body weight", unit: "lbs", higherIsBetter: false },
];

const TODAY_ISO = "2026-08-05";

export const DEFAULT_ONBOARDING: OnboardingAnswers = {
  goalType: "Build strength",
  experience: "Intermediate",
  daysPerWeek: 4,
  equipment: ["Barbell", "Dumbbells", "Bench", "Squat rack"],
  goal: {
    metric: "Bench Press",
    unit: "lbs",
    startValue: 105,
    currentValue: 115,
    targetValue: 135,
    startDate: "2026-06-01",
    targetDate: "2026-12-01",
  },
};

export const WEEKLY_PLAN: PlanDay[] = [
  {
    day: "Monday",
    focus: "Upper Body Push",
    exercises: [
      {
        name: "Bench Press",
        sets: 4,
        reps: "6",
        rest: "2 min",
        targetWeight: 115,
        formTip: "Keep your feet planted, shoulder blades pulled back and down, and lower the bar to your mid-chest with control.",
      },
      {
        name: "Overhead Press",
        sets: 3,
        reps: "8",
        rest: "90 sec",
        targetWeight: 65,
        formTip: "Brace your core and glutes so you're not leaning back; press the bar in a straight line overhead.",
      },
      {
        name: "Incline Dumbbell Press",
        sets: 3,
        reps: "10",
        rest: "90 sec",
        targetWeight: 40,
        formTip: "Keep a slight arch, elbows at about 45°, and don't let the dumbbells drift too far forward.",
      },
      {
        name: "Close-Grip Bench Press",
        sets: 3,
        reps: "8",
        rest: "90 sec",
        targetWeight: 95,
        formTip: "Keep your grip just inside shoulder width and your elbows tucked, tracking close to your ribs on the way down.",
      },
    ],
    coachNote:
      "Push days are where you're strongest right now — try adding a rep or two on the overhead press before adding weight.",
  },
  {
    day: "Tuesday",
    focus: "Rest / Mobility",
    isRestDay: true,
    exercises: [],
    coachNote: "Rest day — prioritize sleep, hydration, and light mobility work. No sets to log today.",
  },
  {
    day: "Wednesday",
    focus: "Lower Body",
    exercises: [
      {
        name: "Back Squat",
        sets: 4,
        reps: "6",
        rest: "2 min",
        targetWeight: 155,
        formTip: "Keep your chest up and knees tracking over your toes; hit depth before driving back up.",
      },
      {
        name: "Romanian Deadlift",
        sets: 3,
        reps: "8",
        rest: "90 sec",
        targetWeight: 115,
        formTip:
          "Hinge at the hips with a soft knee bend, keep the bar close to your legs, and stop when you feel a stretch in your hamstrings.",
      },
      {
        name: "Walking Lunge",
        sets: 3,
        reps: "12 each leg",
        rest: "60 sec",
        targetWeight: 30,
        formTip: "Keep your torso upright and step far enough that your front knee stays behind your toes.",
      },
      {
        name: "Glute Bridge",
        sets: 3,
        reps: "15",
        rest: "60 sec",
        formTip: "Drive through your heels and squeeze your glutes hard at the top — avoid arching your lower back to get there.",
      },
      {
        name: "Plank",
        sets: 3,
        reps: "45 sec",
        rest: "45 sec",
        formTip: "Squeeze your glutes and brace your abs so your hips don't sag or pike up.",
      },
    ],
    coachNote:
      "Nice pace on squats last week — try adding 5 lbs to your working sets today. Keep the core braced through the RDLs and don't rush the lunges.",
  },
  {
    day: "Thursday",
    focus: "Rest",
    isRestDay: true,
    exercises: [],
    coachNote: "Rest day — prioritize sleep, hydration, and light mobility work. No sets to log today.",
  },
  {
    day: "Friday",
    focus: "Upper Body Pull",
    exercises: [
      {
        name: "Barbell Row",
        sets: 4,
        reps: "8",
        rest: "90 sec",
        targetWeight: 95,
        formTip: "Hinge forward with a flat back and pull the bar to your lower ribs, leading with your elbows.",
      },
      {
        name: "Pull-Up",
        sets: 3,
        reps: "6",
        rest: "90 sec",
        formTip: "Start from a dead hang and pull until your chin clears the bar, without kipping or swinging.",
      },
      {
        name: "Dumbbell Row",
        sets: 3,
        reps: "10",
        rest: "90 sec",
        targetWeight: 50,
        formTip: "Brace one hand on the bench, keep your back flat, and row the dumbbell to your hip without twisting your torso.",
      },
      {
        name: "Barbell Curl",
        sets: 3,
        reps: "12",
        rest: "60 sec",
        targetWeight: 45,
        formTip: "Keep your elbows tucked at your sides and avoid swinging your torso to move the weight.",
      },
    ],
    coachNote:
      "Pull volume has been climbing nicely — keep your shoulder blades pulled back on rows and don't let them turn into shrugs.",
  },
  {
    day: "Saturday",
    focus: "Full Body / Accessories",
    exercises: [
      {
        name: "Trap Bar Deadlift",
        sets: 3,
        reps: "6",
        rest: "2 min",
        targetWeight: 185,
        formTip: "Push through the floor with your legs first, keep the bar path close, and stand tall at the top.",
      },
      {
        name: "Dumbbell Shoulder Press",
        sets: 3,
        reps: "10",
        rest: "90 sec",
        targetWeight: 35,
        formTip: "Keep your core tight so you're not overarching your lower back as you press overhead.",
      },
      {
        name: "Cable Face Pull",
        sets: 3,
        reps: "15",
        rest: "60 sec",
        targetWeight: 30,
        formTip: "Pull toward your face with elbows high and squeeze your shoulder blades at the end of the movement.",
      },
      {
        name: "Farmer's Carry",
        sets: 3,
        reps: "40 yd",
        rest: "60 sec",
        targetWeight: 50,
        formTip: "Keep your shoulders back and core braced — walk with control, don't let the weights swing.",
      },
    ],
    coachNote:
      "This one's your accessory day — lighter loads, but keep intent high on every rep, especially the face pulls.",
  },
  {
    day: "Sunday",
    focus: "Rest",
    isRestDay: true,
    exercises: [],
    coachNote: "Rest day — prioritize sleep, hydration, and light mobility work. No sets to log today.",
  },
];

export const TODAYS_WORKOUT: PlanDay = WEEKLY_PLAN[2];

// The exercise library (backend/data/exercises.json) is the single source of
// truth for exercise metadata — every exercise anywhere in the app (mock plan
// or backend-generated) is drawn from it. Substitutes/progression/regression
// aren't stored here anymore — they're computed by the backend (see
// backend/exercise_library.py) from these attributes, and fetched via
// fetchExerciseRelations in lib/api.ts.
type LibraryExercise = {
  name: string;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment: string[];
  movement_pattern: string;
  exercise_type: string;
  experience_level: string;
  stability_demand: string;
  skill_demand: string;
  unilateral: boolean;
  joint_demands: string[];
};

const EXERCISE_LIBRARY = exerciseLibraryData as LibraryExercise[];

export function libraryInfoForExercise(name: string): { muscleGroup: string | null } {
  const entry = EXERCISE_LIBRARY.find((ex) => ex.name === name);
  return { muscleGroup: entry ? entry.primary_muscles.join(" & ") : null };
}

export const PROGRESS_ACTIVITY = {
  // Consecutive workout days completed with none missed — resets to 0 the moment a
  // scheduled workout day is skipped. Hardcoded for now (no persisted daily history
  // to compute this from); AppStateProvider bumps it by 1 live when today's workout
  // is finished this session. Currently tied with longestStreakDays (16) — finishing
  // today's workout pushes it to 17, becoming a new all-time record.
  streakDays: 16,
  // Longest unbroken streak ever, must be >= streakDays. Hardcoded for now. Right
  // now it's tied with the current streak (both 16) rather than an older, separate
  // record — AppStateProvider takes Math.max(longestStreakDays, live streakDays),
  // so completing today's workout (streakDays -> 17) automatically becomes the new
  // longest streak with no other change needed.
  longestStreakDays: 16,
  workoutsThisWeek: 1,
  plannedThisWeek: 4,
  workoutsThisMonth: 9,
  plannedThisMonth: 13,
  // Lifetime total of completed workout days, independent of the current streak
  // (keeps counting even after a streak resets). Also hardcoded for now — 32 =
  // the sum of PAST_WEEKLY_COMPLETIONS (31) below plus workoutsThisWeek (1).
  totalWorkoutDays: 32,
  // All-time volume (sum of weight x reps across every completed set), in the same
  // lbs unit WEEKLY_PLAN's targetWeights use. Base amount hardcoded (no persisted
  // history of past sessions) — derived from WEEKLY_PLAN's own per-session volume
  // (~9,295 lbs/session average across the 4 weekly workout days) x 32 completed
  // sessions =~ 297,440, rounded to 295,000. AppStateProvider adds today's actual
  // logged volume (from setProgress) live on top of this base.
  totalWeightLifted: 295000,
};

function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function today(): Date {
  return parseISODate(TODAY_ISO);
}

function mondayOf(date: Date): Date {
  const day = date.getDay(); // 0 (Sun) - 6 (Sat)
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

function formatSlashDate(date: Date): string {
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()}/${yy}`;
}

/** Date range (Monday-Sunday) of the week containing "today", e.g. "8/3/26-8/9/26". */
export function thisWeekRangeLabel(): string {
  const monday = mondayOf(today());
  const sunday = addDays(monday, 6);
  return `${formatSlashDate(monday)}-${formatSlashDate(sunday)}`;
}

function isHigherBetter(goal: Goal): boolean {
  return goal.targetValue >= goal.startValue;
}

/** How far the user's current value is from start toward target, as a 0-100 percentage. */
export function goalProgressPercent(goal: Goal): number {
  const span = goal.targetValue - goal.startValue;
  if (span === 0) return 100;
  const frac = (goal.currentValue - goal.startValue) / span;
  return Math.round(Math.min(Math.max(frac, 0), 1) * 100);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** ~8 weeks before today — the flavor "start of this goal" date used for any goal set during onboarding. */
export function defaultGoalStartDate(): string {
  return isoDate(addDays(today(), -56));
}

/**
 * Derives a plausible starting value for a freshly-entered goal: a bit less
 * progressed than the current value, in the direction the goal is moving,
 * so the trajectory chart has a believable recent history to show.
 */
export function deriveGoalStartValue(currentValue: number, targetValue: number): number {
  const direction = targetValue >= currentValue ? 1 : -1;
  const magnitude = Math.abs(targetValue - currentValue) || Math.abs(currentValue) * 0.1 || 5;
  return Math.round((currentValue - direction * 0.15 * magnitude) * 10) / 10;
}

/**
 * Builds a set of checkpoints between the goal's start and target date: an
 * even ideal (linear) pace line covering the whole span, plus an "actual"
 * line that interpolates from the starting value to the user's reported
 * current value — so today's actual point always matches what they entered
 * in onboarding, and earlier points show a plausible path to get there.
 */
export function buildTrajectory(goal: Goal): TrajectoryPoint[] {
  const start = parseISODate(goal.startDate);
  const target = parseISODate(goal.targetDate);
  const totalDays = Math.max(daysBetween(start, target), 1);
  const elapsedDays = Math.min(Math.max(daysBetween(start, today()), 0), totalDays);
  const idealDelta = goal.targetValue - goal.startValue;
  const actualDelta = goal.currentValue - goal.startValue;

  const CHECKPOINTS = 8;
  const dayOffsets = new Set<number>();
  for (let i = 0; i <= CHECKPOINTS; i++) {
    dayOffsets.add(Math.round((i / CHECKPOINTS) * totalDays));
  }
  dayOffsets.add(elapsedDays);

  const sortedOffsets = Array.from(dayOffsets).sort((a, b) => a - b);

  return sortedOffsets.map((offset) => {
    const date = addDays(start, offset);
    const ideal = goal.startValue + idealDelta * (offset / totalDays);
    const isToday = offset === elapsedDays;
    const isPast = offset <= elapsedDays;

    let actual: number | null = null;
    if (isPast) {
      const progressFrac = elapsedDays === 0 ? 0 : offset / elapsedDays;
      actual = Math.round((goal.startValue + actualDelta * progressFrac) * 10) / 10;
    }

    return {
      label: formatShortDate(date) + (isToday ? " (today)" : offset === totalDays ? " (goal)" : ""),
      ideal: Math.round(ideal * 10) / 10,
      actual,
      isToday,
    };
  });
}

export type WeeklyConsistencyPoint = {
  label: string;
  completed: number;
  planned: number;
  status: "past" | "current" | "future";
};

// Hardcoded completions for every week before the current one, oldest first — 9 weeks
// (2026-06-01 through the week before "today"), sums to 31 (+1 for this week so far =
// 32 = totalWorkoutDays). Tells the same story as the streak stats:
// - Weeks 0-4: five weeks of solid-but-imperfect early training (2,3,4,3,4 = 16
//   total) — a believable ramp-up, none of them perfect, so nothing here connects
//   into a longer streak than the current one.
// - Week 5: a partial week (3/4) — the streak actually begins mid-week here
//   (Wed-Sat), with that week's Monday as the missed day right before it.
// - Weeks 6-8: three perfect 4/4 weeks continuing the streak unbroken into today.
// - Together, week 5's 3 + weeks 6-8's 12 + today-so-far's 1 = 16, exactly matching
//   the current streakDays — which is currently tied with longestStreakDays, so
//   finishing today's workout sets a new all-time record (17).
const PAST_WEEKLY_COMPLETIONS = [2, 3, 4, 3, 4, 3, 4, 4, 4];

/**
 * Builds one bar per week from the goal's start date through its target date.
 * Weeks fully in the past pull from PAST_WEEKLY_COMPLETIONS (hardcoded, oldest
 * first); the current week uses the live workoutsThisWeek count so it updates
 * as sets get checked off; future weeks show the planned pace as a projection.
 */
export function buildWeeklyConsistency(
  goal: Goal,
  plannedThisWeek: number,
  workoutsThisWeek: number
): WeeklyConsistencyPoint[] {
  const start = parseISODate(goal.startDate);
  const target = parseISODate(goal.targetDate);
  const now = today();

  const points: WeeklyConsistencyPoint[] = [];
  let pastIndex = 0;

  for (let weekStart = start; weekStart <= target; weekStart = addDays(weekStart, 7)) {
    const weekEnd = addDays(weekStart, 6);
    const isCurrent = weekStart <= now && now <= weekEnd;
    const isPast = weekEnd < now;

    const completed = isPast
      ? PAST_WEEKLY_COMPLETIONS[Math.min(pastIndex, PAST_WEEKLY_COMPLETIONS.length - 1)]
      : isCurrent
        ? workoutsThisWeek
        : plannedThisWeek;
    if (isPast) pastIndex++;

    points.push({
      label: formatShortDate(weekStart),
      completed,
      planned: plannedThisWeek,
      status: isPast ? "past" : isCurrent ? "current" : "future",
    });
  }

  return points;
}

export function computeProgressStats(goal: Goal, trajectory: TrajectoryPoint[]) {
  const todayPoint = trajectory.find((p) => p.isToday) ?? trajectory[trajectory.length - 1];
  const actualToday = todayPoint.actual ?? goal.currentValue;
  const idealToday = todayPoint.ideal;
  const gap = Math.round(Math.abs(idealToday - actualToday) * 10) / 10;
  const behind = isHigherBetter(goal) ? actualToday < idealToday : actualToday > idealToday;
  const daysRemaining = Math.max(daysBetween(today(), parseISODate(goal.targetDate)), 0);

  return {
    idealToday: Math.round(idealToday * 10) / 10,
    actualToday: Math.round(actualToday * 10) / 10,
    paceGap: gap,
    behindPace: behind,
    daysRemaining,
    weeksRemaining: Math.max(Math.round(daysRemaining / 7), 0),
  };
}
