import OpenAI from "openai";
import { COMPACT_EXTRACT_SYSTEM, type CompactAiClient } from "./compact-ai";

export function openAiCompactClient(): CompactAiClient {
  const openai = new OpenAI();
  return {
    async complete({ user, maxTokens }) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: COMPACT_EXTRACT_SYSTEM },
          { role: "user", content: user },
        ],
      });
      return completion.choices[0]?.message?.content ?? "";
    },
  };
}
