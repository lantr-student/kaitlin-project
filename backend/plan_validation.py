"""Deterministic plan validation: the final gate every generated plan passes
through before it goes anywhere else. Pure Python plus one Pydantic schema
check, no LLM calls. Designed to run after the initial Stage 1-4 generation,
and again after any future adaptation (Stage 6) or LLM patch (Stage 7) step
produces a revised plan -- those two call sites don't exist yet (neither
stage produces a full revised plan today), so this module is only exercised
at the first point for now, the same "standalone" status every prior stage
had until wired in.

Severity: a slot that Stage 3 could only fill via its constraint-relaxation
fallback, or a muscle/session-time figure that falls outside its prescribed
range, is a WARNING, not an error -- both are already-accepted tradeoffs of
Stage 2/3's design (graceful degradation over leaving a slot empty, and a
flagged-not-rebalanced over-capacity day) and are near-universal given
today's exercise library and Stage 1/2 sizing approximations, not signs of
a broken plan. A plan with only warnings is still `valid`. Genuine breakage
-- wrong day count, an exercise not in the library, a muscle with no
exercise anywhere in the plan, a same-day duplicate, sets/reps that don't
match the goal+role config, or output that doesn't match the schema -- are
errors, and make the plan invalid."""

from collections import Counter
from typing import NamedTuple, Optional

from pydantic import BaseModel, ValidationError

from exercise_library import _matches_equipment, find_exercise
from exercise_prescription import PrescribedWorkout, compute_exercise_prescription
from exercise_selection import compute_exercise_selection
from session_store import SessionRecord
from training_prescription import PrescriptionInput, TrainingPrescription, compute_prescription
from training_rules import GOAL_ROLE_SETS_REPS, MINUTES_PER_SET
from workout_structure import WorkoutStructure, compute_workout_structure


class ValidationIssue(NamedTuple):
    code: str
    severity: str  # "error" | "warning"
    message: str


class ValidationResult(NamedTuple):
    errors: list[ValidationIssue]
    warnings: list[ValidationIssue]

    @property
    def valid(self) -> bool:
        return not self.errors


class _PrescribedSlotSchema(BaseModel):
    muscle_group: str
    slot_type: str
    exercise: Optional[dict] = None
    sets: Optional[int] = None
    reps: Optional[tuple[int, int]] = None
    weight: Optional[float] = None
    weight_source: str
    note: str


class _PrescribedDaySchema(BaseModel):
    weekday: str
    split_label: str
    slots: list[_PrescribedSlotSchema]


class _PrescribedWorkoutSchema(BaseModel):
    training_days: list[_PrescribedDaySchema]


def _check_day_count(profile: PrescriptionInput, prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    actual = len(prescribed.training_days)
    if actual != profile.days_per_week:
        return [
            ValidationIssue(
                "WRONG_DAY_COUNT", "error", f"Expected {profile.days_per_week} training days, got {actual}."
            )
        ]
    return []


def _check_exercise_ids(prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    issues = []
    for day in prescribed.training_days:
        for slot in day.slots:
            if slot.exercise is None:
                continue
            if find_exercise(slot.exercise["name"]) is None:
                issues.append(
                    ValidationIssue(
                        "UNKNOWN_EXERCISE", "error",
                        f"{day.weekday}: '{slot.exercise['name']}' is not in the exercise library.",
                    )
                )
    return issues


def _check_equipment(profile: PrescriptionInput, prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    issues = []
    for day in prescribed.training_days:
        for slot in day.slots:
            if slot.exercise is None:
                continue
            if not _matches_equipment(slot.exercise["equipment"], profile.equipment):
                issues.append(
                    ValidationIssue(
                        "EQUIPMENT_UNAVAILABLE", "warning",
                        f"{day.weekday}: '{slot.exercise['name']}' needs equipment the client doesn't have "
                        f"({', '.join(slot.exercise['equipment'])}) -- only reached via Stage 3's fallback.",
                    )
                )
    return issues


def _check_muscle_coverage(structure: WorkoutStructure, prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    """A muscle needs coverage only if Stage 2 actually sized a dedicated
    slot for it on some day (DaySlot.exercise_slots non-empty). A muscle
    Stage 2 decided needs no dedicated slot at all -- e.g. fully covered by
    same-day secondary credit, exercise_slots == [] every day -- was never
    something Stage 3 was asked to fill, so its absence here isn't a
    coverage failure (whether that credit actually met the muscle's weekly
    target is _check_weekly_volume's job, not this one)."""
    needs_dedicated_slot = {
        day_slot.muscle_group for day in structure.training_days for day_slot in day.muscle_slots
        if day_slot.exercise_slots
    }
    covered = {
        slot.muscle_group for day in prescribed.training_days for slot in day.slots if slot.exercise is not None
    }
    return [
        ValidationIssue(
            "MUSCLE_NOT_COVERED", "error",
            f"{muscle} was sized a dedicated exercise slot but no exercise was assigned for it anywhere in the plan.",
        )
        for muscle in sorted(needs_dedicated_slot - covered)
    ]


def _check_weekly_volume(
    prescription: TrainingPrescription, structure: WorkoutStructure, prescribed: PrescribedWorkout
) -> list[ValidationIssue]:
    actual_sets: Counter = Counter()
    for day in prescribed.training_days:
        for slot in day.slots:
            if slot.exercise is not None:
                actual_sets[slot.muscle_group] += slot.sets

    secondary_credit: Counter = Counter()
    for day in structure.training_days:
        for day_slot in day.muscle_slots:
            secondary_credit[day_slot.muscle_group] += day_slot.secondary_credit_sets

    issues = []
    for muscle, (weekly_min, weekly_max) in prescription.weekly_volume_sets.items():
        if weekly_max == 0:
            continue
        total = actual_sets[muscle] + secondary_credit[muscle]
        if total < weekly_min or total > weekly_max:
            issues.append(
                ValidationIssue(
                    "VOLUME_OUT_OF_RANGE", "warning",
                    f"{muscle}: {total} sets/week, outside the prescribed ({weekly_min}, {weekly_max}) range.",
                )
            )
    return issues


def _check_duplicate_exercises(prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    issues = []
    for day in prescribed.training_days:
        seen: set[str] = set()
        for slot in day.slots:
            if slot.exercise is None:
                continue
            name = slot.exercise["name"].lower()
            if name in seen:
                issues.append(
                    ValidationIssue(
                        "DUPLICATE_EXERCISE", "error",
                        f"{day.weekday}: '{slot.exercise['name']}' appears more than once that day.",
                    )
                )
            seen.add(name)
    return issues


def _check_session_time(profile: PrescriptionInput, prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    if profile.session_length_minutes is None:
        return []
    issues = []
    for day in prescribed.training_days:
        total_sets = sum(slot.sets for slot in day.slots if slot.exercise is not None)
        estimated_minutes = total_sets * MINUTES_PER_SET
        if estimated_minutes > profile.session_length_minutes:
            issues.append(
                ValidationIssue(
                    "SESSION_OVER_TIME", "warning",
                    f"{day.weekday}: ~{estimated_minutes} min estimated, above the "
                    f"{profile.session_length_minutes} min limit.",
                )
            )
    return issues


def _check_sets_reps(profile: PrescriptionInput, prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    issues = []
    for day in prescribed.training_days:
        for slot in day.slots:
            if slot.exercise is None:
                continue
            expected_sets, expected_reps = GOAL_ROLE_SETS_REPS[profile.goal_type][slot.slot_type]
            if slot.sets != expected_sets or slot.reps != expected_reps:
                issues.append(
                    ValidationIssue(
                        "INVALID_SETS_REPS", "error",
                        f"{day.weekday}: '{slot.exercise['name']}' prescribed {slot.sets}x{slot.reps}, "
                        f"expected {expected_sets}x{expected_reps} for {profile.goal_type}/{slot.slot_type}.",
                    )
                )
    return issues


def _check_schema(prescribed: PrescribedWorkout) -> list[ValidationIssue]:
    try:
        _PrescribedWorkoutSchema(
            training_days=[
                {
                    "weekday": day.weekday,
                    "split_label": day.split_label,
                    "slots": [slot._asdict() for slot in day.slots],
                }
                for day in prescribed.training_days
            ]
        )
    except ValidationError as e:
        return [ValidationIssue("SCHEMA_MISMATCH", "error", str(e))]
    return []


def validate_plan(
    profile: PrescriptionInput,
    prescription: TrainingPrescription,
    structure: WorkoutStructure,
    prescribed: PrescribedWorkout,
) -> ValidationResult:
    issues = [
        *_check_day_count(profile, prescribed),
        *_check_exercise_ids(prescribed),
        *_check_equipment(profile, prescribed),
        *_check_muscle_coverage(structure, prescribed),
        *_check_weekly_volume(prescription, structure, prescribed),
        *_check_duplicate_exercises(prescribed),
        *_check_session_time(profile, prescribed),
        *_check_sets_reps(profile, prescribed),
        *_check_schema(prescribed),
    ]
    return ValidationResult(
        errors=[i for i in issues if i.severity == "error"],
        warnings=[i for i in issues if i.severity == "warning"],
    )


def validate_full_plan(
    profile: PrescriptionInput, exercise_history: Optional[dict[str, list[SessionRecord]]] = None
) -> tuple[PrescribedWorkout, ValidationResult]:
    """Runs Stages 1-4 and then this validation, all from one input --
    the "on the initial plan" call site. Mirrors exercise_selection.py's
    compute_full_plan, one layer further."""
    prescription = compute_prescription(profile)
    structure = compute_workout_structure(prescription)
    selected = compute_exercise_selection(
        structure,
        goal_type=profile.goal_type,
        experience_level=profile.experience_level,
        equipment=profile.equipment,
        constraints=profile.constraints,
    )
    prescribed = compute_exercise_prescription(
        selected,
        goal_type=profile.goal_type,
        experience_level=profile.experience_level,
        exercise_history=exercise_history or {},
    )
    return prescribed, validate_plan(profile, prescription, structure, prescribed)
