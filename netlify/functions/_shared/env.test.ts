import { describe, expect, it } from "vitest";
import { envGet, envPresent } from "./env";

describe("envGet", () => {
  it("reads from process.env", () => {
    process.env.CLASSIFY_SECRET = "  preview-secret  ";
    expect(envGet("CLASSIFY_SECRET")).toBe("preview-secret");
    delete process.env.CLASSIFY_SECRET;
  });

  it("treats blank as missing", () => {
    process.env.CLASSIFY_SECRET = "   ";
    expect(envGet("CLASSIFY_SECRET")).toBeUndefined();
    delete process.env.CLASSIFY_SECRET;
    expect(envPresent().CLASSIFY_SECRET).toBe(false);
  });
});
