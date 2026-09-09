import type { Folder } from "./folders.ts";

const NOTION_VERSION = "2022-06-28";
const RICH_TEXT_LIMIT = 2000;

export type NotionNote = {
  title: string;
  folder: Folder;
  project?: string;
  captured: string;
  transcript: string;
  phone?: string;
  email?: string;
};

export function notionPagePayload(databaseId: string, note: NotionNote) {
  const properties: Record<string, unknown> = {
    Name: {
      title: [{ type: "text", text: { content: clip(note.title, RICH_TEXT_LIMIT) } }],
    },
    Category: {
      select: { name: note.folder },
    },
    Captured: {
      date: { start: note.captured },
    },
  };

  if (note.project) {
    properties.Project = {
      rich_text: [{ type: "text", text: { content: clip(note.project, RICH_TEXT_LIMIT) } }],
    };
  }

  if (note.phone) {
    properties.Phone = { phone_number: note.phone };
  }

  if (note.email) {
    properties.Email = { email: note.email };
  }

  return {
    parent: { database_id: databaseId },
    properties,
    children: transcriptBlocks(note.transcript),
  };
}

export async function createNotionPage(
  token: string,
  databaseId: string,
  note: NotionNote,
): Promise<{ url: string }> {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(notionPagePayload(databaseId, note)),
  });

  const body = (await response.json()) as { url?: string; message?: string };
  if (!response.ok || !body.url) {
    throw new Error(body.message ?? `Notion create failed (${response.status})`);
  }

  return { url: body.url };
}

function transcriptBlocks(transcript: string) {
  const chunks = chunk(transcript, RICH_TEXT_LIMIT);
  return chunks.map((content) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content } }],
    },
  }));
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
