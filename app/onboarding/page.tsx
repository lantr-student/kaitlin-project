"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Quicksand, Caveat } from "next/font/google";
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
import { PRIMARY_BUTTON } from "@/lib/theme";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"] });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

const STEP_LABELS = ["Goal", "Experience", "Frequency", "Equipment", "Your goal", "Review"];

// Shared card styles: white, shadow-only "note" cards on the gray page background.
const CARD_INACTIVE =
  "bg-white text-[#26313D] shadow-sm shadow-black/5 hover:shadow-md dark:bg-[#242C36] dark:text-[#EDF1F4]";
const CARD_ACTIVE =
  "bg-[#A9BFA0]/25 text-[#26313D] shadow-md shadow-[#33465C]/10 dark:bg-[#7C9270]/25 dark:text-[#EDF1F4]";
const DAY_ACTIVE = "bg-[#33465C] text-[#F4F6F7] shadow-md shadow-[#33465C]/25 dark:bg-[#6E8CB0] dark:text-[#141A21]";
const INPUT_CLASS =
  "w-full rounded-xl bg-white px-3 py-3 text-sm text-[#26313D] shadow-sm shadow-black/5 focus:outline-none focus:ring-2 focus:ring-[#33465C]/30 dark:bg-[#242C36] dark:text-[#EDF1F4] dark:focus:ring-[#6E8CB0]/30";

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
    <main className={`flex flex-1 flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12 md:max-w-2xl md:py-16">
        <div className="mb-6">
          <p className={`mb-1.5 text-xl text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>
            Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#33465C]/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[#33465C] transition-all dark:bg-[#6E8CB0]"
              style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 rounded-3xl bg-white p-5 shadow-lg shadow-[#33465C]/10 sm:p-8 dark:bg-[#1E2630] dark:shadow-black/40">
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
              <div className="flex gap-2.5">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDaysPerWeek(n)}
                    className={`flex h-14 flex-1 items-center justify-center rounded-2xl text-lg font-semibold transition-all ${
                      daysPerWeek === n ? DAY_ACTIVE : CARD_INACTIVE
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
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {EQUIPMENT_OPTIONS.map((item) => {
                  const active = equipment.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleEquipment(item)}
                      className={`relative rounded-2xl px-3 py-3 text-left text-sm font-medium transition-all ${
                        active ? CARD_ACTIVE : CARD_INACTIVE
                      }`}
                    >
                      {item}
                      {active && <SketchCheck />}
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
                  <select value={metric} onChange={(e) => setMetric(e.target.value)} className={INPUT_CLASS}>
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
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label={`Target (${selectedMetric.unit})`}>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>

                <Field label="Target date">
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Here's what we've got" subtitle="Spotter will build your plan around this.">
              <div className="space-y-2.5">
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
              </div>
            </StepShell>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              className="flex-1 rounded-full bg-transparent py-3.5 text-base font-semibold text-[#33465C] transition-colors hover:bg-[#33465C]/5 dark:text-[#9AA6B0] dark:hover:bg-white/5"
            >
              Back
            </button>
          )}
          {step < lastStep ? (
            <button
              type="button"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => Math.min(s + 1, lastStep))}
              className={`${PRIMARY_BUTTON} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span>Continue</span>
              <span aria-hidden>→</span>
            </button>
          ) : (
            <button type="button" onClick={handleFinish} className={`${PRIMARY_BUTTON} flex-1`}>
              <span>Build my plan</span>
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-[#26313D] sm:text-4xl dark:text-[#EDF1F4]">{title}</h1>
      <p className="mt-1.5 mb-6 text-sm text-[#67727C] dark:text-[#9AA6B0]">{subtitle}</p>
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
    <div className="space-y-2.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={`relative w-full rounded-2xl px-4 py-3.5 text-left text-sm font-medium transition-all ${
            selected === option ? CARD_ACTIVE : CARD_INACTIVE
          }`}
        >
          {option}
          {selected === option && <SketchCheck />}
        </button>
      ))}
    </div>
  );
}

function SketchCheck() {
  return (
    <span
      aria-hidden
      className="absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#33465C] dark:bg-[#6E8CB0]"
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
        <path
          d="M4.5 10.3 Q6.7 13.2 8.4 13.8 Q12 8 15.5 5.2"
          className="fill-none stroke-[#F4F6F7] dark:stroke-[#141A21]"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#26313D] dark:text-[#EDF1F4]">{label}</span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm shadow-black/5 dark:bg-[#242C36]">
      <dt className="text-xs font-semibold tracking-wide text-[#8A939B] uppercase dark:text-[#67727C]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#26313D] dark:text-[#EDF1F4]">{value}</dd>
    </div>
  );
}
