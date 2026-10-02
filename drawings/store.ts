import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type { DrawingObject, ObjectKind } from "./objects";
import type { Conflict, DrawingSource, Fact } from "./types";

const require = createRequire(import.meta.url);
let engine: SqlJsStatic | null = null;

async function sqlEngine(): Promise<SqlJsStatic> {
  if (!engine) {
    engine = await initSqlJs({
      locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`),
    });
  }
  return engine;
}

export type MacroRow = {
  name: string;
  kind: string | null;
  expectedValue: number;
  unit: string;
  sourceSheet: string;
};

export type ValidationRow = {
  macroName: string;
  computed: number;
  expected: number;
  status: "pass" | "fail";
  detail: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sheets (
  sheet_id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  format TEXT NOT NULL,
  discipline TEXT NOT NULL,
  revision_date TEXT,
  scale_text TEXT,
  scale_ratio REAL,
  page_count INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  text_layer TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  tag TEXT NOT NULL,
  location TEXT,
  discipline TEXT NOT NULL,
  reliability TEXT NOT NULL,
  conflict INTEGER NOT NULL DEFAULT 0,
  display TEXT NOT NULL,
  source_sheet TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attrs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  precision TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS refs (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  rel TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS conflicts (
  key TEXT,
  canonical_value TEXT,
  canonical_sheet TEXT,
  other_value TEXT,
  other_sheet TEXT
);
CREATE TABLE IF NOT EXISTS rejected (
  key TEXT,
  value TEXT,
  source_sheet TEXT,
  reason TEXT
);
CREATE TABLE IF NOT EXISTS macros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT,
  expected_value REAL NOT NULL,
  unit TEXT NOT NULL,
  source_sheet TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  macro_name TEXT NOT NULL,
  computed REAL NOT NULL,
  expected REAL NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL
);
`;

export class DrawingStore {
  constructor(private db: Database) {}

  static async create(): Promise<DrawingStore> {
    const SQL = await sqlEngine();
    const store = new DrawingStore(new SQL.Database());
    store.db.run(SCHEMA);
    return store;
  }

  static async open(path: string): Promise<DrawingStore> {
    const SQL = await sqlEngine();
    const bytes = await readFile(path);
    return new DrawingStore(new SQL.Database(bytes));
  }

  async save(path: string): Promise<void> {
    await writeFile(path, Buffer.from(this.db.export()));
  }

  insertSheet(
    source: DrawingSource,
    extras: { discipline: string; scaleText: string | null; scaleRatio: number | null },
  ): void {
    this.db.run(
      `INSERT OR REPLACE INTO sheets (sheet_id, path, format, discipline, revision_date, scale_text, scale_ratio, page_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        source.sheetId,
        source.path,
        source.format,
        extras.discipline,
        source.revisionDate,
        extras.scaleText,
        extras.scaleRatio,
      ],
    );
    this.db.run(`DELETE FROM pages WHERE sheet_id = ?`, [source.sheetId]);
    this.db.run(`INSERT INTO pages (sheet_id, page_number, text_layer) VALUES (?, 1, ?)`, [
      source.sheetId,
      source.rawText,
    ]);
  }

  insertObject(object: DrawingObject): void {
    this.db.run(
      `INSERT OR REPLACE INTO objects (id, kind, tag, location, discipline, reliability, conflict, display, source_sheet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        object.id,
        object.kind,
        object.tag,
        object.location,
        object.discipline,
        object.reliability,
        object.conflict ? 1 : 0,
        object.display,
        object.sourceSheet,
      ],
    );
    this.db.run(`DELETE FROM attrs WHERE object_id = ?`, [object.id]);
    for (const attr of object.attrs) {
      this.db.run(`INSERT INTO attrs (object_id, name, value, unit, precision) VALUES (?, ?, ?, ?, ?)`, [
        object.id,
        attr.name,
        attr.value,
        attr.unit,
        attr.precision,
      ]);
    }
  }

  insertConflicts(conflicts: Conflict[]): void {
    this.db.run(`DELETE FROM conflicts`);
    for (const conflict of conflicts) {
      this.db.run(
        `INSERT INTO conflicts (key, canonical_value, canonical_sheet, other_value, other_sheet) VALUES (?, ?, ?, ?, ?)`,
        [conflict.key, conflict.canonicalValue, conflict.canonicalSheet, conflict.otherValue, conflict.otherSheet],
      );
    }
  }

  insertRejected(rejected: Array<Fact & { sanityReason: string }>): void {
    this.db.run(`DELETE FROM rejected`);
    for (const item of rejected) {
      this.db.run(`INSERT INTO rejected (key, value, source_sheet, reason) VALUES (?, ?, ?, ?)`, [
        item.key,
        item.value,
        item.sourceSheet,
        item.sanityReason,
      ]);
    }
  }

  insertMacro(macro: MacroRow): void {
    this.db.run(
      `INSERT INTO macros (name, kind, expected_value, unit, source_sheet) VALUES (?, ?, ?, ?, ?)`,
      [macro.name, macro.kind, macro.expectedValue, macro.unit, macro.sourceSheet],
    );
  }

  insertValidation(row: ValidationRow): void {
    this.db.run(
      `INSERT INTO validations (macro_name, computed, expected, status, detail) VALUES (?, ?, ?, ?, ?)`,
      [row.macroName, row.computed, row.expected, row.status, row.detail],
    );
  }

  countKind(kind: ObjectKind): number {
    const stmt = this.db.prepare("SELECT COUNT(*) FROM objects WHERE kind = ?");
    stmt.bind([kind]);
    stmt.step();
    const value = Number(stmt.get()[0] ?? 0);
    stmt.free();
    return value;
  }

  listObjects(kind?: ObjectKind): DrawingObject[] {
    const stmt = kind
      ? this.db.prepare(
          "SELECT id, kind, tag, location, discipline, reliability, conflict, display, source_sheet FROM objects WHERE kind = ?",
        )
      : this.db.prepare(
          "SELECT id, kind, tag, location, discipline, reliability, conflict, display, source_sheet FROM objects",
        );
    if (kind) {
      stmt.bind([kind]);
    }
    const rows: unknown[][] = [];
    while (stmt.step()) {
      rows.push(stmt.get());
    }
    stmt.free();
    return rows.map((row) => ({
      id: String(row[0]),
      kind: row[1] as ObjectKind,
      tag: String(row[2]),
      location: row[3] == null ? null : String(row[3]),
      discipline: row[4] as DrawingObject["discipline"],
      reliability: row[5] as DrawingObject["reliability"],
      conflict: Number(row[6]) === 1,
      display: String(row[7]),
      sourceSheet: String(row[8]),
      attrs: [],
    }));
  }

  searchObjects(tokens: string[]): DrawingObject[] {
    const all = this.listObjects();
    if (tokens.length === 0) {
      return [];
    }
    return all
      .map((object) => {
        const haystack = [object.kind, object.tag, object.location ?? "", object.display, object.sourceSheet, object.discipline]
          .join(" ")
          .toLowerCase();
        const score = tokens.filter((token) => haystack.includes(token)).length;
        return { object, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.object);
  }

  searchTextLayer(needle: string): Array<{ sheetId: string; snippet: string }> {
    const result = this.db.exec(`SELECT sheet_id, text_layer FROM pages`);
    const rows = result[0]?.values ?? [];
    const hits: Array<{ sheetId: string; snippet: string }> = [];
    const query = needle.trim();
    if (!query) {
      return hits;
    }
    for (const [sheetId, text] of rows) {
      const body = String(text);
      const index = body.toLowerCase().indexOf(query.toLowerCase());
      if (index >= 0) {
        hits.push({
          sheetId: String(sheetId),
          snippet: body.slice(Math.max(0, index - 40), index + query.length + 40).replace(/\s+/g, " "),
        });
      }
    }
    return hits;
  }

  macros(): MacroRow[] {
    const result = this.db.exec(`SELECT name, kind, expected_value, unit, source_sheet FROM macros`);
    return (result[0]?.values ?? []).map((row) => ({
      name: String(row[0]),
      kind: row[1] == null ? null : String(row[1]),
      expectedValue: Number(row[2]),
      unit: String(row[3]),
      sourceSheet: String(row[4]),
    }));
  }

  validations(): ValidationRow[] {
    const result = this.db.exec(`SELECT macro_name, computed, expected, status, detail FROM validations`);
    return (result[0]?.values ?? []).map((row) => ({
      macroName: String(row[0]),
      computed: Number(row[1]),
      expected: Number(row[2]),
      status: row[3] === "pass" ? "pass" : "fail",
      detail: String(row[4]),
    }));
  }

  sheets(): Array<{
    sheetId: string;
    path: string;
    format: string;
    discipline: string;
    revisionDate: string | null;
    scaleText: string | null;
  }> {
    const result = this.db.exec(
      `SELECT sheet_id, path, format, discipline, revision_date, scale_text FROM sheets ORDER BY sheet_id`,
    );
    return (result[0]?.values ?? []).map((row) => ({
      sheetId: String(row[0]),
      path: String(row[1]),
      format: String(row[2]),
      discipline: String(row[3]),
      revisionDate: row[4] == null ? null : String(row[4]),
      scaleText: row[5] == null ? null : String(row[5]),
    }));
  }

  kindCounts(): Array<{ kind: string; count: number }> {
    const result = this.db.exec(`SELECT kind, COUNT(*) FROM objects GROUP BY kind ORDER BY kind`);
    return (result[0]?.values ?? []).map((row) => ({ kind: String(row[0]), count: Number(row[1]) }));
  }
}
