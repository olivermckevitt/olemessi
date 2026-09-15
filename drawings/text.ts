export function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[”“]/g, '"')
    .replace(/\s+/g, " ");
}

export function factKey(type: string, location: string | null, name: string): string {
  return [type, slug(location || "unspecified"), slug(name)].join("|");
}

export function clip(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max);
}
