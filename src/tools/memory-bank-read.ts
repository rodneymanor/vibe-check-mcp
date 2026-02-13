import { z } from "zod";
import {
  memoryBankExists,
  readMemoryBankFile,
  getMemoryBankContext,
  CORE_FILES,
} from "../utils/memory-bank.js";

export const memoryBankReadSchema = {
  projectPath: z.string().describe("Absolute path to the project root"),
  file: z
    .string()
    .describe(
      'Which file to read: "projectbrief.md", "activeContext.md", "techContext.md", "systemPatterns.md", "routes.md", "progress.md", or "all" for a summary of everything'
    ),
};

interface ReadResult {
  found: boolean;
  file: string;
  content: string | null;
  summary?: {
    files: Record<string, { exists: boolean; lineCount: number }>;
    featureSpecs: string[];
  };
}

export async function executeMemoryBankRead(input: {
  projectPath: string;
  file: string;
}): Promise<ReadResult> {
  const exists = await memoryBankExists(input.projectPath);

  if (!exists) {
    return {
      found: false,
      file: input.file,
      content: null,
    };
  }

  if (input.file === "all") {
    const ctx = await getMemoryBankContext(input.projectPath);
    const files: Record<string, { exists: boolean; lineCount: number }> = {};

    const fileContents: Record<string, string | null> = {
      "projectbrief.md": ctx.projectBrief,
      "activeContext.md": ctx.activeContext,
      "techContext.md": ctx.techContext,
      "systemPatterns.md": ctx.systemPatterns,
      "routes.md": ctx.routes,
      "progress.md": ctx.progress,
    };

    for (const [name, content] of Object.entries(fileContents)) {
      files[name] = {
        exists: content !== null,
        lineCount: content ? content.split("\n").length : 0,
      };
    }

    // Build a combined summary
    const sections: string[] = [];
    for (const [name, content] of Object.entries(fileContents)) {
      if (content) {
        sections.push(`--- ${name} ---\n${content}`);
      }
    }

    return {
      found: true,
      file: "all",
      content: sections.join("\n\n"),
      summary: {
        files,
        featureSpecs: ctx.featureSpecs,
      },
    };
  }

  // Validate file target
  const validFiles = new Set<string>([...CORE_FILES]);
  if (!validFiles.has(input.file) && !input.file.startsWith("features/")) {
    return {
      found: false,
      file: input.file,
      content: `Invalid file target: "${input.file}". Valid targets: ${[...CORE_FILES, "features/<name>.md"].join(", ")}, or "all"`,
    };
  }

  const content = await readMemoryBankFile(input.projectPath, input.file);

  return {
    found: content !== null,
    file: input.file,
    content,
  };
}
