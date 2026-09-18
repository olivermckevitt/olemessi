import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { leftoverText, compactUserMessage, extractResidualFacts, shouldCallModel, TOKEN_BUDGET } from "./compact-ai";
import { parseDxf } from "./dxf";
import { parseTitleBlock } from "./extract";
import { ingestFile, UnsupportedDrawingError } from "./ingest";
import { extractPdfText, buildTextPdf } from "./pdf";
import { formatHitsCompact, queryDatabase } from "./query";
import { indexDrawings } from "./pipeline";
import { parseArgs } from "./cli";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("DXF ingest", () => {
  it("reads TEXT, INSERT, and DIMENSION values", async () => {
    const dxf = await readFile(join(FIXTURES, "a-102.dxf"), "utf8");
    const parsed = parseDxf(dxf);
    expect(parsed.texts.some((text) => text.includes("SHEET A-102"))).toBe(true);
    expect(parsed.inserts).toContain("DR-1");
    expect(parsed.dimensions).toContain("3'-0\"");
  });
});

describe("PDF ingest", () => {
  it("extracts the text layer from a generated PDF", async () => {
    const bytes = buildTextPdf("SHEET A-201 REV 1 DATE 2026-08-01 DR-4 3'-0\"");
    const text = await extractPdfText(bytes);
    expect(text).toContain("A-201");
    expect(parseTitleBlock(text, "X").sheetId).toBe("A-201");
  });

  it("accepts a Node Buffer, which pdf.js rejects", async () => {
    const bytes = buildTextPdf("SHEET A-301 REV 1 DATE 2026-08-01 DR-8 3'-0\"");
    const text = await extractPdfText(Buffer.from(bytes));
    expect(text).toContain("A-301");
  });
});

describe("DWG ingest", () => {
  it("rejects DWG and asks for DXF", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dwg-"));
    const file = join(dir, "plan.dwg");
    await writeFile(file, "fake");
    await expect(ingestFile(file)).rejects.toBeInstanceOf(UnsupportedDrawingError);
    await expect(ingestFile(file)).rejects.toThrow("Convert DWG to DXF and retry.");
  });
});

describe("compact leftover AI", () => {
  it("does not call the model when leftover text is tiny", () => {
    expect(shouldCallModel("ok")).toBe(false);
    expect(TOKEN_BUDGET.leftoverChars).toBe(3000);
  });

  it("builds a short user message and skips already-known lines", () => {
    const leftover = leftoverText("DR-1 3'-0\"\nSTRANGE CALLOUT ON GRID C PLEASE VERIFY IN FIELD\n", [
      {
        type: "dimension",
        location: null,
        key: "dimension|x|dr-1",
        value: "3'-0\"",
        originalLabel: "DR-1",
        sourceSheet: "A-101",
        sourcePath: "a",
        revisionDate: null,
      },
    ]);
    expect(leftover).toContain("STRANGE CALLOUT");
    expect(leftover).not.toContain("DR-1");
    expect(compactUserMessage(leftover, ["dimension|x|dr-1"]).startsWith("known:")).toBe(true);
  });

  it("parses residual JSON from a fake model", async () => {
    const facts = await extractResidualFacts(
      "STRANGE CALLOUT ON GRID C PLEASE VERIFY IN FIELD BEFORE POUR",
      [],
      {
      complete: async () =>
        JSON.stringify({
          facts: [{ type: "note", location: "Grid C", value: "Strange callout", originalLabel: "note" }],
        }),
    });
    expect(facts[0].value).toBe("Strange callout");
  });
});

describe("pipeline wiki + query", () => {
  it("indexes fixtures into a database you can search without re-reading drawings", async () => {
    const output = await mkdtemp(join(tmpdir(), "wiki-"));
    const result = await indexDrawings({
      input: FIXTURES,
      output,
      now: () => "2026-09-15T00:00:00.000Z",
    });

    expect(result.database.drawingCount).toBe(3);
    expect(result.database.factCount).toBeGreaterThan(5);
    expect(result.database.conflictCount).toBeGreaterThan(0);

    const index = await readFile(join(output, "index.md"), "utf8");
    expect(index).toContain("Conflicts");
    expect(index).toContain("drawings.md");
    const master = await readFile(join(output, "drawings.md"), "utf8");
    expect(master).toContain("S-101");
    const conflicts = await readFile(join(output, "_conflicts.md"), "utf8");
    expect(conflicts).toContain("kept");

    const hits = queryDatabase(result.database, "WP-GFI grid");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].fact.display).toContain("[WP-GFI]");
    expect(formatHitsCompact(hits)).toContain("WP-GFI");
  });
});

describe("parseArgs", () => {
  it("parses index and query commands", () => {
    expect(parseArgs(["index", "--input", "./plans", "--output", "./wiki", "--ai"])).toMatchObject({
      command: "index",
      input: "./plans",
      output: "./wiki",
      ai: true,
    });
    expect(parseArgs(["query", "--db", "./wiki/database.json", "door", "width"])).toMatchObject({
      command: "query",
      db: "./wiki/database.json",
      query: "door width",
      vision: false,
    });
  });

  it("reads Windows --flag=value paths with spaces", () => {
    expect(
      parseArgs([
        "index",
        "--input=C:\\Users\\olemc\\Desktop\\Construction Drawings",
        "--output=.\\wiki",
      ]),
    ).toMatchObject({
      command: "index",
      input: "C:\\Users\\olemc\\Desktop\\Construction Drawings",
      output: ".\\wiki",
    });
  });
});
