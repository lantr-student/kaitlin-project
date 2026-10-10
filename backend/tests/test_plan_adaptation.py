import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from exercise_library import _EQUIPMENT_ITEMS, find_exercise
from exercise_prescription import compute_exercise_prescription
from exercise_selection import compute_exercise_selection
from plan_adaptation import _find_substitute, compute_adaptation
from session_store import SessionRecord
from training_prescription import PrescriptionInput, compute_prescription
from training_rules import MISSED_REPS_SIGNAL_THRESHOLD, SKIPPED_EXERCISE_SIGNAL_THRESHOLD, STALLED_PROGRESS_SESSION_THRESHOLD
from workout_structure import compute_workout_structure


def _baseline(**overrides):
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
    plan = compute_exercise_prescription(
        selected, goal_type=profile.goal_type, experience_level=profile.experience_level, exercise_history={}
    )
    return profile, prescription, structure, plan


def _first_weighted_exercise_name(plan) -> str:
    for day in plan.training_days:
        for slot in day.slots:
            if slot.exercise is not None and slot.weight is not None:
                return slot.exercise["name"]
    raise AssertionError("no weighted exercise in baseline plan")


def _session(name, weight, actual_reps, date, prescribed_reps=8, prescribed_sets=3):
    return SessionRecord(
        user_id="u1", exercise_name=name, date=date,
        prescribed_sets=prescribed_sets, prescribed_reps=prescribed_reps, weight=weight, actual_reps=actual_reps,
    )


def _changes_for(result, exercise_name):
    return [c for c in result.changes if c.exercise_name == exercise_name]


# --- no signals: progression math still runs, no structural change ---


def test_clean_progression_updates_weight_with_no_signals():
    profile, prescription, structure, plan = _baseline()
    name = _first_weighted_exercise_name(plan)
    history = {name.lower(): [_session(name, 100.0, [8, 8, 8], "2026-01-01"), _session(name, 100.0, [8, 8, 8], "2026-01-08")]}

    result = compute_adaptation(profile, prescription, structure, plan, history)

    assert result.applied
    assert result.signals == []
    assert result.needs_llm_review == []
    changes = _changes_for(result, name)
    assert changes and all(c.change == "weight_update" for c in changes)
    updated_slot = next(
        s for day in result.plan.training_days for s in day.slots if s.exercise and s.exercise["name"] == name
    )
    assert updated_slot.weight == 105.0


# --- repeated missed reps -> deload ---


def test_repeated_missed_reps_triggers_a_deload():
    profile, prescription, structure, plan = _baseline()
    name = _first_weighted_exercise_name(plan)
    sessions = [
        _session(name, 100.0, [5, 5, 5], f"2026-01-{i:02d}") for i in (1, 8, 15)
    ][:MISSED_REPS_SIGNAL_THRESHOLD]
    history = {name.lower(): sessions}

    result = compute_adaptation(profile, prescription, structure, plan, history)

    assert result.applied
    assert any(s.signal == "repeated_missed_reps" for s in result.signals)
    assert result.needs_llm_review == []
    deload_changes = [c for c in _changes_for(result, name) if "Deloaded" in c.reason]
    assert deload_changes
    updated_slot = next(
        s for day in result.plan.training_days for s in day.slots if s.exercise and s.exercise["name"] == name
    )
    assert updated_slot.weight == 95.0
    assert updated_slot.weight_source == "adaptation_deload"


def test_deload_that_would_go_non_positive_escalates_instead():
    profile, prescription, structure, plan = _baseline()
    name = _first_weighted_exercise_name(plan)
    sessions = [_session(name, 2.0, [5, 5, 5], f"2026-01-{i:02d}") for i in (1, 8, 15)]
    history = {name.lower(): sessions}

    result = compute_adaptation(profile, prescription, structure, plan, history)

    assert any(s.signal == "repeated_missed_reps" for s in result.needs_llm_review)
    updated_slot = next(
        s for day in result.plan.training_days for s in day.slots if s.exercise and s.exercise["name"] == name
    )
    assert updated_slot.weight_source != "adaptation_deload"


# --- stalled progress -> exercise swap (takes precedence over the baseline increase) ---


def test_stalled_progress_triggers_an_exercise_swap():
    profile, prescription, structure, plan = _baseline()
    name = _first_weighted_exercise_name(plan)
    sessions = [
        _session(name, 100.0, [8, 8, 8], f"2026-01-{i:02d}") for i in range(1, STALLED_PROGRESS_SESSION_THRESHOLD + 1)
    ]
    history = {name.lower(): sessions}

    result = compute_adaptation(profile, prescription, structure, plan, history)

    assert any(s.signal == "stalled_progress" for s in result.signals)
    swap_changes = [c for c in _changes_for(result, name) if c.change == "exercise_swap"]
    assert swap_changes and swap_changes[0].previous == name and swap_changes[0].new != name


# --- consistently skipped -> exercise swap ---


def test_consistently_skipped_triggers_an_exercise_swap():
    profile, prescription, structure, plan = _baseline()
    name = _first_weighted_exercise_name(plan)
    skipped = [(name, "2026-01-01")] * SKIPPED_EXERCISE_SIGNAL_THRESHOLD

    result = compute_adaptation(profile, prescription, structure, plan, {}, skipped_exercises=skipped)

    assert any(s.signal == "consistently_skipped" for s in result.signals)
    swap_changes = [c for c in _changes_for(result, name) if c.change == "exercise_swap"]
    assert swap_changes and swap_changes[0].previous == name


def test_below_threshold_skips_do_not_trigger_a_signal():
    profile, prescription, structure, plan = _baseline()
    name = _first_weighted_exercise_name(plan)
    skipped = [(name, "2026-01-01")] * (SKIPPED_EXERCISE_SIGNAL_THRESHOLD - 1)

    result = compute_adaptation(profile, prescription, structure, plan, {}, skipped_exercises=skipped)

    assert result.signals == []
    assert result.changes == []


# --- no safe substitute -> escalate rather than guess ---


def test_find_substitute_returns_none_when_nothing_qualifies():
    leg_extension = find_exercise("Leg Extension")  # the library's only Quads-Isolation exercise
    equipment_free_profile = PrescriptionInput(
        goal_type="Build muscle", experience_level="Intermediate", days_per_week=3, equipment=[]
    )
    assert _find_substitute(leg_extension, "Isolation", equipment_free_profile, used_today=set()) is None


# --- invalid result reverts to the original plan, unmodified ---


def test_invalid_plan_reverts_and_reports_rejection():
    # A pre-existing day-count mismatch (profile vs. plan) always fails Stage 5
    # regardless of what adaptation does -- a direct way to exercise the
    # revert control flow without depending on adaptation itself causing the
    # break (the rule-based swap/deload logic is deliberately constrained to
    # stay within Stage 5's checks, so it won't normally cause one).
    profile, prescription, structure, plan = _baseline()
    broken_plan = plan._replace(training_days=plan.training_days[:-1])

    result = compute_adaptation(profile, prescription, structure, broken_plan, {})

    assert not result.applied
    assert result.plan is broken_plan
    assert result.rejected_reason is not None and "training days" in result.rejected_reason
    assert not result.validation.valid
    assert any(e.code == "WRONG_DAY_COUNT" for e in result.validation.errors)
