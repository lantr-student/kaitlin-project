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
