import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from progression_calculator import (
    DEFAULT_WEEKLY_CAP_LB,
    WEIGHT_INCREMENT_LB,
    compute_next_weight,
    estimate_one_rep_max,
    exceeds_cap,
    weekly_progression_needed,
)
from session_store import SessionRecord


def _session(date: str, weight: float, actual_reps: list[int], prescribed_reps: int = 5, prescribed_sets: int = 3) -> SessionRecord:
    return SessionRecord(
        user_id="u1",
        exercise_name="Back Squat",
        date=date,
        prescribed_sets=prescribed_sets,
        prescribed_reps=prescribed_reps,
        weight=weight,
        actual_reps=actual_reps,
    )


def test_no_sessions_returns_no_data_result():
    result = compute_next_weight([])
    assert result.action == "none"


def test_single_successful_session_holds():
    sessions = [_session("2026-08-01", 185, [5, 5, 5])]
    result = compute_next_weight(sessions)
    assert result.action == "hold"
    assert result.recommended_weight == 185


def test_two_consecutive_successful_sessions_increases_weight():
    # 185 lb x 3x5 completed successfully for two sessions -> 190 lb next session.
    sessions = [
        _session("2026-08-01", 185, [5, 5, 5]),
        _session("2026-08-04", 185, [5, 5, 5]),
    ]
    result = compute_next_weight(sessions)
    assert result.action == "increase"
    assert result.current_weight == 185
    assert result.recommended_weight == 185 + WEIGHT_INCREMENT_LB == 190


def test_missed_reps_repeats_same_weight():
    sessions = [
        _session("2026-08-01", 185, [5, 5, 5]),
        _session("2026-08-04", 185, [5, 4, 3]),  # missed prescribed reps on sets 2 and 3
    ]
    result = compute_next_weight(sessions)
    assert result.action == "repeat"
    assert result.recommended_weight == 185


def test_weight_change_between_sessions_resets_streak():
    # Both sessions succeeded, but the weight changed in between, so the
    # 2-consecutive-session streak doesn't carry over -> hold, not increase.
    sessions = [
        _session("2026-08-01", 180, [5, 5, 5]),
        _session("2026-08-04", 185, [5, 5, 5]),
    ]
    result = compute_next_weight(sessions)
    assert result.action == "hold"
    assert result.recommended_weight == 185


def test_three_sessions_only_last_two_matter():
    sessions = [
        _session("2026-07-28", 185, [4, 4, 4]),  # missed, irrelevant to the current streak
        _session("2026-08-01", 185, [5, 5, 5]),
        _session("2026-08-04", 185, [5, 5, 5]),
    ]
    result = compute_next_weight(sessions)
    assert result.action == "increase"
    assert result.recommended_weight == 190


def test_estimate_one_rep_max_epley_formula():
    sessions = [_session("2026-08-01", 185, [5, 6, 5])]
    # Epley: weight * (1 + best_reps / 30), best_reps = 6
    expected = 185 * (1 + 6 / 30)
    assert estimate_one_rep_max(sessions) == expected


def test_estimate_one_rep_max_none_when_no_sessions():
    assert estimate_one_rep_max([]) is None


def test_weekly_progression_needed_within_cap():
    # 5 lb needed over exactly 5 weeks = 1 lb/week, well under the 5 lb/week cap.
    needed = weekly_progression_needed(
        current_one_rep_max=200, goal_target_weight=205, target_date="2026-09-19", today="2026-08-15"
    )
    assert needed == pytest.approx(1.0)
    assert exceeds_cap(needed, DEFAULT_WEEKLY_CAP_LB) is False


def test_weekly_progression_needed_exceeds_cap():
    # 40 lb needed over exactly 2 weeks = 20 lb/week, far beyond the 5 lb/week cap.
    needed = weekly_progression_needed(
        current_one_rep_max=200, goal_target_weight=240, target_date="2026-08-29", today="2026-08-15"
    )
    assert needed == pytest.approx(20.0)
    assert exceeds_cap(needed, DEFAULT_WEEKLY_CAP_LB) is True


def test_weekly_progression_needed_past_target_date_is_none():
    needed = weekly_progression_needed(
        current_one_rep_max=200, goal_target_weight=240, target_date="2026-08-01", today="2026-08-15"
    )
    assert needed is None
