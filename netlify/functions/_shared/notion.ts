import {
  type Folder,
  type KanbanType,
  type Urgency,
} from "./folders";
import type { ImageInput } from "./parse";

const NOTION_VERSION = "2025-09-03";
const RICH_TEXT_LIMIT = 2000;

export type NotionNote = {
  title: string;
  folder: Folder;
  kanbanType: KanbanType;
  status: "To Do" | "Logged";
  project?: string;
  captured: string;
  transcript: string;
  location?: string;
  trade?: string;
  urgency: Urgency;
  summary: string;
  redFlag: boolean;
  alertStatus?: "red_flag";
  skillAssessment?: string;
  photoUrl?: string;
  photoFileId?: string;
  photoName?: string;
  phone?: string;
  email?: string;
  sourceUrl?: string;
};

export function notionPagePayload(databaseId: string, note: NotionNote) {
  return {
    parent: { database_id: databaseId },
    properties: noteProperties(note, { includeContacts: true, includeStatus: true }),
    children: pageChildren(note),
  };
}

export function lessonsPagePayload(databaseId: string, note: NotionNote) {
  return {
    parent: { database_id: databaseId },
    properties: noteProperties(note, { includeContacts: false, includeStatus: false }),
    children: pageChildren(note),
  };
}

export async function uploadNotionFile(
  token: string,
  image: ImageInput,
): Promise<{ id: string }> {
  const created = await notionRequest<{ id?: string; message?: string }>(
    token,
    "https://api.notion.com/v1/file_uploads",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: image.filename,
        content_type: image.mime,
      }),
    },
  );

  if (!created.ok || !created.body.id) {
    throw new Error(created.body.message ?? `Notion file create failed (${created.status})`);
  }

  const bytes = Buffer.from(image.base64, "base64");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const form = new FormData();
  form.set("file", new Blob([copy], { type: image.mime }), image.filename);

  const sent = await notionRequest<{ status?: string; message?: string }>(
    token,
    `https://api.notion.com/v1/file_uploads/${created.body.id}/send`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!sent.ok || sent.body.status !== "uploaded") {
    throw new Error(sent.body.message ?? `Notion file send failed (${sent.status})`);
  }

  return { id: created.body.id };
}

export async function createNotionPage(
  token: string,
  payload: { parent: { database_id: string }; properties: Record<string, unknown>; children: unknown[] },
): Promise<{ url: string }> {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.message ?? `Notion create failed (${response.status})`);
  }

  return { url: body.url };
}

export async function fetchSkillBaseText(token: string, pageId: string): Promise<string> {
  const texts: string[] = [];
  let cursor: string | undefined;

  for (let i = 0; i < 5; i += 1) {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) {
      url.searchParams.set("start_cursor", cursor);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
      },
    });

    const body = (await response.json()) as {
      results?: Array<{ type?: string; [key: string]: unknown }>;
      has_more?: boolean;
      next_cursor?: string | null;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(body.message ?? `Skill base fetch failed (${response.status})`);
    }

    for (const block of body.results ?? []) {
      const text = richTextFromBlock(block);
      if (text) {
        texts.push(text);
      }
    }

    if (!body.has_more || !body.next_cursor) {
      break;
    }
    cursor = body.next_cursor;
  }

  return texts.join("\n").slice(0, 20_000);
}

function noteProperties(
  note: NotionNote,
  options: { includeContacts: boolean; includeStatus: boolean },
): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Name: {
      title: [{ type: "text", text: { content: clip(note.title, RICH_TEXT_LIMIT) } }],
    },
    Category: {
      select: { name: note.folder },
    },
    "Kanban Type": {
      select: { name: note.kanbanType },
    },
    Captured: {
      date: { start: note.captured },
    },
    Urgency: {
      select: { name: note.urgency },
    },
    Summary: richText(note.summary),
    "Red Flag": { checkbox: note.redFlag },
  };

  if (options.includeStatus) {
    properties.Status = { select: { name: note.status } };
  }

  if (note.project) {
    properties.Project = richText(note.project);
  }

  if (note.location) {
    properties.Location = richText(note.location);
  }

  if (note.trade) {
    properties.Trade = richText(note.trade);
  }

  if (note.alertStatus) {
    properties["Alert Status"] = { select: { name: note.alertStatus } };
  }

  if (note.skillAssessment) {
    properties["Skill Assessment"] = richText(note.skillAssessment);
  }

  const photo = photoAttachment(note);
  if (photo) {
    properties.Photo = {
      files: [photo.filesValue],
    };
  }

  if (note.sourceUrl) {
    properties.Source = { url: note.sourceUrl };
  }

  if (options.includeContacts && note.phone) {
    properties.Phone = { phone_number: note.phone };
  }

  if (options.includeContacts && note.email) {
    properties.Email = { email: note.email };
  }

  return properties;
}

function pageChildren(note: NotionNote) {
  const chunks = chunk(note.transcript, RICH_TEXT_LIMIT);
  const children: unknown[] = [];

  if (note.summary) {
    children.push({
      object: "block",
      type: "callout",
      callout: {
        rich_text: [{ type: "text", text: { content: clip(note.summary, RICH_TEXT_LIMIT) } }],
      },
    });
  }

  const photo = photoAttachment(note);
  if (photo) {
    children.push({
      object: "block",
      type: "image",
      image: photo.imageValue,
    });
  }

  for (const content of chunks) {
    children.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content } }],
      },
    });
  }

  return children;
}

function richText(value: string) {
  return {
    rich_text: [{ type: "text", text: { content: clip(value, RICH_TEXT_LIMIT) } }],
  };
}

function richTextFromBlock(block: { type?: string; [key: string]: unknown }): string {
  const type = block.type;
  if (!type || typeof type !== "string") {
    return "";
  }

  const payload = block[type];
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const rich = (payload as { rich_text?: Array<{ plain_text?: string }> }).rich_text;
  if (!Array.isArray(rich)) {
    return "";
  }

  return rich.map((item) => item.plain_text ?? "").join("").trim();
}

function chunk(value: string, size: number): string[] {
  if (value.length === 0) {
    return [""];
  }

  const parts: string[] = [];
  for (let i = 0; i < value.length; i += size) {
    parts.push(value.slice(i, i + size));
  }
  return parts;
}

function clip(value: string, size: number): string {
  return value.slice(0, size);
}

function photoAttachment(note: NotionNote): {
  filesValue: Record<string, unknown>;
  imageValue: Record<string, unknown>;
} | undefined {
  const name = clip(note.photoName ?? "photo.jpg", 100);

  if (note.photoFileId) {
    return {
      filesValue: {
        name,
        type: "file_upload",
        file_upload: { id: note.photoFileId },
      },
      imageValue: {
        type: "file_upload",
        file_upload: { id: note.photoFileId },
      },
    };
  }

  if (note.photoUrl) {
    return {
      filesValue: {
        name,
        type: "external",
        external: { url: note.photoUrl },
      },
      imageValue: {
        type: "external",
        external: { url: note.photoUrl },
      },
    };
  }

  return undefined;
}

async function notionRequest<T extends { message?: string }>(
  token: string,
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: T }> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Notion-Version", NOTION_VERSION);

  const response = await fetch(url, { ...init, headers });
  const body = (await response.json()) as T;
  return { ok: response.ok, status: response.status, body };
}
