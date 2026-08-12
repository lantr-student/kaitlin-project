import os
import re

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

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


def build_agent():
    base_url = os.environ["LANTR_AI_URL"].rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    llm = ChatOpenAI(
        api_key=os.environ["LANTR_AI_KEY"],
        base_url=base_url,
        model=os.environ["LANTR_MODEL"],
    )

    return create_agent(llm, tools=[], system_prompt=SYSTEM_PROMPT)


def get_reply(agent, user_input):
    result = agent.invoke({"messages": [{"role": "user", "content": user_input}]})
    reply = result["messages"][-1].content
    return limit_sentences(reply)


def main():
    agent = build_agent()
    user_input = input("You: ")
    print(get_reply(agent, user_input))


if __name__ == "__main__":
    main()
