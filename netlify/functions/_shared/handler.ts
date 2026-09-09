import { contactFields, normalizeFolder } from "./folders";
import type { NotionNote } from "./notion";
import { parseClassifyRequest, type RequestParseError } from "./parse";

export type ClassifiedNote = {
  folder: string;
  title: string;
  phone: string | null;
  email: string | null;
};

export type ClassifyDeps = {
  getSecret: () => string | undefined;
  classify: (text: string) => Promise<ClassifiedNote>;
  saveNote: (note: NotionNote) => Promise<{ url: string }>;
  today: () => string;
};

export async function handleClassify(
  req: Request,
  deps: ClassifyDeps,
): Promise<Response> {
  const body = await readJson(req);
  if (!body.ok) {
    return json({ error: body.error.error }, body.error.status);
  }

  const parsed = parseClassifyRequest(
    req.method,
    req.headers.get("X-Classify-Secret"),
    deps.getSecret(),
    body.value,
  );
  if ("error" in parsed) {
    return json({ error: parsed.error }, parsed.status);
  }

  let classified: ClassifiedNote;
  try {
    classified = await deps.classify(parsed.text);
  } catch {
    return json({ error: "Classification failed" }, 502);
  }

  const folder = normalizeFolder(classified.folder);
  const fields = contactFields(folder, classified.phone, classified.email);
  const note: NotionNote = {
    title: classified.title,
    folder,
    project: parsed.project,
    captured: deps.today(),
    transcript: parsed.text,
    ...fields,
  };

  try {
    const saved = await deps.saveNote(note);
    return json({ folder, title: note.title, url: saved.url });
  } catch {
    return json({ error: "Notion save failed" }, 502);
  }
}

async function readJson(
  req: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; error: RequestParseError }> {
  try {
    return { ok: true, value: await req.json() };
  } catch {
    return { ok: false, error: { status: 400, error: "JSON body required" } };
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
