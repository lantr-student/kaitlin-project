import json
from pathlib import Path
from typing import NamedTuple, Optional

EXERCISE_LIBRARY_PATH = Path(__file__).parent / "data" / "exercises.json"
with open(EXERCISE_LIBRARY_PATH) as f:
    _EXERCISE_LIBRARY: list[dict] = json.load(f)

_EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"]
_DEMAND_LEVELS = ["Low", "Medium", "High"]

_MUSCLE_GROUPS = sorted(
    {m for ex in _EXERCISE_LIBRARY for m in ex["primary_muscles"]}
    | {m for ex in _EXERCISE_LIBRARY for m in ex["secondary_muscles"]}
)
_EQUIPMENT_ITEMS = sorted({item for ex in _EXERCISE_LIBRARY for item in ex["equipment"]})
_MOVEMENT_PATTERNS = sorted({ex["movement_pattern"] for ex in _EXERCISE_LIBRARY})


def _matches_equipment(exercise_equipment: list[str], available: Optional[list[str]]) -> bool:
    if available is None:
        return True
    return set(exercise_equipment).issubset(set(available))


def _matches_muscle_group(exercise: dict, muscle_group: str) -> bool:
    target = muscle_group.lower()
    if any(m.lower() == target for m in exercise["primary_muscles"]):
        return True
    return any(m.lower() == target for m in exercise["secondary_muscles"])


def find_exercise(name: str) -> Optional[dict]:
    return next((ex for ex in _EXERCISE_LIBRARY if ex["name"].lower() == name.lower()), None)


def _format_exercise(exercise: dict) -> str:
    """Compact one-line summary for list contexts (discovery results, substitute
    lists, plan candidates)."""
    equipment = ", ".join(exercise["equipment"]) if exercise["equipment"] else "Bodyweight only"
    muscles = "/".join(exercise["primary_muscles"])
    if exercise["secondary_muscles"]:
        muscles += f" (also works {', '.join(exercise['secondary_muscles'])})"
    return (
        f"{exercise['name']} ({muscles}, {exercise['experience_level']}, "
        f"{exercise['movement_pattern']}, {exercise['exercise_type']}, equipment: {equipment})"
    )


class ProgressionResult(NamedTuple):
    exercises: list[dict]
    # True when these are same-difficulty fallbacks, not genuinely harder —
    # happens when target is already at the ceiling this library models
    # (e.g. Back Squat: Advanced + High/High skill/stability, the max rank).
    is_same_difficulty: bool


def _format_exercise_detail(exercise: dict, progression: ProgressionResult, regression: list[dict]) -> str:
    """Full profile for a single exercise, used when a specific exercise_name
    lookup succeeds — includes the attributes _format_exercise omits to stay
    concise (stability/skill demand, joints, progression/regression)."""
    joints = ", ".join(exercise["joint_demands"])
    lines = [
        _format_exercise(exercise),
        f"Unilateral: {'yes' if exercise['unilateral'] else 'no'}. "
        f"Stability demand: {exercise['stability_demand']}. Skill demand: {exercise['skill_demand']}. "
        f"Joints loaded: {joints}.",
    ]
    if progression.exercises:
        label = (
            "No harder variant in the library — closest same-difficulty options"
            if progression.is_same_difficulty
            else "Progression (harder variants)"
        )
        lines.append(f"{label}: {', '.join(ex['name'] for ex in progression.exercises)}.")
    if regression:
        lines.append(f"Regression (easier variants): {', '.join(ex['name'] for ex in regression)}.")
    return " ".join(lines)


def _filter_candidates(equipment: list[str], experience_level: str) -> list[dict]:
    """Deterministic equipment/experience filter over the exercise library, run
    in plain Python instead of letting the LLM discover candidates one at a
    time via tool calls (which was costing a full LLM round-trip per guess —
    see PLAN_SYSTEM_PROMPT for where the filtered result gets used).

    Includes exercises at or below the client's stated experience level (an
    Advanced client can still do Beginner/Intermediate movements), not just
    exact-level matches — exact-match only leaves just 2-3 candidates for an
    Advanced client in this library, nowhere near enough to fill a full week.
    """
    max_level = _EXPERIENCE_LEVELS.index(experience_level) if experience_level in _EXPERIENCE_LEVELS else len(_EXPERIENCE_LEVELS) - 1
    return [
        ex
        for ex in _EXERCISE_LIBRARY
        if _matches_equipment(ex["equipment"], equipment)
        and _EXPERIENCE_LEVELS.index(ex["experience_level"]) <= max_level
    ]


def _format_candidates(candidates: list[dict]) -> str:
    return "\n".join(f"- {_format_exercise(ex)}" for ex in candidates)


# --- Similarity scoring, used for substitutes/progression/regression ---
# All weights live here so they're easy to retune without touching the
# selection logic below. They sum to 1.0 but don't strictly need to —
# only the relative sizes matter, since we're only ever comparing scores
# against each other (ranking), never against an absolute threshold.
_WEIGHT_PRIMARY_MUSCLES = 0.40
_WEIGHT_MOVEMENT_PATTERN = 0.25
_WEIGHT_EXERCISE_TYPE = 0.15
_WEIGHT_SECONDARY_MUSCLES = 0.10
_WEIGHT_DEMAND_CLOSENESS = 0.10


def _jaccard(a: list[str], b: list[str]) -> float:
    set_a, set_b = set(a), set(b)
    union = set_a | set_b
    return len(set_a & set_b) / len(union) if union else 0.0


def _difficulty_rank(exercise: dict) -> int:
    """Combined difficulty score used to tell progression (harder) apart from
    regression (easier). experience_level dominates the ranking; skill/stability
    demand break ties within the same level."""
    return (
        _EXPERIENCE_LEVELS.index(exercise["experience_level"]) * 10
        + _DEMAND_LEVELS.index(exercise["skill_demand"])
        + _DEMAND_LEVELS.index(exercise["stability_demand"])
    )


def _shares_any_muscle(a: dict, b: dict) -> bool:
    muscles_a = set(a["primary_muscles"]) | set(a["secondary_muscles"])
    muscles_b = set(b["primary_muscles"]) | set(b["secondary_muscles"])
    return bool(muscles_a & muscles_b)


def _similarity_score(target: dict, candidate: dict) -> float:
    primary_score = _jaccard(target["primary_muscles"], candidate["primary_muscles"])
    secondary_score = _jaccard(target["secondary_muscles"], candidate["secondary_muscles"])
    pattern_score = 1.0 if target["movement_pattern"] == candidate["movement_pattern"] else 0.0
    type_score = 1.0 if target["exercise_type"] == candidate["exercise_type"] else 0.0

    skill_gap = abs(_DEMAND_LEVELS.index(target["skill_demand"]) - _DEMAND_LEVELS.index(candidate["skill_demand"]))
    stability_gap = abs(
        _DEMAND_LEVELS.index(target["stability_demand"]) - _DEMAND_LEVELS.index(candidate["stability_demand"])
    )
    demand_score = 1.0 - (skill_gap + stability_gap) / 4  # max combined gap is 2 + 2

    return (
        _WEIGHT_PRIMARY_MUSCLES * primary_score
        + _WEIGHT_MOVEMENT_PATTERN * pattern_score
        + _WEIGHT_EXERCISE_TYPE * type_score
        + _WEIGHT_SECONDARY_MUSCLES * secondary_score
        + _WEIGHT_DEMAND_CLOSENESS * demand_score
    )


def _candidate_pool(target: dict, equipment: Optional[list[str]], experience_level: str = "") -> list[dict]:
    pool = []
    for ex in _EXERCISE_LIBRARY:
        if ex["name"] == target["name"]:
            continue
        if not _shares_any_muscle(target, ex):
            continue
        if not _matches_equipment(ex["equipment"], equipment):
            continue
        if experience_level and ex["experience_level"].lower() != experience_level.lower():
            continue
        pool.append(ex)
    return pool


def compute_substitutes(
    target: dict, equipment: Optional[list[str]] = None, experience_level: str = "", top_n: int = 5
) -> list[dict]:
    """Best lateral swaps for target — same training purpose, ranked by
    _similarity_score, no difficulty direction required."""
    pool = _candidate_pool(target, equipment, experience_level)
    return sorted(pool, key=lambda ex: _similarity_score(target, ex), reverse=True)[:top_n]


def compute_progression(target: dict, equipment: Optional[list[str]] = None, top_n: int = 3) -> ProgressionResult:
    """Closest harder variants of target — same candidate pool as substitutes,
    restricted to strictly higher _difficulty_rank, picking the closest match
    first (the next rung up) rather than the single hardest option overall.

    If nothing scores harder (target is already at the ceiling this library
    models for its muscle group, e.g. Back Squat), falls back to the closest
    same-difficulty options instead of returning nothing — flagged via
    is_same_difficulty so callers don't present a lateral pick as harder."""
    pool = _candidate_pool(target, equipment)
    target_rank = _difficulty_rank(target)

    harder = [ex for ex in pool if _difficulty_rank(ex) > target_rank]
    if harder:
        ranked = sorted(harder, key=lambda ex: _similarity_score(target, ex), reverse=True)
        return ProgressionResult(ranked[:top_n], is_same_difficulty=False)

    same_tier = [ex for ex in pool if _difficulty_rank(ex) == target_rank]
    ranked = sorted(same_tier, key=lambda ex: _similarity_score(target, ex), reverse=True)
    return ProgressionResult(ranked[:top_n], is_same_difficulty=True)


def compute_regression(target: dict, equipment: Optional[list[str]] = None, top_n: int = 3) -> list[dict]:
    """Closest easier variants of target — mirror of compute_progression."""
    pool = _candidate_pool(target, equipment)
    target_rank = _difficulty_rank(target)
    easier = [ex for ex in pool if _difficulty_rank(ex) < target_rank]
    return sorted(easier, key=lambda ex: _similarity_score(target, ex), reverse=True)[:top_n]
