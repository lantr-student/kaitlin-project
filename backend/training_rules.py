"""Centralized, tunable training-prescription rules. Change numbers/mappings
here, not in training_prescription.py's logic. Each table below is annotated
with what the number represents and where it comes from — most are standard
strength-coaching conventions; GOAL_VOLUME_MULTIPLIER's exact values are our
own first-pass heuristic (direction is standard, magnitude is a guess) and
are the most likely to need retuning."""

# Mirrors lib/data.ts's GOAL_TYPES — no backend enum exists yet, same duplication
# pattern as _EXPERIENCE_LEVELS already has between frontend/backend.
GOAL_TYPES = [
    "Build strength", "Build muscle", "Lose fat",
    "Improve endurance", "Improve Overall Fitness",
]

# (min_reps, max_reps) per working set, by goal. Standard NSCA/ACSM-style
# rep-range conventions:
# - strength: low reps/high load maximize neural & strength adaptation.
#   Kept at 3-6 (not 1-3) since the app doesn't do 1RM testing.
# - muscle: 8-12 is the classic default hypertrophy range (hypertrophy occurs
#   6-30 reps near failure per modern research, but 8-12 is easiest to program).
# - fat loss: diet drives fat loss, not rep range — leans higher-rep/shorter-
#   rest than hypertrophy for time efficiency during a cut.
# - endurance: traditional muscular-endurance prescription (light, high reps).
# - overall fitness: no narrow target, spans the hypertrophy-endurance middle.
REP_RANGES: dict[str, tuple[int, int]] = {
    "Build strength": (3, 6),
    "Build muscle": (8, 12),
    "Lose fat": (10, 15),
    "Improve endurance": (15, 20),
    "Improve Overall Fitness": (8, 15),
}

# Base weekly working-sets-per-muscle-group landmark, by experience level,
# before GOAL_VOLUME_MULTIPLIER is applied. From the "volume landmark"
# concept in hypertrophy literature (Schoenfeld et al.'s dose-response
# meta-analyses; MEV/MAV/MRV framework popularized by Renaissance
# Periodization) — beginners have lower work capacity/recovery so need
# less; advanced lifters show continued dose-response up to ~20 sets/week
# in trained individuals. Ranges are intentionally fuzzy/overlapping —
# landmarks, not hard boundaries.
BASE_WEEKLY_SETS_PER_MUSCLE: dict[str, tuple[int, int]] = {
    "Beginner": (8, 12), "Intermediate": (10, 16), "Advanced": (12, 20),
}

# Scales BASE_WEEKLY_SETS_PER_MUSCLE by goal. Direction of each adjustment
# is standard programming logic; the exact magnitudes are first-pass
# defaults, not precisely cited numbers — retune here as needed.
# - strength: lower volume, traded for intensity/heavier loads + longer rest.
# - muscle: baseline (1.0) — the landmarks above are already hypertrophy-derived.
# - fat loss: 1.0, not reduced — common guidance is to *maintain* volume
#   during a cut to preserve muscle; the deficit itself drives fat loss.
# - endurance: more total sets at lighter loads is standard for this goal.
# - overall fitness: slightly reduced to stay sustainable for a
#   non-specialized goal.
GOAL_VOLUME_MULTIPLIER: dict[str, float] = {
    "Build strength": 0.8, "Build muscle": 1.0, "Lose fat": 1.0,
    "Improve endurance": 1.1, "Improve Overall Fitness": 0.9,
}

# Muscle-group categorization used to build the day-split templates below —
# standard Push/Pull/Legs & Upper/Lower grouping (pushing muscles work
# together in pressing movements, pulling muscles — including forearms,
# engaged via grip — work together in pulling movements). Maps directly
# onto exercise_library._MUSCLE_GROUPS's 12 groups. Update these if that
# muscle vocabulary changes.
PUSH_MUSCLES = ["Chest", "Shoulders", "Triceps"]
PULL_MUSCLES = ["Back", "Rear Delts", "Biceps", "Forearms"]
LEG_MUSCLES = ["Quads", "Hamstrings", "Glutes", "Adductors"]
CORE_MUSCLES = ["Core"]

# Which day templates make up the split for each supported days/week value
# (matches onboarding's actual Frequency step options: 2-6). Standard
# program-design mapping:
# - 2-3 days: Full Body — at low frequency, training everything each
#   session maximizes per-muscle frequency (2x/week beats 1x/week for
#   hypertrophy per Schoenfeld's frequency meta-analysis).
# - 4 days: Upper/Lower — hits each muscle 2x/week with more per-session volume.
# - 5 days: Upper/Lower/Push/Pull/Legs hybrid — common intermediate/advanced
#   5-day template (e.g. PHUL-style programs).
# - 6 days: Push/Pull/Legs x2 — classic advanced split, 2x/week per muscle.
SPLIT_BY_DAYS: dict[int, dict] = {
    2: {"name": "Full Body", "day_templates": ["Full Body", "Full Body"]},
    3: {"name": "Full Body", "day_templates": ["Full Body", "Full Body", "Full Body"]},
    4: {"name": "Upper/Lower", "day_templates": ["Upper", "Lower", "Upper", "Lower"]},
    5: {"name": "Upper/Lower/Push/Pull/Legs", "day_templates": ["Upper", "Lower", "Push", "Pull", "Legs"]},
    6: {"name": "Push/Pull/Legs", "day_templates": ["Push", "Pull", "Legs", "Push", "Pull", "Legs"]},
}

# Rough planning heuristic (set execution + rest + transition time), used
# only for the optional estimated_sets_per_session output — a coarse
# estimate, not a precise figure.
MINUTES_PER_SET = 4

# Which weekday each training day lands on, for a given days/week value — an
# explicit, hand-editable table (like SPLIT_BY_DAYS) rather than a runtime
# spacing algorithm. Each entry was derived by spreading N training days as
# evenly as possible across a 7-day week (round(i * 7 / N) for i in 0..N-1),
# verified by hand against SPLIT_BY_DAYS's day_templates so the one
# unavoidable back-to-back pair (when N doesn't evenly divide 7) always lands
# on different templates rather than repeating one (e.g. for 4 days, the
# Friday/Saturday pair is Upper/Lower, not Upper/Upper).
TRAINING_WEEKDAYS: dict[int, list[str]] = {
    2: ["Monday", "Friday"],
    3: ["Monday", "Wednesday", "Saturday"],
    4: ["Monday", "Wednesday", "Friday", "Saturday"],
    5: ["Monday", "Tuesday", "Thursday", "Friday", "Sunday"],
    6: ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday", "Sunday"],
}

# Mirrors main.py's WEEKDAY_ORDER — duplicated here (the same pattern
# _EXPERIENCE_LEVELS already has between frontend/backend) rather than
# importing main.py, which would pull in LangChain/agent setup this module
# has no need for.
WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Common default working-set count per exercise, used to turn a target sets
# range for a muscle on a given day into a number of exercise slots.
SETS_PER_EXERCISE_SLOT = 3

# Muscle groups that appear in training_prescription's output (via
# LEG_MUSCLES etc. above) but have zero exercises where they're the
# *primary* muscle anywhere in exercises.json today — Adductors is only ever
# a secondary mover on leg-compound lifts (Squat/Deadlift variants). Skip
# generating a dedicated exercise slot for these; they're still covered
# secondarily by compound leg work. Revisit if the library ever adds a
# primary-Adductors exercise.
MUSCLES_WITHOUT_DEDICATED_SLOTS = ["Adductors"]

# Threshold for treating a (primary, secondary) muscle pairing from
# exercises.json's Compound exercises as a real, repeatable secondary
# relationship worth crediting (see workout_structure.py's
# _SECONDARY_COVERAGE) rather than a one-off/incidental pairing. A raw count
# rather than a fraction, since some muscles have very few compound
# exercises (e.g. Forearms has only 2) where a fraction would be noisy.
MIN_SECONDARY_COVERAGE_COUNT = 2

# Sets credited toward a muscle's own weekly target, per same-day compound
# slot that commonly hits it as a secondary mover (e.g. Chest's Bench Press
# slot credits Triceps/Shoulders). A heuristic, not a precisely cited number
# — roughly two-thirds of SETS_PER_EXERCISE_SLOT, reflecting that secondary/
# synergist stimulus is real but not equivalent to a fully dedicated
# exercise's worth of direct work. Credit stacks across multiple qualifying
# sources on the same day, capped at the muscle's own target (never negative).
SECONDARY_CREDIT_SETS_PER_SOURCE = 2

# --- Stage 3: Exercise Selection scoring (first-pass defaults — FLAG FOR REVIEW) ---
# Weighted-sum score used to rank candidates that already survived every hard
# filter (exercise_type-matches-slot, target-muscle, equipment, experience,
# avoid-list, same-day no-repeat, movement-pattern variety — see
# exercise_selection.py). Only relative size matters (used purely for
# ranking), summing to 1.0 is a convenience, not a requirement.
WEIGHT_MUSCLE_MATCH = 0.40
WEIGHT_GOAL_MATCH = 0.20
WEIGHT_EQUIPMENT_MATCH = 0.20
WEIGHT_EXPERIENCE_MATCH = 0.20

# A candidate that only hits the slot's target muscle as a secondary mover
# (not in primary_muscles) scores this fraction of WEIGHT_MUSCLE_MATCH
# instead of the full weight.
SECONDARY_MUSCLE_MATCH_FACTOR = 0.5

# goal_match score for goals with no bonus/penalty condition below (keeps
# the term an explicit no-op rather than silently 0, since 0 could read as
# a penalty rather than neutral).
NEUTRAL_GOAL_MATCH_SCORE = 0.5

# Which bonus condition each goal's candidates are checked against for
# goal_match. "compound_bonus": exercise_type == "Compound" scores full
# weight, else 0 — strength favors heavier compound lifts. "low_demand_bonus":
# skill_demand == "Low" and stability_demand == "Low" scores full weight,
# else 0 — endurance/fat-loss work is done at high rep counts near fatigue,
# where low-skill/low-stability movements are safer to repeat that often.
# "neutral": always NEUTRAL_GOAL_MATCH_SCORE, no bonus either way.
GOAL_MATCH_RULE: dict[str, str] = {
    "Build strength": "compound_bonus",
    "Build muscle": "neutral",
    "Lose fat": "low_demand_bonus",
    "Improve endurance": "low_demand_bonus",
    "Improve Overall Fitness": "neutral",
}

# Flat penalty subtracted from a slot's winning score when it could only be
# filled by relaxing one or more constraints (see exercise_selection.py's
# fixed fallback order: 1) drop movement-pattern variety, 2) also allow one
# experience level above the client's, 3) also allow equipment the client
# doesn't have — each level cumulative on the previous). Keyed by which
# level resolved the slot; applied once per slot, not per relaxed rule.
# Increasing by level reflects that each step is a bigger compromise than
# the last — first-pass magnitudes, not precisely tuned.
RELAXATION_PENALTY_BY_LEVEL: dict[int, float] = {
    1: 0.05,
    2: 0.15,
    3: 0.30,
}
