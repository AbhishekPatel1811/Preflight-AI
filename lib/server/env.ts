import "server-only";
import { readLocalEnv } from "./localEnv";

export class MissingOpenAIKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is missing. Add it to .env.local before generating a launch plan.");
  }
}

export type ServerEnv = {
  openAIKey: string;
  model: string;
};

export function getServerEnv(): ServerEnv {
  const localEnv = readLocalEnv();
  const openAIKey = (localEnv.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY)?.trim();

  if (!openAIKey) {
    throw new MissingOpenAIKeyError();
  }

  return {
    openAIKey,
    model: (localEnv.OPENAI_AGENT_MODEL ?? process.env.OPENAI_AGENT_MODEL)?.trim() || "gpt-5.4-mini"
  };
}
