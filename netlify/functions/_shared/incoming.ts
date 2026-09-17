import type { RequestParseError } from "./parse";

export async function readPayload(
  req: Request,
): Promise<{ ok: true; fields: Record<string, unknown> } | { ok: false; error: RequestParseError }> {
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    return readForm(req);
  }

  try {
    const raw = await req.json();
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: { status: 400, error: "JSON or form body required" } };
    }

    return { ok: true, fields: raw as Record<string, unknown> };
  } catch {
    return { ok: false, error: { status: 400, error: "JSON or form body required" } };
  }
}

async function readForm(
  req: Request,
): Promise<{ ok: true; fields: Record<string, unknown> } | { ok: false; error: RequestParseError }> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, error: { status: 400, error: "JSON or form body required" } };
  }

  const fields: Record<string, unknown> = {};
  for (const key of ["text", "project", "secret", "CLASSIFY_SECRET", "CLASSIFY_KEY"]) {
    const value = form.get(key);
    if (typeof value === "string") {
      fields[key] = value;
    }
  }

  return { ok: true, fields };
}

const SECRET_HEADERS = [
  "X-Classify-Secret",
  "Classify-Secret",
  "CLASSIFY_SECRET",
  "CLASSIFY_KEY",
];

const SECRET_FIELDS = ["secret", "CLASSIFY_SECRET", "CLASSIFY_KEY"];

export function secretFromRequest(req: Request, fields: Record<string, unknown>): string | null {
  for (const name of SECRET_HEADERS) {
    const header = req.headers.get(name);
    if (header) {
      return header;
    }
  }

  for (const name of SECRET_FIELDS) {
    const value = fields[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}
