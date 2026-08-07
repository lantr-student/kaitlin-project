"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppStateProvider";
import {
  DEFAULT_ONBOARDING,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVELS,
  GOAL_METRICS,
  GOAL_TYPES,
  defaultGoalStartDate,
  deriveGoalStartValue,
  type OnboardingAnswers,
} from "@/lib/data";

const STEP_LABELS = ["Goal", "Experience", "Frequency", "Equipment", "Your goal", "Review"];

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useAppState();

  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState(DEFAULT_ONBOARDING.goalType);
  const [experience, setExperience] = useState(DEFAULT_ONBOARDING.experience);
  const [daysPerWeek, setDaysPerWeek] = useState(DEFAULT_ONBOARDING.daysPerWeek);
  const [equipment, setEquipment] = useState<string[]>(DEFAULT_ONBOARDING.equipment);
  const [metric, setMetric] = useState(DEFAULT_ONBOARDING.goal.metric);
  const [currentValue, setCurrentValue] = useState(String(DEFAULT_ONBOARDING.goal.currentValue));
  const [targetValue, setTargetValue] = useState(String(DEFAULT_ONBOARDING.goal.targetValue));
  const [targetDate, setTargetDate] = useState(DEFAULT_ONBOARDING.goal.targetDate);

  const selectedMetric = GOAL_METRICS.find((m) => m.metric === metric) ?? GOAL_METRICS[0];
  const lastStep = STEP_LABELS.length - 1;

  function toggleEquipment(item: string) {
    setEquipment((prev) => (prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]));
  }

  function canAdvance(): boolean {
    if (step === 4) {
      return currentValue.trim() !== "" && targetValue.trim() !== "" && targetDate.trim() !== "";
    }
    return true;
  }

  function handleFinish() {
    const current = Number(currentValue);
    const target = Number(targetValue);
    const answers: OnboardingAnswers = {
      goalType,
      experience,
      daysPerWeek,
      equipment,
      goal: {
        metric: selectedMetric.metric,
        unit: selectedMetric.unit,
        currentValue: current,
        targetValue: target,
        startValue: deriveGoalStartValue(current, target),
        startDate: defaultGoalStartDate(),
        targetDate,
      },
    };
    completeOnboarding(answers);
    router.push("/plan");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10 sm:py-16">
      <div className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepShell title="What's your main goal?" subtitle="This shapes how Spotter balances your weekly plan.">
            <OptionList options={GOAL_TYPES} selected={goalType} onSelect={setGoalType} />
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="What's your experience level?" subtitle="Helps Spotter pick sensible starting weights and volume.">
            <OptionList options={EXPERIENCE_LEVELS} selected={experience} onSelect={setExperience} />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="How many days a week can you train?" subtitle="Be realistic — consistency beats an ambitious plan you skip.">
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDaysPerWeek(n)}
                  className={`flex h-14 flex-1 items-center justify-center rounded-xl border text-lg font-semibold transition-colors ${
                    daysPerWeek === n
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="What equipment do you have access to?" subtitle="Pick everything available — Spotter will only program what you can use.">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EQUIPMENT_OPTIONS.map((item) => {
                const active = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                      active
                        ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title="Set one dated goal" subtitle="A specific target and date is what lets Spotter track your pace.">
            <div className="space-y-4">
              <Field label="What are you working toward?">
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {GOAL_METRICS.map((m) => (
                    <option key={m.metric} value={m.metric}>
                      {m.metric}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={`Where are you now (${selectedMetric.unit})?`}>
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>

              <Field label={`Target (${selectedMetric.unit})`}>
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>

              <Field label="Target date">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </Field>
            </div>
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title="Here's what we've got" subtitle="Spotter will build your plan around this.">
            <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              <SummaryRow label="Goal type" value={goalType} />
              <SummaryRow label="Experience" value={experience} />
              <SummaryRow label="Days per week" value={`${daysPerWeek} days`} />
              <SummaryRow label="Equipment" value={equipment.length ? equipment.join(", ") : "Bodyweight only"} />
              <SummaryRow
                label="Dated goal"
                value={`${selectedMetric.metric}: ${currentValue} → ${targetValue} ${selectedMetric.unit} by ${new Date(
                  `${targetDate}T00:00:00`
                ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              />
            </dl>
          </StepShell>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            className="flex-1 rounded-full border border-zinc-300 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Back
          </button>
        )}
        {step < lastStep ? (
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep((s) => Math.min(s + 1, lastStep))}
            className="flex-1 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            className="flex-1 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Build my plan
          </button>
        )}
      </div>
    </main>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      {children}
    </div>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
            selected === option
              ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-600"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-800 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
