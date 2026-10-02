import * as XLSX from "xlsx";
import { parseCsvText, parsePlainTextSchedule, rowsToActivities } from "./parse-schedule";
import type { ScheduleActivity } from "./types";

export async function parseSpreadsheetFile(file: File): Promise<ScheduleActivity[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  return rowsToActivities(rows);
}

export async function parseScheduleFile(file: File): Promise<ScheduleActivity[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    return name.endsWith(".txt") ? parsePlainTextSchedule(text) : parseCsvText(text);
  }
  return parseSpreadsheetFile(file);
}

export async function ocrImageFile(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}
