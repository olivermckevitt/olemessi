export function envGet(name: string): string | undefined {
  const fromNetlify =
    typeof Netlify !== "undefined" ? Netlify.env.get(name) : undefined;
  const value = fromNetlify || process.env[name];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function classifySecret(): string | undefined {
  return envGet("CLASSIFY_SECRET") ?? envGet("CLASSIFY_KEY");
}

export function envPresent(): {
  CLASSIFY_SECRET: boolean;
  CLASSIFY_KEY: boolean;
  NOTION_TOKEN: boolean;
  NOTION_DATABASE_ID: boolean;
  NOTION_LESSONS_DATABASE_ID: boolean;
} {
  return {
    CLASSIFY_SECRET: Boolean(envGet("CLASSIFY_SECRET")),
    CLASSIFY_KEY: Boolean(envGet("CLASSIFY_KEY")),
    NOTION_TOKEN: Boolean(envGet("NOTION_TOKEN")),
    NOTION_DATABASE_ID: Boolean(envGet("NOTION_DATABASE_ID")),
    NOTION_LESSONS_DATABASE_ID: Boolean(envGet("NOTION_LESSONS_DATABASE_ID")),
  };
}
