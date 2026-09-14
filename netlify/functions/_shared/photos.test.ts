import { describe, expect, it } from "vitest";
import { publicPhotoUrl, resolvePublicBaseUrl } from "./photos";

describe("resolvePublicBaseUrl", () => {
  it("prefers the request origin so preview photos stay on the preview host", () => {
    expect(
      resolvePublicBaseUrl({
        requestUrl: "https://deploy-preview-2--superb-halva-c3d71d.netlify.app/api/classify",
        deployPrimeUrl: "https://deploy-preview-2--superb-halva-c3d71d.netlify.app",
        siteUrl: "https://superb-halva-c3d71d.netlify.app",
      }),
    ).toBe("https://deploy-preview-2--superb-halva-c3d71d.netlify.app");
  });

  it("falls back to DEPLOY_PRIME_URL then the production site URL", () => {
    expect(
      resolvePublicBaseUrl({
        deployPrimeUrl: "https://deploy-preview-2--superb-halva-c3d71d.netlify.app",
        siteUrl: "https://superb-halva-c3d71d.netlify.app",
      }),
    ).toBe("https://deploy-preview-2--superb-halva-c3d71d.netlify.app");

    expect(
      resolvePublicBaseUrl({
        siteUrl: "https://superb-halva-c3d71d.netlify.app/",
      }),
    ).toBe("https://superb-halva-c3d71d.netlify.app");
  });
});

describe("publicPhotoUrl", () => {
  it("serves blobs from /uploads", () => {
    expect(publicPhotoUrl("https://example.netlify.app/", "shot.jpg")).toBe(
      "https://example.netlify.app/uploads/shot.jpg",
    );
  });
});
