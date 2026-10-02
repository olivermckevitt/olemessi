import type { CalendarEvent } from "./types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function stamp(date = new Date()): string {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function localDateTime(isoDate: string, hour: number, minute = 0): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}${month}${day}T${pad(hour)}${pad(minute)}00`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  const limit = 74;
  if (line.length <= limit) return line;
  const parts = [line.slice(0, limit)];
  let rest = line.slice(limit);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, limit - 1)}`);
    rest = rest.slice(limit - 1);
  }
  return parts.join("\r\n");
}

function descriptionFor(event: CalendarEvent): string {
  const items = event.checklist.map((item, index) => `${index + 1}. ${item}`).join("\n");
  return `${event.notes}\n\nChecklist:\n${items}`;
}

export function generateIcs(
  events: CalendarEvent[],
  calendarName = "InspectAhead",
  now = new Date(),
): string {
  const dtstamp = stamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InspectAhead//Construction Inspection Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    const start = localDateTime(event.date, event.hour);
    const endHour = Math.min(event.hour + event.durationHours, 23);
    const end = localDateTime(event.date, endHour);
    const uid = `${event.id}-${event.date}@inspectahead`;
    const categories =
      event.kind === "sub_chase"
        ? "INSPECTION,SUBCONTRACTOR"
        : event.kind === "readiness"
          ? "INSPECTION,READINESS"
          : "INSPECTION";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    lines.push(`DESCRIPTION:${escapeText(descriptionFor(event))}`);
    lines.push(`CATEGORIES:${categories}`);
    lines.push("STATUS:CONFIRMED");
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeText(event.title)}`);
    lines.push("TRIGGER:-PT0M");
    lines.push("END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function icsFilename(projectName: string, today: string): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "inspect-ahead"}-${today}.ics`;
}
