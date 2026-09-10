import {
  ALLOWED_IMAGE_TYPES,
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
  for (const key of ["text", "project", "secret", "CLASSIFY_SECRET", "CLASSIFY_KEY"]) {
    const value = form.get(key);
    if (typeof value === "string") {
      fields[key] = value;
    }
  }

  const file = firstFile(form, ["image", "photo"]);
  if (file) {
    const mime = (file.type || "").toLowerCase();
    if (mime && !ALLOWED_IMAGE_TYPES.includes(mime)) {
      return { ok: false, error: { status: 400, error: "image must be jpeg, png, webp, or gif" } };
    }
    const parsed = await imageFromFile(file);
    if ("error" in parsed) {
      return { ok: false, error: parsed };
    }
    return { ok: true, fields, image: parsed };
  }

  return { ok: true, fields };
}

function firstFile(form: FormData, names: string[]): File | undefined {
  for (const name of names) {
    const value = form.get(name);
    if (value instanceof File && value.size > 0) {
      return value;
    }
  }
  return undefined;
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
