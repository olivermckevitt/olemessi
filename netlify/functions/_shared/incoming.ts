import {
  imageFromBase64,
  imageFromFile,
  type ImageInput,
  type RequestParseError,
} from "./parse";

export async function readPayload(
  req: Request,
): Promise<
  | { ok: true; fields: Record<string, unknown>; image?: ImageInput }
  | { ok: false; error: RequestParseError }
> {
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

    const body = raw as Record<string, unknown>;
    let image: ImageInput | undefined;

    if (body.image_base64 !== undefined && body.image_base64 !== null) {
      if (typeof body.image_base64 !== "string") {
        return { ok: false, error: { status: 400, error: "image_base64 must be a string" } };
      }

      const mime = typeof body.image_mime === "string" ? body.image_mime : "image/jpeg";
      const filename = typeof body.image_filename === "string" ? body.image_filename : "photo.jpg";
      const parsed = imageFromBase64(body.image_base64, mime, filename);
      if ("error" in parsed) {
        return { ok: false, error: parsed };
      }
      image = parsed;
    }

    return { ok: true, fields: body, image };
  } catch {
    return { ok: false, error: { status: 400, error: "JSON or form body required" } };
  }
}

async function readForm(
  req: Request,
): Promise<
  | { ok: true; fields: Record<string, unknown>; image?: ImageInput }
  | { ok: false; error: RequestParseError }
> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { ok: false, error: { status: 400, error: "JSON or form body required" } };
  }

  const fields: Record<string, unknown> = {};
  for (const key of [
    "text",
    "project",
    "secret",
    "CLASSIFY_SECRET",
    "CLASSIFY_KEY",
    "image_base64",
    "image_mime",
    "image_filename",
  ]) {
    const value = form.get(key);
    if (typeof value === "string") {
      fields[key] = value;
    }
  }

  const file = firstFile(form);
  if (file) {
    const parsed = await imageFromFile(file);
    if ("error" in parsed) {
      return { ok: false, error: parsed };
    }
    return { ok: true, fields, image: parsed };
  }

  if (typeof fields.image_base64 === "string" && fields.image_base64.trim().length > 0) {
    const mime = typeof fields.image_mime === "string" ? fields.image_mime : "image/jpeg";
    const filename =
      typeof fields.image_filename === "string" ? fields.image_filename : "photo.jpg";
    const parsed = imageFromBase64(fields.image_base64, mime, filename);
    if ("error" in parsed) {
      return { ok: false, error: parsed };
    }
    return { ok: true, fields, image: parsed };
  }

  return { ok: true, fields };
}

const FILE_FIELD_NAMES = ["image", "photo", "file", "jpeg", "picture"];

function firstFile(form: FormData): File | undefined {
  const preferred = new Set(FILE_FIELD_NAMES);
  let fallback: File | undefined;

  for (const [key, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) {
      continue;
    }

    if (preferred.has(key.toLowerCase())) {
      return value;
    }

    fallback ??= value;
  }

  return fallback;
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
