import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from exercise_library import _EQUIPMENT_ITEMS, _EXERCISE_LIBRARY, _EXPERIENCE_LEVELS, _MUSCLE_GROUPS
from exercise_selection import _resolve_slot, _score, compute_exercise_selection, compute_full_plan
from training_prescription import PrescriptionInput, compute_prescription
from training_rules import (
    BASE_WEEKLY_SETS_PER_MUSCLE,
    GOAL_MATCH_RULE,
    GOAL_TYPES,
    NEUTRAL_GOAL_MATCH_SCORE,
    SECONDARY_MUSCLE_MATCH_FACTOR,
    SPLIT_BY_DAYS,
    WEIGHT_EQUIPMENT_MATCH,
    WEIGHT_EXPERIENCE_MATCH,
    WEIGHT_GOAL_MATCH,
    WEIGHT_MUSCLE_MATCH,
)
from workout_structure import DaySlot, WorkoutDay, WorkoutStructure, compute_workout_structure


def _day_slot(muscle: str, exercise_slots: list[str]) -> DaySlot:
    return DaySlot(
        muscle_group=muscle,
        target_sets=(0, 0),
        secondary_credit_sets=0,
        remaining_target_sets=(0, 0),
        exercise_slots=exercise_slots,
    )


def _single_day_structure(muscle: str, exercise_slots: list[str], weekday: str = "Monday") -> WorkoutStructure:
    day = WorkoutDay(
        weekday=weekday,
        split_label="Test",
        muscle_slots=[_day_slot(muscle, exercise_slots)],
        total_target_sets=(0, 0),
        over_capacity=None,
    )
    return WorkoutStructure(split_name="Test", training_days=[day], rest_days=[], overlap_warnings=[])


def _resolve(muscle, slot_type, goal_type="Build muscle", experience_level_index=2, equipment=None, avoid_terms=None):
    return _resolve_slot(
        muscle,
        slot_type,
        goal_type,
        experience_level_index,
        equipment if equipment is not None else [],
        avoid_terms if avoid_terms is not None else [],
        used_today=set(),
        patterns_today=set(),
    )


# --- hard filters (each independently excludes a non-matching candidate) ---


def test_equipment_filter_excludes_unavailable_equipment():
    # Biceps Isolation candidates: Barbell Curl (Barbell), Preacher Curl
    # (Dumbbells+Bench), Hammer Curl (Dumbbells), Band Curl (Resistance bands).
    # Only Hammer Curl's equipment is a subset of what's available.
    result = _resolve("Biceps", "Isolation", equipment=["Dumbbells"])
    assert result.exercise["name"] == "Hammer Curl"
    assert result.fallback_level == 0


def test_experience_filter_excludes_above_level_exercises():
    # Shoulders Compound with Dumbbells: Dumbbell Shoulder Press (Beginner)
    # vs Arnold Press (Intermediate) -- only the Beginner one should survive.
    result = _resolve("Shoulders", "Compound", experience_level_index=0, equipment=["Dumbbells"])
    assert result.exercise["name"] == "Dumbbell Shoulder Press"
    assert result.fallback_level == 0


def test_avoid_list_excludes_by_exercise_name():
    # With only Dumbbells, Hammer Curl is the sole strict-pass candidate
    # (see test_equipment_filter_excludes_unavailable_equipment). Avoiding it
    # by name removes it even though it still satisfies every other filter,
    # forcing a fallback all the way to equipment relaxation (level 3) to
    # reach the remaining curls -- proving the avoid-list itself is never
    # the thing that gets relaxed.
    without_avoid = _resolve("Biceps", "Isolation", equipment=["Dumbbells"])
    assert without_avoid.exercise["name"] == "Hammer Curl"
    assert without_avoid.fallback_level == 0

    with_avoid = _resolve("Biceps", "Isolation", equipment=["Dumbbells"], avoid_terms=["hammer curl"])
    assert with_avoid.exercise["name"] != "Hammer Curl"
    assert with_avoid.fallback_level == 3


def test_exercise_type_filter_excludes_wrong_slot_type():
    # Chest Isolation: Bench Press/Incline Dumbbell Press/Push-Up are
    # Compound and must be excluded; only Dumbbell Fly is Isolation.
    result = _resolve("Chest", "Isolation", equipment=["Dumbbells", "Bench"])
    assert result.exercise["name"] == "Dumbbell Fly"
    assert result.fallback_level == 0


# --- scoring: muscle_match (primary vs secondary) ---


def test_primary_muscle_match_scores_higher_than_secondary_only():
    primary_candidate = {
        "primary_muscles": ["Triceps"], "secondary_muscles": [],
        "exercise_type": "Isolation", "skill_demand": "Low", "stability_demand": "Low",
    }
    secondary_candidate = {
        "primary_muscles": ["Chest"], "secondary_muscles": ["Triceps"],
        "exercise_type": "Isolation", "skill_demand": "Low", "stability_demand": "Low",
    }
    primary_score = _score(primary_candidate, "Triceps", "Build muscle", level=0)
    secondary_score = _score(secondary_candidate, "Triceps", "Build muscle", level=0)
    assert primary_score > secondary_score
    assert primary_score - secondary_score == pytest.approx(WEIGHT_MUSCLE_MATCH * (1.0 - SECONDARY_MUSCLE_MATCH_FACTOR))


# --- scoring: goal_match ---


def test_goal_match_favors_compound_for_build_strength():
    compound = {"primary_muscles": ["Chest"], "secondary_muscles": [], "exercise_type": "Compound", "skill_demand": "Low", "stability_demand": "Low"}
    isolation = {"primary_muscles": ["Chest"], "secondary_muscles": [], "exercise_type": "Isolation", "skill_demand": "Low", "stability_demand": "Low"}
    compound_score = _score(compound, "Chest", "Build strength", level=0)
    isolation_score = _score(isolation, "Chest", "Build strength", level=0)
    assert compound_score - isolation_score == pytest.approx(WEIGHT_GOAL_MATCH)


@pytest.mark.parametrize("goal_type", ["Lose fat", "Improve endurance"])
def test_goal_match_favors_low_demand_for_fat_loss_and_endurance(goal_type):
    low_demand = {"primary_muscles": ["Chest"], "secondary_muscles": [], "exercise_type": "Isolation", "skill_demand": "Low", "stability_demand": "Low"}
    high_demand = {"primary_muscles": ["Chest"], "secondary_muscles": [], "exercise_type": "Isolation", "skill_demand": "High", "stability_demand": "High"}
    low_score = _score(low_demand, "Chest", goal_type, level=0)
    high_score = _score(high_demand, "Chest", goal_type, level=0)
    assert low_score - high_score == pytest.approx(WEIGHT_GOAL_MATCH)


@pytest.mark.parametrize("goal_type", ["Build muscle", "Improve Overall Fitness"])
def test_goal_match_is_neutral_for_muscle_and_overall_fitness(goal_type):
    compound = {"primary_muscles": ["Chest"], "secondary_muscles": [], "exercise_type": "Compound", "skill_demand": "High", "stability_demand": "High"}
    isolation = {"primary_muscles": ["Chest"], "secondary_muscles": [], "exercise_type": "Isolation", "skill_demand": "Low", "stability_demand": "Low"}
    assert _score(compound, "Chest", goal_type, level=0) == pytest.approx(_score(isolation, "Chest", goal_type, level=0))
    assert _score(compound, "Chest", goal_type, level=0) == pytest.approx(
        WEIGHT_MUSCLE_MATCH + WEIGHT_GOAL_MATCH * NEUTRAL_GOAL_MATCH_SCORE + WEIGHT_EQUIPMENT_MATCH + WEIGHT_EXPERIENCE_MATCH
    )


# --- same-day no-repeat / movement-pattern variety / cross-day repeats ---


def test_same_day_slots_never_repeat_an_exercise():
    # Shoulders Isolation has exactly two candidates with different
    # movement patterns (Lateral Raise: Shoulder Abduction, Front Raise:
    # Shoulder Flexion) -- both resolvable at level 0 without any fallback.
    structure = _single_day_structure("Shoulders", ["Isolation", "Isolation"])
    result = compute_exercise_selection(
        structure, goal_type="Build muscle", experience_level="Beginner", equipment=["Dumbbells"], constraints=[]
    )
    slots = result.training_days[0].slots
    names = [slot.exercise["name"] for slot in slots]
    assert len(names) == len(set(names))
    assert set(names) == {"Front Raise", "Lateral Raise"}
    assert all(slot.fallback_level == 0 for slot in slots)


def test_same_exercise_can_repeat_across_different_days():
    structure = WorkoutStructure(
        split_name="Test",
        training_days=[
            WorkoutDay("Monday", "Test", [_day_slot("Shoulders", ["Isolation"])], (0, 0), None),
            WorkoutDay("Wednesday", "Test", [_day_slot("Shoulders", ["Isolation"])], (0, 0), None),
        ],
        rest_days=[],
        overlap_warnings=[],
    )
    result = compute_exercise_selection(
        structure, goal_type="Build muscle", experience_level="Beginner", equipment=["Dumbbells"], constraints=[]
    )
    monday_pick = result.training_days[0].slots[0].exercise["name"]
    wednesday_pick = result.training_days[1].slots[0].exercise["name"]
    assert monday_pick == wednesday_pick == "Front Raise"


# --- fallback escalation ---


def test_movement_pattern_variety_is_the_first_thing_relaxed():
    # Rear Delts Isolation has exactly three candidates (Cable Face Pull,
    # Reverse Fly, Band Pull-Apart), all movement_pattern "Horizontal Pull".
    # Pretending that pattern was already used today makes level 0 empty
    # purely on variety grounds; dropping variety at level 1 (not
    # experience/equipment, which are already wide open) fixes it.
    result = _resolve_slot(
        "Rear Delts", "Isolation", "Build muscle", experience_level_index=2,
        equipment=_EQUIPMENT_ITEMS, avoid_terms=[], used_today=set(), patterns_today={"Horizontal Pull"},
    )
    assert result.fallback_level == 1
    assert result.exercise["name"] == "Band Pull-Apart"


def test_fallback_escalates_to_experience_relaxation_when_needed():
    # With only a Pull-up bar, Pull-Up is the only Compound exercise that
    # works Back at all. It's Advanced; an Intermediate client needs level 2
    # (experience +1, reaching Advanced) to unlock it -- level 0/1 are both
    # empty first since dropping pattern variety alone doesn't touch experience.
    result = _resolve_slot(
        "Back", "Compound", "Build muscle", experience_level_index=1,
        equipment=["Pull-up bar"], avoid_terms=[], used_today=set(), patterns_today=set(),
    )
    assert result.fallback_level == 2
    assert result.exercise["name"] == "Pull-Up"


def test_unresolvable_slot_reports_explicit_reason_instead_of_crashing():
    # No Isolation exercise in the library touches Adductors at all (primary
    # or secondary) -- no relaxation level can ever produce a candidate.
    result = _resolve("Adductors", "Isolation", equipment=_EQUIPMENT_ITEMS)
    assert result.exercise is None
    assert result.fallback_level == 4
    assert "Adductors" in result.unfilled_reason
    assert "Isolation" in result.unfilled_reason


# --- tie-break determinism ---


def test_tie_break_is_alphabetical_and_deterministic():
    equipment = ["Barbell", "Dumbbells", "Resistance bands", "Bench"]
    first_run = _resolve("Biceps", "Isolation", equipment=equipment, avoid_terms=["hammer curl"])
    second_run = _resolve("Biceps", "Isolation", equipment=equipment, avoid_terms=["hammer curl"])
    assert first_run.exercise["name"] == second_run.exercise["name"] == "Band Curl"

    # Exclude the winner too -- next alphabetically should win, proving the
    # ordering (not coincidence) drove the first result.
    next_run = _resolve("Biceps", "Isolation", equipment=equipment, avoid_terms=["hammer curl", "band curl"])
    assert next_run.exercise["name"] == "Barbell Curl"


# --- end-to-end through the real Stage 1 + Stage 2 pipeline ---


@pytest.mark.parametrize(
    "goal_type,experience_level,days_per_week",
    [("Build muscle", "Beginner", 3), ("Build strength", "Advanced", 5)],
)
def test_end_to_end_every_slot_gets_a_real_exercise(goal_type, experience_level, days_per_week):
    prescription = compute_prescription(
        PrescriptionInput(goal_type=goal_type, experience_level=experience_level, days_per_week=days_per_week)
    )
    structure = compute_workout_structure(prescription)
    result = compute_exercise_selection(
        structure, goal_type=goal_type, experience_level=experience_level, equipment=_EQUIPMENT_ITEMS, constraints=[]
    )

    library_names = {ex["name"] for ex in _EXERCISE_LIBRARY}
    for day in result.training_days:
        for slot in day.slots:
            assert slot.exercise is not None, slot.unfilled_reason
            assert slot.exercise["name"] in library_names


# --- Stage 1 -> 2 -> 3 pipeline wiring ---


def test_compute_full_plan_chains_all_three_stages_from_one_input():
    profile = PrescriptionInput(
        goal_type="Build strength", experience_level="Intermediate", days_per_week=4, equipment=_EQUIPMENT_ITEMS
    )
    result = compute_full_plan(profile)
    assert len(result.training_days) == 4
    library_names = {ex["name"] for ex in _EXERCISE_LIBRARY}
    for day in result.training_days:
        for slot in day.slots:
            assert slot.exercise is not None, slot.unfilled_reason
            assert slot.exercise["name"] in library_names


def test_excluded_muscle_never_appears_anywhere_in_the_final_plan():
    # A muscle excluded via Stage 1's constraints should vanish from Stage 2's
    # structure and therefore never reach Stage 3 at all -- no slot, no crash.
    profile = PrescriptionInput(
        goal_type="Build muscle", experience_level="Intermediate", days_per_week=4,
        equipment=_EQUIPMENT_ITEMS, constraints=["Shoulders"],
    )
    result = compute_full_plan(profile)
    muscles_present = {slot.muscle_group for day in result.training_days for slot in day.slots}
    assert "Shoulders" not in muscles_present


def test_goal_and_experience_vocabulary_match_across_stages():
    # Stage 1 (training_prescription.py) and Stage 3 (exercise_selection.py)
    # must agree on exactly which goal/experience strings are valid, or a
    # value that passes Stage 1 could later raise in Stage 3 (or vice versa).
    assert set(GOAL_TYPES) == set(GOAL_MATCH_RULE)
    assert set(BASE_WEEKLY_SETS_PER_MUSCLE) == set(_EXPERIENCE_LEVELS)


def test_muscle_vocabulary_used_by_stage1_is_recognized_by_the_library():
    # Every muscle group training_prescription.py can put into a day's
    # structure must exist in the library's muscle vocabulary, or Stage 3
    # could receive a muscle it can never match any exercise against.
    from training_rules import CORE_MUSCLES, LEG_MUSCLES, PULL_MUSCLES, PUSH_MUSCLES

    stage1_muscles = set(PUSH_MUSCLES) | set(PULL_MUSCLES) | set(LEG_MUSCLES) | set(CORE_MUSCLES)
    assert stage1_muscles.issubset(set(_MUSCLE_GROUPS))


@pytest.mark.parametrize("goal_type", GOAL_TYPES)
@pytest.mark.parametrize("experience_level", _EXPERIENCE_LEVELS)
@pytest.mark.parametrize("days_per_week", sorted(SPLIT_BY_DAYS))
def test_full_pipeline_never_raises_across_the_entire_input_matrix(goal_type, experience_level, days_per_week):
    # Exhaustive sweep (no assertion on unfilled slots -- a thin library for
    # some muscle/type combos, e.g. only one Quads Isolation exercise
    # existing at all, is an expected content limitation, not a wiring bug;
    # Stage 3 is expected to report those explicitly rather than invent one).
    profile = PrescriptionInput(
        goal_type=goal_type, experience_level=experience_level, days_per_week=days_per_week,
        session_length_minutes=60, equipment=_EQUIPMENT_ITEMS,
    )
    compute_full_plan(profile)
