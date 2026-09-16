import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  extractResidualFacts,
  leftoverText,
  type CompactAiClient,
} from "./compact-ai";
import { factsFromSource, ingestFile } from "./ingest";
import { extractMacros, parseScale } from "./macros";
import { disciplineFromSheet, factsToObjects } from "./objects";
import { factKey } from "./text";
import { resolveFacts } from "./resolve";
import { DrawingStore } from "./store";
import type { DrawingDatabase, DrawingSource, Fact } from "./types";
import { runMacroValidations } from "./validate";
import { writeWiki } from "./wiki";

const FACT_TYPES = new Set(["dimension", "material", "specification", "symbol", "note"]);

export type IndexResult = {
  database: DrawingDatabase;
  storePath: string;
  errors: Array<{ path: string; error: string }>;
};

export async function listDrawingFiles(root: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "wiki") {
          continue;
        }
        await walk(full);
      } else if (/\.(pdf|dxf|dwg|txt)$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }

  await walk(root);
  return out.sort();
}

export async function indexDrawings(options: {
  input: string;
  output: string;
  ai?: CompactAiClient;
  now?: () => string;
}): Promise<IndexResult> {
  const files = await listDrawingFiles(options.input);
  const errors: IndexResult["errors"] = [];
  const sources: DrawingSource[] = [];
  const facts: Fact[] = [];

  for (const filePath of files) {
    try {
      const source = await ingestFile(filePath);
      sources.push(source);
      const extracted = factsFromSource(source);
      facts.push(...extracted);

      if (options.ai) {
        const leftover = leftoverText(source.rawText, extracted);
        const residual = await extractResidualFacts(
          leftover,
          extracted.map((fact) => fact.key),
          options.ai,
        );
        for (const item of residual) {
          if (!item.type || !FACT_TYPES.has(item.type) || !item.value) {
            continue;
          }
          facts.push({
            type: item.type as Fact["type"],
            location: item.location,
            key: factKey(item.type, item.location, item.originalLabel || item.value),
            value: item.value,
            originalLabel: item.originalLabel || item.value,
            sourceSheet: source.sheetId,
            sourcePath: source.path,
            revisionDate: source.revisionDate,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "ingest failed";
      errors.push({ path: filePath, error: message });
    }
  }

  const { resolved, conflicts, rejected } = resolveFacts(facts);
  const uniqueSheets = new Set(sources.map((source) => source.sheetId));
  const database: DrawingDatabase = {
    generatedAt: (options.now ?? (() => new Date().toISOString()))(),
    drawingCount: uniqueSheets.size,
    factCount: resolved.length,
    conflictCount: conflicts.length,
    rejectedCount: rejected.length,
    drawings: sources.map((source) => ({
      path: source.path,
      format: source.format,
      sheetId: source.sheetId,
      revisionDate: source.revisionDate,
    })),
    facts: resolved,
    conflicts,
    rejected,
  };

  await mkdir(options.output, { recursive: true });
  const store = await DrawingStore.create();
  const latestBySheet = new Map<string, DrawingSource>();
  for (const source of sources) {
    const prev = latestBySheet.get(source.sheetId);
    if (!prev || (source.revisionDate || "") >= (prev.revisionDate || "")) {
      latestBySheet.set(source.sheetId, source);
    }
  }
  for (const source of latestBySheet.values()) {
    const scale = parseScale(source.rawText);
    store.insertSheet(source, {
      discipline: disciplineFromSheet(source.sheetId),
      scaleText: scale.scaleText,
      scaleRatio: scale.scaleRatio,
    });
    for (const macro of extractMacros(source.rawText)) {
      store.insertMacro({
        name: macro.name,
        kind: macro.kind,
        expectedValue: macro.expectedValue,
        unit: macro.unit,
        sourceSheet: source.sheetId,
      });
    }
  }
  for (const object of factsToObjects(resolved)) {
    store.insertObject(object);
  }
  store.insertConflicts(conflicts);
  store.insertRejected(rejected);
  runMacroValidations(store);

  const storePath = join(options.output, "drawings.sqlite");
  await store.save(storePath);
  await writeWiki(options.output, database, store);
  return { database, storePath, errors };
}

