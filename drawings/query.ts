import { readFile } from "node:fs/promises";
import { TOKEN_BUDGET } from "./compact-ai";
import type { DrawingObject } from "./objects";
import type { DrawingStore } from "./store";
import type { DrawingDatabase, Reliability, ResolvedFact } from "./types";
import { shouldUseVision, type VisionClient } from "./vision";

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

export type StoreQueryResult = {
  tier: "sql" | "text" | "vision" | "none";
  needsVision: boolean;
  rows: string[];
};

export async function queryStore(
  store: DrawingStore,
  rawQuery: string,
  options: { vision?: VisionClient } = {},
): Promise<StoreQueryResult> {
  const tokens = tokenize(rawQuery);
  const sqlHits = store.searchObjects(tokens);
  const lowest = lowestReliability(sqlHits);

  if (sqlHits.length > 0 && !shouldUseVision(rawQuery, sqlHits.length, lowest)) {
    return {
      tier: "sql",
      needsVision: false,
      rows: sqlHits.slice(0, TOKEN_BUDGET.queryHitsForModel).map(formatObjectRow),
    };
  }

  const textHits = store.searchTextLayer(rawQuery);
  if (textHits.length > 0 && sqlHits.length === 0) {
    return {
      tier: "text",
      needsVision: false,
      rows: textHits.map((hit) => `text|${hit.sheetId}|${hit.snippet}`),
    };
  }

  const needsVision = shouldUseVision(rawQuery, sqlHits.length, lowest);
  if (needsVision && options.vision) {
    await options.vision.inspectCrop({
      sheetId: sqlHits[0]?.sourceSheet || textHits[0]?.sheetId || "unknown",
      reason: rawQuery,
    });
    return {
      tier: "vision",
      needsVision: true,
      rows: sqlHits.map(formatObjectRow),
    };
  }

  if (sqlHits.length > 0) {
    return { tier: "sql", needsVision, rows: sqlHits.map(formatObjectRow) };
  }

  return { tier: "none", needsVision, rows: [] };
}

export function formatObjectRow(object: DrawingObject): string {
  return [object.kind, object.location ?? "", object.display, object.reliability, object.sourceSheet].join("|");
}

function lowestReliability(objects: DrawingObject[]): Reliability | null {
  const rank: Record<Reliability, number> = {
    low: 1,
    medium: 2,
    high: 3,
    "very high": 4,
  };
  if (objects.length === 0) {
    return null;
  }
  return objects.reduce((lowest, object) => (rank[object.reliability] < rank[lowest] ? object.reliability : lowest), objects[0].reliability);
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 2);
}
