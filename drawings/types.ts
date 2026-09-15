export const FACT_TYPES = [
  "dimension",
  "material",
  "specification",
  "symbol",
  "note",
] as const;

export type FactType = (typeof FACT_TYPES)[number];

export const RELIABILITY = ["low", "medium", "high", "very high"] as const;
export type Reliability = (typeof RELIABILITY)[number];

export const SYMBOL_CATEGORIES = [
  "Door",
  "Window",
  "Wall",
  "Column",
  "Beam",
  "Stair",
  "Receptacle",
  "Switch",
  "Lighting",
  "Panel",
  "Fixture",
  "Valve",
  "Diffuser",
  "Damper",
  "Fire extinguisher",
  "Exit",
  "Unknown",
] as const;

export type SymbolCategory = (typeof SYMBOL_CATEGORIES)[number];

export const SANITY = ["pass", "fail"] as const;
export type Sanity = (typeof SANITY)[number];

export type Fact = {
  type: FactType;
  location: string | null;
  key: string;
  value: string;
  originalLabel: string;
  sourceSheet: string;
  sourcePath: string;
  revisionDate: string | null;
  category?: SymbolCategory;
};

export type SanityResult = {
  status: Sanity;
  reason: string | null;
};

export type ResolvedFact = Fact & {
  reliability: Reliability;
  agreeingSheets: string[];
  conflict: boolean;
  sanity: Sanity;
  sanityReason: string | null;
  display: string;
};

export type Conflict = {
  key: string;
  canonicalValue: string;
  canonicalSheet: string;
  canonicalDate: string | null;
  otherValue: string;
  otherSheet: string;
  otherDate: string | null;
};

export type DrawingSource = {
  path: string;
  format: "pdf" | "dxf";
  sheetId: string;
  revisionDate: string | null;
  revisionLabel: string | null;
  rawText: string;
};

export type DrawingDatabase = {
  generatedAt: string;
  drawingCount: number;
  factCount: number;
  conflictCount: number;
  rejectedCount: number;
  drawings: Array<{
    path: string;
    format: "pdf" | "dxf";
    sheetId: string;
    revisionDate: string | null;
  }>;
  facts: ResolvedFact[];
  conflicts: Conflict[];
  rejected: Array<Fact & { sanityReason: string }>;
};
