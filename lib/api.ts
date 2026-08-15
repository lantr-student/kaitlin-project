import type { OnboardingAnswers, PlanDay } from "@/lib/data";

const DEFAULT_API_URL = "https://kaitlin-project-production.up.railway.app";

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function postJson<TResponse>(path: string, body: unknown, friendlyMessage: string): Promise<TResponse> {
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError("This is taking longer than expected — please try again.");
    }
    throw new ApiError("Couldn't reach Spotter's servers. Check your connection and try again.");
  }

  if (!res.ok) {
    throw new ApiError(friendlyMessage, res.status);
  }

  return (await res.json()) as TResponse;
}

async function getJson<TResponse>(path: string, friendlyMessage: string): Promise<TResponse> {
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, { signal: AbortSignal.timeout(60_000) });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError("This is taking longer than expected — please try again.");
    }
    throw new ApiError("Couldn't reach Spotter's servers. Check your connection and try again.");
  }

  if (!res.ok) {
    throw new ApiError(friendlyMessage, res.status);
  }

  return (await res.json()) as TResponse;
}

export async function fetchPlan(answers: OnboardingAnswers): Promise<PlanDay[]> {
  return postJson<PlanDay[]>("/plan", answers, "Spotter couldn't build your plan right now. Please try again.");
}

export async function sendChatMessage(message: string): Promise<string> {
  const data = await postJson<{ response: string }>(
    "/chat",
    { message },
    "Spotter couldn't send that message. Please try again."
  );
  return data.response;
}

export type ExerciseRelations = { substitutes: string[]; progression: string[]; regression: string[] };

export async function fetchExerciseRelations(name: string): Promise<ExerciseRelations> {
  return getJson<ExerciseRelations>(
    `/exercises/${encodeURIComponent(name)}/relations`,
    "Spotter couldn't load exercise alternatives right now."
  );
}
