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
    expect(
      parseClassifyRequest("POST", "nope", SECRET, { text: "hello" }),
    ).toEqual({ status: 401, error: "Unauthorized" });
  });

  it("requires trimmed text", () => {
    expect(parseClassifyRequest("POST", SECRET, SECRET, { text: "  " })).toEqual(
      { status: 400, error: "text is required" },
    );
  });

  it("keeps optional project and ignores empty project", () => {
    expect(
      parseClassifyRequest("POST", SECRET, SECRET, {
        text: "paint delivery at 7",
        project: " Store 1184 ",
      }),
    ).toEqual({ text: "paint delivery at 7", project: "Store 1184" });

    expect(
      parseClassifyRequest("POST", SECRET, SECRET, {
        text: "paint delivery at 7",
        project: "  ",
      }),
    ).toEqual({ text: "paint delivery at 7" });
  });
});

describe("parseModelOutput", () => {
  it("reads JSON even if the model wraps it", () => {
    const parsed = parseModelOutput(
      'Here you go\n{"folder":"Contacts","title":"Electrician contact","phone":"555-0100","email":"ed@co.com"}\n',
    );
    expect(parsed).toEqual({
      folder: "Contacts",
      title: "Electrician contact",
      phone: "555-0100",
      email: "ed@co.com",
    });
  });

  it("defaults a missing title", () => {
    const parsed = parseModelOutput('{"folder":"Daily Logs"}');
    expect(parsed.title).toBe("Untitled note");
    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
  });
});
