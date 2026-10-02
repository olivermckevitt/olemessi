import { describe, expect, it } from "vitest";
import { reliabilityFromCount, resolveFacts } from "./resolve";
import type { Fact } from "./types";

function fact(overrides: Partial<Fact> & Pick<Fact, "value" | "sourceSheet">): Fact {
  return {
    type: "dimension",
    location: "Level 1 / Grid B-4",
    key: "dimension|level-1-grid-b-4|dr-1-3-0",
    originalLabel: "DR-1",
    sourcePath: `${overrides.sourceSheet}.pdf`,
    revisionDate: "2026-08-01",
    ...overrides,
  };
}

describe("reliabilityFromCount", () => {
  it("maps 1/2/3/4 agreeing sheets", () => {
    expect(reliabilityFromCount(1, false)).toBe("low");
    expect(reliabilityFromCount(2, false)).toBe("medium");
    expect(reliabilityFromCount(3, false)).toBe("high");
    expect(reliabilityFromCount(4, false)).toBe("very high");
  });

  it("caps conflicts at low", () => {
    expect(reliabilityFromCount(4, true)).toBe("low");
  });
});

describe("resolveFacts", () => {
  it("keeps the newest revision when values disagree", () => {
    const { resolved, conflicts } = resolveFacts([
      fact({
        value: "3'-0\"",
        sourceSheet: "A-101",
        revisionDate: "2026-08-01",
        key: "dimension|level-1-grid-b-4|dr-1-width",
      }),
      fact({
        value: "3'-6\"",
        sourceSheet: "A-101",
        revisionDate: "2026-09-01",
        key: "dimension|level-1-grid-b-4|dr-1-width",
      }),
      fact({
        value: "3'-0\"",
        sourceSheet: "A-102",
        revisionDate: "2026-08-15",
        key: "dimension|level-1-grid-b-4|dr-1-width",
      }),
    ]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0].value).toBe("3'-6\"");
    expect(resolved[0].conflict).toBe(true);
    expect(resolved[0].reliability).toBe("low");
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("raises reliability when distinct sheets agree", () => {
    const { resolved, conflicts } = resolveFacts([
      fact({ value: "3'-0\"", sourceSheet: "A-101", key: "dimension|x|y" }),
      fact({ value: "3'-0\"", sourceSheet: "A-102", key: "dimension|x|y" }),
      fact({ value: "3'-0\"", sourceSheet: "A-601", key: "dimension|x|y" }),
      fact({ value: "3'-0\"", sourceSheet: "S-201", key: "dimension|x|y" }),
    ]);

    expect(conflicts).toHaveLength(0);
    expect(resolved[0].reliability).toBe("very high");
    expect(resolved[0].agreeingSheets).toEqual(["A-101", "A-102", "A-601", "S-201"]);
  });

  it("rejects facts that fail sanity instead of storing them", () => {
    const { resolved, rejected } = resolveFacts([
      fact({ value: "900'-0\"", sourceSheet: "A-101", key: "dimension|x|huge" }),
    ]);
    expect(resolved).toHaveLength(0);
    expect(rejected[0].sanityReason).toBe("dimension out of range");
  });
});
