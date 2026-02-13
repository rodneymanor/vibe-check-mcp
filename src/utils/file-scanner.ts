import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative, basename, extname } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "__pycache__",
  "venv",
  ".venv",
  ".cache",
  ".turbo",
  "coverage",
  ".output",
  ".nuxt",
]);

const MAX_DEPTH = 6;
const SCAN_TIMEOUT_MS = 5000;
const MAX_FILE_SIZE = 100 * 1024; // 100KB
const MAX_LINES_READ = 100;

export interface FileInfo {
  path: string;
  relativePath: string;
  size: number;
  category: FileCategory;
}

export type FileCategory =
  | "route"
  | "test"
  | "config"
  | "entry"
  | "component"
  | "utility"
  | "style"
  | "migration"
  | "type"
  | "other";

export interface ProjectSnapshot {
  files: FileInfo[];
  totalFiles: number;
  framework: string | null;
  detectedPatterns: string[];
  hasTests: boolean;
  hasCI: boolean;
  packageDeps: string[];
}

function classifyFile(relativePath: string): FileCategory {
  const name = basename(relativePath).toLowerCase();
  const ext = extname(relativePath).toLowerCase();
  const parts = relativePath.toLowerCase().split("/");

  // Tests
  if (
    name.includes(".test.") ||
    name.includes(".spec.") ||
    name.startsWith("test") ||
    parts.includes("__tests__") ||
    parts.includes("tests") ||
    parts.includes("test")
  ) {
    return "test";
  }

  // Config files
  if (
    name.startsWith(".") ||
    name === "package.json" ||
    name === "tsconfig.json" ||
    name === "jest.config.ts" ||
    name === "jest.config.js" ||
    name === "vitest.config.ts" ||
    name === "vite.config.ts" ||
    name === "next.config.js" ||
    name === "next.config.mjs" ||
    name === "tailwind.config.js" ||
    name === "tailwind.config.ts" ||
    name === "postcss.config.js" ||
    name === "webpack.config.js" ||
    name === "eslint.config.js" ||
    name === "prettier.config.js" ||
    name.endsWith(".config.ts") ||
    name.endsWith(".config.js") ||
    name.endsWith(".config.mjs")
  ) {
    return "config";
  }

  // Routes
  if (
    parts.includes("routes") ||
    parts.includes("api") ||
    parts.includes("pages") ||
    parts.includes("app") && (name === "page.tsx" || name === "page.jsx" || name === "route.ts" || name === "route.js")
  ) {
    return "route";
  }

  // Entry points
  if (
    name === "index.ts" ||
    name === "index.js" ||
    name === "main.ts" ||
    name === "main.js" ||
    name === "app.ts" ||
    name === "app.js" ||
    name === "server.ts" ||
    name === "server.js"
  ) {
    return "entry";
  }

  // Components
  if (
    parts.includes("components") ||
    parts.includes("ui") ||
    (ext === ".tsx" || ext === ".jsx")
  ) {
    return "component";
  }

  // Styles
  if (ext === ".css" || ext === ".scss" || ext === ".less" || ext === ".sass") {
    return "style";
  }

  // Migrations
  if (parts.includes("migrations") || parts.includes("migrate")) {
    return "migration";
  }

  // Type definitions
  if (name.endsWith(".d.ts") || parts.includes("types") || name === "types.ts") {
    return "type";
  }

  // Utilities
  if (
    parts.includes("utils") ||
    parts.includes("lib") ||
    parts.includes("helpers") ||
    parts.includes("shared")
  ) {
    return "utility";
  }

  return "other";
}

async function walkDir(
  dir: string,
  rootDir: string,
  depth: number,
  deadline: number,
  files: FileInfo[]
): Promise<void> {
  if (depth > MAX_DEPTH || Date.now() > deadline) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (Date.now() > deadline) return;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walkDir(join(dir, entry.name), rootDir, depth + 1, deadline, files);
    } else if (entry.isFile()) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(rootDir, fullPath);
      try {
        const fileStat = await stat(fullPath);
        files.push({
          path: fullPath,
          relativePath: relPath,
          size: fileStat.size,
          category: classifyFile(relPath),
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }
}

function detectFramework(deps: Record<string, string>): string | null {
  const allDeps = Object.keys(deps);
  if (allDeps.includes("next")) return "Next.js";
  if (allDeps.includes("nuxt")) return "Nuxt";
  if (allDeps.includes("@angular/core")) return "Angular";
  if (allDeps.includes("svelte") || allDeps.includes("@sveltejs/kit")) return "SvelteKit";
  if (allDeps.includes("remix") || allDeps.includes("@remix-run/node")) return "Remix";
  if (allDeps.includes("astro")) return "Astro";
  if (allDeps.includes("express")) return "Express";
  if (allDeps.includes("fastify")) return "Fastify";
  if (allDeps.includes("hono")) return "Hono";
  if (allDeps.includes("react")) return "React";
  if (allDeps.includes("vue")) return "Vue";
  if (allDeps.includes("@modelcontextprotocol/sdk")) return "MCP Server";
  return null;
}

export async function scanProject(projectPath: string): Promise<ProjectSnapshot> {
  const deadline = Date.now() + SCAN_TIMEOUT_MS;
  const files: FileInfo[] = [];

  await walkDir(projectPath, projectPath, 0, deadline, files);

  // Read package.json for deps
  let packageDeps: string[] = [];
  let framework: string | null = null;
  try {
    const pkgRaw = await readFile(join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };
    packageDeps = Object.keys(allDeps);
    framework = detectFramework(allDeps);
  } catch {
    // No package.json or invalid
  }

  const categories = files.map((f) => f.category);
  const hasTests = categories.includes("test");
  const hasCI = files.some(
    (f) =>
      f.relativePath.startsWith(".github/") ||
      f.relativePath.startsWith(".gitlab-ci") ||
      f.relativePath.startsWith(".circleci/")
  );

  const detectedPatterns: string[] = [];
  if (files.some((f) => f.relativePath.includes("middleware"))) detectedPatterns.push("middleware");
  if (files.some((f) => f.relativePath.includes("hooks/"))) detectedPatterns.push("custom-hooks");
  if (files.some((f) => f.relativePath.includes("store/"))) detectedPatterns.push("state-management");
  if (files.some((f) => f.relativePath.includes("prisma/"))) detectedPatterns.push("prisma-orm");
  if (files.some((f) => f.relativePath.includes("drizzle/"))) detectedPatterns.push("drizzle-orm");
  if (hasTests) detectedPatterns.push("testing");
  if (hasCI) detectedPatterns.push("ci-cd");

  return {
    files,
    totalFiles: files.length,
    framework,
    detectedPatterns,
    hasTests,
    hasCI,
    packageDeps,
  };
}

export async function getFileSignatures(
  filePaths: string[]
): Promise<Map<string, string[]>> {
  const signatures = new Map<string, string[]>();

  for (const filePath of filePaths) {
    try {
      const fileStat = await stat(filePath);
      if (fileStat.size > MAX_FILE_SIZE) continue;

      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n").slice(0, MAX_LINES_READ);
      const exports: string[] = [];

      for (const line of lines) {
        // Detect exports
        const exportMatch = line.match(
          /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type|enum)\s+(\w+)/
        );
        if (exportMatch) exports.push(exportMatch[1]);

        // Detect route definitions
        const routeMatch = line.match(
          /(?:app|router)\.\s*(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)/
        );
        if (routeMatch) exports.push(`${routeMatch[1].toUpperCase()} ${routeMatch[2]}`);
      }

      if (exports.length > 0) {
        signatures.set(filePath, exports);
      }
    } catch {
      // Skip unreadable files
    }
  }

  return signatures;
}
