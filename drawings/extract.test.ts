import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractFactsFromText, extractNotes, parseTitleBlock, toIsoDate } from "./extract";
import { checkFact } from "./sanity";
import { extractSymbolLabels, mapSymbol } from "./symbols";

const SAMPLE = `SHEET A-101
REV 2 DATE 08/01/2026
LEVEL 1 GRID B-4

DOOR SCHEDULE
DR-1 3'-0" x 7'-0" GWB FRAME TYP
DR-2 2'-8" x 7'-0"

ELECTRICAL
WP-GFI AT GRID B-4

MATERIAL
8" CMU AT GRID A-3

SPEC SECTION 09 29 00
1-HR FIRE-RATED

GENERAL NOTES
1. ALL DIMENSIONS TO FACE OF STUDS UNLESS NOTED.
2. SEE SPEC SECTION 09 29 00 FOR GWB.
`;

describe("mapSymbol", () => {
  it("maps door tags and keeps the original label in brackets", () => {
    expect(mapSymbol("DR-1")).toEqual({
      category: "Door",
      name: "Door",
      originalLabel: "DR-1",
      display: "Door [DR-1]",
    });
  });

  it("maps GFI devices to receptacles", () => {
    expect(mapSymbol("WP-GFI").display).toBe("Duplex Receptacle [WP-GFI]");
  });

  it("keeps unknown labels instead of dropping them", () => {
    expect(mapSymbol("ZZ-99")).toEqual({
      category: "Unknown",
      name: "Unknown",
      originalLabel: "ZZ-99",
      display: "Unknown [ZZ-99]",
    });
  });
});

describe("extractSymbolLabels", () => {
  it("finds door and receptacle tags in drawing text", () => {
    const labels = extractSymbolLabels(SAMPLE).map((item) => item.display);
    expect(labels).toContain("Door [DR-1]");
    expect(labels).toContain("Door [DR-2]");
    expect(labels).toContain("Duplex Receptacle [WP-GFI]");
  });
});

describe("parseTitleBlock", () => {
  it("reads sheet id and US revision date", () => {
    expect(parseTitleBlock(SAMPLE, "X")).toEqual({
      sheetId: "A-101",
      revisionDate: "2026-08-01",
      revisionLabel: "2",
    });
  });

  it("rejects impossible dates", () => {
    expect(toIsoDate("2026-13-40")).toBeNull();
  });
});

describe("extractFactsFromText", () => {
  const facts = extractFactsFromText(SAMPLE, { path: "fixtures/a-101.txt" });

  it("extracts imperial door dimensions", () => {
    const values = facts.filter((fact) => fact.type === "dimension").map((fact) => fact.value);
    expect(values).toContain("3'-0\"");
    expect(values).toContain("7'-0\"");
    expect(values).toContain("2'-8\"");
    expect(values).toContain("8\" CMU");
  });

  it("attaches location from nearby grid and level", () => {
    const door = facts.find((fact) => fact.originalLabel === "DR-1" && fact.type === "dimension");
    expect(door?.location).toContain("Level 1");
    expect(door?.location).toContain("Grid B-4");
  });

  it("extracts materials and specifications", () => {
    expect(facts.some((fact) => fact.type === "material" && fact.value === "GWB")).toBe(true);
    expect(facts.some((fact) => fact.type === "material" && fact.value === "CMU")).toBe(true);
    expect(facts.some((fact) => fact.type === "specification" && fact.value.includes("09 29 00"))).toBe(true);
  });

  it("maps symbols with original labels", () => {
    const gfi = facts.find((fact) => fact.type === "symbol" && fact.originalLabel === "WP-GFI");
    expect(gfi?.value).toBe("Duplex Receptacle [WP-GFI]");
    expect(gfi?.category).toBe("Receptacle");
  });

  it("keeps unstructured notes", () => {
    expect(extractNotes(SAMPLE)).toEqual([
      "ALL DIMENSIONS TO FACE OF STUDS UNLESS NOTED.",
      "SEE SPEC SECTION 09 29 00 FOR GWB.",
    ]);
  });
});

describe("checkFact", () => {
  it("passes a normal door width", () => {
    expect(
      checkFact({
        type: "dimension",
        location: "Grid B-4",
        key: "dimension|grid-b-4|dr-1",
        value: "3'-0\"",
        originalLabel: "DR-1",
        sourceSheet: "A-101",
        sourcePath: "a.pdf",
        revisionDate: "2026-08-01",
      }).status,
    ).toBe("pass");
  });

  it("fails an out-of-range dimension", () => {
    expect(
      checkFact({
        type: "dimension",
        location: null,
        key: "x",
        value: "900'-0\"",
        originalLabel: "DR-1",
        sourceSheet: "A-101",
        sourcePath: "a.pdf",
        revisionDate: "2026-08-01",
      }).reason,
    ).toBe("dimension out of range");
  });

  it("fails a symbol without bracket metadata", () => {
    expect(
      checkFact({
        type: "symbol",
        location: null,
        key: "x",
        value: "Door",
        originalLabel: "DR-1",
        sourceSheet: "A-101",
        sourcePath: "a.pdf",
        revisionDate: "2026-08-01",
      }).status,
    ).toBe("fail");
  });
});

describe("fixture file", () => {
  it("matches the committed sample", async () => {
    const file = await readFile(new URL("./fixtures/a-101.txt", import.meta.url), "utf8");
    expect(file).toContain("SHEET A-101");
  });
});
