import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from exercise_library import _EQUIPMENT_ITEMS, find_exercise
from exercise_prescription import compute_exercise_prescription
from exercise_selection import compute_exercise_selection
from plan_validation import validate_full_plan, validate_plan
from training_prescription import PrescriptionInput, compute_prescription
from workout_structure import compute_workout_structure


def _baseline(**overrides):
    """A real, fully-equipped plan plus the intermediate objects validate_plan
    needs, so each test can mutate exactly one thing off a known-good plan."""
    defaults = dict(
        goal_type="Build muscle", experience_level="Intermediate", days_per_week=3, equipment=_EQUIPMENT_ITEMS
    )
    defaults.update(overrides)
    profile = PrescriptionInput(**defaults)
    prescription = compute_prescription(profile)
    structure = compute_workout_structure(prescription)
    selected = compute_exercise_selection(
        structure, goal_type=profile.goal_type, experience_level=profile.experience_level,
        equipment=profile.equipment, constraints=profile.constraints,
    )
    prescribed = compute_exercise_prescription(
        selected, goal_type=profile.goal_type, experience_level=profile.experience_level, exercise_history={}
    )
    return profile, prescription, structure, prescribed


def _codes(issues):
    return {i.code for i in issues}


def _replace_day_slots(prescribed, day_index, slots):
    days = list(prescribed.training_days)
    days[day_index] = days[day_index]._replace(slots=slots)
    return prescribed._replace(training_days=days)


# --- a real, well-equipped plan is valid ---


def test_a_real_well_equipped_plan_has_no_errors():
    profile, *_ = _baseline()
    prescribed, result = validate_full_plan(profile)
    assert result.valid
    assert result.errors == []
    assert len(prescribed.training_days) == profile.days_per_week


# --- each error check, via a one-field mutation off the baseline ---


def test_wrong_day_count_is_an_error():
    profile, prescription, structure, prescribed = _baseline()
    mutated = prescribed._replace(training_days=prescribed.training_days[:-1])
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "WRONG_DAY_COUNT" in _codes(result.errors)


def test_unknown_exercise_is_an_error():
    profile, prescription, structure, prescribed = _baseline()
    day = prescribed.training_days[0]
    bogus = dict(day.slots[0].exercise, name="Nonexistent Exercise Zzz")
    mutated_slot = day.slots[0]._replace(exercise=bogus)
    mutated = _replace_day_slots(prescribed, 0, [mutated_slot, *day.slots[1:]])
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "UNKNOWN_EXERCISE" in _codes(result.errors)


def test_equipment_unavailable_is_a_warning_not_an_error():
    profile, prescription, structure, prescribed = _baseline(equipment=["Barbell", "Bench"])
    day = prescribed.training_days[0]
    # Leg Extension needs "Leg machine", which isn't in this client's equipment.
    swapped = day.slots[0]._replace(exercise=find_exercise("Leg Extension"))
    mutated = _replace_day_slots(prescribed, 0, [swapped, *day.slots[1:]])
    result = validate_plan(profile, prescription, structure, mutated)
    assert "EQUIPMENT_UNAVAILABLE" in _codes(result.warnings)
    assert "EQUIPMENT_UNAVAILABLE" not in _codes(result.errors)


def test_muscle_not_covered_is_an_error():
    profile, prescription, structure, prescribed = _baseline()
    target_muscle = prescribed.training_days[0].slots[0].muscle_group
    new_days = [
        day._replace(slots=[s for s in day.slots if s.muscle_group != target_muscle])
        for day in prescribed.training_days
    ]
    mutated = prescribed._replace(training_days=new_days)
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "MUSCLE_NOT_COVERED" in _codes(result.errors)


def test_volume_out_of_range_is_a_warning_not_an_error():
    profile, prescription, structure, prescribed = _baseline()
    day = prescribed.training_days[0]
    starved = day.slots[0]._replace(sets=0)
    mutated = _replace_day_slots(prescribed, 0, [starved, *day.slots[1:]])
    result = validate_plan(profile, prescription, structure, mutated)
    assert "VOLUME_OUT_OF_RANGE" in _codes(result.warnings)
    assert "VOLUME_OUT_OF_RANGE" not in _codes(result.errors)


def test_duplicate_exercise_same_day_is_an_error():
    profile, prescription, structure, prescribed = _baseline()
    day = prescribed.training_days[0]
    assert len(day.slots) >= 2
    cloned = day.slots[1]._replace(exercise=day.slots[0].exercise)
    mutated = _replace_day_slots(prescribed, 0, [day.slots[0], cloned, *day.slots[2:]])
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "DUPLICATE_EXERCISE" in _codes(result.errors)


def test_session_over_time_is_a_warning_not_an_error():
    profile, prescription, structure, prescribed = _baseline(session_length_minutes=1)
    result = validate_plan(profile, prescription, structure, prescribed)
    assert "SESSION_OVER_TIME" in _codes(result.warnings)
    assert "SESSION_OVER_TIME" not in _codes(result.errors)


def test_invalid_sets_reps_is_an_error():
    profile, prescription, structure, prescribed = _baseline()
    day = prescribed.training_days[0]
    wrong = day.slots[0]._replace(sets=day.slots[0].sets + 1)
    mutated = _replace_day_slots(prescribed, 0, [wrong, *day.slots[1:]])
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "INVALID_SETS_REPS" in _codes(result.errors)


def test_schema_mismatch_is_an_error():
    profile, prescription, structure, prescribed = _baseline()
    day = prescribed.training_days[0]
    broken = day.slots[0]._replace(weight="not-a-number")
    mutated = _replace_day_slots(prescribed, 0, [broken, *day.slots[1:]])
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "SCHEMA_MISMATCH" in _codes(result.errors)


# --- unfilled slots (preserved by Stage 4, see test_exercise_prescription.py) ---
# are a MUSCLE_NOT_COVERED error if that was the muscle's only slot, since no
# exercise ever got assigned for it -- not a separate code of their own.


def test_unfilled_slot_surfaces_as_muscle_not_covered():
    profile, prescription, structure, prescribed = _baseline()
    day0 = prescribed.training_days[0]
    target_muscle = day0.slots[0].muscle_group
    unfilled = day0.slots[0]._replace(
        exercise=None, sets=None, reps=None, weight=None, weight_source="unfilled", note="no candidate"
    )

    new_days = []
    for i, day in enumerate(prescribed.training_days):
        if i == 0:
            kept = [unfilled] + [s for s in day.slots[1:] if s.muscle_group != target_muscle]
        else:
            kept = [s for s in day.slots if s.muscle_group != target_muscle]
        new_days.append(day._replace(slots=kept))

    mutated = prescribed._replace(training_days=new_days)
    result = validate_plan(profile, prescription, structure, mutated)
    assert not result.valid
    assert "MUSCLE_NOT_COVERED" in _codes(result.errors)
