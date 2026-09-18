import { clip } from "./text";
import type { Fact } from "./types";

export const TOKEN_BUDGET = {
  leftoverChars: 3000,
  knownKeyLimit: 80,
  maxOutputTokens: 600,
  skipIfLeftoverBelow: 40,
  queryHitsForModel: 20,
};

export const COMPACT_EXTRACT_SYSTEM =
  "JSON only. {\"facts\":[{\"type\":\"dimension|material|specification|symbol|note\",\"location\":null,\"value\":\"\",\"originalLabel\":\"\"}]}. Skip known. No guesses.";

export function leftoverText(sourceText: string, facts: Fact[]): string {
  const claimed = facts.flatMap((fact) => [fact.value, fact.originalLabel]).filter(Boolean);
  return sourceText
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 8) {
        return false;
      }
      const upper = line.toUpperCase();
      return !claimed.some((item) => upper.includes(item.toUpperCase()));
    })
    .join("\n");
}

export function compactUserMessage(leftover: string, knownKeys: string[]): string {
  const keys = knownKeys.slice(0, TOKEN_BUDGET.knownKeyLimit).join(",");
  const body = clip(leftover.trim(), TOKEN_BUDGET.leftoverChars);
  return `known:${keys}\ntext:${body}`;
}

export function shouldCallModel(leftover: string): boolean {
  return leftover.trim().length >= TOKEN_BUDGET.skipIfLeftoverBelow;
}

export type CompactAiClient = {
  complete: (input: { system: string; user: string; maxTokens: number }) => Promise<string>;
};

export async function extractResidualFacts(
  leftover: string,
  knownKeys: string[],
  client: CompactAiClient,
): Promise<Array<{ type: string; location: string | null; value: string; originalLabel: string }>> {
  if (!shouldCallModel(leftover)) {
    return [];
  }

  const raw = await client.complete({
    system: COMPACT_EXTRACT_SYSTEM,
    user: compactUserMessage(leftover, knownKeys),
    maxTokens: TOKEN_BUDGET.maxOutputTokens,
  });

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      facts?: Array<{ type?: string; location?: string | null; value?: string; originalLabel?: string }>;
    };
    return (parsed.facts ?? []).filter((item) => item.value && item.type);
  } catch {
    return [];
  }
}
