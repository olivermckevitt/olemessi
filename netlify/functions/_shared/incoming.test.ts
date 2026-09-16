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

  it("accepts a photo file field as the image", async () => {
    const form = new FormData();
    form.set("text", "open shaft");
    form.set("photo", new File(["jpeg-bytes"], "shot.jpg", { type: "image/jpeg" }));

    const req = new Request("https://example.com/api/classify", {
      method: "POST",
      body: form,
    });

    const parsed = await readPayload(req);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.fields.text).toBe("open shaft");
      expect(parsed.image?.mime).toBe("image/jpeg");
      expect(parsed.image?.filename).toBe("shot.jpg");
    }
  });

  it("accepts a Shortcuts file even when the form key is not photo", async () => {
    const form = new FormData();
    form.set("text", "painters on site");
    form.set("JPEG", new File(["jpeg-bytes"], "IMG_1234.JPG", { type: "image/jpeg" }));

    const parsed = await readPayload(
      new Request("https://example.com/api/classify", { method: "POST", body: form }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.image?.filename).toBe("IMG_1234.JPG");
    }
  });

  it("accepts a Shortcuts Convert Image file named Resized Image", async () => {
    const form = new FormData();
    form.set("text", "painters on site");
    form.set(
      "Resized Image",
      new File(["jpeg-bytes"], "photo.jpg", { type: "image/jpeg" }),
    );

    const parsed = await readPayload(
      new Request("https://example.com/api/classify", { method: "POST", body: form }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.image?.filename).toBe("photo.jpg");
    }
  });

  it("accepts a form image_base64 field from Shortcuts JSON mistakes", async () => {
    const form = new FormData();
    form.set("text", "painters on site");
    form.set("image_base64", Buffer.from("jpeg-bytes").toString("base64"));
    form.set("image_mime", "image/jpeg");

    const parsed = await readPayload(
      new Request("https://example.com/api/classify", { method: "POST", body: form }),
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.image?.mime).toBe("image/jpeg");
      expect(parsed.image?.filename).toBe("photo.jpg");
    }
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
