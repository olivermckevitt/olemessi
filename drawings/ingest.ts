import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { dxfToText } from "./dxf";
import { extractFactsFromText, parseTitleBlock } from "./extract";
import { extractPdfText, toPdfBytes } from "./pdf";
import type { DrawingSource, Fact } from "./types";

export class UnsupportedDrawingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedDrawingError";
  }
}

export async function ingestFile(filePath: string): Promise<DrawingSource> {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".dwg") {
    throw new UnsupportedDrawingError("Convert DWG to DXF and retry.");
  }

  if (ext === ".pdf") {
    const bytes = toPdfBytes(await readFile(filePath));
    const rawText = await extractPdfText(bytes);
    return sourceFromText(filePath, "pdf", rawText);
  }

  if (ext === ".dxf") {
    const content = await readFile(filePath, "utf8");
    return sourceFromText(filePath, "dxf", dxfToText(content));
  }

  if (ext === ".txt") {
    const rawText = await readFile(filePath, "utf8");
    return sourceFromText(filePath, "pdf", rawText);
  }

  throw new UnsupportedDrawingError(`Unsupported drawing format: ${ext || "unknown"}`);
}

export function sourceFromText(
  filePath: string,
  format: "pdf" | "dxf",
  rawText: string,
): DrawingSource {
  const fallback = basename(filePath).replace(/\.[^.]+$/, "").toUpperCase();
  const title = parseTitleBlock(rawText, fallback);
  return {
    path: filePath,
    format,
    sheetId: title.sheetId,
    revisionDate: title.revisionDate,
    revisionLabel: title.revisionLabel,
    rawText,
  };
}

export function factsFromSource(source: DrawingSource): Fact[] {
  return extractFactsFromText(source.rawText, source);
}
