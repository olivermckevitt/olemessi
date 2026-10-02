export type ExtractedMacro = {
  name: string;
  kind: string | null;
  expectedValue: number;
  unit: string;
};

export function parseScale(text: string): { scaleText: string | null; scaleRatio: number | null } {
  const labeled = text.match(/\bSCALE\s+([^\n]+)/i);
  const scaleText = labeled ? labeled[1].trim() : null;
  const imperial = (scaleText || text).match(/(\d+)\s*\/\s*(\d+)\s*"?\s*=\s*1'\s*-?\s*0"?/);
  if (imperial) {
    return {
      scaleText: scaleText || imperial[0],
      scaleRatio: (Number(imperial[2]) / Number(imperial[1])) * 12,
    };
  }
  return { scaleText, scaleRatio: null };
}

export function extractMacros(text: string): ExtractedMacro[] {
  const macros: ExtractedMacro[] = [];
  const footings = text.match(/\bTOTAL\s+(\d+)\s+FOOTINGS\b/i);
  if (footings) {
    macros.push({
      name: "footing_count",
      kind: "footing",
      expectedValue: Number(footings[1]),
      unit: "count",
    });
  }
  const length = text.match(/\bBUILDING LENGTH\s+(\d{1,3})'\s*-\s*(\d{1,2})/i);
  if (length) {
    macros.push({
      name: "building_length_ft",
      kind: "slab",
      expectedValue: Number(length[1]) + Number(length[2]) / 12,
      unit: "ft",
    });
  }
  return macros;
}

export function feetInchesToNumber(value: string): number | null {
  const match = value.match(/^(\d{1,3})'-(\d{1,2})(?:\s+\d+\/\d+)?"$/);
  if (!match) {
    return null;
  }
  return Number(match[1]) + Number(match[2]) / 12;
}
