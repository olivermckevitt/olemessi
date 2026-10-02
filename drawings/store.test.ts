import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { extractFactsFromText } from "./extract";
import { extractMacros, parseScale } from "./macros";
import { factsToObjects } from "./objects";
import { indexDrawings } from "./pipeline";
import { queryStore } from "./query";
import { resolveFacts } from "./resolve";
import { DrawingStore } from "./store";
import { mapSymbol } from "./symbols";
import { runMacroValidations } from "./validate";
import { shouldUseVision } from "./vision";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("physical object mapping", () => {
  it("maps footing tags and keeps original labels", () => {
    expect(mapSymbol("F-1").display).toBe("Footing [F-1]");
    expect(mapSymbol("SLAB").category).toBe("Slab");
  });

  it("groups objects by kind not page number", () => {
    const text = `SHEET S-101 REV 1 DATE 09/01/2026 LEVEL 1 GRID A-1
FOOTING SCHEDULE
F-1
F-2
TOTAL 2 FOOTINGS`;
    const facts = resolveFacts(extractFactsFromText(text, { path: "s-101.txt" })).resolved;
    const objects = factsToObjects(facts);
    const footings = objects.filter((object) => object.kind === "footing").map((object) => object.tag);
    expect(footings).toContain("F-1");
    expect(footings).toContain("F-2");
    expect(objects.every((object) => object.sourceSheet === "S-101")).toBe(true);
  });
});

describe("macros", () => {
  it("reads footing totals and scale", () => {
    const text = awaitFile();
    expect(extractMacros(text).some((macro) => macro.name === "footing_count" && macro.expectedValue === 2)).toBe(true);
    expect(parseScale(text).scaleText).toContain("1/8");
  });
});

function awaitFile(): string {
  return `SHEET S-101
SCALE 1/8" = 1'-0"
TOTAL 2 FOOTINGS
BUILDING LENGTH 40'-0"`;
}

describe("sqlite store + query tiers", () => {
  it("round-trips objects and serves SQL without vision", async () => {
    const output = await mkdtemp(join(tmpdir(), "wiki-sql-"));
    const result = await indexDrawings({ input: FIXTURES, output });
    const map = await readFile(join(output, "drawings.md"), "utf8");
    expect(map).toContain("S-101");
    expect(map).toContain("footing");
    const trade = await readFile(join(output, "by-trade", "concrete.md"), "utf8");
    expect(trade).toContain("Footing");

    const store = await DrawingStore.open(result.storePath);
    expect(store.countKind("footing")).toBe(2);
    const vision = { inspectCrop: vi.fn(async () => "nope") };
    const sql = await queryStore(store, "WP-GFI", { vision });
    expect(sql.tier).toBe("sql");
    expect(sql.rows.join("\n")).toContain("WP-GFI");
    expect(vision.inspectCrop).not.toHaveBeenCalled();

    const textMiss = await queryStore(store, "SCALE 1/8");
    expect(textMiss.tier).toBe("text");

    expect(shouldUseVision("cable run length", 0, null)).toBe(true);
    expect(shouldUseVision("WP-GFI count", 2, "medium")).toBe(false);
  });

  it("flags a footing count mismatch against the schedule macro", async () => {
    const store = await DrawingStore.create();
    store.insertMacro({
      name: "footing_count",
      kind: "footing",
      expectedValue: 4,
      unit: "count",
      sourceSheet: "S-101",
    });
    store.insertObject({
      id: "footing|a|f-1",
      kind: "footing",
      tag: "F-1",
      location: null,
      discipline: "structural",
      reliability: "low",
      conflict: false,
      display: "Footing [F-1]",
      sourceSheet: "S-101",
      attrs: [],
    });
    const rows = runMacroValidations(store);
    expect(rows[0].status).toBe("fail");
    expect(rows[0].computed).toBe(1);
  });
});
