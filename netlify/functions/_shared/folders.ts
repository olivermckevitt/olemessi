export const FOLDERS = [
  "Contacts",
  "Lessons Learned",
  "Daily Logs",
  "Subcontractor Deficiencies and Punch List",
  "Logistics and Deliveries",
  "RFIs and Field Clarifications",
  "Safety and Inspections",
  "Change Orders",
  "to-do list",
  "General Notes",
] as const;

export type Folder = (typeof FOLDERS)[number];

export const CONTACTS_FOLDER = "Contacts" satisfies Folder;
export const FALLBACK_FOLDER = "General Notes" satisfies Folder;

export const KANBAN_TYPES = [
  "Daily Log / Site Progress",
  "Subcontractor Deficiency / Punch List",
  "RFI / Site Clarification",
  "Safety Issues and Inspections",
] as const;

export type KanbanType = (typeof KANBAN_TYPES)[number];
export const FALLBACK_KANBAN_TYPE = "Daily Log / Site Progress" satisfies KanbanType;

export const URGENCIES = ["low", "medium", "high", "critical"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const FALLBACK_URGENCY = "medium" satisfies Urgency;

const FOLDER_SET = new Set<string>(FOLDERS);
const KANBAN_SET = new Set<string>(KANBAN_TYPES);
const URGENCY_SET = new Set<string>(URGENCIES);

export function normalizeFolder(raw: string | null | undefined): Folder {
  return matchAllowed(raw, FOLDERS, FOLDER_SET, FALLBACK_FOLDER);
}

export function normalizeKanbanType(raw: string | null | undefined, folder: Folder): KanbanType {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (KANBAN_SET.has(trimmed)) {
      return trimmed as KanbanType;
    }

    const lower = trimmed.toLowerCase();
    for (const item of KANBAN_TYPES) {
      if (item.toLowerCase() === lower) {
        return item;
      }
    }
  }

  return defaultKanbanType(folder);
}

export function normalizeUrgency(raw: string | null | undefined): Urgency {
  return matchAllowed(raw, URGENCIES, URGENCY_SET, FALLBACK_URGENCY);
}

export function defaultKanbanType(folder: Folder): KanbanType {
  switch (folder) {
    case "Subcontractor Deficiencies and Punch List":
      return "Subcontractor Deficiency / Punch List";
    case "RFIs and Field Clarifications":
      return "RFI / Site Clarification";
    case "Safety and Inspections":
      return "Safety Issues and Inspections";
    default:
      return FALLBACK_KANBAN_TYPE;
  }
}

export function defaultRoute(folder: Folder): { kanban: boolean; knowledge_base: boolean } {
  return {
    kanban:
      folder !== "Lessons Learned" &&
      folder !== "Contacts" &&
      folder !== "General Notes",
    knowledge_base: folder === "Lessons Learned",
  };
}

export function resolveRoute(
  folder: Folder,
  kanban: boolean | null,
  knowledgeBase: boolean | null,
): { kanban: boolean; knowledge_base: boolean } {
  const fallback = defaultRoute(folder);
  return {
    kanban: kanban ?? fallback.kanban,
    knowledge_base: knowledgeBase ?? fallback.knowledge_base,
  };
}

export function contactFields(
  folder: Folder,
  phone: string | null | undefined,
  email: string | null | undefined,
): { phone?: string; email?: string } {
  if (folder !== CONTACTS_FOLDER) {
    return {};
  }

  const fields: { phone?: string; email?: string } = {};
  const cleanPhone = cleanOptional(phone);
  const cleanEmail = cleanOptional(email);

  if (cleanPhone) {
    fields.phone = cleanPhone;
  }

  if (cleanEmail && cleanEmail.includes("@")) {
    fields.email = cleanEmail;
  }

  return fields;
}

export function applySkillPolicy(
  hasSkillBase: boolean,
  redFlag: boolean,
  alertStatus: string | null,
  assessment: string | null,
): {
  red_flag: boolean;
  alert_status: "red_flag" | null;
  skill_assessment: string | null;
} {
  if (!hasSkillBase) {
    return { red_flag: false, alert_status: null, skill_assessment: null };
  }

  const flagged = redFlag === true;
  return {
    red_flag: flagged,
    alert_status: flagged ? "red_flag" : null,
    skill_assessment: assessment,
  };
}

function matchAllowed<T extends string>(
  raw: string | null | undefined,
  list: readonly T[],
  set: Set<string>,
  fallback: T,
): T {
  if (typeof raw !== "string") {
    return fallback;
  }

  const trimmed = raw.trim();
  if (set.has(trimmed)) {
    return trimmed as T;
  }

  const lower = trimmed.toLowerCase();
  for (const item of list) {
    if (item.toLowerCase() === lower) {
      return item;
    }
  }

  return fallback;
}

function cleanOptional(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
