import type { Config, Context } from "@netlify/functions";
import OpenAI from "openai";
import { handleClassify } from "./_shared/handler";
import { createNotionPage, fetchSkillBaseText, lessonsPagePayload, notionPagePayload } from "./_shared/notion";
import { parseModelOutput, type ImageInput } from "./_shared/parse";
import { publicPhotoUrl, storePhoto } from "./_shared/photos";
import { CLASSIFY_SYSTEM_PROMPT, classifyUserMessage } from "./_shared/prompt";

export default async (req: Request, context: Context) => {
  const token = Netlify.env.get("NOTION_TOKEN");
  const databaseId = Netlify.env.get("NOTION_DATABASE_ID");
  const lessonsId = Netlify.env.get("NOTION_LESSONS_DATABASE_ID");
  const skillPageId = Netlify.env.get("NOTION_SKILL_BASE_PAGE_ID");
  const siteUrl = context.site?.url ?? "";

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
    getSecret: () => Netlify.env.get("CLASSIFY_SECRET"),
    hasSkillBase: () => Boolean(skillBase),
    classify: (input) => classifyWithGateway(input, skillBase),
    storePhoto: siteUrl
      ? async (image) => {
          const { key } = await storePhoto(image);
          return { url: publicPhotoUrl(siteUrl, key) };
        }
      : undefined,
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
  path: "/api/classify",
  method: "POST",
};

async function classifyWithGateway(
  input: { text: string; image?: ImageInput },
  skillBase: string | null,
) {
  const openai = new OpenAI();
  const userText = classifyUserMessage(input.text, Boolean(input.image), skillBase);
  const content = input.image
    ? [
        { type: "text" as const, text: userText },
        {
          type: "image_url" as const,
          image_url: { url: `data:${input.image.mime};base64,${input.image.base64}` },
        },
      ]
    : userText;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
      { role: "user", content },
    ],
  });

  const message = completion.choices[0]?.message?.content;
  if (!message) {
    throw new Error("Empty classification");
  }

  return parseModelOutput(message);
}
