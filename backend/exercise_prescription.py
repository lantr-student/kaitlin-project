"""Deterministic sets/reps/starting-weight engine: attaches a complete
prescription to every exercise already chosen by Stage 3's SelectedWorkout.
Pure Python, no LLM calls. Sets/reps come from a config lookup; weight comes
from logged history, a similarity-based estimate, or a flat fallback -- see
training_rules.py's Stage 4 section for the numbers.

exercise_history is supplied by the caller (not fetched here), keeping this
module a pure function the same way progression_calculator.py's functions
are pure over a passed-in session list rather than reaching into
session_store.py themselves."""

from typing import NamedTuple, Optional

from exercise_library import _similarity_score, _shares_any_muscle, find_exercise
from exercise_selection import SelectedSlot, SelectedWorkout
from progression_calculator import WEIGHT_INCREMENT_LB, compute_next_weight, estimate_one_rep_max
from session_store import SessionRecord
from training_rules import GOAL_ROLE_SETS_REPS, STARTING_WEIGHT_FALLBACK_LB, STARTING_WEIGHT_PERCENT_OF_SIMILAR_1RM


class PrescribedSlot(NamedTuple):
    muscle_group: str
    slot_type: str
    exercise: Optional[dict]  # None when Stage 3 never filled this slot (see unfilled_reason)
    sets: Optional[int]
    reps: Optional[tuple[int, int]]
    weight: Optional[float]
    weight_source: str  # "bodyweight" | "history" | "similar_exercise" | "default" | "unfilled"
    note: str


class PrescribedDay(NamedTuple):
    weekday: str
    split_label: str
    slots: list[PrescribedSlot]


class PrescribedWorkout(NamedTuple):
    training_days: list[PrescribedDay]


def _round_to_increment(value: float, increment: float = WEIGHT_INCREMENT_LB) -> float:
    return round(value / increment) * increment


def _sets_reps(exercise_type: str, goal_type: str) -> tuple[int, tuple[int, int]]:
    return GOAL_ROLE_SETS_REPS[goal_type][exercise_type]


def _best_comparable(exercise: dict, exercise_history: dict[str, list[SessionRecord]]) -> Optional[dict]:
    """Best already-logged exercise to estimate `exercise`'s starting weight
    from: shares a muscle, uses the exact same equipment (so a 1RM-derived
    number stays on a sensible scale), ranked by the existing similarity
    scorer. Returns None if nothing qualifies."""
    candidates = []
    for name, sessions in exercise_history.items():
        if not sessions or name == exercise["name"].lower():
            continue
        candidate = find_exercise(name)
        if candidate is None:
            continue
        if set(candidate["equipment"]) != set(exercise["equipment"]):
            continue
        if not _shares_any_muscle(exercise, candidate):
            continue
        candidates.append(candidate)

    if not candidates:
        return None
    return max(candidates, key=lambda candidate: _similarity_score(exercise, candidate))


def _weight_for(
    exercise: dict, exercise_type: str, experience_level: str, exercise_history: dict[str, list[SessionRecord]]
) -> tuple[Optional[float], str, str]:
    if not exercise["equipment"]:
        return None, "bodyweight", "Bodyweight exercise -- no weight to track."

    own_sessions = exercise_history.get(exercise["name"].lower(), [])
    if own_sessions:
        progression = compute_next_weight(own_sessions)
        return progression.recommended_weight, "history", progression.reason

    comparable = _best_comparable(exercise, exercise_history)
    if comparable is not None:
        comparable_sessions = exercise_history[comparable["name"].lower()]
        one_rep_max = estimate_one_rep_max(comparable_sessions)
        if one_rep_max is not None:
            estimated = _round_to_increment(one_rep_max * STARTING_WEIGHT_PERCENT_OF_SIMILAR_1RM)
            return (
                estimated,
                "similar_exercise",
                f"No logged history for {exercise['name']} yet -- estimated from {comparable['name']} "
                f"({STARTING_WEIGHT_PERCENT_OF_SIMILAR_1RM:.0%} of its estimated 1-rep max).",
            )

    default_weight = STARTING_WEIGHT_FALLBACK_LB[exercise_type][experience_level]
    return (
        default_weight,
        "default",
        f"No logged history for {exercise['name']} or any comparable exercise yet -- using a conservative "
        f"{experience_level} default. Adjust as needed and log your results.",
    )


def _prescribe_slot(
    slot: SelectedSlot, goal_type: str, experience_level: str, exercise_history: dict[str, list[SessionRecord]]
) -> PrescribedSlot:
    exercise = slot.exercise
    sets, reps = _sets_reps(exercise["exercise_type"], goal_type)
    weight, weight_source, note = _weight_for(exercise, exercise["exercise_type"], experience_level, exercise_history)
    return PrescribedSlot(
        muscle_group=slot.muscle_group,
        slot_type=slot.slot_type,
        exercise=exercise,
        sets=sets,
        reps=reps,
        weight=weight,
        weight_source=weight_source,
        note=note,
    )


def compute_exercise_prescription(
    selected_workout: SelectedWorkout,
    *,
    goal_type: str,
    experience_level: str,
    exercise_history: dict[str, list[SessionRecord]],
) -> PrescribedWorkout:
    if goal_type not in GOAL_ROLE_SETS_REPS:
        raise ValueError(f"Unknown goal_type {goal_type!r}. Expected one of {list(GOAL_ROLE_SETS_REPS)}.")
    if experience_level not in STARTING_WEIGHT_FALLBACK_LB["Compound"]:
        raise ValueError(
            f"Unknown experience_level {experience_level!r}. "
            f"Expected one of {list(STARTING_WEIGHT_FALLBACK_LB['Compound'])}."
        )

    training_days = []
    for day in selected_workout.training_days:
        slots = [
            _prescribe_slot(slot, goal_type, experience_level, exercise_history)
            if slot.exercise is not None
            else PrescribedSlot(
                muscle_group=slot.muscle_group,
                slot_type=slot.slot_type,
                exercise=None,
                sets=None,
                reps=None,
                weight=None,
                weight_source="unfilled",
                note=slot.unfilled_reason,
            )
            for slot in day.slots
        ]
        training_days.append(PrescribedDay(weekday=day.weekday, split_label=day.split_label, slots=slots))

    return PrescribedWorkout(training_days=training_days)
