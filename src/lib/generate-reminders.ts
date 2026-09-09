import { CHECKLISTS, tradeForKind } from "./checklists";
import { addBusinessDays, isPast } from "./dates";
import type { CalendarEvent, DetectedInspection, ReminderOptions } from "./types";

function eventHour(kind: CalendarEvent["kind"], inspectionHour: number): number {
  if (kind === "sub_chase") return 7;
  if (kind === "readiness") return 6;
  return inspectionHour;
}

export function generateReminders(
  inspections: DetectedInspection[],
  options: ReminderOptions,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const inspection of inspections) {
    if (!inspection.included || !inspection.date) continue;
    const lists = CHECKLISTS[inspection.kind];
    const trade = tradeForKind(inspection.kind, inspection.activity.trade);
    const name = inspection.activity.name;

    const candidates: Array<Omit<CalendarEvent, "id">> = [
      {
        inspectionId: inspection.id,
        kind: "sub_chase",
        title: `CHASE SUBS: ${name}`,
        date: addBusinessDays(inspection.date, -options.chaseBusinessDaysBefore),
        hour: eventHour("sub_chase", options.inspectionHour),
        durationHours: 1,
        checklist: lists.chase,
        notes: `Call ${trade}. You need their reports in hand before the inspector reviews this work on ${inspection.date}.`,
      },
      {
        inspectionId: inspection.id,
        kind: "readiness",
        title: `READY CHECK: ${name}`,
        date: addBusinessDays(inspection.date, -options.readinessBusinessDaysBefore),
        hour: eventHour("readiness", options.inspectionHour),
        durationHours: 2,
        checklist: lists.readiness,
        notes: `Walk the work yourself. If it is not ready, do not call the inspector.`,
      },
      {
        inspectionId: inspection.id,
        kind: "inspection",
        title: `INSPECTION: ${name}`,
        date: inspection.date,
        hour: eventHour("inspection", options.inspectionHour),
        durationHours: 3,
        checklist: lists.inspection,
        notes: `Inspection day. Folder, plans, and the responsible trade stay with you.`,
      },
    ];

    for (const candidate of candidates) {
      if (options.skipPast && options.today && isPast(candidate.date, options.today)) continue;
      events.push({
        ...candidate,
        id: `${inspection.id}-${candidate.kind}`,
      });
    }
  }

  return events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.hour - b.hour;
  });
}
