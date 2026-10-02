import { describe, expect, it } from "vitest";
import { classifySecret, envGet, envPresent } from "./env";

describe("envGet", () => {
  it("reads from process.env", () => {
    process.env.CLASSIFY_SECRET = "  preview-secret  ";
    expect(envGet("CLASSIFY_SECRET")).toBe("preview-secret");
    delete process.env.CLASSIFY_SECRET;
  });

  it("falls back to CLASSIFY_KEY", () => {
    delete process.env.CLASSIFY_SECRET;
    process.env.CLASSIFY_KEY = "preview-key";
    expect(classifySecret()).toBe("preview-key");
    delete process.env.CLASSIFY_KEY;
  });

  it("treats blank as missing", () => {
    process.env.CLASSIFY_SECRET = "   ";
    expect(envGet("CLASSIFY_SECRET")).toBeUndefined();
    delete process.env.CLASSIFY_SECRET;
    expect(envPresent().CLASSIFY_SECRET).toBe(false);
  });
});
