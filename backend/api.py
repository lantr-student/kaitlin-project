from fastapi import FastAPI
from pydantic import BaseModel

from main import build_agent, get_reply

app = FastAPI()
agent = build_agent()


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
