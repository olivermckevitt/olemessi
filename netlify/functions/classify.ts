import type { Config } from "@netlify/functions";
import OpenAI from "openai";
import { handleClassify } from "./_shared/handler";
import { createNotionPage } from "./_shared/notion";
import { parseModelOutput } from "./_shared/parse";
import { CLASSIFY_SYSTEM_PROMPT } from "./_shared/prompt";

export default async (req: Request) => {
  return handleClassify(req, {
    getSecret: () => Netlify.env.get("CLASSIFY_SECRET"),
    classify: classifyWithGateway,
    saveNote: async (note) => {
      const token = Netlify.env.get("NOTION_TOKEN");
      const databaseId = Netlify.env.get("NOTION_DATABASE_ID");
      if (!token || !databaseId) {
        throw new Error("NOTION_TOKEN or NOTION_DATABASE_ID is not set");
      }
      return createNotionPage(token, databaseId, note);
    },
    today: () => new Date().toISOString().slice(0, 10),
  });
};

export const config: Config = {
  path: "/api/classify",
  method: "POST",
};

async function classifyWithGateway(text: string) {
  const openai = new OpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty classification");
  }

  return parseModelOutput(content);
}
