import { describe, expect, it, vi } from "vitest";
import { handleClassify } from "./handler";
import { notionPagePayload } from "./notion";
import type { ModelOutput } from "./parse";

const classified: ModelOutput = {
  folder: "Daily Logs",
  category: "Daily Log / Site Progress",
  title: "Framers on site",
  location: "Sales floor",
  subcontractor_or_trade: "Framing",
  urgency: "medium",
  daily_log_summary: "Framers are on the sales floor.",
  route: { kanban: true, knowledge_base: false },
  red_flag: true,
  alert_status: "red_flag",
  skill_assessment: "should not stick without a skill base",
  phone: "555-0100",
  email: "skip@me.com",
};

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

describe("notionPagePayload", () => {
  it("writes kanban metadata and omits contact fields for non-contacts", () => {
    const payload = notionPagePayload("db-id", {
      title: "Paint delivery",
      folder: "Logistics and Deliveries",
      kanbanType: "Daily Log / Site Progress",
      status: "To Do",
      captured: "2026-09-09",
      transcript: "paint shows at 7",
      urgency: "medium",
      summary: "Paint delivery at 7.",
      redFlag: false,
    });

    const properties = payload.properties as Record<string, unknown>;
    expect(properties.Phone).toBeUndefined();
    expect(properties.Photo).toBeUndefined();
    expect(properties.Status).toEqual({ select: { name: "To Do" } });
    expect(properties["Kanban Type"]).toEqual({
      select: { name: "Daily Log / Site Progress" },
    });
  });
});

describe("handleClassify", () => {
  const saveNote = vi.fn(async () => ({ url: "https://notion.so/note" }));
  const saveLesson = vi.fn(async () => ({ url: "https://notion.so/lesson" }));
  const classify = vi.fn(async () => classified);

  const deps = {
    getSecret: () => "secret",
    hasSkillBase: () => false,
    classify,
    saveNote,
    saveLesson,
    today: () => "2026-09-09",
  };

  it("autosaves and returns the locked JSON schema", async () => {
    saveNote.mockClear();
    saveLesson.mockClear();
    const response = await handleClassify(
      request({ text: "framers in today", project: "Store 1184" }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      category: "Daily Log / Site Progress",
      title: "Framers on site",
      location: "Sales floor",
      subcontractor_or_trade: "Framing",
      urgency: "medium",
      daily_log_summary: "Framers are on the sales floor.",
      route: { kanban: true, knowledge_base: false },
      red_flag: false,
      alert_status: null,
      skill_assessment: null,
      url: "https://notion.so/note",
      folder: "Daily Logs",
    });
    expect(saveLesson).not.toHaveBeenCalled();
    expect(saveNote).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "Daily Logs",
        kanbanType: "Daily Log / Site Progress",
        status: "To Do",
        project: "Store 1184",
        redFlag: false,
      }),
    );
  });

  it("duplicates onto Lessons Learned when routed to the knowledge base", async () => {
    saveNote.mockClear();
    saveLesson.mockClear();
    const response = await handleClassify(request({ text: "never stack pallets in the egress" }), {
      ...deps,
      classify: async () => ({
        ...classified,
        folder: "Lessons Learned",
        category: "Safety Issues and Inspections",
        route: { kanban: false, knowledge_base: true },
        red_flag: false,
      }),
    });

    expect(response.status).toBe(200);
    expect(saveLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: "Lessons Learned",
        status: "Logged",
        sourceUrl: "https://notion.so/note",
      }),
    );
    const body = await response.json();
    expect(body.folder).toBe("Lessons Learned");
    expect(body.route.knowledge_base).toBe(true);
  });

  it("returns 401 when the secret does not match", async () => {
    classify.mockClear();
    const response = await handleClassify(request({ text: "hello" }, "wrong"), deps);
    expect(response.status).toBe(401);
    expect(classify).not.toHaveBeenCalled();
  });

  it("ignores leftover photo fields and still files the transcript", async () => {
    saveNote.mockClear();
    classify.mockClear();
    const response = await handleClassify(
      request({
        text: "painters on site",
        image_base64: "not-a-real-photo",
      }),
      deps,
    );

    expect(response.status).toBe(200);
    expect(classify).toHaveBeenCalledWith({ text: "painters on site" });
    expect(saveNote).toHaveBeenCalledWith(
      expect.not.objectContaining({
        photoUrl: expect.anything(),
      }),
    );
  });

  it("returns 502 when Notion save fails", async () => {
    const response = await handleClassify(request({ text: "hello" }), {
      ...deps,
      saveNote: async () => {
        throw new Error("notion down");
      },
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Notion save failed" });
  });
});
