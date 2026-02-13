import { z } from "zod";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  memoryBankExists,
  memoryBankPath,
  writeMemoryBankFile,
  ensureClaudeMdRules,
  TEMPLATES,
  CORE_FILES,
} from "../utils/memory-bank.js";

export const memoryBankInitSchema = {
  projectPath: z.string().describe("Absolute path to the project root"),
  projectName: z.string().optional().describe("Name of the project"),
  techStack: z.string().optional().describe("Technology stack (e.g., 'Next.js, TypeScript, Prisma')"),
  description: z.string().optional().describe("Brief project description"),
};

interface InitResult {
  initialized: boolean;
  message: string;
  createdFiles: string[];
  path: string;
  claudeMd?: {
    created: boolean;
    updated: boolean;
    path: string;
  };
}

export async function executeMemoryBankInit(input: {
  projectPath: string;
  projectName?: string;
  techStack?: string;
  description?: string;
}): Promise<InitResult> {
  const exists = await memoryBankExists(input.projectPath);

  if (exists) {
    // Even if memory bank exists, ensure CLAUDE.md has the workflow rules
    const claudeMdResult = await ensureClaudeMdRules(input.projectPath);

    const claudeMdNote = claudeMdResult.created
      ? " Workflow rules written to .claude/CLAUDE.md."
      : claudeMdResult.updated
        ? " Workflow rules appended to existing .claude/CLAUDE.md."
        : "";

    return {
      initialized: false,
      message: `Memory bank already exists at this location. Use memory_bank_update to modify files, or delete the directory to reinitialize.${claudeMdNote}`,
      createdFiles: [],
      path: memoryBankPath(input.projectPath),
      claudeMd: claudeMdResult,
    };
  }

  const mbPath = memoryBankPath(input.projectPath);
  await mkdir(mbPath, { recursive: true });
  await mkdir(join(mbPath, "features"), { recursive: true });

  const templateOpts = {
    projectName: input.projectName,
    techStack: input.techStack,
    description: input.description,
  };

  const createdFiles: string[] = [];

  for (const fileName of CORE_FILES) {
    const template = TEMPLATES[fileName];
    await writeMemoryBankFile(input.projectPath, fileName, template(templateOpts));
    createdFiles.push(fileName);
  }

  // Write vibe-check workflow rules to .claude/CLAUDE.md
  const claudeMdResult = await ensureClaudeMdRules(input.projectPath);

  const claudeMdNote = claudeMdResult.created
    ? " Workflow rules written to .claude/CLAUDE.md."
    : claudeMdResult.updated
      ? " Workflow rules appended to existing .claude/CLAUDE.md."
      : "";

  return {
    initialized: true,
    message: `Memory bank initialized with ${createdFiles.length} files. Review and fill in the placeholder sections.${claudeMdNote}`,
    createdFiles,
    path: mbPath,
    claudeMd: claudeMdResult,
  };
}
