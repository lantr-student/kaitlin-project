"""Deterministic exercise-selection engine: fills every exercise slot in a
WorkoutStructure (Stage 2's output) with a real exercise from the library.
Pure Python, no LLM calls, layered directly on workout_structure.py's output
the same way workout_structure.py is layered on training_prescription.py's.

All tunable numbers live in training_rules.py, not here."""

from typing import NamedTuple, Optional

from exercise_library import _EXERCISE_LIBRARY, _EXPERIENCE_LEVELS, _matches_equipment, _matches_muscle_group
from training_rules import (
    GOAL_MATCH_RULE,
    NEUTRAL_GOAL_MATCH_SCORE,
    RELAXATION_PENALTY_BY_LEVEL,
    SECONDARY_MUSCLE_MATCH_FACTOR,
    WEIGHT_EQUIPMENT_MATCH,
    WEIGHT_EXPERIENCE_MATCH,
    WEIGHT_GOAL_MATCH,
    WEIGHT_MUSCLE_MATCH,
)
from training_prescription import PrescriptionInput, compute_prescription
from workout_structure import WorkoutStructure, compute_workout_structure

# Fixed, cumulative fallback levels tried in order when a slot's filter pass
# comes up empty. Level 0 is the strict pass (nothing relaxed). Target-muscle
# match, the avoid-list, same-day no-repeat, and exercise_type-matches-slot
# are never relaxed at any level.
_MAX_FALLBACK_LEVEL = 3


class SelectedSlot(NamedTuple):
    muscle_group: str
    slot_type: str  # "Compound" | "Isolation"
    exercise: Optional[dict]
    fallback_level: int  # 0 = resolved at the strict pass; _MAX_FALLBACK_LEVEL + 1 = unresolved
    unfilled_reason: Optional[str]  # set only when exercise is None


class SelectedDay(NamedTuple):
    weekday: str
    split_label: str
    slots: list[SelectedSlot]


class SelectedWorkout(NamedTuple):
    training_days: list[SelectedDay]


def _candidate_pool(
    muscle: str,
    slot_type: str,
    level: int,
    experience_level_index: int,
    equipment: list[str],
    avoid_terms: list[str],
    used_today: set[str],
    patterns_today: set[str],
) -> list[dict]:
    enforce_pattern_variety = level == 0
    max_level_index = min(experience_level_index + (1 if level >= 2 else 0), len(_EXPERIENCE_LEVELS) - 1)
    equipment_required = level < 3

    return [
        ex
        for ex in _EXERCISE_LIBRARY
        if ex["exercise_type"] == slot_type
        and _matches_muscle_group(ex, muscle)
        and ex["name"].lower() not in used_today
        and not any(term in ex["name"].lower() for term in avoid_terms)
        and _EXPERIENCE_LEVELS.index(ex["experience_level"]) <= max_level_index
        and (not equipment_required or _matches_equipment(ex["equipment"], equipment))
        and (not enforce_pattern_variety or ex["movement_pattern"] not in patterns_today)
    ]


def _score(exercise: dict, muscle: str, goal_type: str, level: int) -> float:
    muscle_score = 1.0 if muscle in exercise["primary_muscles"] else SECONDARY_MUSCLE_MATCH_FACTOR

    rule = GOAL_MATCH_RULE.get(goal_type, "neutral")
    if rule == "compound_bonus":
        goal_score = 1.0 if exercise["exercise_type"] == "Compound" else 0.0
    elif rule == "low_demand_bonus":
        goal_score = 1.0 if exercise["skill_demand"] == "Low" and exercise["stability_demand"] == "Low" else 0.0
    else:
        goal_score = NEUTRAL_GOAL_MATCH_SCORE

    # equipment_match/experience_match are constant among a given level's
    # survivors (the filter already decided pass/fail for that level); the
    # cost of having relaxed either one to get here is captured once below
    # via RELAXATION_PENALTY_BY_LEVEL, not by varying these two terms.
    equipment_score = 1.0
    experience_score = 1.0

    raw = (
        WEIGHT_MUSCLE_MATCH * muscle_score
        + WEIGHT_GOAL_MATCH * goal_score
        + WEIGHT_EQUIPMENT_MATCH * equipment_score
        + WEIGHT_EXPERIENCE_MATCH * experience_score
    )
    return raw - RELAXATION_PENALTY_BY_LEVEL.get(level, 0.0)


def _pick_best(pool: list[dict], muscle: str, goal_type: str, level: int) -> dict:
    scored = [(ex, _score(ex, muscle, goal_type, level)) for ex in pool]
    best_score = max(score for _, score in scored)
    tied = [ex for ex, score in scored if score == best_score]
    return min(tied, key=lambda ex: (len(ex["secondary_muscles"]), ex["name"].lower()))


def _resolve_slot(
    muscle: str,
    slot_type: str,
    goal_type: str,
    experience_level_index: int,
    equipment: list[str],
    avoid_terms: list[str],
    used_today: set[str],
    patterns_today: set[str],
) -> SelectedSlot:
    for level in range(_MAX_FALLBACK_LEVEL + 1):
        pool = _candidate_pool(
            muscle, slot_type, level, experience_level_index, equipment, avoid_terms, used_today, patterns_today
        )
        if pool:
            best = _pick_best(pool, muscle, goal_type, level)
            return SelectedSlot(muscle, slot_type, best, level, None)

    reason = (
        f"No {slot_type} exercise in the library works {muscle} even after relaxing movement-pattern variety, "
        f"experience level, and equipment availability — excluding the avoid-list and same-day repeats."
    )
    return SelectedSlot(muscle, slot_type, None, _MAX_FALLBACK_LEVEL + 1, reason)


def compute_exercise_selection(
    structure: WorkoutStructure,
    *,
    goal_type: str,
    experience_level: str,
    equipment: list[str],
    constraints: list[str],
) -> SelectedWorkout:
    if experience_level not in _EXPERIENCE_LEVELS:
        raise ValueError(f"Unknown experience_level {experience_level!r}. Expected one of {_EXPERIENCE_LEVELS}.")
    if goal_type not in GOAL_MATCH_RULE:
        raise ValueError(f"Unknown goal_type {goal_type!r}. Expected one of {list(GOAL_MATCH_RULE)}.")

    experience_level_index = _EXPERIENCE_LEVELS.index(experience_level)
    avoid_terms = [c.strip().lower() for c in constraints if c.strip()]

    training_days = []
    for day in structure.training_days:
        used_today: set[str] = set()
        patterns_today: set[str] = set()
        slots = []
        for day_slot in day.muscle_slots:
            for slot_type in day_slot.exercise_slots:
                resolved = _resolve_slot(
                    day_slot.muscle_group,
                    slot_type,
                    goal_type,
                    experience_level_index,
                    equipment,
                    avoid_terms,
                    used_today,
                    patterns_today,
                )
                slots.append(resolved)
                if resolved.exercise is not None:
                    used_today.add(resolved.exercise["name"].lower())
                    patterns_today.add(resolved.exercise["movement_pattern"])
        training_days.append(SelectedDay(weekday=day.weekday, split_label=day.split_label, slots=slots))

    return SelectedWorkout(training_days=training_days)


def compute_full_plan(prescription_input: PrescriptionInput) -> SelectedWorkout:
    """Runs Stages 1-3 as one pipeline from a single input: training
    prescription -> workout structure -> exercise selection. Reads
    goal_type/experience_level/equipment/constraints once from
    prescription_input and reuses them for every stage, so there's no way
    for the stages to see inconsistent values for the same client profile."""
    prescription = compute_prescription(prescription_input)
    structure = compute_workout_structure(prescription)
    return compute_exercise_selection(
        structure,
        goal_type=prescription_input.goal_type,
        experience_level=prescription_input.experience_level,
        equipment=prescription_input.equipment,
        constraints=prescription_input.constraints,
    )
