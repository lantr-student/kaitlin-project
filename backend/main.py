import os
import re
from typing import Optional

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

SYSTEM_PROMPT = (
    "You are a personal training coach. Your tone is confident, calm, and "
    "conversational — like a good friend who happens to know their stuff: "
    "casual, warm, everyday language, not clinical or stiff, "
    "and never trying to hype anyone up. Every sentence should say "
    "something specific and useful, not filler. You're still real with "
    "them: you don't pile on empty compliments, and you never use fake "
    "reassurance — no 'you've got this', 'don't worry', 'you'll be "
    "fine.' You always aim to give a concrete, specific next step toward "
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


def build_agent():
    return create_agent(_get_llm(), tools=[], system_prompt=SYSTEM_PROMPT)


def get_reply(agent, user_input):
    result = agent.invoke({"messages": [{"role": "user", "content": user_input}]})
    reply = result["messages"][-1].content
    return limit_sentences(reply)


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
    "You are the same personal training coach described here: " + SYSTEM_PROMPT + " "
    "You are now building a complete 7-day weekly training plan for a client based on "
    "their intake profile, to be returned as structured data. Rules: "
    "- Produce exactly 7 days, in this exact order: Monday, Tuesday, Wednesday, Thursday, "
    "Friday, Saturday, Sunday. "
    "- Exactly the client's stated daysPerWeek should be training days (isRestDay=false, "
    "3-6 exercises each); all other days are rest days (isRestDay=true, focus='Rest' or "
    "'Rest / Mobility', exercises=[]). "
    "- Spread training days sensibly across the week and avoid hitting the same primary "
    "muscle group on back-to-back training days. "
    "- Only program exercises usable with the client's stated equipment. "
    "- Scale volume, load, and exercise complexity to the client's experience level and goal type. "
    "- Where relevant, base targetWeight on the client's stated current value for their goal "
    "metric; omit targetWeight for bodyweight-only or timed movements. "
    "- coachNote on training days: 2-3 sentences in the persona's voice above — specific and "
    "useful, no filler, no fake reassurance. "
    "- coachNote on rest days: a short, consistent recovery reminder. "
    "- formTip per exercise: one or two sentences of concrete, actionable cueing."
)


def _build_plan_prompt(profile: OnboardingRequest) -> str:
    equipment = ", ".join(profile.equipment) if profile.equipment else "bodyweight only"
    return (
        f"Client profile:\n"
        f"- Goal type: {profile.goalType}\n"
        f"- Experience: {profile.experience}\n"
        f"- Training days per week: {profile.daysPerWeek}\n"
        f"- Available equipment: {equipment}\n"
        f"- Goal metric: {profile.goal.metric} ({profile.goal.unit}), "
        f"currently at {profile.goal.currentValue}, targeting {profile.goal.targetValue} "
        f"by {profile.goal.targetDate}\n\n"
        f"Build the 7-day weekly plan now."
    )


def _validate_plan_shape(plan: WeeklyPlanModel, days_per_week: int) -> None:
    if [d.day for d in plan.days] != WEEKDAY_ORDER:
        raise ValueError(f"Expected days in order {WEEKDAY_ORDER}, got {[d.day for d in plan.days]}")
    training_days = sum(1 for d in plan.days if not d.isRestDay)
    if training_days != days_per_week:
        raise ValueError(f"Expected {days_per_week} training days, got {training_days}")


def build_plan_llm():
    return _get_llm().with_structured_output(WeeklyPlanModel)


def generate_plan(plan_llm, profile: OnboardingRequest) -> list[PlanDayModel]:
    prompt = _build_plan_prompt(profile)
    last_error: Exception | None = None

    for _ in range(2):  # one retry on validation failure
        try:
            result: WeeklyPlanModel = plan_llm.invoke(
                [
                    {"role": "system", "content": PLAN_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ]
            )
            _validate_plan_shape(result, profile.daysPerWeek)
            return result.days
        except (ValidationError, ValueError) as e:
            last_error = e

    raise RuntimeError(f"Failed to generate a valid plan after retry: {last_error}")


def main():
    agent = build_agent()
    user_input = input("You: ")
    print(get_reply(agent, user_input))


if __name__ == "__main__":
    main()
