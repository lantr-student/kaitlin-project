import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from session_store import SessionRecord, get_sessions, log_session


def _session(user_id: str, exercise_name: str, date: str, weight: float) -> SessionRecord:
    return SessionRecord(
        user_id=user_id,
        exercise_name=exercise_name,
        date=date,
        prescribed_sets=3,
        prescribed_reps=5,
        weight=weight,
        actual_reps=[5, 5, 5],
    )


def test_log_and_get_sessions_round_trip():
    log_session(_session("u_store_1", "Bench Press", "2026-08-01", 135))
    log_session(_session("u_store_1", "Bench Press", "2026-08-04", 140))

    sessions = get_sessions("u_store_1", "Bench Press")
    assert [s.date for s in sessions] == ["2026-08-01", "2026-08-04"]
    assert [s.weight for s in sessions] == [135, 140]


def test_get_sessions_scoped_per_user():
    log_session(_session("u_store_a", "Deadlift", "2026-08-01", 225))
    log_session(_session("u_store_b", "Deadlift", "2026-08-01", 315))

    assert [s.weight for s in get_sessions("u_store_a", "Deadlift")] == [225]
    assert [s.weight for s in get_sessions("u_store_b", "Deadlift")] == [315]


def test_get_sessions_empty_for_unknown_exercise():
    assert get_sessions("u_store_unknown", "Nonexistent Lift") == []


def test_log_session_keeps_chronological_order_even_if_logged_out_of_order():
    log_session(_session("u_store_2", "Overhead Press", "2026-08-10", 95))
    log_session(_session("u_store_2", "Overhead Press", "2026-08-03", 90))

    sessions = get_sessions("u_store_2", "Overhead Press")
    assert [s.date for s in sessions] == ["2026-08-03", "2026-08-10"]
