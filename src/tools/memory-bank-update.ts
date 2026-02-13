import { z } from "zod";
import {
  memoryBankExists,
  readMemoryBankFile,
  writeMemoryBankFile,
  appendToMemoryBankFile,
  updateActiveContextTimestamp,
  CORE_FILES,
} from "../utils/memory-bank.js";

export const memoryBankUpdateSchema = {
  projectPath: z.string().describe("Absolute path to the project root"),
  file: z
    .string()
    .describe(
      'Which file to update: "projectbrief.md", "activeContext.md", "techContext.md", "systemPatterns.md", "routes.md", "progress.md", or "features/<slug>.md"'
    ),
  content: z.string().describe("The content to write"),
  mode: z
    .enum(["replace", "append"])
    .optional()
    .describe('Write mode: "replace" overwrites the file, "append" adds to the end. Defaults to "replace".'),
};

interface UpdateResult {
  updated: boolean;
  message: string;
  file: string;
}

export async function executeMemoryBankUpdate(input: {
  projectPath: string;
  file: string;
  content: string;
  mode?: "replace" | "append";
}): Promise<UpdateResult> {
  const exists = await memoryBankExists(input.projectPath);

  if (!exists) {
    return {
      updated: false,
      message: "Memory bank does not exist. Run memory_bank_init first.",
      file: input.file,
    };
  }

  // Validate file target
  const validFiles = new Set<string>([...CORE_FILES]);
  const isFeatureFile = input.file.startsWith("features/") && input.file.endsWith(".md");

  if (!validFiles.has(input.file) && !isFeatureFile) {
    return {
      updated: false,
      message: `Invalid file target: "${input.file}". Valid targets: ${[...CORE_FILES, "features/<slug>.md"].join(", ")}`,
      file: input.file,
    };
  }

  const mode = input.mode || "replace";

  if (mode === "append") {
    await appendToMemoryBankFile(input.projectPath, input.file, input.content);
  } else {
    await writeMemoryBankFile(input.projectPath, input.file, input.content);
  }

  // Update activeContext timestamp if we're not already updating activeContext
  if (input.file !== "activeContext.md") {
    await updateActiveContextTimestamp(input.projectPath);
  }

  return {
    updated: true,
    message: `Successfully ${mode === "append" ? "appended to" : "updated"} ${input.file}`,
    file: input.file,
  };
}
