import { describe, expect, it } from "vitest";
import { parseClassifyRequest, parseModelOutput } from "./parse";

const SECRET = "test-secret";

describe("parseClassifyRequest", () => {
  it("rejects non-POST methods", () => {
    expect(
      parseClassifyRequest("GET", SECRET, SECRET, { text: "hello" }),
    ).toEqual({ status: 405, error: "POST only" });
  });

  it("rejects a missing or wrong secret", () => {
    expect(
      parseClassifyRequest("POST", null, SECRET, { text: "hello" }),
    ).toEqual({ status: 401, error: "Unauthorized" });
  });

  it("requires trimmed text", () => {
    expect(parseClassifyRequest("POST", SECRET, SECRET, { text: "  " })).toEqual(
      { status: 400, error: "text is required" },
    );
  });

  it("keeps optional project", () => {
    expect(
      parseClassifyRequest("POST", SECRET, SECRET, {
        text: "paint delivery at 7",
        project: " Store 1184 ",
      }),
    ).toEqual({ text: "paint delivery at 7", project: "Store 1184" });
  });
});

describe("parseModelOutput", () => {
  it("reads the locked JSON schema", () => {
    const parsed = parseModelOutput(`{
      "folder": "Safety and Inspections",
      "category": "Safety Issues and Inspections",
      "title": "Open shaft no rail",
      "location": "Grid B stair",
      "subcontractor_or_trade": "Framing",
      "urgency": "critical",
      "daily_log_summary": "Photo confirms the stair shaft has no guardrail.",
      "route": { "kanban": true, "knowledge_base": true },
      "red_flag": true,
      "alert_status": "red_flag",
      "skill_assessment": "Guardrail missing",
      "phone": null,
      "email": null
    }`);

    expect(parsed.folder).toBe("Safety and Inspections");
    expect(parsed.category).toBe("Safety Issues and Inspections");
    expect(parsed.route).toEqual({ kanban: true, knowledge_base: true });
    expect(parsed.red_flag).toBe(true);
  });

  it("defaults a missing title and null route flags", () => {
    const parsed = parseModelOutput('{"folder":"Daily Logs"}');
    expect(parsed.title).toBe("Untitled note");
    expect(parsed.route).toEqual({ kanban: null, knowledge_base: null });
    expect(parsed.phone).toBeNull();
  });
});
