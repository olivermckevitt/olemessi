import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { slug } from "./text";
import type { DrawingDatabase, ResolvedFact } from "./types";

export async function writeWiki(outputDir: string, db: DrawingDatabase): Promise<void> {
  await mkdir(join(outputDir, "by-type"), { recursive: true });
  await mkdir(join(outputDir, "by-location"), { recursive: true });
  await mkdir(join(outputDir, "drawings"), { recursive: true });

  await writeFile(join(outputDir, "index.md"), renderIndex(db));
  await writeFile(join(outputDir, "_conflicts.md"), renderConflicts(db));
  await writeFile(join(outputDir, "_rejected.md"), renderRejected(db));
  await writeFile(join(outputDir, "database.json"), JSON.stringify(db, null, 2));

  const types = ["dimension", "material", "specification", "symbol", "note"] as const;
  for (const type of types) {
    const facts = db.facts.filter((fact) => fact.type === type);
    await writeFile(join(outputDir, "by-type", `${type}s.md`), renderTypePage(type, facts));
  }

  const locations = group(db.facts, (fact) => fact.location || "Unspecified");
  for (const [location, facts] of locations) {
    await writeFile(join(outputDir, "by-location", `${slug(location) || "unspecified"}.md`), renderLocationPage(location, facts));
  }

  const sheets = group(db.facts, (fact) => fact.sourceSheet);
  for (const [sheet, facts] of sheets) {
    await writeFile(join(outputDir, "drawings", `${slug(sheet) || "unknown"}.md`), renderSheetPage(sheet, facts));
  }
}

function renderIndex(db: DrawingDatabase): string {
  const lines = [
    "# Drawing wiki",
    "",
    `Drawings: ${db.drawingCount}. Facts: ${db.factCount}. Conflicts: ${db.conflictCount}. Rejected: ${db.rejectedCount}.`,
    "",
    "Query `database.json` next time. Do not re-upload PDFs.",
    "",
    "## Conflicts",
    "",
    db.conflictCount > 0 ? "See [_conflicts.md](_conflicts.md)." : "None.",
    "",
    "## Rejected by sanity check",
    "",
    db.rejectedCount > 0 ? "See [_rejected.md](_rejected.md)." : "None.",
    "",
    "## By type",
    "",
    "- [dimensions](by-type/dimensions.md)",
    "- [materials](by-type/materials.md)",
    "- [specifications](by-type/specifications.md)",
    "- [symbols](by-type/symbols.md)",
    "- [notes](by-type/notes.md)",
    "",
  ];
  return lines.join("\n");
}

function renderRejected(db: DrawingDatabase): string {
  const lines = ["# Rejected by sanity check", ""];
  if (db.rejected.length === 0) {
    lines.push("None.");
    return `${lines.join("\n")}\n`;
  }
  for (const item of db.rejected) {
    lines.push(`- ${item.type} ${item.value} (${item.sourceSheet}): ${item.sanityReason}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderConflicts(db: DrawingDatabase): string {
  const lines = ["# Conflicts for manual review", ""];
  if (db.conflicts.length === 0) {
    lines.push("None.");
    return `${lines.join("\n")}\n`;
  }
  for (const conflict of db.conflicts) {
    lines.push(
      `- \`${conflict.key}\`: kept **${conflict.canonicalValue}** from ${conflict.canonicalSheet} (${conflict.canonicalDate || "no date"}) over ${conflict.otherValue} from ${conflict.otherSheet} (${conflict.otherDate || "no date"}).`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function renderTypePage(type: string, facts: ResolvedFact[]): string {
  const lines = [`# ${type}s`, ""];
  if (facts.length === 0) {
    lines.push("None.");
    return `${lines.join("\n")}\n`;
  }
  for (const fact of facts) {
    lines.push(factLine(fact));
  }
  return `${lines.join("\n")}\n`;
}

function renderLocationPage(location: string, facts: ResolvedFact[]): string {
  const lines = [`# ${location}`, ""];
  for (const fact of facts) {
    lines.push(factLine(fact));
  }
  return `${lines.join("\n")}\n`;
}

function renderSheetPage(sheet: string, facts: ResolvedFact[]): string {
  const revision = facts[0]?.revisionDate || "unknown";
  const lines = [`# ${sheet}`, "", `Revision: ${revision}`, ""];
  const notes = facts.filter((fact) => fact.type === "note");
  if (notes.length > 0) {
    lines.push("## Notes", "");
    for (const note of notes) {
      lines.push(`> ${note.value}`);
      lines.push("");
    }
  }
  lines.push("## Facts", "");
  for (const fact of facts.filter((item) => item.type !== "note")) {
    lines.push(factLine(fact));
  }
  return `${lines.join("\n")}\n`;
}

function factLine(fact: ResolvedFact): string {
  const loc = fact.location ? ` @ ${fact.location}` : "";
  const conflict = fact.conflict ? " conflict" : "";
  return `- ${fact.display}${loc} · ${fact.reliability}${conflict} · ${fact.agreeingSheets.join(", ")}`;
}

function group<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
