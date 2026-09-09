export type InspectionKind =
  | "foundation"
  | "framing"
  | "electrical"
  | "plumbing"
  | "mechanical"
  | "fire"
  | "insulation"
  | "final"
  | "special"
  | "generic";

export type ReminderKind = "sub_chase" | "readiness" | "inspection";

export type Confidence = "high" | "medium" | "low";

export type ScheduleActivity = {
  id: string;
  name: string;
  start: string | null;
  finish: string | null;
  trade: string | null;
  type: string | null;
  sourceRow: number;
};

export type DetectedInspection = {
  id: string;
  activity: ScheduleActivity;
  kind: InspectionKind;
  date: string;
  included: boolean;
  confidence: Confidence;
  reason: string;
};

export type CalendarEvent = {
  id: string;
  inspectionId: string;
  kind: ReminderKind;
  title: string;
  date: string;
  hour: number;
  durationHours: number;
  checklist: string[];
  notes: string;
};

export type ReminderOptions = {
  chaseBusinessDaysBefore: number;
  readinessBusinessDaysBefore: number;
  inspectionHour: number;
  skipPast: boolean;
  today: string;
};

export const DEFAULT_REMINDER_OPTIONS: ReminderOptions = {
  chaseBusinessDaysBefore: 5,
  readinessBusinessDaysBefore: 2,
  inspectionHour: 7,
  skipPast: true,
  today: "",
};
