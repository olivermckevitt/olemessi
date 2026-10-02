import type { SymbolCategory } from "./types";

export type MappedSymbol = {
  category: SymbolCategory;
  name: string;
  originalLabel: string;
  display: string;
};

type Rule = {
  pattern: RegExp;
  category: SymbolCategory;
  name: string;
};

const RULES: Rule[] = [
  { pattern: /\bWP-?GFI\b/i, category: "Receptacle", name: "Duplex Receptacle" },
  { pattern: /\bGFI\b/i, category: "Receptacle", name: "Duplex Receptacle" },
  { pattern: /\b(?:DUPLEX|RECEPTACLE|REC(?:EPT)?)\b/i, category: "Receptacle", name: "Duplex Receptacle" },
  { pattern: /\bFTG[-.]?\d+[A-Z]?\b/i, category: "Footing", name: "Footing" },
  { pattern: /\bF[-.]?\d+[A-Z]?\b/i, category: "Footing", name: "Footing" },
  { pattern: /\bCND[-.]?\d+[A-Z]?\b/i, category: "Conduit", name: "Conduit" },
  { pattern: /\bCONDUIT\b/i, category: "Conduit", name: "Conduit" },
  { pattern: /\bSLAB\b/i, category: "Slab", name: "Slab" },
  { pattern: /\bDR[-.]?\d+[A-Z]?\b/i, category: "Door", name: "Door" },
  { pattern: /\bWD[-.]?\d+[A-Z]?\b/i, category: "Window", name: "Window" },
  { pattern: /\bWIN[-.]?\d+[A-Z]?\b/i, category: "Window", name: "Window" },
  { pattern: /\bCOL[-.]?\d+[A-Z]?\b/i, category: "Column", name: "Column" },
  { pattern: /\bBM[-.]?\d+[A-Z]?\b/i, category: "Beam", name: "Beam" },
  { pattern: /\bST[-.]?\d+[A-Z]?\b/i, category: "Stair", name: "Stair" },
  { pattern: /\bSW[-.]?\d+[A-Z]?\b/i, category: "Switch", name: "Switch" },
  { pattern: /\b(?:LT|LGT)[-.]?\d+[A-Z]?\b/i, category: "Lighting", name: "Lighting" },
  { pattern: /\b(?:PNL|LP|PP)[-.]?\d+[A-Z]?\b/i, category: "Panel", name: "Panel" },
  { pattern: /\b(?:WC|LAV|SK|UR)[-.]?\d+[A-Z]?\b/i, category: "Fixture", name: "Fixture" },
  { pattern: /\bVLV[-.]?\d+[A-Z]?\b/i, category: "Valve", name: "Valve" },
  { pattern: /\b(?:CD|SD|VAV)[-.]?\d+[A-Z]?\b/i, category: "Diffuser", name: "Diffuser" },
  { pattern: /\bDMP[-.]?\d+[A-Z]?\b/i, category: "Damper", name: "Damper" },
  { pattern: /\b(?:FEXT|FE)[-.]?\d+[A-Z]?\b/i, category: "Fire extinguisher", name: "Fire extinguisher" },
  { pattern: /\bFDC\b/i, category: "Fire extinguisher", name: "Fire department connection" },
  { pattern: /\bEXIT\b/i, category: "Exit", name: "Exit" },
  { pattern: /\bWALL\b/i, category: "Wall", name: "Wall" },
];

export function mapSymbol(raw: string): MappedSymbol {
  const originalLabel = raw.trim();
  for (const rule of RULES) {
    const match = originalLabel.match(rule.pattern);
    if (match) {
      const label = match[0];
      return {
        category: rule.category,
        name: rule.name,
        originalLabel: label,
        display: `${rule.name} [${label}]`,
      };
    }
  }

  return {
    category: "Unknown",
    name: "Unknown",
    originalLabel,
    display: `Unknown [${originalLabel}]`,
  };
}

export function extractSymbolLabels(text: string): MappedSymbol[] {
  const found = new Map<string, MappedSymbol>();
  for (const rule of RULES) {
    const global = new RegExp(rule.pattern.source, "gi");
    for (const match of text.matchAll(global)) {
      const label = match[0];
      const key = label.toUpperCase();
      if (!found.has(key)) {
        found.set(key, {
          category: rule.category,
          name: rule.name,
          originalLabel: label,
          display: `${rule.name} [${label}]`,
        });
      }
    }
  }

  return [...found.values()].filter((item, _, all) => {
    const label = item.originalLabel.toUpperCase();
    return !all.some(
      (other) =>
        other.originalLabel.toUpperCase() !== label && other.originalLabel.toUpperCase().includes(label),
    );
  });
}
