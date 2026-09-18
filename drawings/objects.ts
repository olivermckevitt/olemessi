import type { Reliability, ResolvedFact, SymbolCategory } from "./types";

export const OBJECT_KINDS = [
  "footing",
  "slab",
  "column",
  "beam",
  "wall",
  "door",
  "window",
  "conduit",
  "receptacle",
  "switch",
  "lighting",
  "panel",
  "note",
  "spec",
  "unknown",
] as const;

export type ObjectKind = (typeof OBJECT_KINDS)[number];

export const DISCIPLINES = ["architectural", "structural", "electrical", "mechanical", "plumbing"] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const TRADES = ["concrete", "electrical", "mechanical", "architectural"] as const;
export type Trade = (typeof TRADES)[number];

const CATEGORY_KIND: Partial<Record<SymbolCategory, ObjectKind>> = {
  Door: "door",
  Window: "window",
  Wall: "wall",
  Column: "column",
  Beam: "beam",
  Receptacle: "receptacle",
  Switch: "switch",
  Lighting: "lighting",
  Panel: "panel",
  Footing: "footing",
  Slab: "slab",
  Conduit: "conduit",
  Fixture: "spec",
  Valve: "spec",
  Diffuser: "spec",
  Damper: "spec",
};

export type DrawingObject = {
  id: string;
  kind: ObjectKind;
  tag: string;
  location: string | null;
  discipline: Discipline;
  reliability: Reliability;
  conflict: boolean;
  display: string;
  sourceSheet: string;
  attrs: Array<{ name: string; value: string; unit: string | null; precision: "high" | "moderate" }>;
};

export function disciplineFromSheet(sheetId: string): Discipline {
  const prefix = (sheetId.match(/^([A-Z]+)/i)?.[1] || "A").toUpperCase();
  if (prefix === "S") {
    return "structural";
  }
  if (prefix === "E" || prefix === "EL") {
    return "electrical";
  }
  if (prefix === "M" || prefix === "H") {
    return "mechanical";
  }
  if (prefix === "P" || prefix === "PL") {
    return "plumbing";
  }
  return "architectural";
}

export function kindFromFact(fact: ResolvedFact): ObjectKind {
  if (fact.type === "note") {
    return "note";
  }
  if (fact.category && CATEGORY_KIND[fact.category]) {
    return CATEGORY_KIND[fact.category] as ObjectKind;
  }
  const blob = `${fact.originalLabel} ${fact.value}`.toUpperCase();
  if (/\bFTG[-.]?\d|\bF-\d/.test(blob) || blob.includes("FOOTING")) {
    return "footing";
  }
  if (blob.includes("SLAB")) {
    return "slab";
  }
  if (blob.includes("CONDUIT") || /\bCND-/.test(blob)) {
    return "conduit";
  }
  if (fact.type === "specification" || fact.type === "material") {
    return "spec";
  }
  return "unknown";
}

export function tradeFor(kind: ObjectKind, discipline: Discipline): Trade {
  if (kind === "footing" || kind === "slab" || kind === "column" || kind === "beam" || discipline === "structural") {
    return "concrete";
  }
  if (
    kind === "receptacle" ||
    kind === "switch" ||
    kind === "lighting" ||
    kind === "panel" ||
    kind === "conduit" ||
    discipline === "electrical"
  ) {
    return "electrical";
  }
  if (discipline === "mechanical") {
    return "mechanical";
  }
  return "architectural";
}

export function factToObject(fact: ResolvedFact): DrawingObject {
  const kind = kindFromFact(fact);
  const discipline = disciplineFromSheet(fact.sourceSheet);
  const spatial = fact.type === "dimension";
  return {
    id: fact.key,
    kind,
    tag: fact.originalLabel,
    location: fact.location,
    discipline,
    reliability: fact.reliability,
    conflict: fact.conflict,
    display: fact.display,
    sourceSheet: fact.sourceSheet,
    attrs: [
      {
        name: fact.type,
        value: fact.value,
        unit: spatial ? "ft-in" : null,
        precision: spatial ? "moderate" : "high",
      },
    ],
  };
}

export function factsToObjects(facts: ResolvedFact[]): DrawingObject[] {
  return facts.map(factToObject);
}
