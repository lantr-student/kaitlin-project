"""Temporary in-memory session-log storage.

This is a placeholder for a real persistent database (planned later) — the
process-local dict below is lost on every restart. Callers should only rely
on the log_session/get_sessions function signatures, not on how the data is
actually held, so swapping this out for a real DB later doesn't touch any
caller.
"""

from pydantic import BaseModel


class SessionRecord(BaseModel):
    user_id: str
    exercise_name: str
    date: str  # ISO date "YYYY-MM-DD", used for chronological ordering
    prescribed_sets: int
    prescribed_reps: int
    weight: float
    actual_reps: list[int]  # reps completed per set, in order


_SESSION_LOG: dict[tuple[str, str], list[SessionRecord]] = {}


def log_session(record: SessionRecord) -> None:
    key = (record.user_id, record.exercise_name)
    sessions = _SESSION_LOG.setdefault(key, [])
    sessions.append(record)
    sessions.sort(key=lambda s: s.date)


def get_sessions(user_id: str, exercise_name: str) -> list[SessionRecord]:
    return list(_SESSION_LOG.get((user_id, exercise_name), []))
