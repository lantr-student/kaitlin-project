import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from exercise_library import find_exercise
from exercise_prescription import _round_to_increment, _sets_reps, _weight_for, compute_exercise_prescription
from exercise_selection import SelectedDay, SelectedSlot, SelectedWorkout, compute_full_plan
from progression_calculator import compute_next_weight, estimate_one_rep_max
from session_store import SessionRecord
from training_prescription import PrescriptionInput
from training_rules import GOAL_ROLE_SETS_REPS, STARTING_WEIGHT_FALLBACK_LB, STARTING_WEIGHT_PERCENT_OF_SIMILAR_1RM


def _slot(exercise_name: str) -> SelectedSlot:
    exercise = find_exercise(exercise_name)
    return SelectedSlot(
        muscle_group=exercise["primary_muscles"][0],
        slot_type=exercise["exercise_type"],
        exercise=exercise,
        fallback_level=0,
        unfilled_reason=None,
    )


def _session(exercise_name, weight, actual_reps, prescribed_reps=8, prescribed_sets=3, date="2026-01-01"):
    return SessionRecord(
        user_id="u1", exercise_name=exercise_name, date=date,
        prescribed_sets=prescribed_sets, prescribed_reps=prescribed_reps, weight=weight, actual_reps=actual_reps,
    )


# --- sets/reps lookup ---


def test_sets_reps_match_config_for_build_muscle():
    compound = _sets_reps("Compound", "Build muscle")
    isolation = _sets_reps("Isolation", "Build muscle")
    assert compound == GOAL_ROLE_SETS_REPS["Build muscle"]["Compound"] == (3, (6, 10))
    assert isolation == GOAL_ROLE_SETS_REPS["Build muscle"]["Isolation"] == (3, (10, 15))


def test_editing_the_config_changes_the_output(monkeypatch):
    monkeypatch.setitem(GOAL_ROLE_SETS_REPS, "Build muscle", {"Compound": (5, (1, 3)), "Isolation": (5, (1, 3))})
    assert _sets_reps("Compound", "Build muscle") == (5, (1, 3))


# --- weight: bodyweight ---


def test_bodyweight_exercise_always_has_no_weight_even_with_history():
    history = {"push-up": [_session("Push-Up", 0.0, [12, 12, 12])]}
    weight, source, note = _weight_for(find_exercise("Push-Up"), "Compound", "Intermediate", history)
    assert weight is None
    assert source == "bodyweight"


# --- weight: tier 2, own logged history ---


def test_own_history_matches_progression_calculator_exactly():
    sessions = [
        _session("Bench Press", 135.0, [8, 8, 8], date="2026-01-01"),
        _session("Bench Press", 135.0, [8, 8, 8], date="2026-01-08"),
    ]
    history = {"bench press": sessions}
    weight, source, note = _weight_for(find_exercise("Bench Press"), "Compound", "Intermediate", history)
    expected = compute_next_weight(sessions)
    assert source == "history"
    assert weight == expected.recommended_weight
    assert note == expected.reason


# --- weight: tier 3, similar-exercise estimate ---


def test_similar_exercise_estimate_uses_1rm_percentage_of_best_equipment_match():
    # Close-Grip Bench Press (Barbell+Bench) has no history of its own, but
    # Bench Press (also Barbell+Bench, shares Chest/Triceps/Shoulders) does.
    bench_sessions = [_session("Bench Press", 135.0, [8, 8, 8])]
    history = {"bench press": bench_sessions}

    weight, source, note = _weight_for(find_exercise("Close-Grip Bench Press"), "Compound", "Intermediate", history)

    expected_one_rm = estimate_one_rep_max(bench_sessions)
    expected = _round_to_increment(expected_one_rm * STARTING_WEIGHT_PERCENT_OF_SIMILAR_1RM)
    assert source == "similar_exercise"
    assert weight == expected
    assert "Bench Press" in note


def test_similar_exercise_estimate_requires_exact_equipment_match():
    # Incline Dumbbell Press (Dumbbells+Bench) shares Chest with Bench Press
    # (Barbell+Bench), but the equipment lists differ -- must NOT be used as
    # a comparable, so this should fall through to the tier 4 default.
    history = {"bench press": [_session("Bench Press", 135.0, [8, 8, 8])]}
    weight, source, note = _weight_for(find_exercise("Incline Dumbbell Press"), "Compound", "Intermediate", history)
    assert source == "default"
    assert weight == STARTING_WEIGHT_FALLBACK_LB["Compound"]["Intermediate"]


# --- weight: tier 4, true cold start ---


@pytest.mark.parametrize("experience_level", ["Beginner", "Intermediate", "Advanced"])
def test_true_cold_start_uses_flat_fallback_by_role_and_experience(experience_level):
    weight, source, note = _weight_for(find_exercise("Leg Extension"), "Isolation", experience_level, {})
    assert source == "default"
    assert weight == STARTING_WEIGHT_FALLBACK_LB["Isolation"][experience_level]


# --- unfilled slots pass through rather than vanishing ---


def test_unfilled_slot_is_preserved_not_dropped():
    unfilled = SelectedSlot(
        muscle_group="Adductors", slot_type="Isolation", exercise=None, fallback_level=4,
        unfilled_reason="No Isolation exercise in the library works Adductors.",
    )
    selected = SelectedWorkout(training_days=[SelectedDay(weekday="Monday", split_label="Lower", slots=[unfilled])])

    result = compute_exercise_prescription(
        selected, goal_type="Build muscle", experience_level="Intermediate", exercise_history={}
    )

    slot = result.training_days[0].slots[0]
    assert slot.exercise is None
    assert slot.sets is None and slot.reps is None and slot.weight is None
    assert slot.weight_source == "unfilled"
    assert slot.note == "No Isolation exercise in the library works Adductors."


# --- end-to-end through the real Stage 1-3 pipeline ---


def test_end_to_end_every_filled_slot_gets_a_sane_prescription():
    profile = PrescriptionInput(
        goal_type="Build muscle", experience_level="Intermediate", days_per_week=3,
        equipment=["Barbell", "Dumbbells", "Bench", "Cable machine", "Squat rack", "Leg machine", "Pull-up bar"],
    )
    selected = compute_full_plan(profile)
    history = {"bench press": [_session("Bench Press", 135.0, [8, 8, 8])]}

    result = compute_exercise_prescription(
        selected, goal_type="Build muscle", experience_level="Intermediate", exercise_history=history
    )

    assert len(result.training_days) == 3
    for day in result.training_days:
        for slot in day.slots:
            if slot.exercise is None:
                assert slot.weight_source == "unfilled"
                assert slot.sets is None and slot.reps is None and slot.weight is None
                continue
            expected_sets, expected_reps = GOAL_ROLE_SETS_REPS["Build muscle"][slot.exercise["exercise_type"]]
            assert slot.sets == expected_sets
            assert slot.reps == expected_reps
            assert slot.weight_source in {"bodyweight", "history", "similar_exercise", "default"}
            if slot.exercise["equipment"]:
                assert slot.weight is not None and slot.weight > 0
            else:
                assert slot.weight is None
