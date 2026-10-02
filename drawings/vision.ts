import type { Reliability } from "./types";

export type VisionClient = {
  inspectCrop: (input: { sheetId: string; reason: string }) => Promise<string>;
};

export function isSpatialQuery(query: string): boolean {
  return /\b(length|area|run|distance|how long|sq\.?\s*ft|square feet)\b/i.test(query);
}

export function shouldUseVision(
  query: string,
  sqlHitCount: number,
  lowestReliability: Reliability | null,
): boolean {
  if (!isSpatialQuery(query)) {
    return false;
  }
  if (sqlHitCount > 0 && lowestReliability && lowestReliability !== "low") {
    return false;
  }
  return true;
}
