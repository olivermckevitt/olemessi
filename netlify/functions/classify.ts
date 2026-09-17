import type { Config } from "@netlify/functions";
import OpenAI from "openai";
import { classifySecret, envGet, envPresent } from "./_shared/env";
import { handleClassify } from "./_shared/handler";
import { createNotionPage, fetchSkillBaseText, lessonsPagePayload, notionPagePayload } from "./_shared/notion";
import { parseModelOutput } from "./_shared/parse";
import { CLASSIFY_SYSTEM_PROMPT, classifyUserMessage } from "./_shared/prompt";

export default async (req: Request) => {
  if (req.method === "GET") {
    return Response.json({
      ok: true,
      post: "/api/classify",
      env: envPresent(),
    });
  }

  const token = envGet("NOTION_TOKEN");
  const databaseId = envGet("NOTION_DATABASE_ID");
  const lessonsId = envGet("NOTION_LESSONS_DATABASE_ID");
  const skillPageId = envGet("NOTION_SKILL_BASE_PAGE_ID");

  let skillBase: string | null = null;
  if (token && skillPageId) {
    try {
      const text = await fetchSkillBaseText(token, skillPageId);
      skillBase = text.trim() ? text : null;
    } catch {
      skillBase = null;
    }
  }

  return handleClassify(req, {
    getSecret: () => classifySecret(),
    hasSkillBase: () => Boolean(skillBase),
    classify: (input) => classifyWithGateway(input.text, skillBase),
    saveNote: async (note) => {
      if (!token || !databaseId) {
        throw new Error("NOTION_TOKEN or NOTION_DATABASE_ID is not set");
      }
      return createNotionPage(token, notionPagePayload(databaseId, note));
    },
    saveLesson: async (note) => {
      if (!token || !lessonsId) {
        throw new Error("NOTION_TOKEN or NOTION_LESSONS_DATABASE_ID is not set");
      }
      return createNotionPage(token, lessonsPagePayload(lessonsId, note));
    },
    today: () => new Date().toISOString().slice(0, 10),
  });
};

export const config: Config = {
  path: ["/api/classify", "/.netlify/functions/classify"],
  method: ["GET", "POST"],
};

async function classifyWithGateway(text: string, skillBase: string | null) {
  const openai = new OpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
      { role: "user", content: classifyUserMessage(text, skillBase) },
    ],
  });

  const message = completion.choices[0]?.message?.content;
  if (!message) {
    throw new Error("Empty classification");
  }

  return parseModelOutput(message);
}
