import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from training_prescription import PrescriptionInput, TrainingPrescription, compute_prescription
from training_rules import GOAL_TYPES, TRAINING_WEEKDAYS, WEEKDAY_ORDER
from workout_structure import _distribute_volume, compute_workout_structure


def _prescription(**overrides) -> TrainingPrescription:
    defaults = dict(goal_type="Build muscle", experience_level="Intermediate", days_per_week=3)
    defaults.update(overrides)
    return compute_prescription(PrescriptionInput(**defaults))


# --- weekday / rest-day assignment ---


@pytest.mark.parametrize("days_per_week", [2, 3, 4, 5, 6])
@pytest.mark.parametrize("goal_type", ["Build muscle", "Improve endurance"])
def test_weekday_and_rest_day_assignment(days_per_week, goal_type):
    structure = compute_workout_structure(_prescription(days_per_week=days_per_week, goal_type=goal_type))
    assert [day.weekday for day in structure.training_days] == TRAINING_WEEKDAYS[days_per_week]
    assert len(structure.training_days) == days_per_week
    assert sorted(structure.rest_days) == sorted(set(WEEKDAY_ORDER) - set(TRAINING_WEEKDAYS[days_per_week]))


# --- remainder rule ---


def test_distribute_volume_evenly_divides_with_no_remainder():
    assert _distribute_volume(16, 2) == [8, 8]


def test_distribute_volume_gives_extra_to_earliest_occurrences():
    assert _distribute_volume(9, 2) == [5, 4]
    assert _distribute_volume(13, 2) == [7, 6]
    assert sum(_distribute_volume(9, 2)) == 9
    assert sum(_distribute_volume(13, 2)) == 13


def test_remainder_rule_end_to_end_on_a_real_prescription():
    # Beginner (8,12) x Improve endurance (1.1) = (8.8, 13.2) -> rounds to
    # (9, 13), both odd -- a concrete case where volume doesn't divide evenly
    # across a frequency-2 muscle. Verify the prescription layer actually
    # produces this before trusting the distribution built on top of it.
    prescription = _prescription(
        goal_type="Improve endurance", experience_level="Beginner", days_per_week=4
    )
    assert prescription.weekly_volume_sets["Chest"] == (9, 13)
    assert prescription.muscle_frequency["Chest"] == 2

    structure = compute_workout_structure(prescription)
    # 4-day Upper/Lower: Chest (a Push/Upper muscle) trains on day 0 (Monday)
    # and day 2 (Friday) -- the earliest occurrence gets the extra set.
    monday_chest = next(s for s in structure.training_days[0].muscle_slots if s.muscle_group == "Chest")
    friday_chest = next(s for s in structure.training_days[2].muscle_slots if s.muscle_group == "Chest")
    assert monday_chest.target_sets == (5, 7)
    assert friday_chest.target_sets == (4, 6)
    summed = (
        monday_chest.target_sets[0] + friday_chest.target_sets[0],
        monday_chest.target_sets[1] + friday_chest.target_sets[1],
    )
    assert summed == (9, 13)


# --- once-per-week (frequency=1) degenerate case ---


def test_frequency_one_muscle_gets_full_weekly_volume_on_its_single_day():
    prescription = TrainingPrescription(
        split_name="Custom",
        day_muscle_groups=[["Chest"], ["Back"]],
        muscle_frequency={"Chest": 1, "Back": 1},
        weekly_volume_sets={"Chest": (9, 13), "Back": (10, 10)},
        rep_range=(8, 12),
        estimated_sets_per_session=None,
        excluded_muscles=[],
    )
    structure = compute_workout_structure(prescription)
    chest_slot = next(s for s in structure.training_days[0].muscle_slots if s.muscle_group == "Chest")
    back_slot = next(s for s in structure.training_days[1].muscle_slots if s.muscle_group == "Back")
    assert chest_slot.target_sets == (9, 13)
    assert back_slot.target_sets == (10, 10)


# --- exercise slot typing ---


def test_muscle_with_compound_options_gets_compound_first_slot():
    structure = compute_workout_structure(_prescription(days_per_week=3))
    chest_slot = next(s for s in structure.training_days[0].muscle_slots if s.muscle_group == "Chest")
    assert chest_slot.exercise_slots[0] == "Compound"


def test_all_isolation_muscles_get_only_isolation_slots():
    structure = compute_workout_structure(_prescription(days_per_week=3))
    for day in structure.training_days:
        for slot in day.muscle_slots:
            if slot.muscle_group in ("Biceps", "Rear Delts"):
                assert slot.exercise_slots == ["Isolation"] * len(slot.exercise_slots)
                assert len(slot.exercise_slots) >= 1


# --- Adductors: no dedicated slot ---


@pytest.mark.parametrize("days_per_week", [2, 3, 4, 5, 6])
def test_adductors_never_gets_a_dedicated_slot(days_per_week):
    structure = compute_workout_structure(_prescription(days_per_week=days_per_week))
    for day in structure.training_days:
        assert all(slot.muscle_group != "Adductors" for slot in day.muscle_slots)


# --- session-length capacity flagging ---


def test_over_capacity_is_none_without_session_length():
    structure = compute_workout_structure(_prescription(days_per_week=4))
    assert all(day.over_capacity is None for day in structure.training_days)


def test_over_capacity_true_for_a_very_short_session():
    structure = compute_workout_structure(_prescription(days_per_week=4, session_length_minutes=4))
    assert any(day.over_capacity is True for day in structure.training_days)


def test_over_capacity_false_for_a_very_long_session():
    structure = compute_workout_structure(_prescription(days_per_week=4, session_length_minutes=600))
    assert all(day.over_capacity is False for day in structure.training_days)


# --- consecutive-day overlap warnings ---


@pytest.mark.parametrize("days_per_week", [2, 3, 4, 5, 6])
@pytest.mark.parametrize("goal_type", GOAL_TYPES)
def test_no_overlap_warnings_for_real_prescriptions(days_per_week, goal_type):
    structure = compute_workout_structure(_prescription(days_per_week=days_per_week, goal_type=goal_type))
    assert structure.overlap_warnings == []


def test_overlap_warning_fires_when_calendar_adjacent_days_share_a_muscle():
    # Synthetic prescription: day index 2 (Friday) and day index 3 (Saturday)
    # under a 4-day split are calendar-adjacent -- force both to train Back.
    prescription = TrainingPrescription(
        split_name="Custom",
        day_muscle_groups=[["Chest"], ["Quads"], ["Back"], ["Back"]],
        muscle_frequency={"Chest": 1, "Quads": 1, "Back": 2},
        weekly_volume_sets={"Chest": (9, 13), "Quads": (10, 10), "Back": (10, 14)},
        rep_range=(8, 12),
        estimated_sets_per_session=None,
        excluded_muscles=[],
    )
    structure = compute_workout_structure(prescription)
    assert structure.overlap_warnings == ["Friday and Saturday both train Back"]
