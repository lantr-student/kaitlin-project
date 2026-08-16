"""Deterministic training-prescription engine: given a client's goal,
experience, and schedule, computes the training split, weekly volume and
frequency per muscle group, and rep range — before any exercises are
selected. Pure Python, no LLM calls, kept separate from main.py the same
way progression_calculator.py and exercise_library.py are.

All tunable numbers live in training_rules.py, not here."""

from typing import NamedTuple, Optional

from pydantic import BaseModel

from exercise_library import _MUSCLE_GROUPS
from training_rules import (
    BASE_WEEKLY_SETS_PER_MUSCLE,
    CORE_MUSCLES,
    GOAL_VOLUME_MULTIPLIER,
    LEG_MUSCLES,
    MINUTES_PER_SET,
    PULL_MUSCLES,
    PUSH_MUSCLES,
    REP_RANGES,
    SPLIT_BY_DAYS,
)

# Core isn't tied to a specific split template — it's added to every
# training day below regardless of split, since core work is commonly
# programmed near-daily as accessory work rather than on a dedicated day.
_TEMPLATE_MUSCLES: dict[str, list[str]] = {
    "Full Body": list(_MUSCLE_GROUPS),
    "Upper": PUSH_MUSCLES + PULL_MUSCLES,
    "Lower": LEG_MUSCLES,
    "Push": PUSH_MUSCLES,
    "Pull": PULL_MUSCLES,
    "Legs": LEG_MUSCLES,
}


class PrescriptionInput(BaseModel):
    goal_type: str
    experience_level: str
    days_per_week: int
    session_length_minutes: Optional[int] = None
    equipment: list[str] = []  # accepted for interface completeness; unused here —
    # equipment affects which exercises can fill this structure, not the
    # structure itself, and exercise selection is out of scope for this engine.
    constraints: list[str] = []  # free strings; only exact muscle-group-name
    # matches (case-insensitive) are acted on — this isn't an injury parser.


class TrainingPrescription(NamedTuple):
    split_name: str
    day_muscle_groups: list[list[str]]  # per training day, in order
    muscle_frequency: dict[str, int]  # times/week each muscle group is trained
    weekly_volume_sets: dict[str, tuple[int, int]]  # (min, max) working sets/week per muscle group
    rep_range: tuple[int, int]
    estimated_sets_per_session: Optional[int]
    excluded_muscles: list[str]  # muscles zeroed out via a matching constraint


def compute_prescription(prescription_input: PrescriptionInput) -> TrainingPrescription:
    if prescription_input.goal_type not in REP_RANGES:
        raise ValueError(
            f"Unknown goal_type {prescription_input.goal_type!r}. Expected one of {list(REP_RANGES)}."
        )
    if prescription_input.experience_level not in BASE_WEEKLY_SETS_PER_MUSCLE:
        raise ValueError(
            f"Unknown experience_level {prescription_input.experience_level!r}. "
            f"Expected one of {list(BASE_WEEKLY_SETS_PER_MUSCLE)}."
        )
    if prescription_input.days_per_week not in SPLIT_BY_DAYS:
        raise ValueError(
            f"Unsupported days_per_week {prescription_input.days_per_week}. "
            f"Expected one of {sorted(SPLIT_BY_DAYS)}."
        )

    split = SPLIT_BY_DAYS[prescription_input.days_per_week]
    day_muscle_groups = [list(_TEMPLATE_MUSCLES[template]) for template in split["day_templates"]]
    for day in day_muscle_groups:
        for core_muscle in CORE_MUSCLES:
            if core_muscle not in day:
                day.append(core_muscle)

    excluded = {
        muscle
        for muscle in _MUSCLE_GROUPS
        for constraint in prescription_input.constraints
        if constraint.strip().lower() == muscle.lower()
    }
    if excluded:
        day_muscle_groups = [[m for m in day if m not in excluded] for day in day_muscle_groups]

    muscle_frequency = {
        muscle: sum(1 for day in day_muscle_groups if muscle in day) for muscle in _MUSCLE_GROUPS
    }

    base_min, base_max = BASE_WEEKLY_SETS_PER_MUSCLE[prescription_input.experience_level]
    multiplier = GOAL_VOLUME_MULTIPLIER[prescription_input.goal_type]
    weekly_volume_sets = {
        muscle: (0, 0) if muscle in excluded else (round(base_min * multiplier), round(base_max * multiplier))
        for muscle in _MUSCLE_GROUPS
    }

    estimated_sets_per_session = None
    if prescription_input.session_length_minutes:
        estimated_sets_per_session = max(1, prescription_input.session_length_minutes // MINUTES_PER_SET)

    return TrainingPrescription(
        split_name=split["name"],
        day_muscle_groups=day_muscle_groups,
        muscle_frequency=muscle_frequency,
        weekly_volume_sets=weekly_volume_sets,
        rep_range=REP_RANGES[prescription_input.goal_type],
        estimated_sets_per_session=estimated_sets_per_session,
        excluded_muscles=sorted(excluded),
    )
