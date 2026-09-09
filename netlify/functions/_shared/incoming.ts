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
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
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
  const text = form.get("text");
  if (typeof text === "string") {
    fields.text = text;
  }
  const project = form.get("project");
  if (typeof project === "string") {
    fields.project = project;
  }

  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes((file.type || "").toLowerCase())) {
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
