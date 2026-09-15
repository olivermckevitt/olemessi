import { join } from "node:path";
import { openAiCompactClient } from "./openai-client";
import { formatHitsCompact, loadDatabase, queryDatabase } from "./query";
import { indexDrawings } from "./pipeline";

export function parseArgs(argv: string[]): {
  command: "index" | "query";
  input?: string;
  output?: string;
  db?: string;
  query?: string;
  ai: boolean;
} {
  const args = [...argv];
  let command: "index" | "query" | undefined;
  if (args[0] === "index" || args[0] === "query") {
    command = args.shift() as "index" | "query";
  }

  const flagValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index === -1) {
      return undefined;
    }
    return args[index + 1];
  };

  const input = flagValue("--input");
  const output = flagValue("--output");
  const db = flagValue("--db");
  const ai = args.includes("--ai");
  const query = args
    .filter((item, index) => {
      if (item.startsWith("--") || item === "index" || item === "query") {
        return false;
      }
      const prev = args[index - 1];
      return prev !== "--input" && prev !== "--output" && prev !== "--db";
    })
    .join(" ")
    .trim();

  if (!command) {
    command = input ? "index" : "query";
  }

  return {
    command,
    input,
    output,
    db,
    query: query || undefined,
    ai,
  };
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.command === "query") {
    const dbPath = parsed.db || join(process.cwd(), "wiki", "database.json");
    if (!parsed.query) {
      console.error("Usage: query-drawings --db ./wiki/database.json <search>");
      return 1;
    }
    const db = await loadDatabase(dbPath);
    const hits = queryDatabase(db, parsed.query);
    console.log(formatHitsCompact(hits) || "No matches.");
    return 0;
  }

  if (!parsed.input) {
    console.error("Usage: index-drawings --input ./plans --output ./wiki [--ai]");
    return 1;
  }

  const output = parsed.output || join(process.cwd(), "wiki");
  const result = await indexDrawings({
    input: parsed.input,
    output,
    ai: parsed.ai ? openAiCompactClient() : undefined,
  });

  if (result.database.drawingCount === 0) {
    for (const error of result.errors) {
      console.error(`${error.path}: ${error.error}`);
    }
    console.error("No drawings indexed.");
    return 1;
  }

  console.log(
    [
      `drawings ${result.database.drawingCount}`,
      `facts ${result.database.factCount}`,
      `conflicts ${result.database.conflictCount}`,
      `rejected ${result.database.rejectedCount}`,
      `errors ${result.errors.length}`,
      `db ${join(output, "database.json")}`,
    ].join("\n"),
  );
  return 0;
}

const invoked = process.argv[1]?.replace(/\\/g, "/");
if (invoked?.endsWith("/cli.ts") || invoked?.endsWith("/cli.js")) {
  main().then((code) => process.exit(code));
}
