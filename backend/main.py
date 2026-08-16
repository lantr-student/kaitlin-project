import logging
import os
import re
import time
from datetime import date
from typing import Annotated, Optional

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.messages import ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, ValidationError

from exercise_library import (
    _EQUIPMENT_ITEMS,
    _EXERCISE_LIBRARY,
    _EXPERIENCE_LEVELS,
    _MOVEMENT_PATTERNS,
    _MUSCLE_GROUPS,
    _filter_candidates,
    _format_candidates,
    _format_exercise,
    _format_exercise_detail,
    _matches_equipment,
    _matches_muscle_group,
    compute_progression,
    compute_regression,
    compute_substitutes,
    find_exercise,
    ProgressionResult,
)
from progression_calculator import (
    compute_next_weight,
    estimate_one_rep_max,
    format_progression_result,
    weekly_progression_needed,
)
from session_store import get_sessions

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


class TimingCallback(BaseCallbackHandler):
    """Logs per-LLM-call and per-tool-call timing/counts for one request, plus
    a total-time summary. Attach via config={"callbacks": [...]} on invoke()."""

    def __init__(self, label: str):
        self.label = label
        self.start_time = time.perf_counter()
        self.llm_call_count = 0
        self.tool_call_count = 0
        self.input_tokens = 0
        self.output_tokens = 0
        self.total_tokens = 0
        self._llm_starts: dict = {}
        self._tool_starts: dict = {}

    def on_chat_model_start(self, serialized, messages, *, run_id, **kwargs):
        self._llm_starts[run_id] = time.perf_counter()
        self.llm_call_count += 1
        prompt_chars = sum(len(m.content or "") for batch in messages for m in batch)
        logger.info("[%s] LLM call #%d start (~%d prompt chars)", self.label, self.llm_call_count, prompt_chars)

    def on_llm_end(self, response, *, run_id, **kwargs):
        start = self._llm_starts.pop(run_id, None)
        if start is not None:
            logger.info("[%s] LLM call end — %.2fs", self.label, time.perf_counter() - start)

        usage = self._extract_usage(response)
        if usage is None:
            logger.info("[%s] token usage unavailable for this call", self.label)
            return
        input_tokens, output_tokens, total_tokens = usage
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.total_tokens += total_tokens
        logger.info(
            "[%s] tokens — input: %d, output: %d, total: %d", self.label, input_tokens, output_tokens, total_tokens
        )

    @staticmethod
    def _extract_usage(response) -> Optional[tuple[int, int, int]]:
        """Best-effort token usage extraction. Response shape varies by
        provider/gateway, so this must never raise — a missing/unrecognized
        shape just means usage logging is skipped, not a broken plan call."""
        try:
            token_usage = (response.llm_output or {}).get("token_usage") if response.llm_output else None
            if token_usage:
                return (
                    token_usage.get("prompt_tokens", 0),
                    token_usage.get("completion_tokens", 0),
                    token_usage.get("total_tokens", 0),
                )
            message = response.generations[0][0].message
            usage_metadata = getattr(message, "usage_metadata", None)
            if usage_metadata:
                return (
                    usage_metadata.get("input_tokens", 0),
                    usage_metadata.get("output_tokens", 0),
                    usage_metadata.get("total_tokens", 0),
                )
        except (AttributeError, IndexError, KeyError, TypeError):
            pass
        return None

    def on_tool_start(self, serialized, input_str, *, run_id, **kwargs):
        self._tool_starts[run_id] = time.perf_counter()
        self.tool_call_count += 1
        logger.info(
            "[%s] tool call #%d start: %s(%s)", self.label, self.tool_call_count, serialized.get("name"), input_str
        )

    def on_tool_end(self, output, *, run_id, **kwargs):
        start = self._tool_starts.pop(run_id, None)
        if start is not None:
            logger.info("[%s] tool call end — %.3fs", self.label, time.perf_counter() - start)

    def log_summary(self):
        total = time.perf_counter() - self.start_time
        logger.info(
            "[%s] TOTAL %.2fs | LLM calls: %d | tool calls: %d | tokens in: %d, out: %d, total: %d",
            self.label,
            total,
            self.llm_call_count,
            self.tool_call_count,
            self.input_tokens,
            self.output_tokens,
            self.total_tokens,
        )
        return total

COACH_PERSONA = (
    "You are a personal training coach. Your tone is confident, calm, and "
    "conversational — like a good friend who happens to know their stuff: "
    "casual, warm, everyday language, not clinical or stiff, "
    "and never trying to hype anyone up. Every sentence should say "
    "something specific and useful, not filler. You always aim to give a concrete, specific next step toward "
    "their goal based on what they've actually told you. If you don't "
    "have enough information to give a specific step (current numbers, "
    "timeline, training frequency, experience level, etc.), say so "
    "plainly and ask a clarifying question instead of guessing. You never "
    "invent numbers, never diagnose injuries, and never give medical "
    "advice. Examples of the intended style, NOT hard-coded responses: "
    "'Okay, 225 by June is totally doable — you're at 185 now, so let's "
    "just add about 2.5 pounds a week and you'll get there right on "
    "time.' Or: 'Running a marathon is a solid goal. Five consistent training days gives "
    "us plenty to build on — first step is bringing your easy volume up "
    "gradually. We'll build your base over a few weeks, then start "
    "layering in intensity.'"
)

# SYSTEM_PROMPT (chat) = persona + chat-only mechanics (tool use, markdown-free
# UI). PLAN_SYSTEM_PROMPT below reuses COACH_PERSONA directly instead of this,
# since plan generation has no tools bound and isn't rendered in the chat UI —
# those two sentences would just be dead prompt tokens on every plan call.
SYSTEM_PROMPT = (
    COACH_PERSONA + " "
    "When the client asks about swapping an exercise, needs "
    "an alternative because a piece of equipment isn't available, or asks what "
    "exercises fit their equipment or experience level, use the lookup_exercise "
    "tool rather than guessing. When the client reports finishing or missing a set, "
    "or asks whether to add weight next time, use the progression_calculator tool to "
    "get the next weight, action, and reason instead of computing or guessing it "
    "yourself. Write in plain text only, no markdown — the chat "
    "UI doesn't render formatting, so never wrap exercise names or anything else "
    "in asterisks or other markdown syntax."
)


def limit_sentences(text, max_sentences=4):
    text = text.strip()
    boundaries = [m.end() for m in re.finditer(r"[.!?]+(?=\s|$)", text)]
    if not boundaries:
        return text
    return text[: boundaries[min(max_sentences, len(boundaries)) - 1]].strip()


def _build_llm() -> ChatOpenAI:
    base_url = os.environ["LANTR_AI_URL"].rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    return ChatOpenAI(
        api_key=os.environ["LANTR_AI_KEY"],
        base_url=base_url,
        model=os.environ["LANTR_MODEL"],
    )


# Shared by build_agent() and build_plan_llm() so the app only opens one
# ChatOpenAI client (and connection pool) instead of one per use case.
_llm_instance: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = _build_llm()
    return _llm_instance


@tool
def lookup_exercise(
    exercise_name: Annotated[
        str, Field(description="Exact exercise name to get full details and substitutes for, e.g. 'Back Squat'.")
    ] = "",
    muscle_group: Annotated[
        str, Field(description=f"One of: {', '.join(_MUSCLE_GROUPS)}.")
    ] = "",
    movement_pattern: Annotated[
        str, Field(description=f"One of: {', '.join(_MOVEMENT_PATTERNS)}.")
    ] = "",
    equipment: Annotated[
        Optional[list[str]],
        Field(description=f"Client's available equipment, from: {', '.join(_EQUIPMENT_ITEMS)}."),
    ] = None,
    experience_level: Annotated[
        str, Field(description=f"One of: {', '.join(_EXPERIENCE_LEVELS)}.")
    ] = "",
    direction: Annotated[
        str,
        Field(
            description="Only relevant with exercise_name. 'similar' (default) finds the closest same-difficulty "
            "swap — use this for ordinary substitution requests (equipment unavailable, wants variety, etc). "
            "Use 'harder' or 'easier' ONLY when the client explicitly asks for a harder or easier variant."
        ),
    ] = "similar",
) -> str:
    """Look up exercises in Spotter's library by name, muscle group, or movement pattern — filtered by the client's equipment and experience level — and surface the closest-matching substitute, or an easier/harder variant if the client asked for one."""
    primary_input = exercise_name or muscle_group or movement_pattern or "unspecified"
    logger.info("tool=lookup_exercise input=%s", primary_input)
    direction = direction.lower() if direction.lower() in ("harder", "easier") else "similar"

    def matches_filters(ex: dict) -> bool:
        if not _matches_equipment(ex["equipment"], equipment):
            return False
        if experience_level and ex["experience_level"].lower() != experience_level.lower():
            return False
        if movement_pattern and ex["movement_pattern"].lower() != movement_pattern.lower():
            return False
        return True

    def matches_pattern(ex: dict) -> bool:
        # Equipment/experience are already applied inside compute_substitutes /
        # compute_progression / compute_regression below (with different rules
        # per call — see their docstrings), so this only layers movement_pattern
        # on top when the caller asked for one.
        return not movement_pattern or ex["movement_pattern"].lower() == movement_pattern.lower()

    if exercise_name:
        target = find_exercise(exercise_name)
        if target is None:
            return f"No exercise named '{exercise_name}' found in the library."

        subs: list[dict] = []
        progression = ProgressionResult([], False)
        regression: list[dict] = []

        if direction == "harder":
            progression_result = compute_progression(target, equipment=equipment)
            progression = ProgressionResult(
                [ex for ex in progression_result.exercises if matches_pattern(ex)],
                progression_result.is_same_difficulty,
            )
        elif direction == "easier":
            regression = [ex for ex in compute_regression(target, equipment=equipment) if matches_pattern(ex)]
        else:
            subs = [
                ex for ex in compute_substitutes(target, equipment=equipment, experience_level=experience_level)
                if matches_pattern(ex)
            ]

        result = _format_exercise_detail(target, progression, regression)
        if direction == "similar":
            if subs:
                listed = "; ".join(_format_exercise(ex) for ex in subs)
                result += f" Substitutes: {listed}"
            else:
                result += " No substitute matched the given equipment/experience/pattern filters."
        elif direction == "harder" and not progression.exercises:
            result += " No progression options matched the given equipment/pattern filters."
        elif direction == "easier" and not regression:
            result += " No regression options matched the given equipment/pattern filters."
        return result

    if muscle_group or movement_pattern:
        matches = [
            ex for ex in _EXERCISE_LIBRARY
            if (not muscle_group or _matches_muscle_group(ex, muscle_group))
            and matches_filters(ex)
        ]
        if not matches:
            return "No exercises found matching those filters."
        listed = "; ".join(_format_exercise(ex) for ex in matches)
        label = muscle_group or movement_pattern
        return f"Exercises for {label}: {listed}"

    return "Provide an exercise_name, muscle_group, or movement_pattern to look up."


@tool
def progression_calculator(
    user_id: Annotated[str, Field(description="Client's user id, used to look up their logged session history.")],
    exercise_name: Annotated[str, Field(description="Exact exercise name to compute the next weight for, e.g. 'Back Squat'.")],
    goal_target_weight: Annotated[
        Optional[float],
        Field(description="Client's target weight in lbs for this lift, if they have one — omit if unknown."),
    ] = None,
    goal_target_date: Annotated[
        Optional[str],
        Field(description="Client's target date for goal_target_weight, as an ISO date 'YYYY-MM-DD' — omit if unknown."),
    ] = None,
) -> str:
    """Compute the deterministic next-session weight recommendation for a client's logged lift — never do this
    math yourself. Reads the client's logged sessions for the given exercise and returns the current weight, the
    recommended next weight, an action (increase/repeat/hold), the reason, an estimated current 1-rep max, and,
    if a goal weight/date is given, the weekly progression needed to hit it and whether that exceeds the safe cap."""
    logger.info("tool=progression_calculator input=%s/%s", user_id, exercise_name)
    sessions = get_sessions(user_id, exercise_name)
    if not sessions:
        return f"No logged sessions found for '{exercise_name}' for this client yet — log a session first."

    progression = compute_next_weight(sessions)
    estimated_1rm = estimate_one_rep_max(sessions)

    weekly_needed = None
    if goal_target_weight is not None and goal_target_date and estimated_1rm is not None:
        today = date.today().isoformat()
        weekly_needed = weekly_progression_needed(estimated_1rm, goal_target_weight, goal_target_date, today)

    return format_progression_result(progression, estimated_1rm, weekly_needed)


def build_agent():
    return create_agent(_get_llm(), tools=[lookup_exercise, progression_calculator], system_prompt=SYSTEM_PROMPT)


def _tool_used_label(messages) -> str:
    used = []
    for message in messages:
        if isinstance(message, ToolMessage) and message.name and message.name not in used:
            used.append(message.name)
    return ", ".join(used) if used else "no tool"


def get_reply(agent, user_input):
    timing = TimingCallback("chat")
    result = agent.invoke({"messages": [{"role": "user", "content": user_input}]}, config={"callbacks": [timing]})
    timing.log_summary()
    reply = limit_sentences(result["messages"][-1].content)
    return f"{reply} [{_tool_used_label(result['messages'])}]"


class GoalModel(BaseModel):
    metric: str
    unit: str
    startValue: float
    currentValue: float
    targetValue: float
    startDate: str
    targetDate: str


class OnboardingRequest(BaseModel):
    goalType: str
    experience: str
    daysPerWeek: int
    equipment: list[str]
    goal: GoalModel


class ExerciseModel(BaseModel):
    name: str = Field(description="Exercise name, e.g. 'Barbell Row'")
    sets: int = Field(description="Number of working sets, typically 2-5")
    reps: str = Field(description="Rep target as a string, e.g. '8', '12 each leg', or '45 sec'")
    rest: str = Field(description="Rest between sets, e.g. '90 sec' or '2 min'")
    targetWeight: Optional[float] = Field(
        default=None, description="Suggested working weight in lbs; omit for bodyweight/timed moves"
    )
    formTip: str = Field(description="One or two sentences of concrete, actionable cueing")


class PlanDayModel(BaseModel):
    day: str = Field(description="Full weekday name, e.g. 'Monday'")
    focus: str = Field(description="Short label for the day's focus, e.g. 'Upper Body Push' or 'Rest'")
    isRestDay: bool = Field(default=False)
    exercises: list[ExerciseModel] = Field(description="Empty list on rest days")
    coachNote: str = Field(description="2-3 sentence note in the coach's voice")


class WeeklyPlanModel(BaseModel):
    days: list[PlanDayModel] = Field(description="Exactly 7 entries, Monday through Sunday, in that order")


WEEKDAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

PLAN_SYSTEM_PROMPT = (
    "You are the same personal training coach described here: " + COACH_PERSONA + " "
    "You are now building a complete 7-day weekly training plan for a client based on "
    "their intake profile, to be returned as structured data. Rules: "
    "- Produce exactly 7 days, in this exact order: Monday, Tuesday, Wednesday, Thursday, "
    "Friday, Saturday, Sunday. "
    "- Exactly the client's stated daysPerWeek should be training days (isRestDay=false, "
    "3-6 exercises each); all other days are rest days (isRestDay=true, focus='Rest' or "
    "'Rest / Mobility', exercises=[]). "
    "- Spread training days sensibly across the week and avoid hitting the same primary "
    "muscle group on back-to-back training days. "
    "- Choose exercises only from the candidate list given below the client profile — it's "
    "already filtered for this client's equipment and experience level, so every exercise on "
    "it is usable. Use your judgment to pick, combine, and sequence the best ones for this "
    "client's specific goal and split; don't just take them in list order, and don't invent "
    "exercises that aren't on the list. "
    "- Scale volume, load, and exercise complexity to the client's experience level and goal type. "
    "- Where relevant, base targetWeight on the client's stated current value for their goal "
    "metric; omit targetWeight for bodyweight-only or timed movements. "
    "- coachNote on training days: 2-3 sentences in the persona's voice above — specific and "
    "useful, no filler, no fake reassurance. "
    "- coachNote on rest days: a short, consistent recovery reminder. "
    "- formTip per exercise: one or two sentences of concrete, actionable cueing."
)


def _build_plan_prompt(profile: OnboardingRequest) -> tuple[str, list[dict]]:
    equipment = ", ".join(profile.equipment) if profile.equipment else "bodyweight only"
    candidates = _filter_candidates(profile.equipment, profile.experience)
    prompt = (
        f"Client profile:\n"
        f"- Goal type: {profile.goalType}\n"
        f"- Experience: {profile.experience}\n"
        f"- Training days per week: {profile.daysPerWeek}\n"
        f"- Available equipment: {equipment}\n"
        f"- Goal metric: {profile.goal.metric} ({profile.goal.unit}), "
        f"currently at {profile.goal.currentValue}, targeting {profile.goal.targetValue} "
        f"by {profile.goal.targetDate}\n\n"
        f"Candidate exercises (already filtered for this client's equipment and experience "
        f"level):\n{_format_candidates(candidates)}\n\n"
        f"Build the 7-day weekly plan now."
    )
    return prompt, candidates


def _validate_plan_shape(plan: WeeklyPlanModel, days_per_week: int) -> None:
    if [d.day for d in plan.days] != WEEKDAY_ORDER:
        raise ValueError(f"Expected days in order {WEEKDAY_ORDER}, got {[d.day for d in plan.days]}")
    training_days = sum(1 for d in plan.days if not d.isRestDay)
    if training_days != days_per_week:
        raise ValueError(f"Expected {days_per_week} training days, got {training_days}")


def _validate_plan_exercises(plan: WeeklyPlanModel, candidates: list[dict]) -> None:
    """Checks every non-rest-day exercise name against the exact candidate
    list the model was offered (catches hallucinated names and equipment/
    experience mismatches, not just unknown names) and rejects duplicate
    exercises within the same day."""
    candidate_names = {ex["name"].lower() for ex in candidates}
    for day in plan.days:
        if day.isRestDay:
            continue
        seen: set[str] = set()
        for exercise in day.exercises:
            key = exercise.name.lower()
            if key not in candidate_names:
                raise ValueError(f"'{exercise.name}' on {day.day} is not in the candidate list")
            if key in seen:
                raise ValueError(f"Duplicate exercise '{exercise.name}' on {day.day}")
            seen.add(key)


def build_plan_llm():
    # No tools/agent loop here on purpose: candidate exercises are filtered
    # deterministically in Python (_filter_candidates) and handed to the model
    # directly in the prompt, so plan generation is a single structured-output
    # call rather than a multi-round tool-calling loop. lookup_exercise stays
    # available to the chat agent (build_agent) for one-off exercise swaps.
    return _get_llm().with_structured_output(WeeklyPlanModel)


def generate_plan(plan_llm, profile: OnboardingRequest) -> list[PlanDayModel]:
    t0 = time.perf_counter()
    prompt, candidates = _build_plan_prompt(profile)
    logger.info("[plan] build-prompt step — %.4fs (%d candidates)", time.perf_counter() - t0, len(candidates))

    last_error: Exception | None = None
    timing = TimingCallback("plan")

    for _ in range(2):  # one retry on validation failure
        try:
            result: WeeklyPlanModel = plan_llm.invoke(
                [
                    {"role": "system", "content": PLAN_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                config={"callbacks": [timing]},
            )
            t_validate = time.perf_counter()
            _validate_plan_shape(result, profile.daysPerWeek)
            _validate_plan_exercises(result, candidates)
            logger.info("[plan] validate step — %.4fs", time.perf_counter() - t_validate)
            timing.log_summary()
            return result.days
        except (ValidationError, ValueError) as e:
            last_error = e

    timing.log_summary()
    raise RuntimeError(f"Failed to generate a valid plan after retry: {last_error}")


def main():
    agent = build_agent()
    user_input = input("You: ")
    print(get_reply(agent, user_input))


if __name__ == "__main__":
    main()
