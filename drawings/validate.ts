import { feetInchesToNumber } from "./macros";
import type { DrawingStore, ValidationRow } from "./store";

export function runMacroValidations(store: DrawingStore): ValidationRow[] {
  const rows: ValidationRow[] = [];
  for (const macro of store.macros()) {
    if (macro.name === "footing_count") {
      const computed = store.countKind("footing");
      rows.push(compare(macro.name, computed, macro.expectedValue, "footing count vs schedule"));
    }
    if (macro.name === "building_length_ft") {
      const computed = maxLinearFeet(store);
      rows.push(compare(macro.name, computed, macro.expectedValue, "longest linear dim vs building length"));
    }
  }
  for (const row of rows) {
    store.insertValidation(row);
  }
  return rows;
}

function compare(name: string, computed: number, expected: number, detail: string): ValidationRow {
  const pass = Math.abs(computed - expected) < 0.05;
  return {
    macroName: name,
    computed,
    expected,
    status: pass ? "pass" : "fail",
    detail: `${detail}: computed ${computed}, expected ${expected}`,
  };
}

function maxLinearFeet(store: DrawingStore): number {
  let max = 0;
  for (const object of store.listObjects()) {
    for (const raw of [object.display, object.tag]) {
      const match = raw.match(/(\d{1,3})'-(\d{1,2})"?/);
      if (!match) {
        continue;
      }
      const feet = feetInchesToNumber(`${match[1]}'-${match[2]}"`);
      if (feet != null && feet > max) {
        max = feet;
      }
    }
  }
  return max;
}
