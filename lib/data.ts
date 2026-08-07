export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  targetWeight?: number;
};

export type PlanDay = {
  day: string;
  focus: string;
  isRestDay?: boolean;
  exercises: Exercise[];
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

export type CoachTurn =
  | { from: "coach"; observation: string; reasoning: string; recommendation: string }
  | { from: "user"; text: string };

export const GOAL_TYPES = [
  "Build strength",
  "Build muscle",
  "Lose fat",
  "Improve endurance",
  "General fitness",
];

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbells",
  "Bench",
  "Squat rack",
  "Pull-up bar",
  "Resistance bands",
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

export const TODAY_ISO = "2026-08-04";

export const DEFAULT_ONBOARDING: OnboardingAnswers = {
  goalType: "Build strength",
  experience: "Intermediate",
  daysPerWeek: 4,
  equipment: ["Barbell", "Dumbbells", "Bench", "Squat rack"],
  goal: {
    metric: "Bench Press",
    unit: "lbs",
    startValue: 95,
    currentValue: 105,
    targetValue: 135,
    startDate: "2026-06-01",
    targetDate: "2026-12-15",
  },
};

export const WEEKLY_PLAN: PlanDay[] = [
  {
    day: "Monday",
    focus: "Upper Body Push",
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6", rest: "2 min", targetWeight: 105 },
      { name: "Overhead Press", sets: 3, reps: "8", rest: "90 sec", targetWeight: 65 },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10", rest: "90 sec", targetWeight: 40 },
      { name: "Triceps Pushdown", sets: 3, reps: "12", rest: "60 sec", targetWeight: 35 },
    ],
  },
  { day: "Tuesday", focus: "Rest / Mobility", isRestDay: true, exercises: [] },
  {
    day: "Wednesday",
    focus: "Lower Body",
    exercises: [
      { name: "Back Squat", sets: 4, reps: "6", rest: "2 min", targetWeight: 155 },
      { name: "Romanian Deadlift", sets: 3, reps: "8", rest: "90 sec", targetWeight: 115 },
      { name: "Walking Lunges", sets: 3, reps: "12 each leg", rest: "60 sec", targetWeight: 30 },
      { name: "Leg Press", sets: 3, reps: "10", rest: "90 sec", targetWeight: 220 },
      { name: "Plank", sets: 3, reps: "45 sec", rest: "45 sec" },
    ],
  },
  { day: "Thursday", focus: "Rest", isRestDay: true, exercises: [] },
  {
    day: "Friday",
    focus: "Upper Body Pull",
    exercises: [
      { name: "Barbell Row", sets: 4, reps: "8", rest: "90 sec", targetWeight: 95 },
      { name: "Lat Pulldown", sets: 3, reps: "10", rest: "90 sec", targetWeight: 100 },
      { name: "Seated Cable Row", sets: 3, reps: "10", rest: "90 sec", targetWeight: 90 },
      { name: "Barbell Curl", sets: 3, reps: "12", rest: "60 sec", targetWeight: 45 },
    ],
  },
  {
    day: "Saturday",
    focus: "Full Body / Accessories",
    exercises: [
      { name: "Trap Bar Deadlift", sets: 3, reps: "6", rest: "2 min", targetWeight: 185 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "10", rest: "90 sec", targetWeight: 35 },
      { name: "Cable Face Pull", sets: 3, reps: "15", rest: "60 sec", targetWeight: 30 },
      { name: "Farmer's Carry", sets: 3, reps: "40 yd", rest: "60 sec", targetWeight: 50 },
    ],
  },
  { day: "Sunday", focus: "Rest", isRestDay: true, exercises: [] },
];

export const TODAYS_WORKOUT: PlanDay = WEEKLY_PLAN[2];

export const PROGRESS_ACTIVITY = {
  streakDays: 4,
  workoutsThisMonth: 9,
  plannedThisMonth: 13,
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

export function isHigherBetter(goal: Goal): boolean {
  return goal.targetValue >= goal.startValue;
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

export function buildCoachTranscript(
  goal: Goal,
  stats: ReturnType<typeof computeProgressStats>,
  activity: { workoutsThisMonth: number; plannedThisMonth: number } = PROGRESS_ACTIVITY
): CoachTurn[] {
  const paceWord = stats.behindPace ? "behind" : "ahead of";
  const metricLower = goal.metric.toLowerCase();

  return [
    {
      from: "coach",
      observation: `Your ${metricLower} is at ${stats.actualToday} ${goal.unit} — about ${stats.paceGap} ${goal.unit} ${paceWord} the pace needed to hit ${goal.targetValue} ${goal.unit} by ${new Date(
        `${goal.targetDate}T00:00:00`
      ).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`,
      reasoning: `Over the last 3 weeks you completed ${activity.workoutsThisMonth} of ${activity.plannedThisMonth} planned sessions this month. The sessions you did complete were solid — the missed ones are the main gap, not your effort on the days you trained.`,
      recommendation: `Let's add one short 20-minute session this week focused on ${metricLower}, without turning it into a full extra training day.`,
    },
    { from: "user", text: "That makes sense — I've been busy on Tuesdays. Could we make it shorter?" },
    {
      from: "coach",
      observation: "Your average logged session this month runs about 52 minutes, and Tuesday has been your tightest weekday window.",
      reasoning: `A focused 20-minute add-on covers the missing ${metricLower} volume without requiring a full session, which should fit inside a tighter Tuesday window.`,
      recommendation: "I've trimmed it to 3 exercises, about 20 minutes total — enough to move the needle without crowding your week.",
    },
    { from: "user", text: "Sounds good, let's try that." },
    {
      from: "coach",
      observation: `You're ${stats.paceGap} ${goal.unit} ${paceWord} pace with about ${stats.weeksRemaining} weeks left before your target date.`,
      reasoning: `At your current rate, closing a gap this size over ${stats.weeksRemaining} weeks just needs a small consistency boost — not a bigger program change.`,
      recommendation: "Stick with this week's plan plus the new add-on. I'll re-check your trajectory in two weeks and adjust from there.",
    },
  ];
}
