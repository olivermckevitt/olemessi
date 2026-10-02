import type { Fact, SanityResult } from "./types";
import { toIsoDate } from "./extract";

const MIN_YEAR = 1990;
const MAX_YEAR = new Date().getUTCFullYear() + 2;
const MAX_FEET = 500;
const MAX_MM = 50_000;
const MAX_NOTE = 400;
const MAX_LABEL = 48;

export function checkFact(fact: Fact): SanityResult {
  if (!fact.value.trim()) {
    return fail("empty value");
  }

  if (fact.originalLabel.length > MAX_LABEL) {
    return fail("label too long");
  }

  if (fact.location && fact.location.length > 80) {
    return fail("location too long");
  }

  switch (fact.type) {
    case "dimension":
      return checkDimension(fact.value);
    case "material":
      return checkMaterial(fact.value);
    case "specification":
      return checkSpec(fact.value);
    case "symbol":
      return checkSymbol(fact);
    case "note":
      return checkNote(fact.value);
    default:
      return fail("unknown type");
  }
}

export function checkRevisionDate(iso: string | null): SanityResult {
  if (!iso) {
    return { status: "pass", reason: null };
  }
  const parsed = toIsoDate(iso);
  if (!parsed) {
    return fail("invalid revision date");
  }
  const year = Number(parsed.slice(0, 4));
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return fail("revision date out of range");
  }
  return { status: "pass", reason: null };
}

export function checkSheetId(sheetId: string): SanityResult {
  if (/^(?:FP|EL|PL|FA|A|S|M|E|P|C|L|I|T)-?\d{2,4}[A-Z]?$/i.test(sheetId)) {
    return { status: "pass", reason: null };
  }
  if (/^[A-Z0-9-]{2,24}$/i.test(sheetId)) {
    return { status: "pass", reason: null };
  }
  return fail("invalid sheet id");
}

function checkDimension(value: string): SanityResult {
  const feet = value.match(/^(\d{1,3})'-(\d{1,2})(?:\s+\d+\/\d+)?"$/);
  if (feet) {
    const ft = Number(feet[1]);
    const inches = Number(feet[2]);
    if (ft > MAX_FEET || inches >= 12) {
      return fail("dimension out of range");
    }
    return { status: "pass", reason: null };
  }

  const mm = value.match(/^(\d+(?:\.\d+)?) mm$/);
  if (mm) {
    if (Number(mm[1]) > MAX_MM) {
      return fail("dimension out of range");
    }
    return { status: "pass", reason: null };
  }

  if (/^\d{1,2}(?:\s+\d+\/\d+)?"\s+[A-Z][A-Z-]+$/.test(value)) {
    return { status: "pass", reason: null };
  }

  return fail("dimension did not parse");
}

function checkMaterial(value: string): SanityResult {
  if (/^[A-Z][A-Z0-9 -]{1,40}$/.test(value)) {
    return { status: "pass", reason: null };
  }
  return fail("material token invalid");
}

function checkSpec(value: string): SanityResult {
  if (value.length < 4 || value.length > 80) {
    return fail("specification length");
  }
  return { status: "pass", reason: null };
}

function checkSymbol(fact: Fact): SanityResult {
  if (!fact.value.includes("[") || !fact.value.includes("]")) {
    return fail("symbol missing original label");
  }
  if (!fact.originalLabel.trim()) {
    return fail("symbol label empty");
  }
  if (/[\\$]/.test(fact.originalLabel)) {
    return fail("cad junk label");
  }
  return { status: "pass", reason: null };
}

function checkNote(value: string): SanityResult {
  if (value.length < 12) {
    return fail("note too short");
  }
  if (value.length > MAX_NOTE) {
    return fail("note too long");
  }
  return { status: "pass", reason: null };
}

function fail(reason: string): SanityResult {
  return { status: "fail", reason };
}
