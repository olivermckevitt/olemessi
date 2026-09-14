import { timingSafeEqual } from "node:crypto";

export type ImageInput = {
  base64: string;
  mime: string;
  filename: string;
};

export type ClassifyRequest = {
  text: string;
  project?: string;
  image?: ImageInput;
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
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function parseClassifyRequest(
  method: string,
  secretHeader: string | null,
  expectedSecret: string | undefined,
  rawBody: unknown,
  image?: ImageInput,
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

  if (image) {
    result.image = image;
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

export function imageFromBase64(base64: string, mime: string, filename: string): ImageInput | RequestParseError {
  const cleanMime = mime.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(cleanMime)) {
    return { status: 400, error: "image must be jpeg, png, webp, or gif" };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    return { status: 400, error: "image_base64 is invalid" };
  }

  if (bytes.length === 0) {
    return { status: 400, error: "image is empty" };
  }

  if (bytes.length > MAX_IMAGE_BYTES) {
    return { status: 400, error: "image is too large" };
  }

  return {
    base64: bytes.toString("base64"),
    mime: cleanMime,
    filename: filename || filenameFromMime(cleanMime),
  };
}

export async function imageFromFile(file: File): Promise<ImageInput | RequestParseError> {
  const rawType = (file.type || "").toLowerCase();
  const mime =
    !rawType || rawType === "application/octet-stream" ? "image/jpeg" : rawType;
  if (!ALLOWED_IMAGE_TYPES.includes(mime)) {
    return { status: 400, error: "image must be jpeg, png, webp, or gif" };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { status: 400, error: "image is too large" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return { status: 400, error: "image is empty" };
  }

  return {
    base64: buffer.toString("base64"),
    mime,
    filename: file.name || filenameFromMime(mime),
  };
}

function filenameFromMime(mime: string): string {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
  return `photo.${ext}`;
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
