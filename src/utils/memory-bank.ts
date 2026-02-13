import { readFile, writeFile, mkdir, stat, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export const MEMORY_BANK_DIR = "memory-bank";

export const CORE_FILES = [
  "projectbrief.md",
  "activeContext.md",
  "techContext.md",
  "systemPatterns.md",
  "routes.md",
  "progress.md",
] as const;

export type CoreFileName = (typeof CORE_FILES)[number];

export const VALID_TARGETS = new Set<string>([
  ...CORE_FILES,
  "features",
]);

export interface MemoryBankContext {
  exists: boolean;
  projectBrief: string | null;
  activeContext: string | null;
  techContext: string | null;
  systemPatterns: string | null;
  routes: string | null;
  progress: string | null;
  featureSpecs: string[];
}

// --- Templates ---

export const TEMPLATES: Record<CoreFileName, (opts?: { projectName?: string; techStack?: string; description?: string }) => string> = {
  "projectbrief.md": (opts) => `# Project Brief${opts?.projectName ? ` — ${opts.projectName}` : ""}

**Created**: ${todayDate()}

## What this project is

${opts?.description || "[Describe the project: what it does, who it's for, and why it exists.]"}

## Primary user & audience

[Who is the primary user? What problem does this solve for them?]

## Core product loop

[What is the main workflow or "happy path" through the product?]

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Out of scope

[What is this project explicitly NOT doing?]
`,

  "activeContext.md": () => `# Active Context

**Last updated**: ${todayDate()}

## Current scope

[What pages/features/areas are actively being worked on?]

## Current priorities

1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

## Recent Changes

[Log of recent changes — auto-updated by diff_review]
`,

  "techContext.md": (opts) => `# Tech Context

## Stack

${opts?.techStack || "[List your tech stack: framework, language, database, etc.]"}

## Dependencies

[Key dependencies and their purposes]

## Architecture notes

[High-level architecture decisions, deployment setup, etc.]

## Design system

[UI framework, component library, styling approach]
`,

  "systemPatterns.md": () => `# System Patterns

## Code conventions

[Naming conventions, file organization patterns, import ordering, etc.]

## Architecture patterns

[State management, data fetching, error handling, routing patterns, etc.]

## Anti-patterns

[Things explicitly avoided in this codebase and why]
`,

  "routes.md": () => `# Route Contract

**Last updated**: ${todayDate()}

## Routes

| Route | Method | Auth | Description | Status |
|-------|--------|------|-------------|--------|
| | | | | |

## Route rules

- All new routes must be added to this table before implementation
- Route changes flagged by scope_lock if not in the original request
- Deprecated routes should be marked with status "deprecated"
`,

  "progress.md": () => `# Progress Log

[Cumulative log of completed work — auto-appended by diff_review]

## Completed

| Date | Summary | Files Changed | Compliance Score |
|------|---------|---------------|-----------------|
`,
};

// --- Utility functions ---

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function memoryBankPath(projectPath: string): string {
  return join(projectPath, MEMORY_BANK_DIR);
}

export function memoryBankFilePath(projectPath: string, fileName: string): string {
  return join(projectPath, MEMORY_BANK_DIR, fileName);
}

export async function memoryBankExists(projectPath: string): Promise<boolean> {
  try {
    const s = await stat(memoryBankPath(projectPath));
    return s.isDirectory();
  } catch {
    return false;
  }
}

export async function readMemoryBankFile(
  projectPath: string,
  fileName: string
): Promise<string | null> {
  try {
    const content = await readFile(memoryBankFilePath(projectPath, fileName), "utf-8");
    return content;
  } catch {
    return null;
  }
}

export async function writeMemoryBankFile(
  projectPath: string,
  fileName: string,
  content: string
): Promise<void> {
  const filePath = memoryBankFilePath(projectPath, fileName);
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, "utf-8");
}

export async function appendToMemoryBankFile(
  projectPath: string,
  fileName: string,
  content: string
): Promise<void> {
  const existing = await readMemoryBankFile(projectPath, fileName);
  if (existing) {
    await writeMemoryBankFile(projectPath, fileName, existing.trimEnd() + "\n" + content + "\n");
  } else {
    await writeMemoryBankFile(projectPath, fileName, content);
  }
}

export async function updateActiveContextTimestamp(projectPath: string): Promise<void> {
  const content = await readMemoryBankFile(projectPath, "activeContext.md");
  if (content) {
    const updated = content.replace(
      /\*\*Last updated\*\*:\s*\d{4}-\d{2}-\d{2}/,
      `**Last updated**: ${todayDate()}`
    );
    await writeMemoryBankFile(projectPath, "activeContext.md", updated);
  }
}

export async function getMemoryBankContext(projectPath: string): Promise<MemoryBankContext> {
  const exists = await memoryBankExists(projectPath);
  if (!exists) {
    return {
      exists: false,
      projectBrief: null,
      activeContext: null,
      techContext: null,
      systemPatterns: null,
      routes: null,
      progress: null,
      featureSpecs: [],
    };
  }

  const [projectBrief, activeContext, techContext, systemPatterns, routes, progress] =
    await Promise.all([
      readMemoryBankFile(projectPath, "projectbrief.md"),
      readMemoryBankFile(projectPath, "activeContext.md"),
      readMemoryBankFile(projectPath, "techContext.md"),
      readMemoryBankFile(projectPath, "systemPatterns.md"),
      readMemoryBankFile(projectPath, "routes.md"),
      readMemoryBankFile(projectPath, "progress.md"),
    ]);

  // List feature specs
  let featureSpecs: string[] = [];
  try {
    const featuresDir = join(memoryBankPath(projectPath), "features");
    const entries = await readdir(featuresDir);
    featureSpecs = entries.filter((e) => e.endsWith(".md"));
  } catch {
    // No features directory
  }

  return {
    exists: true,
    projectBrief,
    activeContext,
    techContext,
    systemPatterns,
    routes,
    progress,
    featureSpecs,
  };
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60)
    .replace(/-$/, "");
}

export async function getUniqueSpecPath(
  projectPath: string,
  slug: string
): Promise<string> {
  const featuresDir = join(memoryBankPath(projectPath), "features");
  await mkdir(featuresDir, { recursive: true });

  let candidate = `${slug}.md`;
  let counter = 1;

  while (true) {
    try {
      await stat(join(featuresDir, candidate));
      // File exists, try next
      candidate = `${slug}-${counter}.md`;
      counter++;
    } catch {
      // File doesn't exist, use this name
      return join("features", candidate);
    }
  }
}

// --- CLAUDE.md integration ---

const VIBE_CHECK_MARKER = "<!-- vibe-check-rules -->";

const VIBE_CHECK_RULES = `${VIBE_CHECK_MARKER}
## Vibe Check — Workflow Rules

- At project start, call \`memory_bank_init\` to set up project context
- Before any implementation, call \`pre_check\` to get a change contract
- After coding, call \`diff_review\` to verify compliance
- Use \`spec\` for any new feature — it will ask clarifying questions first
- Use \`memory_bank_read\` to review project context before making changes
- Use \`memory_bank_update\` to keep context current as the project evolves
`;

export async function ensureClaudeMdRules(projectPath: string): Promise<{
  created: boolean;
  updated: boolean;
  path: string;
}> {
  const claudeMdPath = join(projectPath, ".claude", "CLAUDE.md");

  let existing: string | null = null;
  try {
    existing = await readFile(claudeMdPath, "utf-8");
  } catch {
    // File doesn't exist
  }

  // Already has vibe-check rules
  if (existing && existing.includes(VIBE_CHECK_MARKER)) {
    return { created: false, updated: false, path: claudeMdPath };
  }

  await mkdir(dirname(claudeMdPath), { recursive: true });

  if (existing) {
    // Append rules to existing file
    await writeFile(claudeMdPath, existing.trimEnd() + "\n\n" + VIBE_CHECK_RULES, "utf-8");
    return { created: false, updated: true, path: claudeMdPath };
  } else {
    // Create new file
    await writeFile(claudeMdPath, VIBE_CHECK_RULES, "utf-8");
    return { created: true, updated: false, path: claudeMdPath };
  }
}

export function parseRoutesTable(routesContent: string): Array<{
  route: string;
  method: string;
  auth: string;
  description: string;
  status: string;
}> {
  const routes: Array<{
    route: string;
    method: string;
    auth: string;
    description: string;
    status: string;
  }> = [];

  const lines = routesContent.split("\n");
  let inTable = false;

  for (const line of lines) {
    if (line.includes("| Route") && line.includes("| Method")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|---")) {
      continue;
    }
    if (inTable && line.startsWith("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length >= 4 && cells[0].length > 0) {
        routes.push({
          route: cells[0],
          method: cells[1] || "GET",
          auth: cells[2] || "",
          description: cells[3] || "",
          status: cells[4] || "active",
        });
      }
    } else if (inTable && !line.startsWith("|")) {
      inTable = false;
    }
  }

  return routes;
}
