import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from training_prescription import PrescriptionInput, compute_prescription
from training_rules import GOAL_TYPES, REP_RANGES


def _input(**overrides) -> PrescriptionInput:
    defaults = dict(goal_type="Build muscle", experience_level="Intermediate", days_per_week=3)
    defaults.update(overrides)
    return PrescriptionInput(**defaults)


@pytest.mark.parametrize("goal_type", GOAL_TYPES)
def test_rep_range_matches_config_for_each_goal(goal_type):
    result = compute_prescription(_input(goal_type=goal_type))
    assert result.rep_range == REP_RANGES[goal_type]


def test_weekly_volume_scales_up_with_experience_level():
    beginner = compute_prescription(_input(experience_level="Beginner"))
    intermediate = compute_prescription(_input(experience_level="Intermediate"))
    advanced = compute_prescription(_input(experience_level="Advanced"))

    beginner_max = beginner.weekly_volume_sets["Chest"][1]
    intermediate_max = intermediate.weekly_volume_sets["Chest"][1]
    advanced_max = advanced.weekly_volume_sets["Chest"][1]
    assert beginner_max < intermediate_max < advanced_max


@pytest.mark.parametrize(
    "days_per_week,expected_split_name",
    [
        (2, "Full Body"),
        (3, "Full Body"),
        (4, "Upper/Lower"),
        (5, "Upper/Lower/Push/Pull/Legs"),
        (6, "Push/Pull/Legs"),
    ],
)
def test_split_name_for_each_supported_frequency(days_per_week, expected_split_name):
    result = compute_prescription(_input(days_per_week=days_per_week))
    assert result.split_name == expected_split_name
    assert len(result.day_muscle_groups) == days_per_week


def test_full_body_split_trains_every_muscle_every_day():
    result = compute_prescription(_input(days_per_week=3))
    for muscle, frequency in result.muscle_frequency.items():
        assert frequency == 3, f"{muscle} expected frequency 3, got {frequency}"


def test_upper_lower_split_trains_every_muscle_twice_a_week_except_core_daily():
    result = compute_prescription(_input(days_per_week=4))
    for muscle, frequency in result.muscle_frequency.items():
        if muscle == "Core":
            continue
        assert frequency == 2, f"{muscle} expected frequency 2, got {frequency}"
    # Core is trained every training day regardless of split (see
    # training_prescription._TEMPLATE_MUSCLES), not tied to Upper/Lower.
    assert result.muscle_frequency["Core"] == 4


def test_push_pull_legs_split_trains_every_muscle_twice_a_week_except_core_daily():
    result = compute_prescription(_input(days_per_week=6))
    for muscle, frequency in result.muscle_frequency.items():
        if muscle == "Core":
            continue
        assert frequency == 2, f"{muscle} expected frequency 2, got {frequency}"
    assert result.muscle_frequency["Core"] == 6


@pytest.mark.parametrize("days_per_week", [1, 7])
def test_unsupported_days_per_week_raises(days_per_week):
    with pytest.raises(ValueError):
        compute_prescription(_input(days_per_week=days_per_week))


def test_unknown_goal_type_raises():
    with pytest.raises(ValueError):
        compute_prescription(_input(goal_type="Become a wizard"))


def test_unknown_experience_level_raises():
    with pytest.raises(ValueError):
        compute_prescription(_input(experience_level="Expert"))


def test_constraint_matching_muscle_group_excludes_it():
    result = compute_prescription(_input(days_per_week=3, constraints=["Shoulders"]))
    assert result.excluded_muscles == ["Shoulders"]
    assert result.muscle_frequency["Shoulders"] == 0
    assert result.weekly_volume_sets["Shoulders"] == (0, 0)
    assert all("Shoulders" not in day for day in result.day_muscle_groups)
    # unrelated muscles are unaffected
    assert result.muscle_frequency["Chest"] == 3


def test_constraint_matching_is_case_insensitive():
    result = compute_prescription(_input(constraints=["shoulders"]))
    assert result.excluded_muscles == ["Shoulders"]


def test_nonmatching_constraint_is_a_no_op():
    result = compute_prescription(_input(days_per_week=3, constraints=["bad knee"]))
    assert result.excluded_muscles == []
    assert result.muscle_frequency["Chest"] == 3


def test_estimated_sets_per_session_from_session_length():
    result = compute_prescription(_input(session_length_minutes=60))
    assert result.estimated_sets_per_session == 15  # 60 // MINUTES_PER_SET(4)


def test_estimated_sets_per_session_none_when_not_provided():
    result = compute_prescription(_input())
    assert result.estimated_sets_per_session is None
