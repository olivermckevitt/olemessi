import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request, context: Context) => {
  const key = context.params.key;
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const store = getStore({ name: "jobsite-photos", consistency: "strong" });
  const result = await store.getWithMetadata(key, { type: "stream" });
  if (!result) {
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    typeof result.metadata?.contentType === "string" ? result.metadata.contentType : "image/jpeg";

  return new Response(result.data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

export const config: Config = {
  path: "/uploads/:key",
};
