from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from exercise_library import compute_progression, compute_regression, compute_substitutes, find_exercise
from main import build_agent, build_plan_llm, generate_plan, get_reply, OnboardingRequest, PlanDayModel
from session_store import log_session, SessionRecord

app = FastAPI()
agent = build_agent()
plan_llm = build_plan_llm()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://spotter-app-nu.vercel.app",
        "http://localhost:3000",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class ExerciseRelationsResponse(BaseModel):
    substitutes: list[str]
    progression: list[str]
    progression_is_same_difficulty: bool
    regression: list[str]


@app.get("/")
def root():
    return {"status": "ok", "message": "Coach backend is running"}


@app.get("/exercises/{name}/relations", response_model=ExerciseRelationsResponse)
def exercise_relations(name: str):
    exercise = find_exercise(name)
    if exercise is None:
        raise HTTPException(status_code=404, detail=f"No exercise named '{name}' found.")
    progression = compute_progression(exercise)
    return ExerciseRelationsResponse(
        substitutes=[ex["name"] for ex in compute_substitutes(exercise)],
        progression=[ex["name"] for ex in progression.exercises],
        progression_is_same_difficulty=progression.is_same_difficulty,
        regression=[ex["name"] for ex in compute_regression(exercise)],
    )


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    return ChatResponse(response=get_reply(agent, request.message))


@app.post("/plan", response_model=list[PlanDayModel])
def plan(request: OnboardingRequest):
    try:
        return generate_plan(plan_llm, request)
    except RuntimeError:
        raise HTTPException(status_code=502, detail="Failed to generate a training plan. Please try again.")


@app.post("/sessions")
def log_session_endpoint(record: SessionRecord):
    log_session(record)
    return {"status": "logged"}
