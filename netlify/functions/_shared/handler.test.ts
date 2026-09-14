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
    expect(properties.Status).toEqual({ select: { name: "To Do" } });
    expect(properties["Kanban Type"]).toEqual({
      select: { name: "Daily Log / Site Progress" },
    });
  });

  it("puts the photo on the page and in the Photo property", () => {
    const payload = notionPagePayload("db-id", {
      title: "Open shaft",
      folder: "Safety and Inspections",
      kanbanType: "Safety Issues and Inspections",
      status: "To Do",
      captured: "2026-09-10",
      transcript: "no rail",
      urgency: "high",
      summary: "Open shaft, no rail.",
      redFlag: false,
      photoUrl: "https://example.com/uploads/shot.jpg",
      photoName: "shot.jpg",
    });

    const properties = payload.properties as Record<string, unknown>;
    expect(properties.Photo).toEqual({
      files: [
        {
          name: "shot.jpg",
          type: "external",
          external: { url: "https://example.com/uploads/shot.jpg" },
        },
      ],
    });
    expect(payload.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          image: {
            type: "external",
            external: { url: "https://example.com/uploads/shot.jpg" },
          },
        }),
      ]),
    );
  });

  it("attaches a Notion file upload so the photo renders in Notion", () => {
    const payload = notionPagePayload("db-id", {
      title: "Painters on Site",
      folder: "Daily Logs",
      kanbanType: "Daily Log / Site Progress",
      status: "To Do",
      captured: "2026-09-14",
      transcript: "Painters on site",
      urgency: "medium",
      summary: "Painters were present on site today.",
      redFlag: false,
      photoFileId: "file-upload-id",
      photoName: "photo.jpg",
    });

    const properties = payload.properties as Record<string, unknown>;
    expect(properties.Photo).toEqual({
      files: [
        {
          name: "photo.jpg",
          type: "file_upload",
          file_upload: { id: "file-upload-id" },
        },
      ],
    });
    expect(payload.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image",
          image: {
            type: "file_upload",
            file_upload: { id: "file-upload-id" },
          },
        }),
      ]),
    );
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

  it("attaches a stored photo URL to the Notion note", async () => {
    saveNote.mockClear();
    const storePhoto = vi.fn(async () => ({ url: "https://preview.example/uploads/shot.jpg" }));

    const form = new FormData();
    form.set("text", "painter bucket on the floor");
    form.set("photo", new File(["jpeg-bytes"], "shot.jpg", { type: "image/jpeg" }));

    const response = await handleClassify(
      new Request("https://example.com/api/classify", {
        method: "POST",
        headers: { "X-Classify-Secret": "secret" },
        body: form,
      }),
      { ...deps, storePhoto },
    );

    expect(response.status).toBe(200);
    expect(storePhoto).toHaveBeenCalled();
    expect(saveNote).toHaveBeenCalledWith(
      expect.objectContaining({
        photoUrl: "https://preview.example/uploads/shot.jpg",
        photoName: "shot.jpg",
      }),
    );
  });

  it("attaches a Notion-hosted photo when storePhoto returns a file id", async () => {
    saveNote.mockClear();
    const storePhoto = vi.fn(async () => ({ fileId: "file-upload-id" }));

    const form = new FormData();
    form.set("text", "painters on site");
    form.set("JPEG", new File(["jpeg-bytes"], "photo.jpg", { type: "image/jpeg" }));

    const response = await handleClassify(
      new Request("https://example.com/api/classify", {
        method: "POST",
        headers: { "X-Classify-Secret": "secret" },
        body: form,
      }),
      { ...deps, storePhoto },
    );

    expect(response.status).toBe(200);
    expect(saveNote).toHaveBeenCalledWith(
      expect.objectContaining({
        photoFileId: "file-upload-id",
        photoName: "photo.jpg",
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
