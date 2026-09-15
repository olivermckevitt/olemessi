import { readFile } from "node:fs/promises";
import { TOKEN_BUDGET } from "./compact-ai";
import type { DrawingDatabase, Reliability, ResolvedFact } from "./types";

export type QueryHit = {
  score: number;
  fact: ResolvedFact;
};

const RANK: Record<Reliability, number> = {
  low: 1,
  medium: 2,
  high: 3,
  "very high": 4,
};

export async function loadDatabase(path: string): Promise<DrawingDatabase> {
  return JSON.parse(await readFile(path, "utf8")) as DrawingDatabase;
}

export function queryDatabase(db: DrawingDatabase, rawQuery: string): QueryHit[] {
  const tokens = tokenize(rawQuery);
  if (tokens.length === 0) {
    return [];
  }

  const hits: QueryHit[] = [];
  for (const fact of db.facts) {
    if (fact.sanity !== "pass") {
      continue;
    }
    const haystack = [
      fact.type,
      fact.category ?? "",
      fact.location ?? "",
      fact.value,
      fact.display,
      fact.originalLabel,
      fact.sourceSheet,
    ]
      .join(" ")
      .toLowerCase();

    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) {
        score += 1;
      }
    }
    if (score > 0) {
      hits.push({ score, fact });
    }
  }

  hits.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    return RANK[b.fact.reliability] - RANK[a.fact.reliability];
  });
  return hits;
}

export function formatHitsCompact(hits: QueryHit[]): string {
  return hits
    .slice(0, TOKEN_BUDGET.queryHitsForModel)
    .map((hit) => {
      const fact = hit.fact;
      return [fact.type, fact.location ?? "", fact.display, fact.reliability, fact.agreeingSheets.join("+")].join("|");
    })
    .join("\n");
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 2);
}
