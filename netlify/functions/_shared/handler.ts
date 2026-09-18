import {
  applySkillPolicy,
  contactFields,
  normalizeFolder,
  normalizeKanbanType,
  normalizeUrgency,
  resolveRoute,
} from "./folders";
import { readPayload, secretFromRequest } from "./incoming";
import type { NotionNote } from "./notion";
import {
  parseClassifyRequest,
  type ImageInput,
  type ModelOutput,
} from "./parse";

export type ClassifyDeps = {
  getSecret: () => string | undefined;
  hasSkillBase: () => boolean;
  classify: (input: { text: string; image?: ImageInput }) => Promise<ModelOutput>;
  storePhoto?: (image: ImageInput) => Promise<{ url?: string; fileId?: string }>;
  saveNote: (note: NotionNote) => Promise<{ url: string }>;
  saveLesson: (note: NotionNote) => Promise<{ url: string }>;
  today: () => string;
};

export async function handleClassify(req: Request, deps: ClassifyDeps): Promise<Response> {
  const payload = await readPayload(req);
  if (!payload.ok) {
    return json({ error: payload.error.error }, payload.error.status);
  }

  const parsed = parseClassifyRequest(
    req.method,
    secretFromRequest(req, payload.fields),
    deps.getSecret(),
    payload.fields,
    payload.image,
  );
  if ("error" in parsed) {
    return json({ error: parsed.error }, parsed.status);
  }

  let classified: ModelOutput;
  try {
    classified = await deps.classify({ text: parsed.text, image: parsed.image });
  } catch {
    return json({ error: "Classification failed" }, 502);
  }

  const folder = normalizeFolder(classified.folder);
  const category = normalizeKanbanType(classified.category, folder);
  const urgency = normalizeUrgency(classified.urgency);
  const route = resolveRoute(folder, classified.route.kanban, classified.route.knowledge_base);
  const skill = applySkillPolicy(
    deps.hasSkillBase(),
    classified.red_flag,
    classified.alert_status,
    classified.skill_assessment,
  );
  const fields = contactFields(folder, classified.phone, classified.email);

  let photoUrl: string | undefined;
  let photoFileId: string | undefined;
  if (parsed.image && deps.storePhoto) {
    try {
      const stored = await deps.storePhoto(parsed.image);
      photoUrl = stored.url;
      photoFileId = stored.fileId;
    } catch {
      return json({ error: "Photo save failed" }, 502);
    }
  }

  const note: NotionNote = {
    title: classified.title,
    folder,
    kanbanType: category,
    status: route.kanban ? "To Do" : "Logged",
    project: parsed.project,
    captured: deps.today(),
    transcript: parsed.text,
    location: classified.location ?? undefined,
    trade: classified.subcontractor_or_trade ?? undefined,
    urgency,
    summary: classified.daily_log_summary,
    redFlag: skill.red_flag,
    alertStatus: skill.alert_status ?? undefined,
    skillAssessment: skill.skill_assessment ?? undefined,
    photoUrl,
    photoFileId,
    photoName: parsed.image?.filename,
    ...fields,
  };

  let saved: { url: string };
  try {
    saved = await deps.saveNote(note);
  } catch {
    return json({ error: "Notion save failed" }, 502);
  }

  if (route.knowledge_base) {
    try {
      await deps.saveLesson({ ...note, sourceUrl: saved.url });
    } catch {
      return json({ error: "Knowledge base save failed" }, 502);
    }
  }

  return json({
    category,
    title: note.title,
    location: classified.location,
    subcontractor_or_trade: classified.subcontractor_or_trade,
    urgency,
    daily_log_summary: classified.daily_log_summary,
    route,
    red_flag: skill.red_flag,
    alert_status: skill.alert_status,
    skill_assessment: skill.skill_assessment,
    url: saved.url,
    folder,
  });
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
