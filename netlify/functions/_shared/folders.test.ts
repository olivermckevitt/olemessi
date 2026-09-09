import { describe, expect, it } from "vitest";
import { contactFields, FALLBACK_FOLDER, normalizeFolder } from "./folders";

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
    expect(
      contactFields("Daily Logs", "555-0100", "bob@gc.com"),
    ).toEqual({});
  });

  it("omits blank values and emails without @", () => {
    expect(contactFields("Contacts", "  ", "not-an-email")).toEqual({});
    expect(contactFields("Contacts", "555-0100", null)).toEqual({
      phone: "555-0100",
    });
  });
});
