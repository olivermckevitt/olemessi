import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import type { ImageInput } from "./parse";

export async function storePhoto(image: ImageInput): Promise<{ key: string }> {
  const extension = extensionFor(image.mime);
  const key = `${randomUUID()}.${extension}`;
  const store = getStore({ name: "jobsite-photos", consistency: "strong" });
  const bytes = Buffer.from(image.base64, "base64");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  await store.set(key, copy.buffer, {
    metadata: {
      contentType: image.mime,
      originalFilename: image.filename,
      uploadedAt: new Date().toISOString(),
    },
  });

  return { key };
}

export function resolvePublicBaseUrl(input: {
  requestUrl?: string;
  deployPrimeUrl?: string;
  url?: string;
  siteUrl?: string;
}): string {
  const fromRequest = originOf(input.requestUrl);
  const candidates = [fromRequest, input.deployPrimeUrl, input.url, input.siteUrl];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim().replace(/\/$/, "");
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

export function publicPhotoUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/$/, "")}/uploads/${key}`;
}

function originOf(requestUrl?: string): string | undefined {
  if (!requestUrl) {
    return undefined;
  }

  try {
    return new URL(requestUrl).origin;
  } catch {
    return undefined;
  }
}

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}
