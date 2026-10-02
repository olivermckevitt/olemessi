import { checkFact, checkRevisionDate, checkSheetId } from "./sanity";
import { normalizeValue } from "./text";
import type { Conflict, Fact, Reliability, ResolvedFact } from "./types";

export function reliabilityFromCount(agreeing: number, hasConflict: boolean): Reliability {
  if (hasConflict) {
    return "low";
  }
  if (agreeing >= 4) {
    return "very high";
  }
  if (agreeing === 3) {
    return "high";
  }
  if (agreeing === 2) {
    return "medium";
  }
  return "low";
}

export function resolveFacts(facts: Fact[]): {
  resolved: ResolvedFact[];
  conflicts: Conflict[];
  rejected: Array<Fact & { sanityReason: string }>;
} {
  const rejected: Array<Fact & { sanityReason: string }> = [];
  const usable: Fact[] = [];

  for (const fact of facts) {
    const sheet = checkSheetId(fact.sourceSheet);
    const date = checkRevisionDate(fact.revisionDate);
    const body = checkFact(fact);
    if (sheet.status === "fail" || date.status === "fail" || body.status === "fail") {
      rejected.push({
        ...fact,
        sanityReason: body.reason || date.reason || sheet.reason || "failed sanity",
      });
      continue;
    }
    usable.push(fact);
  }

  const groups = new Map<string, Fact[]>();
  for (const fact of usable) {
    const list = groups.get(fact.key) ?? [];
    list.push(fact);
    groups.set(fact.key, list);
  }

  const resolved: ResolvedFact[] = [];
  const conflicts: Conflict[] = [];

  for (const group of groups.values()) {
    group.sort(compareFacts);
    const canonical = group[0];
    const agreeingSheets = [
      ...new Set(
        group.filter((item) => normalizeValue(item.value) === normalizeValue(canonical.value)).map((item) => item.sourceSheet),
      ),
    ];
    const dissenters = group.filter(
      (item) => normalizeValue(item.value) !== normalizeValue(canonical.value),
    );
    const hasConflict = dissenters.length > 0;

    for (const other of dissenters) {
      conflicts.push({
        key: canonical.key,
        canonicalValue: canonical.value,
        canonicalSheet: canonical.sourceSheet,
        canonicalDate: canonical.revisionDate,
        otherValue: other.value,
        otherSheet: other.sourceSheet,
        otherDate: other.revisionDate,
      });
    }

    resolved.push({
      ...canonical,
      reliability: reliabilityFromCount(agreeingSheets.length, hasConflict),
      agreeingSheets,
      conflict: hasConflict,
      sanity: "pass",
      sanityReason: null,
      display: displayFact(canonical),
    });
  }

  resolved.sort((a, b) => a.key.localeCompare(b.key));
  return { resolved, conflicts, rejected };
}

function compareFacts(a: Fact, b: Fact): number {
  const dateA = a.revisionDate || "0000-00-00";
  const dateB = b.revisionDate || "0000-00-00";
  if (dateA !== dateB) {
    return dateB.localeCompare(dateA);
  }
  return a.sourceSheet.localeCompare(b.sourceSheet);
}

function displayFact(fact: Fact): string {
  if (fact.type === "symbol" || fact.type === "note") {
    return fact.value;
  }
  if (fact.originalLabel && fact.originalLabel !== fact.value) {
    return `${fact.value} [${fact.originalLabel}]`;
  }
  return fact.value;
}
