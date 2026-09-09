import { describe, expect, it } from "vitest";
import {
  applySkillPolicy,
  contactFields,
  defaultKanbanType,
  FALLBACK_FOLDER,
  normalizeFolder,
  normalizeKanbanType,
  resolveRoute,
} from "./folders";

describe("normalizeFolder", () => {
  it("keeps an exact folder name", () => {
    expect(normalizeFolder("Daily Logs")).toBe("Daily Logs");
    expect(normalizeFolder("to-do list")).toBe("to-do list");
  });

  it("matches folder names case-insensitively", () => {
    expect(normalizeFolder("contacts")).toBe("Contacts");
    expect(normalizeFolder("GENERAL NOTES")).toBe("General Notes");
  });

  it("falls back to General Notes for unknown labels", () => {
    expect(normalizeFolder("Punch")).toBe(FALLBACK_FOLDER);
    expect(normalizeFolder("")).toBe(FALLBACK_FOLDER);
    expect(normalizeFolder(null)).toBe(FALLBACK_FOLDER);
  });
});

describe("kanban types", () => {
  it("maps a folder to the matching kanban type when category is missing", () => {
    expect(defaultKanbanType("RFIs and Field Clarifications")).toBe("RFI / Site Clarification");
    expect(normalizeKanbanType("", "Safety and Inspections")).toBe(
      "Safety Issues and Inspections",
    );
  });

  it("keeps an explicit kanban type", () => {
    expect(
      normalizeKanbanType("Subcontractor Deficiency / Punch List", "Daily Logs"),
    ).toBe("Subcontractor Deficiency / Punch List");
  });
});

describe("resolveRoute", () => {
  it("defaults Lessons Learned onto the knowledge base", () => {
    expect(resolveRoute("Lessons Learned", null, null)).toEqual({
      kanban: false,
      knowledge_base: true,
    });
  });

  it("keeps explicit route flags", () => {
    expect(resolveRoute("Daily Logs", false, true)).toEqual({
      kanban: false,
      knowledge_base: true,
    });
  });
});

describe("contactFields", () => {
  it("keeps phone and email only for Contacts", () => {
    expect(
      contactFields("Contacts", "555-0100", "bob@gc.com"),
    ).toEqual({ phone: "555-0100", email: "bob@gc.com" });
  });

  it("drops contact fields for every other folder", () => {
    expect(
      contactFields("to-do list", "555-0100", "bob@gc.com"),
    ).toEqual({});
  });
});

describe("applySkillPolicy", () => {
  it("clears flags when no skill base was provided", () => {
    expect(
      applySkillPolicy(false, true, "red_flag", "missing fire caulk"),
    ).toEqual({
      red_flag: false,
      alert_status: null,
      skill_assessment: null,
    });
  });

  it("keeps a flag only when a skill base exists", () => {
    expect(
      applySkillPolicy(true, true, "red_flag", "missing fire caulk"),
    ).toEqual({
      red_flag: true,
      alert_status: "red_flag",
      skill_assessment: "missing fire caulk",
    });
  });
});
