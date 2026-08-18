"""Distributes a TrainingPrescription into concrete workout days: which
weekday each training day falls on, which muscles train that day, target
sets per muscle for that specific day, and how many exercise slots of what
type (compound/isolation) are needed — no exercises are chosen here. Pure
Python, no LLM calls, layered directly on training_prescription.py's output
so this module only depends on the layer below it, not on raw user input.

All tunable numbers live in training_rules.py, not here."""

from math import ceil
from typing import NamedTuple, Optional

from exercise_library import _EXERCISE_LIBRARY
from training_prescription import TrainingPrescription
from training_rules import (
    MUSCLES_WITHOUT_DEDICATED_SLOTS,
    SETS_PER_EXERCISE_SLOT,
    SPLIT_BY_DAYS,
    TRAINING_WEEKDAYS,
    WEEKDAY_ORDER,
)

# Muscles with at least one Compound-type exercise as a primary mover
# anywhere in the library — reused the same way training_prescription.py
# reuses exercise_library._MUSCLE_GROUPS instead of re-deriving this by hand.
_MUSCLES_WITH_COMPOUND = {
    muscle
    for exercise in _EXERCISE_LIBRARY
    if exercise["exercise_type"] == "Compound"
    for muscle in exercise["primary_muscles"]
}

_CORE_MUSCLE = "Core"  # excluded from overlap_warnings — trained daily by design, not a conflict


class DaySlot(NamedTuple):
    muscle_group: str
    target_sets: tuple[int, int]  # (min, max) sets for this muscle, this day
    exercise_slots: list[str]  # e.g. ["Compound", "Isolation"]


class WorkoutDay(NamedTuple):
    weekday: str
    split_label: str  # e.g. "Upper" — the day's template name
    muscle_slots: list[DaySlot]
    total_target_sets: tuple[int, int]  # summed across muscle_slots
    over_capacity: Optional[bool]  # None if the prescription had no session length


class WorkoutStructure(NamedTuple):
    split_name: str
    training_days: list[WorkoutDay]  # in calendar (weekday) order
    rest_days: list[str]
    overlap_warnings: list[str]  # e.g. "Friday and Saturday both train Back"


def _distribute_volume(weekly_total: int, frequency: int) -> list[int]:
    """Splits weekly_total across `frequency` occurrences (calendar order) as
    evenly as possible: base = weekly_total // frequency each, and the
    remainder (weekly_total % frequency) gives one extra set each to the
    earliest occurrences in the week. Sum of the result always equals
    weekly_total exactly. When frequency == 1 this naturally returns
    [weekly_total] — the whole week's volume on the one day it's trained,
    the degenerate case of the same rule rather than a special-cased path."""
    base, remainder = divmod(weekly_total, frequency)
    return [base + 1 if i < remainder else base for i in range(frequency)]


def _slot_types(muscle: str, target_sets: tuple[int, int]) -> list[str]:
    slot_count = max(1, ceil(round((target_sets[0] + target_sets[1]) / 2) / SETS_PER_EXERCISE_SLOT))
    if muscle not in _MUSCLES_WITH_COMPOUND:
        return ["Isolation"] * slot_count
    return ["Compound"] + ["Isolation"] * (slot_count - 1)


def _overlap_warnings(training_days: list[WorkoutDay]) -> list[str]:
    weekday_index = {day: i for i, day in enumerate(WEEKDAY_ORDER)}
    muscles_by_weekday = {
        day.weekday: {slot.muscle_group for slot in day.muscle_slots} for day in training_days
    }
    warnings = []
    for day_a in training_days:
        for day_b in training_days:
            index_a, index_b = weekday_index[day_a.weekday], weekday_index[day_b.weekday]
            if (index_b - index_a) % 7 != 1:
                continue  # only calendar-adjacent pairs (day_b immediately follows day_a)
            overlap = (muscles_by_weekday[day_a.weekday] & muscles_by_weekday[day_b.weekday]) - {_CORE_MUSCLE}
            if overlap:
                warnings.append(f"{day_a.weekday} and {day_b.weekday} both train {', '.join(sorted(overlap))}")
    return warnings


def compute_workout_structure(prescription: TrainingPrescription) -> WorkoutStructure:
    days_per_week = len(prescription.day_muscle_groups)
    weekdays = TRAINING_WEEKDAYS[days_per_week]
    day_templates = SPLIT_BY_DAYS[days_per_week]["day_templates"]
    rest_days = [day for day in WEEKDAY_ORDER if day not in weekdays]

    muscle_day_indices: dict[str, list[int]] = {}
    for day_index, muscles in enumerate(prescription.day_muscle_groups):
        for muscle in muscles:
            muscle_day_indices.setdefault(muscle, []).append(day_index)

    muscle_daily_targets: dict[str, dict[int, tuple[int, int]]] = {}
    for muscle, day_indices in muscle_day_indices.items():
        weekly_min, weekly_max = prescription.weekly_volume_sets[muscle]
        mins = _distribute_volume(weekly_min, len(day_indices))
        maxs = _distribute_volume(weekly_max, len(day_indices))
        muscle_daily_targets[muscle] = {
            day_index: (mins[i], maxs[i]) for i, day_index in enumerate(day_indices)
        }

    training_days = []
    for day_index, muscles in enumerate(prescription.day_muscle_groups):
        muscle_slots = [
            DaySlot(
                muscle_group=muscle,
                target_sets=muscle_daily_targets[muscle][day_index],
                exercise_slots=_slot_types(muscle, muscle_daily_targets[muscle][day_index]),
            )
            for muscle in muscles
            if muscle not in MUSCLES_WITHOUT_DEDICATED_SLOTS
        ]
        total_min = sum(slot.target_sets[0] for slot in muscle_slots)
        total_max = sum(slot.target_sets[1] for slot in muscle_slots)
        over_capacity = (
            total_max > prescription.estimated_sets_per_session
            if prescription.estimated_sets_per_session is not None
            else None
        )
        training_days.append(
            WorkoutDay(
                weekday=weekdays[day_index],
                split_label=day_templates[day_index],
                muscle_slots=muscle_slots,
                total_target_sets=(total_min, total_max),
                over_capacity=over_capacity,
            )
        )

    return WorkoutStructure(
        split_name=prescription.split_name,
        training_days=training_days,
        rest_days=rest_days,
        overlap_warnings=_overlap_warnings(training_days),
    )
