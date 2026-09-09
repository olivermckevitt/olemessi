import { describe, expect, it } from "vitest";
import { addBusinessDays, parseToIsoDate } from "../lib/dates";
import { generateIcs } from "../lib/generate-ics";
import { generateReminders } from "../lib/generate-reminders";
import { detectInspections, parseCsvText, parsePlainTextSchedule } from "../lib/parse-schedule";
import type { DetectedInspection } from "../lib/types";

const SAMPLE_CSV = `Activity ID,Activity Name,Start,Finish,Trade,Type
A1010,Mobilize site,2026-10-05,2026-10-09,GC,Task
A1020,Footing and foundation inspection,2026-10-14,2026-10-14,City,Inspection
A2010,Install windows,2026-11-01,2026-11-08,Glazier,Task
A2040,Framing inspection L1,10/19/2026,10/19/2026,City,Inspection
A3020,Electrical rough-in L1,2026-12-01,2026-12-03,Electrician,Task
`;

describe("parseCsvText", () => {
  it("maps flexible headers and prefers finish dates", () => {
    const activities = parseCsvText(SAMPLE_CSV);
    expect(activities).toHaveLength(5);
    expect(activities[1]?.name).toBe("Footing and foundation inspection");
    expect(activities[1]?.finish).toBe("2026-10-14");
    expect(activities[3]?.finish).toBe("2026-10-19");
  });
});

describe("detectInspections", () => {
  it("keeps inspection milestones and drops regular tasks", () => {
    const inspections = detectInspections(parseCsvText(SAMPLE_CSV));
    const names = inspections.map((row) => row.activity.name);
    expect(names).toContain("Footing and foundation inspection");
    expect(names).toContain("Framing inspection L1");
    expect(names).not.toContain("Mobilize site");
    expect(names).not.toContain("Install windows");
    expect(names).not.toContain("Electrical rough-in L1");
  });

  it("classifies electrical rough-in as electrical even without the word inspection if type says so", () => {
    const inspections = detectInspections(
      parseCsvText(
        `Name,Finish,Type\nElectrical rough-in L1,2026-12-03,Inspection\n`,
      ),
    );
    expect(inspections[0]?.kind).toBe("electrical");
    expect(inspections[0]?.included).toBe(true);
  });
});

describe("parsePlainTextSchedule", () => {
  it("pulls dated inspection lines out of OCR-style text", () => {
    const activities = parsePlainTextSchedule(`
      Weekly Lookahead
      Framing inspection L1  11/19/2026
      ================================
      Electrical rough-in inspection    2026-12-03
      Deliver windows
    `);
    expect(activities.map((row) => row.name)).toEqual([
      "Framing inspection L1",
      "Electrical rough-in inspection",
    ]);
    expect(activities[0]?.finish).toBe("2026-11-19");
  });
});

describe("dates", () => {
  it("parses excel serials and named months", () => {
    expect(parseToIsoDate(45345)).toBe("2024-02-23");
    expect(parseToIsoDate("Mar 12, 2026")).toBe("2026-03-12");
    expect(parseToIsoDate("12 Mar 26")).toBe("2026-03-12");
  });

  it("skips weekends when offsetting business days", () => {
    expect(addBusinessDays("2026-10-14", -5)).toBe("2026-10-07");
    expect(addBusinessDays("2026-10-19", -2)).toBe("2026-10-15");
  });
});

describe("generateReminders", () => {
  const inspection: DetectedInspection = {
    id: "insp-A2040",
    activity: {
      id: "A2040",
      name: "Framing inspection L1",
      start: "2026-11-19",
      finish: "2026-11-19",
      trade: "City",
      type: "Inspection",
      sourceRow: 2,
    },
    kind: "framing",
    date: "2026-11-19",
    included: true,
    confidence: "high",
    reason: "Matched inspection",
  };

  it("builds chase, readiness, and inspection events", () => {
    const events = generateReminders([inspection], {
      chaseBusinessDaysBefore: 5,
      readinessBusinessDaysBefore: 2,
      inspectionHour: 7,
      skipPast: false,
      today: "2026-10-01",
    });
    expect(events.map((event) => event.kind)).toEqual([
      "sub_chase",
      "readiness",
      "inspection",
    ]);
    expect(events[0]?.date).toBe("2026-11-12");
    expect(events[1]?.date).toBe("2026-11-17");
    expect(events[2]?.date).toBe("2026-11-19");
    expect(events[0]?.checklist.length).toBeGreaterThan(2);
    expect(events[0]?.title).toMatch(/^CHASE SUBS:/);
  });

  it("drops events that are already in the past", () => {
    const events = generateReminders([inspection], {
      chaseBusinessDaysBefore: 5,
      readinessBusinessDaysBefore: 2,
      inspectionHour: 7,
      skipPast: true,
      today: "2026-11-18",
    });
    expect(events.map((event) => event.kind)).toEqual(["inspection"]);
  });
});

describe("generateIcs", () => {
  it("writes a valid calendar with floating local times and a checklist", () => {
    const ics = generateIcs(
      [
        {
          id: "insp-A2040-inspection",
          inspectionId: "insp-A2040",
          kind: "inspection",
          title: "INSPECTION: Framing inspection L1",
          date: "2026-11-19",
          hour: 7,
          durationHours: 3,
          checklist: ["Permit posted", "Hold-downs complete"],
          notes: "Inspection day.",
        },
      ],
      "InspectAhead",
      new Date("2026-09-09T12:00:00Z"),
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261119T070000");
    expect(ics).toContain("DTEND:20261119T100000");
    expect(ics).toContain("SUMMARY:INSPECTION: Framing inspection L1");
    expect(ics).toContain("Permit posted");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics.endsWith("\r\n")).toBe(true);
  });
});
