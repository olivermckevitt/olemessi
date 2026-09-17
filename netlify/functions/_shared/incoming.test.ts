import { describe, expect, it } from "vitest";
import { readPayload, secretFromRequest } from "./incoming";

describe("readPayload", () => {
  it("reads Shortcuts x-www-form-urlencoded bodies", async () => {
    const req = new Request("https://example.com/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "text=framers+on+site&project=Store+1184&secret=test-secret",
    });

    const parsed = await readPayload(req);
    expect(parsed).toEqual({
      ok: true,
      fields: {
        text: "framers on site",
        project: "Store 1184",
        secret: "test-secret",
      },
    });
  });

  it("keeps only text fields and ignores a leftover photo file", async () => {
    const form = new FormData();
    form.set("text", "open shaft");
    form.set("photo", new File(["jpeg-bytes"], "shot.jpg", { type: "image/jpeg" }));

    const parsed = await readPayload(
      new Request("https://example.com/api/classify", { method: "POST", body: form }),
    );

    expect(parsed).toEqual({
      ok: true,
      fields: { text: "open shaft" },
    });
  });
});

describe("secretFromRequest", () => {
  it("falls back to a form secret field", () => {
    const req = new Request("https://example.com/api/classify", { method: "POST" });
    expect(secretFromRequest(req, { secret: "from-form" })).toBe("from-form");
  });

  it("accepts a CLASSIFY_SECRET header from Shortcuts", () => {
    const req = new Request("https://example.com/api/classify", {
      method: "POST",
      headers: { CLASSIFY_SECRET: "from-header" },
    });
    expect(secretFromRequest(req, {})).toBe("from-header");
  });
});
