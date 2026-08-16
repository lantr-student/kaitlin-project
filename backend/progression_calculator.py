"""Deterministic weight-progression math, kept separate from the LLM tool
wrapper in main.py so it's plain, unit-testable Python with no LLM calls —
mirrors the exercise_library.py convention of pure compute + formatting
helpers imported by main.py."""

from datetime import date
from typing import NamedTuple, Optional

from session_store import SessionRecord

WEIGHT_INCREMENT_LB = 5.0
DEFAULT_WEEKLY_CAP_LB = 5.0


class ProgressionResult(NamedTuple):
    current_weight: float
    recommended_weight: float
    action: str  # "increase" | "repeat" | "hold" | "none"
    reason: str


def _session_succeeded(session: SessionRecord) -> bool:
    if len(session.actual_reps) < session.prescribed_sets:
        return False
    return all(reps >= session.prescribed_reps for reps in session.actual_reps[: session.prescribed_sets])


def compute_next_weight(sessions: list[SessionRecord]) -> ProgressionResult:
    """sessions must be chronological, oldest first (session_store.get_sessions
    already returns them this way).

    Rules: a missed session always repeats the same weight next time. A
    successful session only triggers an increase if the immediately preceding
    session was also successful at the *same* weight (a 2-session streak) —
    otherwise it holds, since a single clean session or a weight change resets
    the streak."""
    if not sessions:
        return ProgressionResult(0.0, 0.0, "none", "No logged sessions for this exercise yet.")

    last = sessions[-1]

    if not _session_succeeded(last):
        best_set = max(last.actual_reps, default=0)
        return ProgressionResult(
            last.weight,
            last.weight,
            "repeat",
            f"Missed prescribed reps last session ({best_set}/{last.prescribed_reps} reps on the best set at "
            f"{last.weight:g} lb) — repeat {last.weight:g} lb next session.",
        )

    if len(sessions) >= 2:
        previous = sessions[-2]
        if previous.weight == last.weight and _session_succeeded(previous):
            next_weight = last.weight + WEIGHT_INCREMENT_LB
            return ProgressionResult(
                last.weight,
                next_weight,
                "increase",
                f"Completed all prescribed reps at {last.weight:g} lb for 2 consecutive sessions — "
                f"increase to {next_weight:g} lb next session.",
            )

    return ProgressionResult(
        last.weight,
        last.weight,
        "hold",
        f"Completed all prescribed reps at {last.weight:g} lb — hold at {last.weight:g} lb for one more "
        "clean session before increasing.",
    )


def estimate_one_rep_max(sessions: list[SessionRecord]) -> Optional[float]:
    """Epley formula (1RM = weight * (1 + reps/30)) from the best-performing
    set (most reps) in the most recent logged session."""
    if not sessions or not sessions[-1].actual_reps:
        return None
    last = sessions[-1]
    return last.weight * (1 + max(last.actual_reps) / 30)


def weekly_progression_needed(
    current_one_rep_max: float, goal_target_weight: float, target_date: str, today: str
) -> Optional[float]:
    """Average lb/week increase needed to go from current_one_rep_max to
    goal_target_weight by target_date. Returns None if target_date isn't in
    the future relative to today (nothing meaningful to compute)."""
    weeks_remaining = (date.fromisoformat(target_date) - date.fromisoformat(today)).days / 7
    if weeks_remaining <= 0:
        return None
    if goal_target_weight <= current_one_rep_max:
        return 0.0
    return (goal_target_weight - current_one_rep_max) / weeks_remaining


def exceeds_cap(weekly_needed: float, cap: float = DEFAULT_WEEKLY_CAP_LB) -> bool:
    return weekly_needed > cap


def format_progression_result(
    progression: ProgressionResult,
    estimated_one_rep_max: Optional[float],
    weekly_needed: Optional[float] = None,
    cap: float = DEFAULT_WEEKLY_CAP_LB,
) -> str:
    lines = [
        f"Current weight: {progression.current_weight:g} lb.",
        f"Recommended next weight: {progression.recommended_weight:g} lb.",
        f"Action: {progression.action}.",
        f"Reason: {progression.reason}",
    ]
    if estimated_one_rep_max is not None:
        lines.append(f"Estimated current 1-rep max: {estimated_one_rep_max:.1f} lb.")
    if weekly_needed is not None:
        cap_exceeded = exceeds_cap(weekly_needed, cap)
        lines.append(
            f"Weekly progression needed to hit the goal: {weekly_needed:.2f} lb/week "
            f"({'exceeds' if cap_exceeded else 'within'} the {cap:g} lb/week cap)."
        )
    return " ".join(lines)
