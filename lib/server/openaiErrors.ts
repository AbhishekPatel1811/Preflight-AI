type ErrorLike = {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  code?: unknown;
  type?: unknown;
  cause?: unknown;
};

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function number(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function sanitize(value: unknown) {
  return text(value).replace(/sk-[A-Za-z0-9_-]+/g, "<redacted-key>");
}

export function getOpenAIErrorDetails(error: unknown) {
  const current = asErrorLike(error);
  const cause = asErrorLike(current.cause);
  const message = sanitize(current.message || cause.message);
  const status = number(current.status) || number(cause.status);
  const code = text(current.code || cause.code);
  const type = text(current.type || cause.type);

  return {
    name: text(current.name),
    message,
    status,
    code,
    type
  };
}

export function openAIErrorLog(error: unknown) {
  const details = getOpenAIErrorDetails(error);

  return {
    name: details.name,
    status: details.status,
    code: details.code,
    type: details.type,
    message: details.message
  };
}

export function openAIUserMessage(error: unknown, model: string) {
  const details = getOpenAIErrorDetails(error);
  const message = details.message.toLowerCase();

  if (details.status === 401 || details.code === "invalid_api_key" || /incorrect api key|invalid api key/.test(message)) {
    return "OpenAI rejected the API key loaded by the running server. If you updated .env.local after starting Next.js, stop and restart `pnpm dev` so the new key is loaded.";
  }

  if (details.status === 403 || /model access|permission|project/.test(message)) {
    return `OpenAI credentials loaded successfully, but this project may not have access to ${model}. Check model/project access in the OpenAI dashboard.`;
  }

  if (details.status === 404 || /model .*does not exist|not found/.test(message)) {
    return `The configured OpenAI model ${model} was not found for this project. Update OPENAI_AGENT_MODEL in .env.local.`;
  }

  if (details.status === 429 || /quota|rate limit|billing/.test(message)) {
    return "OpenAI accepted the key but rejected the request for quota, billing, or rate-limit reasons. Check the OpenAI dashboard for this project.";
  }

  return "OpenAI rejected the generation request. Check the server logs for the sanitized OpenAI error details.";
}
