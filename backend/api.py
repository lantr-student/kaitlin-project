from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from main import build_agent, build_plan_llm, generate_plan, get_reply, OnboardingRequest, PlanDayModel

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


@app.get("/")
def root():
    return {"status": "ok", "message": "Coach backend is running"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    return ChatResponse(response=get_reply(agent, request.message))


@app.post("/plan", response_model=list[PlanDayModel])
def plan(request: OnboardingRequest):
    try:
        return generate_plan(plan_llm, request)
    except RuntimeError:
        raise HTTPException(status_code=502, detail="Failed to generate a training plan. Please try again.")
