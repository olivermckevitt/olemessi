import { extractSymbolLabels } from "./symbols";
import { factKey, normalizeValue } from "./text";
import type { DrawingSource, Fact } from "./types";

const SHEET_RE =
  /\b(?:SHEET\s+)?((?:FP|EL|PL|FA|A|S|M|E|P|C|L|I|T)[- ]?\d{2,4}[A-Z]?)\b/i;

const FEET_INCH_RE = /(\d{1,3})'\s*-\s*(\d{1,2})(?:\s*(\d+\/\d+))?\s*"?/g;
const MM_RE = /(\d{2,5}(?:\.\d+)?)\s*mm\b/gi;
const INCH_MATERIAL_RE = /(\d{1,2}(?:\s+\d+\/\d+)?)"\s*(CMU|GWB|STUD|SLAB|DECK|WALL|THK|THICK)/gi;

const MATERIAL_RE =
  /\b(GWB|GYPSUM|DRYWALL|CMU|CONCRETE|STEEL|STAINLESS|GALVANIZED|PLYWOOD|OSB|MINERAL WOOL|FIRE[-\s]?RATED|ACOUSTICAL|ALUMINUM|BRICK|REBAR|METAL DECK|TPO|EPDM|INSULATION)\b/gi;

const SPEC_RE =
  /\b(?:SPEC(?:IFICATION)?\s+SECTION\s+\d{2}\s+\d{2}\s+\d{2}|\d+-HR(?:\s+FIRE(?:-|\s)?RATED)?|UL\s*\d{3,5})\b/gi;

const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/;

export type TitleBlock = {
  sheetId: string;
  revisionDate: string | null;
  revisionLabel: string | null;
};

export function parseTitleBlock(text: string, fallbackSheet: string): TitleBlock {
  const sheetMatch = text.match(SHEET_RE);
  const sheetId = sheetMatch ? sheetMatch[1].toUpperCase().replace(/\s+/g, "-") : fallbackSheet;

  const revLabelMatch = text.match(/\bREV(?:ISION)?\s*([A-Z0-9]+)\b/i);
  const dateMatch =
    text.match(/\b(?:DATE|REV(?:ISION)?)\b[^0-9]{0,16}(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i) ||
    text.match(DATE_RE);

  return {
    sheetId,
    revisionDate: dateMatch ? toIsoDate(dateMatch[1]) : null,
    revisionLabel: revLabelMatch ? revLabelMatch[1].toUpperCase() : null,
  };
}

export function toIsoDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return validIso(trimmed);
  }

  const us = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!us) {
    return null;
  }

  const month = Number(us[1]);
  const day = Number(us[2]);
  let year = Number(us[3]);
  if (year < 100) {
    year += 2000;
  }
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return validIso(iso);
}

function validIso(iso: string): string | null {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return iso;
}

export function locationNear(text: string, index: number): string | null {
  const windowText = text.slice(Math.max(0, index - 90), Math.min(text.length, index + 90));
  return parseLocation(windowText) ?? parseLocation(text);
}

export function parseLocation(text: string): string | null {
  const level = text.match(/\b(?:LEVEL|LVL|FLOOR|FL)\s+(\d{1,2})\b/i);
  const grid = text.match(/\bGRIDS?\s+([A-Z])\s*[-\/]\s*(\d{1,3})\b/i);
  const room = text.match(/\bROOM\s+([A-Z0-9-]+)\b/i);
  const parts: string[] = [];
  if (level) {
    parts.push(`Level ${level[1]}`);
  }
  if (grid) {
    parts.push(`Grid ${grid[1].toUpperCase()}-${grid[2]}`);
  }
  if (room) {
    parts.push(`Room ${room[1].toUpperCase()}`);
  }
  return parts.length > 0 ? parts.join(" / ") : null;
}

export function extractFactsFromText(text: string, source: Partial<DrawingSource> & { path: string }): Fact[] {
  const title = parseTitleBlock(text, source.sheetId || sheetFromPath(source.path));
  const sheetId = source.sheetId || title.sheetId;
  const revisionDate = source.revisionDate ?? title.revisionDate;
  const facts: Fact[] = [];
  const seen = new Set<string>();

  const push = (fact: Omit<Fact, "key"> & { key?: string }) => {
    const key =
      fact.key ??
      factKey(fact.type, fact.location, fact.originalLabel || fact.value);
    const dedupe = `${key}|${normalizeValue(fact.value)}|${sheetId}`;
    if (seen.has(dedupe)) {
      return;
    }
    seen.add(dedupe);
    facts.push({
      ...fact,
      key,
      sourceSheet: sheetId,
      sourcePath: source.path,
      revisionDate,
    });
  };

  for (const match of text.matchAll(FEET_INCH_RE)) {
    const index = match.index ?? 0;
    if (isDateContext(text, index)) {
      continue;
    }
    const value = formatFeetInches(match[1], match[2], match[3]);
    const label = nearestLabel(text, index) || value;
    const location = locationNear(text, index);
    const role = dimensionRole(text, index);
    push({
      type: "dimension",
      location,
      value,
      originalLabel: label,
      key: factKey("dimension", location, `${label}-${role}`),
    });
  }

  for (const match of text.matchAll(MM_RE)) {
    const index = match.index ?? 0;
    const value = `${match[1]} mm`;
    const location = locationNear(text, index);
    const label = nearestLabel(text, index) || value;
    push({
      type: "dimension",
      location,
      value,
      originalLabel: label,
      key: factKey("dimension", location, `${label}-mm`),
    });
  }

  for (const match of text.matchAll(INCH_MATERIAL_RE)) {
    const index = match.index ?? 0;
    const value = `${match[1]}" ${match[2].toUpperCase()}`;
    const location = locationNear(text, index);
    push({
      type: "dimension",
      location,
      value,
      originalLabel: match[2].toUpperCase(),
      key: factKey("dimension", location, `${match[2].toUpperCase()}-thk`),
    });
  }

  for (const match of text.matchAll(MATERIAL_RE)) {
    const index = match.index ?? 0;
    const value = canonicalizeMaterial(match[1]);
    push({
      type: "material",
      location: locationNear(text, index),
      value,
      originalLabel: match[1],
    });
  }

  for (const match of text.matchAll(SPEC_RE)) {
    const index = match.index ?? 0;
    const value = match[0].replace(/\s+/g, " ").toUpperCase();
    push({
      type: "specification",
      location: locationNear(text, index),
      value,
      originalLabel: match[0],
    });
  }

  for (const symbol of extractSymbolLabels(text)) {
    const index = text.toUpperCase().indexOf(symbol.originalLabel.toUpperCase());
    push({
      type: "symbol",
      location: locationNear(text, Math.max(0, index)),
      value: symbol.display,
      originalLabel: symbol.originalLabel,
      category: symbol.category,
      key: factKey("symbol", locationNear(text, Math.max(0, index)), symbol.originalLabel),
    });
  }

  for (const note of extractNotes(text)) {
    push({
      type: "note",
      location: parseLocation(text),
      value: note,
      originalLabel: "note",
      key: factKey("note", parseLocation(text), note.slice(0, 80)),
    });
  }

  return facts;
}

export function extractNotes(text: string): string[] {
  const notes: string[] = [];
  const block = text.match(
    /(?:GENERAL\s+NOTES|KEYNOTES|NOTES)\s*:?\s*([\s\S]+?)(?:\n[A-Z]{3,}[^a-z]{0,20}\n|$)/i,
  );
  const body = block ? block[1] : "";
  const numbered = [...(body || text).matchAll(/^\s*\d+[.)]\s+(.+)$/gm)];
  if (numbered.length > 0) {
    for (const item of numbered) {
      const line = item[1].trim();
      if (line.length >= 12) {
        notes.push(line);
      }
    }
    return notes;
  }

  if (body) {
    for (const line of body.split(/\n+/)) {
      const trimmed = line.trim();
      if (trimmed.length >= 12) {
        notes.push(trimmed);
      }
    }
  }
  return notes;
}

function canonicalizeMaterial(raw: string): string {
  const upper = raw.toUpperCase().replace(/GYPSUM|DRYWALL/, "GWB");
  if (upper === "FIRE RATED") {
    return "FIRE-RATED";
  }
  return upper;
}

function formatFeetInches(feet: string, inches: string, fraction?: string): string {
  const frac = fraction ? ` ${fraction}` : "";
  return `${Number(feet)}'-${Number(inches)}${frac}"`;
}

function nearestLabel(text: string, index: number): string | null {
  const before = text.slice(Math.max(0, index - 40), index);
  const matches = [...before.matchAll(/\b([A-Z]{2,4}[-.]?\d+[A-Z]?)\b/gi)];
  if (matches.length === 0) {
    return null;
  }
  return matches[matches.length - 1][1];
}

function dimensionRole(text: string, index: number): "w" | "h" {
  const before = text.slice(Math.max(0, index - 10), index);
  if (/\bx\s*$/i.test(before)) {
    return "h";
  }
  return "w";
}

function isDateContext(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 12), index).toUpperCase();
  return /\b(DATE|REV|REVISION)\b/.test(before);
}

function sheetFromPath(filePath: string): string {
  const base = filePath.split("/").pop() || "UNKNOWN";
  const name = base.replace(/\.[^.]+$/, "").toUpperCase();
  const sheet = name.match(SHEET_RE);
  return sheet ? sheet[1].toUpperCase() : name.replace(/[^A-Z0-9-]/g, "").slice(0, 24) || "UNKNOWN";
}
