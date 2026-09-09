import { describe, expect, it, vi } from "vitest";
import { handleClassify } from "./handler";
import { notionPagePayload } from "./notion";

describe("notionPagePayload", () => {
  it("omits phone and email unless they were extracted for Contacts", () => {
    const payload = notionPagePayload("db-id", {
      title: "Paint delivery",
      folder: "Logistics and Deliveries",
      captured: "2026-09-09",
      transcript: "paint shows at 7",
    });

    const properties = payload.properties as Record<string, unknown>;
    expect(properties.Phone).toBeUndefined();
    expect(properties.Email).toBeUndefined();
    expect(properties.Project).toBeUndefined();
    expect(properties.Category).toEqual({
      select: { name: "Logistics and Deliveries" },
    });
  });

  it("adds project, phone, and email when present", () => {
    const payload = notionPagePayload("db-id", {
      title: "Electrician",
      folder: "Contacts",
      project: "Store 1184",
      captured: "2026-09-09",
      transcript: "Ed 555-0100 ed@co.com",
      phone: "555-0100",
      email: "ed@co.com",
    });

    const properties = payload.properties as Record<string, unknown>;
    expect(properties.Project).toEqual({
      rich_text: [{ type: "text", text: { content: "Store 1184" } }],
    });
    expect(properties.Phone).toEqual({ phone_number: "555-0100" });
    expect(properties.Email).toEqual({ email: "ed@co.com" });
  });

  it("splits long transcripts into 2000-character blocks", () => {
    const transcript = "a".repeat(2001);
    const payload = notionPagePayload("db-id", {
      title: "Log",
      folder: "Daily Logs",
      captured: "2026-09-09",
      transcript,
    });

    expect(payload.children).toHaveLength(2);
  });
});

describe("handleClassify", () => {
  const saveNote = vi.fn(async () => ({ url: "https://notion.so/note" }));
  const classify = vi.fn(async () => ({
    folder: "Daily Logs",
    title: "Framers on site",
    phone: "555-0100",
    email: "skip@me.com",
  }));

  function request(body: unknown, secret = "secret") {
    return new Request("https://example.com/api/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Classify-Secret": secret,
      },
      body: JSON.stringify(body),
    });
  }

  it("autosaves and returns folder, title, and url", async () => {
    saveNote.mockClear();
    const response = await handleClassify(request({ text: "framers in today", project: "Store 1184" }), {
      getSecret: () => "secret",
      classify,
      saveNote,
      today: () => "2026-09-09",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      folder: "Daily Logs",
      title: "Framers on site",
      url: "https://notion.so/note",
    });
    expect(saveNote).toHaveBeenCalledWith({
      title: "Framers on site",
      folder: "Daily Logs",
      project: "Store 1184",
      captured: "2026-09-09",
      transcript: "framers in today",
    });
  });

  it("returns 401 when the secret does not match", async () => {
    classify.mockClear();
    const response = await handleClassify(request({ text: "hello" }, "wrong"), {
      getSecret: () => "secret",
      classify,
      saveNote,
      today: () => "2026-09-09",
    });

    expect(response.status).toBe(401);
    expect(classify).not.toHaveBeenCalled();
  });

  it("returns 502 when Notion save fails", async () => {
    const response = await handleClassify(request({ text: "hello" }), {
      getSecret: () => "secret",
      classify,
      saveNote: async () => {
        throw new Error("notion down");
      },
      today: () => "2026-09-09",
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Notion save failed" });
  });
});
