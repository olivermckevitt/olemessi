const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseToIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToIso(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) return excelSerialToIso(serial);
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date);
  }

  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    let year = Number(us[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date);
  }

  const named = text.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (month == null) return null;
    const date = new Date(Number(named[3]), month, Number(named[2]));
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date);
  }

  const namedDayFirst = text.match(
    /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})$/,
  );
  if (namedDayFirst) {
    const month = MONTHS[namedDayFirst[2].toLowerCase()];
    if (month == null) return null;
    let year = Number(namedDayFirst[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month, Number(namedDayFirst[1]));
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date);
  }

  return null;
}

function excelSerialToIso(serial: number): string | null {
  if (serial < 1) return null;
  const whole = Math.floor(serial);
  const utcDays = whole - 25569;
  const date = new Date(utcDays * 86400 * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function addBusinessDays(isoDate: string, delta: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (delta === 0) return toIsoDate(date);

  const direction = delta < 0 ? -1 : 1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    date.setDate(date.getDate() + direction);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return toIsoDate(date);
}

export function isPast(isoDate: string, today: string): boolean {
  return isoDate < today;
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now);
}

export function extractDatesFromText(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
  ];
  for (const pattern of patterns) {
    const matches = text.match(pattern) ?? [];
    for (const match of matches) {
      const iso = parseToIsoDate(match);
      if (iso) found.add(iso);
    }
  }
  return [...found];
}
