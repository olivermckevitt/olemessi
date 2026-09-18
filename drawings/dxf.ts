export type DxfExtract = {
  texts: string[];
  inserts: string[];
  dimensions: string[];
};

export function parseDxf(content: string): DxfExtract {
  const texts: string[] = [];
  const inserts: string[] = [];
  const dimensions: string[] = [];
  const lines = content.split(/\r?\n/);
  let entity = "";
  let pendingCode: number | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (pendingCode === null) {
      const code = Number(line);
      pendingCode = Number.isNaN(code) ? null : code;
      continue;
    }

    const code = pendingCode;
    pendingCode = null;
    if (code === 0) {
      entity = line;
      continue;
    }

    if (code === 1 && (entity === "TEXT" || entity === "MTEXT" || entity === "ATTRIB")) {
      texts.push(line.replace(/\\P/g, "\n"));
    } else if (code === 1 && entity === "DIMENSION") {
      if (line) {
        dimensions.push(line);
      }
    } else if (code === 2 && entity === "INSERT") {
      inserts.push(line);
    }
  }

  return { texts, inserts, dimensions };
}

export function dxfToText(content: string): string {
  const parsed = parseDxf(content);
  return [...parsed.texts, ...parsed.dimensions, ...parsed.inserts].join("\n");
}
