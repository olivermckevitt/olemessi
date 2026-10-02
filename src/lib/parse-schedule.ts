import { classifyInspectionKind, looksLikeInspection } from "./checklists";
import { extractDatesFromText, parseToIsoDate } from "./dates";
import type { DetectedInspection, ScheduleActivity } from "./types";

const NAME_HEADERS = /^(task|activity|name|description|item|milestone|work|title|schedule)/i;
const FINISH_HEADERS = /^(finish|end|complete|due|early.?finish|late.?finish|planned.?finish|baseline.?finish)/i;
const START_HEADERS = /^(start|begin|early.?start|late.?start|planned.?start|baseline.?start)/i;
const DATE_HEADERS = /^(date|inspection.?date|day)$/i;
const TRADE_HEADERS = /^(trade|resource|crew|sub|contractor|responsible|company)/i;
const TYPE_HEADERS = /^(type|category|kind|phase|wbs|activity.?type)/i;
const ID_HEADERS = /^(id|activity.?id|task.?id|uid|code|#)/i;

type HeaderMap = {
  name?: string;
  start?: string;
  finish?: string;
  date?: string;
  trade?: string;
  type?: string;
  id?: string;
};

export function normalizeHeader(header: string): string {
  return header.replace(/\s+/g, " ").trim();
}

export function mapHeaders(headers: string[]): HeaderMap {
  const map: HeaderMap = {};
  for (const header of headers) {
    const value = normalizeHeader(header);
    if (!map.id && ID_HEADERS.test(value)) map.id = header;
    else if (!map.finish && FINISH_HEADERS.test(value)) map.finish = header;
    else if (!map.start && START_HEADERS.test(value)) map.start = header;
    else if (!map.date && DATE_HEADERS.test(value)) map.date = header;
    else if (!map.trade && TRADE_HEADERS.test(value)) map.trade = header;
    else if (!map.type && TYPE_HEADERS.test(value)) map.type = header;
    else if (!map.name && NAME_HEADERS.test(value)) map.name = header;
  }
  return map;
}

function cell(row: Record<string, unknown>, key?: string): string {
  if (!key) return "";
  const value = row[key];
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function rowsToActivities(
  rows: Record<string, unknown>[],
  headers?: string[],
): ScheduleActivity[] {
  if (rows.length === 0) return [];
  const keys = headers ?? Object.keys(rows[0] ?? {});
  const map = mapHeaders(keys);
  const nameKey = map.name ?? keys[0];

  return rows
    .map((row, index) => {
      const name = cell(row, nameKey);
      if (!name) return null;
      const start = parseToIsoDate(row[map.start ?? ""] ?? cell(row, map.start));
      const finish =
        parseToIsoDate(row[map.finish ?? ""] ?? cell(row, map.finish)) ??
        parseToIsoDate(row[map.date ?? ""] ?? cell(row, map.date));
      const activity: ScheduleActivity = {
        id: cell(row, map.id) || `row-${index + 1}`,
        name,
        start,
        finish,
        trade: cell(row, map.trade) || null,
        type: cell(row, map.type) || null,
        sourceRow: index + 1,
      };
      return activity;
    })
    .filter((row): row is ScheduleActivity => Boolean(row));
}

export function detectInspections(activities: ScheduleActivity[]): DetectedInspection[] {
  return activities
    .map((activity) => {
      const hit = looksLikeInspection(activity.name, activity.type ?? "");
      const date = activity.finish ?? activity.start;
      if (!date) {
        if (!hit.match) return null;
        return {
          id: `insp-${activity.id}`,
          activity,
          kind: classifyInspectionKind(activity.name, activity.trade ?? "", activity.type ?? ""),
          date: "",
          included: false,
          confidence: "low" as const,
          reason: `${hit.reason}. Missing date.`,
        };
      }
      if (!hit.match) return null;
      const kind = classifyInspectionKind(activity.name, activity.trade ?? "", activity.type ?? "");
      const confidence: DetectedInspection["confidence"] = /\binspect/i.test(activity.name)
        ? "high"
        : activity.type
          ? "high"
          : "medium";
      return {
        id: `insp-${activity.id}`,
        activity,
        kind,
        date,
        included: true,
        confidence,
        reason: hit.reason,
      };
    })
    .filter((row): row is DetectedInspection => Boolean(row));
}

export function parsePlainTextSchedule(text: string): ScheduleActivity[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|=_]{3,}/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const activities: ScheduleActivity[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^(activity|task|name|date|start|finish)\b/i.test(line) && line.includes(",")) continue;
    const dates = extractDatesFromText(line);
    if (dates.length === 0) continue;
    const name = line
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
      .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "")
      .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi, "")
      .replace(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi, "")
      .replace(/[,;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (name.length < 3) continue;
    activities.push({
      id: `text-${i + 1}`,
      name,
      start: dates[0] ?? null,
      finish: dates[dates.length - 1] ?? dates[0] ?? null,
      trade: null,
      type: null,
      sourceRow: i + 1,
    });
  }
  return activities;
}

export function parseCsvText(csv: string): ScheduleActivity[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  if (!lines[0].includes(",")) return parsePlainTextSchedule(csv);

  const headers = splitCsvLine(lines[0]);
  const rows: Record<string, unknown>[] = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
  return rowsToActivities(rows, headers);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      out.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current.trim());
  return out;
}
