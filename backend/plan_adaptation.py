"""Deterministic progression-and-adaptation engine: revises an existing plan
from logged performance instead of regenerating one. Pure Python, no LLM
calls -- situations this module can't resolve with a clear rule are
collected in `needs_llm_review` for Stage 7, never handled by calling an
LLM here.

Separate from the initial plan generator (training_prescription.py etc.):
this module never builds a plan from scratch, only revises an existing
PrescribedWorkout in place, weight by weight and, rarely, exercise by
exercise. Session storage itself is session_store.py's job, already built;
this module is a pure function over whatever history the caller already
fetched from it, the same way exercise_prescription.py is.

Skip detection is caller-provided (`skipped_exercises`), not inferred from
calendar dates -- there's no persisted workout history to infer from yet
(session_store.py is an explicit in-memory placeholder), so the caller
(whoever knows a scheduled day was skipped) reports it directly."""

from collections import Counter
from typing import NamedTuple, Optional

from exercise_library import _EXPERIENCE_LEVELS, compute_substitutes
from exercise_prescription import PrescribedSlot, PrescribedWorkout, _round_to_increment, _weight_for
from plan_validation import ValidationResult, validate_plan
from progression_calculator import _session_succeeded
from session_store import SessionRecord
from training_prescription import PrescriptionInput, TrainingPrescription
from training_rules import (
    MISSED_REPS_SIGNAL_THRESHOLD,
    SKIPPED_EXERCISE_SIGNAL_THRESHOLD,
    STALLED_PROGRESS_SESSION_THRESHOLD,
    WEIGHT_INCREMENT_LB,
)
from workout_structure import WorkoutStructure


class AdaptationSignal(NamedTuple):
    exercise_name: str
    signal: str  # "repeated_missed_reps" | "stalled_progress" | "consistently_skipped"
    detail: str


class PlanChange(NamedTuple):
    weekday: str
    exercise_name: str
    change: str  # "weight_update" | "exercise_swap"
    reason: str
    previous: Optional[str] = None  # previous exercise name, exercise_swap only
    new: Optional[str] = None  # new exercise name, exercise_swap only


class AdaptationResult(NamedTuple):
    plan: PrescribedWorkout  # the revised plan if applied, otherwise the unchanged current_plan
    applied: bool
    changes: list[PlanChange]  # what was attempted, regardless of applied
    signals: list[AdaptationSignal]  # everything detected, regardless of whether it was actioned
    needs_llm_review: list[AdaptationSignal]  # signals with no safe rule-based reaction -- for Stage 7
    rejected_reason: Optional[str]
    validation: ValidationResult


def _detect_signals(
    current_plan: PrescribedWorkout,
    exercise_history: dict[str, list[SessionRecord]],
    skipped_exercises: list[tuple[str, str]],
) -> list[AdaptationSignal]:
    plan_exercise_by_lower = {
        slot.exercise["name"].lower(): slot.exercise["name"]
        for day in current_plan.training_days
        for slot in day.slots
        if slot.exercise is not None
    }

    signals = []
    for name_lower, real_name in plan_exercise_by_lower.items():
        sessions = exercise_history.get(name_lower, [])
        if not sessions:
            continue

        recent_missed = sessions[-MISSED_REPS_SIGNAL_THRESHOLD:]
        if len(recent_missed) == MISSED_REPS_SIGNAL_THRESHOLD and all(
            not _session_succeeded(s) for s in recent_missed
        ):
            signals.append(
                AdaptationSignal(
                    real_name, "repeated_missed_reps",
                    f"Missed prescribed reps in each of the last {MISSED_REPS_SIGNAL_THRESHOLD} sessions.",
                )
            )

        recent_stall = sessions[-STALLED_PROGRESS_SESSION_THRESHOLD:]
        if len(recent_stall) == STALLED_PROGRESS_SESSION_THRESHOLD and len({s.weight for s in recent_stall}) == 1:
            signals.append(
                AdaptationSignal(
                    real_name, "stalled_progress",
                    f"No weight change across the last {STALLED_PROGRESS_SESSION_THRESHOLD} sessions.",
                )
            )

    skip_counts = Counter(name.lower() for name, _ in skipped_exercises)
    for name_lower, count in skip_counts.items():
        if name_lower in plan_exercise_by_lower and count >= SKIPPED_EXERCISE_SIGNAL_THRESHOLD:
            signals.append(
                AdaptationSignal(plan_exercise_by_lower[name_lower], "consistently_skipped", f"Skipped {count} times.")
            )

    return signals


def _find_substitute(exercise: dict, slot_type: str, profile: PrescriptionInput, used_today: set[str]) -> Optional[dict]:
    """Best replacement within the Prescription Engine's own limits: same
    exercise_type (so the slot's sets/reps lookup still applies unchanged),
    at or below the client's experience level (Stage 3's own filter
    semantics, not compute_substitutes' stricter exact-level match), not
    already used elsewhere that day, and equipment the client actually has."""
    max_level = _EXPERIENCE_LEVELS.index(profile.experience_level)
    for candidate in compute_substitutes(exercise, equipment=profile.equipment, top_n=15):
        if candidate["exercise_type"] != slot_type:
            continue
        if candidate["name"].lower() in used_today:
            continue
        if _EXPERIENCE_LEVELS.index(candidate["experience_level"]) > max_level:
            continue
        return candidate
    return None


def _apply_adaptation(
    profile: PrescriptionInput, slot: PrescribedSlot, sessions: list[SessionRecord],
    exercise_signals: list[AdaptationSignal], used_today: set[str],
) -> tuple[PrescribedSlot, Optional[dict], list[AdaptationSignal]]:
    updated = slot
    change: Optional[dict] = None
    review: list[AdaptationSignal] = []

    # Base progression: re-run the same tiered weight logic Stage 4 used
    # initially, scoped to only this exercise's own history so it can't
    # accidentally pull in a cross-exercise estimate meant for exercises
    # with no history of their own yet.
    if sessions:
        new_weight, new_source, new_note = _weight_for(
            slot.exercise, slot.slot_type, profile.experience_level, {slot.exercise["name"].lower(): sessions}
        )
        if new_weight != slot.weight:
            updated = slot._replace(weight=new_weight, weight_source=new_source, note=new_note)
            change = {"change": "weight_update", "reason": new_note}

    signal_codes = {s.signal for s in exercise_signals}

    if "repeated_missed_reps" in signal_codes:
        missed_signal = next(s for s in exercise_signals if s.signal == "repeated_missed_reps")
        deload = _round_to_increment(updated.weight - WEIGHT_INCREMENT_LB) if updated.weight else None
        if not deload or deload <= 0:
            review.append(missed_signal)
        else:
            updated = updated._replace(weight=deload, weight_source="adaptation_deload")
            change = {
                "change": "weight_update",
                "reason": f"Deloaded after {MISSED_REPS_SIGNAL_THRESHOLD} consecutive missed sessions.",
            }

    structural_signal = next(
        (s for s in exercise_signals if s.signal in ("stalled_progress", "consistently_skipped")), None
    )
    if structural_signal is not None:
        substitute = _find_substitute(updated.exercise, updated.slot_type, profile, used_today)
        if substitute is None:
            review.append(structural_signal)
        else:
            new_weight, new_source, new_note = _weight_for(substitute, updated.slot_type, profile.experience_level, {})
            previous_name = updated.exercise["name"]
            updated = PrescribedSlot(
                muscle_group=updated.muscle_group, slot_type=updated.slot_type, exercise=substitute,
                sets=updated.sets, reps=updated.reps, weight=new_weight, weight_source=new_source, note=new_note,
            )
            change = {
                "change": "exercise_swap",
                "reason": f"{structural_signal.signal.replace('_', ' ')} -- {structural_signal.detail}",
                "previous": previous_name,
                "new": substitute["name"],
            }

    return updated, change, review


def compute_adaptation(
    profile: PrescriptionInput,
    prescription: TrainingPrescription,
    structure: WorkoutStructure,
    current_plan: PrescribedWorkout,
    exercise_history: dict[str, list[SessionRecord]],
    skipped_exercises: Optional[list[tuple[str, str]]] = None,
) -> AdaptationResult:
    skipped_exercises = skipped_exercises or []
    signals = _detect_signals(current_plan, exercise_history, skipped_exercises)

    signals_by_exercise: dict[str, list[AdaptationSignal]] = {}
    for s in signals:
        signals_by_exercise.setdefault(s.exercise_name.lower(), []).append(s)

    changes: list[PlanChange] = []
    needs_llm_review: list[AdaptationSignal] = []
    new_days = []

    for day in current_plan.training_days:
        used_today = {slot.exercise["name"].lower() for slot in day.slots if slot.exercise is not None}
        new_slots = []
        for slot in day.slots:
            if slot.exercise is None:
                new_slots.append(slot)
                continue

            name_lower = slot.exercise["name"].lower()
            updated_slot, change, review = _apply_adaptation(
                profile, slot, exercise_history.get(name_lower, []), signals_by_exercise.get(name_lower, []),
                used_today - {name_lower},
            )
            new_slots.append(updated_slot)
            needs_llm_review.extend(review)
            if change is not None:
                changes.append(PlanChange(weekday=day.weekday, exercise_name=slot.exercise["name"], **change))
                if updated_slot.exercise is not None:
                    used_today.discard(name_lower)
                    used_today.add(updated_slot.exercise["name"].lower())

        new_days.append(day._replace(slots=new_slots))

    candidate_plan = current_plan._replace(training_days=new_days)
    validation = validate_plan(profile, prescription, structure, candidate_plan)

    if validation.valid:
        return AdaptationResult(candidate_plan, True, changes, signals, needs_llm_review, None, validation)

    rejected_reason = f"Adaptation produced an invalid plan, reverted: {validation.errors[0].message}"
    return AdaptationResult(current_plan, False, changes, signals, needs_llm_review, rejected_reason, validation)
