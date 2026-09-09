import { timingSafeEqual } from "node:crypto";

export type ClassifyRequest = {
  text: string;
  project?: string;
};

export type RequestParseError = {
  status: number;
  error: string;
};

const MAX_TEXT_CHARS = 20_000;
const MAX_PROJECT_CHARS = 200;
const MAX_TITLE_CHARS = 100;

export function parseClassifyRequest(
  method: string,
  secretHeader: string | null,
  expectedSecret: string | undefined,
  rawBody: unknown,
): ClassifyRequest | RequestParseError {
  if (method !== "POST") {
    return { status: 405, error: "POST only" };
  }

  if (!expectedSecret) {
    return { status: 500, error: "CLASSIFY_SECRET is not set" };
  }

  if (!secureEqual(secretHeader ?? "", expectedSecret)) {
    return { status: 401, error: "Unauthorized" };
  }

  if (rawBody === null || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return { status: 400, error: "JSON body required" };
  }

  const body = rawBody as Record<string, unknown>;
  if (typeof body.text !== "string") {
    return { status: 400, error: "text is required" };
  }

  const text = body.text.trim();
  if (text.length === 0) {
    return { status: 400, error: "text is required" };
  }

  if (text.length > MAX_TEXT_CHARS) {
    return { status: 400, error: "text is too long" };
  }

  const result: ClassifyRequest = { text };

  if (body.project !== undefined && body.project !== null) {
    if (typeof body.project !== "string") {
      return { status: 400, error: "project must be a string" };
    }

    const project = body.project.trim();
    if (project.length > MAX_PROJECT_CHARS) {
      return { status: 400, error: "project is too long" };
    }

    if (project.length > 0) {
      result.project = project;
    }
  }

  return result;
}

export function parseModelOutput(raw: string): {
  folder: string;
  title: string;
  phone: string | null;
  email: string | null;
} {
  const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const title =
    typeof parsed.title === "string" && parsed.title.trim().length > 0
      ? parsed.title.trim().slice(0, MAX_TITLE_CHARS)
      : "Untitled note";

  return {
    folder: typeof parsed.folder === "string" ? parsed.folder : "",
    title,
    phone: optionalString(parsed.phone),
    email: optionalString(parsed.email),
  };
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON");
  }

  return trimmed.slice(start, end + 1);
}

function secureEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
