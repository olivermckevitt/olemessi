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

const FOLDER_SET = new Set<string>(FOLDERS);

export function normalizeFolder(raw: string | null | undefined): Folder {
  if (typeof raw !== "string") {
    return FALLBACK_FOLDER;
  }

  const trimmed = raw.trim();
  if (FOLDER_SET.has(trimmed)) {
    return trimmed as Folder;
  }

  const lower = trimmed.toLowerCase();
  for (const folder of FOLDERS) {
    if (folder.toLowerCase() === lower) {
      return folder;
    }
  }

  return FALLBACK_FOLDER;
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

function cleanOptional(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
