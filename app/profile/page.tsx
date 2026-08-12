"use client";

import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useAppState } from "@/components/AppStateProvider";
import { CheckIcon } from "@/components/Checkbox";
import { COACH_ICONS, DumbbellIcon, FireIcon, PencilIcon } from "@/components/icons";
import { StatTile } from "@/components/StatTile";
import { goalProgressPercent } from "@/lib/data";
import { quicksand, caveat, DONE_TEXT, INK, MUTED, FAINT, PRIMARY_BUTTON } from "@/lib/theme";

const CARD = "rounded-3xl border-2 border-[#33465C]/15 bg-white p-6 shadow-sm shadow-black/5 sm:p-8 dark:border-[#6E8CB0]/20 dark:bg-[#1E2630] dark:shadow-black/20";
const INPUT_CLASS =
  "w-full rounded-xl bg-[#F4F6F7] px-3 py-3 text-sm text-[#26313D] shadow-sm shadow-black/5 focus:outline-none focus:ring-2 focus:ring-[#33465C]/30 dark:bg-[#242C36] dark:text-[#EDF1F4] dark:focus:ring-[#6E8CB0]/30";
const EDIT_BUTTON =
  "flex-none text-[#33465C] transition-colors hover:text-[#26313D] dark:text-[#9AA6B0] dark:hover:text-[#EDF1F4]";

function formatLongDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function Profile() {
  const {
    onboarding,
    activity,
    account,
    updateAccountEmail,
    updateAccountPassword,
    coachIcon,
    setCoachIcon,
    displayName,
    setDisplayName,
  } = useAppState();
  const { goal, goalType, experience, daysPerWeek, equipment } = onboarding;

  const goalPercent = goalProgressPercent(goal);

  return (
    <div className={`flex min-h-dvh flex-col bg-[#F4F6F7] dark:bg-[#141A21] ${quicksand.className}`}>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <p className={`text-lg text-[#33465C] dark:text-[#9AA6B0] ${caveat.className}`}>Your profile</p>
        <DisplayNameHeader name={displayName} onSave={setDisplayName} />
        <p className={`mt-1 text-sm ${MUTED}`}>Member since {formatLongDate(goal.startDate)}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon={<FireIcon className="h-6 w-6" />} label="Day streak" value={String(activity.streakDays)} />
          <StatTile
            icon={<CheckIcon className={`h-5 w-5 ${DONE_TEXT}`} />}
            label="Week streak"
            value={String(activity.weekStreak)}
          />
          <StatTile
            icon={<DumbbellIcon className="h-4 w-8" />}
            label="Workouts this month"
            value={`${activity.workoutsThisMonth}/${activity.plannedThisMonth}`}
          />
          <StatTile label="Goal progress" value={`${goalPercent}%`} />
        </div>

        <section className={`${CARD} mt-6`}>
          <h2 className={`text-xl ${INK} ${caveat.className}`}>Your training profile</h2>
          <p className={`mb-5 text-sm ${FAINT}`}>What you told us during onboarding.</p>
          <div className="space-y-2.5">
            <SummaryRow label="Goal type" value={goalType} />
            <SummaryRow label="Experience" value={experience} />
            <SummaryRow label="Days per week" value={`${daysPerWeek} days`} />
            <SummaryRow label="Equipment" value={equipment.length ? equipment.join(", ") : "Bodyweight only"} />
            <SummaryRow
              label="Dated goal"
              value={`${goal.metric}: ${goal.currentValue} → ${goal.targetValue} ${goal.unit} by ${formatLongDate(goal.targetDate)}`}
            />
          </div>
        </section>

        <AccountSection
          email={account.email}
          password={account.password}
          onSaveEmail={updateAccountEmail}
          onSavePassword={updateAccountPassword}
        />

        <section className={`${CARD} mt-6`}>
          <h2 className={`text-xl ${INK} ${caveat.className}`}>Coach icon</h2>
          <p className={`mb-5 text-sm ${FAINT}`}>Pick the avatar your coach uses in the chat.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {COACH_ICONS.map(({ id, label, Icon }) => {
              const selected = id === coachIcon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCoachIcon(id)}
                  aria-pressed={selected}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center transition-all ${
                    selected
                      ? "bg-[#A9BFA0]/25 shadow-md shadow-[#33465C]/10 dark:bg-[#7C9270]/25"
                      : "bg-[#F4F6F7] shadow-sm shadow-black/5 hover:shadow-md dark:bg-[#242C36]"
                  }`}
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#33465C] dark:bg-[#6E8CB0]">
                    <Icon className="h-6 w-6 text-[#F4F6F7] dark:text-[#141A21]" />
                  </span>
                  <span className={`text-xs font-medium ${INK}`}>{label}</span>
                  {selected && <SketchCheck />}
                </button>
              );
            })}
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function DisplayNameHeader({ name, onSave }: { name: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function startEditing() {
    setDraft(name);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          className={`${INPUT_CLASS} max-w-[14rem]`}
        />
        <button type="button" onClick={handleSave} className={`${PRIMARY_BUTTON} px-4 py-1.5 text-sm`}>
          <span>Save</span>
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#33465C] transition-colors hover:bg-[#33465C]/5 dark:text-[#9AA6B0] dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <h1 className={`text-2xl font-bold sm:text-3xl ${INK}`}>{name}</h1>
      <button type="button" onClick={startEditing} aria-label="Edit display name" className={EDIT_BUTTON}>
        <PencilIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F4F6F7] px-4 py-3 dark:bg-[#242C36]">
      <dt className="text-xs font-semibold tracking-wide text-[#8A939B] uppercase dark:text-[#67727C]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#26313D] dark:text-[#EDF1F4]">{value}</dd>
    </div>
  );
}

function SketchCheck() {
  return (
    <span
      aria-hidden
      className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#33465C] dark:bg-[#6E8CB0]"
    >
      <CheckIcon className="h-3 w-3 text-[#F4F6F7] dark:text-[#141A21]" />
    </span>
  );
}

function AccountSection({
  email,
  password,
  onSaveEmail,
  onSavePassword,
}: {
  email: string;
  password: string;
  onSaveEmail: (email: string) => void;
  onSavePassword: (password: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState(email);
  const [passwordDraft, setPasswordDraft] = useState(password);
  const [showPassword, setShowPassword] = useState(false);

  function startEditing() {
    setEmailDraft(email);
    setPasswordDraft(password);
    setShowPassword(false);
    setEditing(true);
  }

  function handleSave() {
    onSaveEmail(emailDraft.trim());
    onSavePassword(passwordDraft);
    setEditing(false);
  }

  return (
    <section className={`${CARD} mt-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={`text-xl ${INK} ${caveat.className}`}>Login</h2>
          <p className={`text-sm ${FAINT}`}>Your email and password for signing in.</p>
        </div>
        {!editing && (
          <button type="button" onClick={startEditing} aria-label="Edit login" className={EDIT_BUTTON}>
            <PencilIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#26313D] dark:text-[#EDF1F4]">Email</span>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#26313D] dark:text-[#EDF1F4]">Password</span>
            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordDraft}
                onChange={(e) => setPasswordDraft(e.target.value)}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="flex-none rounded-xl px-3 text-sm font-semibold text-[#33465C] transition-colors hover:bg-[#33465C]/5 dark:text-[#9AA6B0] dark:hover:bg-white/5"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-full bg-transparent py-3 text-sm font-semibold text-[#33465C] transition-colors hover:bg-[#33465C]/5 dark:text-[#9AA6B0] dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button type="button" onClick={handleSave} className={`${PRIMARY_BUTTON} flex-1 justify-center py-3`}>
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-2.5">
          <SummaryRow label="Email" value={email} />
          <SummaryRow label="Password" value={"•".repeat(Math.max(password.length, 8))} />
        </div>
      )}
    </section>
  );
}
