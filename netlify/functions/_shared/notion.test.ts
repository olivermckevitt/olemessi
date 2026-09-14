import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadNotionFile } from "./notion";

describe("uploadNotionFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a Notion file upload and sends the bytes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "file-upload-id", status: "pending" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "file-upload-id", status: "uploaded" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      uploadNotionFile("secret-token", {
        base64: Buffer.from("jpeg-bytes").toString("base64"),
        mime: "image/jpeg",
        filename: "photo.jpg",
      }),
    ).resolves.toEqual({ id: "file-upload-id" });

    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const createHeaders = new Headers(createInit.headers);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.notion.com/v1/file_uploads");
    expect(createInit.method).toBe("POST");
    expect(createHeaders.get("Authorization")).toBe("Bearer secret-token");
    expect(createHeaders.get("Notion-Version")).toBe("2025-09-03");
    expect(JSON.parse(String(createInit.body))).toEqual({
      filename: "photo.jpg",
      content_type: "image/jpeg",
    });

    const sendInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const sendHeaders = new Headers(sendInit.headers);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.notion.com/v1/file_uploads/file-upload-id/send",
    );
    expect(sendHeaders.get("Authorization")).toBe("Bearer secret-token");
    expect(sendHeaders.get("Content-Type")).toBeNull();
    expect(sendInit.body).toBeInstanceOf(FormData);
  });
});
