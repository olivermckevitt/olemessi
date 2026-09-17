import { timingSafeEqual } from "node:crypto";

export type ClassifyRequest = {
  text: string;
  project?: string;
};

export type RequestParseError = {
  status: number;
  error: string;
};

export type ModelOutput = {
  folder: string;
  category: string;
  title: string;
  location: string | null;
  subcontractor_or_trade: string | null;
  urgency: string;
  daily_log_summary: string;
  route: { kanban: boolean | null; knowledge_base: boolean | null };
  red_flag: boolean;
  alert_status: string | null;
  skill_assessment: string | null;
  phone: string | null;
  email: string | null;
};

const MAX_TEXT_CHARS = 20_000;
const MAX_PROJECT_CHARS = 200;
const MAX_TITLE_CHARS = 100;
const MAX_SUMMARY_CHARS = 500;

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
    return { status: 400, error: "JSON or form body required" };
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

export function parseModelOutput(raw: string): ModelOutput {
  const parsed = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  const title =
    typeof parsed.title === "string" && parsed.title.trim().length > 0
      ? parsed.title.trim().slice(0, MAX_TITLE_CHARS)
      : "Untitled note";
  const summary =
    typeof parsed.daily_log_summary === "string" && parsed.daily_log_summary.trim().length > 0
      ? parsed.daily_log_summary.trim().slice(0, MAX_SUMMARY_CHARS)
      : title;
  const routeRaw =
    parsed.route !== null && typeof parsed.route === "object" && !Array.isArray(parsed.route)
      ? (parsed.route as Record<string, unknown>)
      : {};

  return {
    folder: typeof parsed.folder === "string" ? parsed.folder : "",
    category: typeof parsed.category === "string" ? parsed.category : "",
    title,
    location: optionalString(parsed.location),
    subcontractor_or_trade: optionalString(parsed.subcontractor_or_trade),
    urgency: typeof parsed.urgency === "string" ? parsed.urgency : "",
    daily_log_summary: summary,
    route: {
      kanban: typeof routeRaw.kanban === "boolean" ? routeRaw.kanban : null,
      knowledge_base: typeof routeRaw.knowledge_base === "boolean" ? routeRaw.knowledge_base : null,
    },
    red_flag: parsed.red_flag === true,
    alert_status: optionalString(parsed.alert_status),
    skill_assessment: optionalString(parsed.skill_assessment),
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
