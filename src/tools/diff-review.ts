import { z } from "zod";
import {
  getMemoryBankContext,
  parseRoutesTable,
  appendToMemoryBankFile,
  updateActiveContextTimestamp,
  memoryBankExists,
} from "../utils/memory-bank.js";

export const diffReviewSchema = {
  scopeContract: z
    .string()
    .describe("JSON output from a prior pre_check call"),
  changedFiles: z
    .array(z.string())
    .describe("Files actually modified"),
  addedFiles: z
    .array(z.string())
    .optional()
    .describe("Files created"),
  deletedFiles: z
    .array(z.string())
    .optional()
    .describe("Files removed"),
  summary: z.string().describe("What was actually implemented"),
  projectPath: z
    .string()
    .optional()
    .describe("Absolute path to project root — needed for route contract checking and auto-updating memory bank"),
};

interface DiffReviewResult {
  compliant: boolean;
  score: number;
  summary: string;
  inScopeChanges: string[];
  violations: Violation[];
  missingChanges: string[];
  recommendedActions: string[];
  memoryBankUpdated: boolean;
}

interface Violation {
  type: string;
  file: string;
  message: string;
  severity: "warning" | "critical";
}

interface ScopeContract {
  requestSummary: string;
  approvedFiles: string[];
  forbiddenFiles: string[];
  allowedNewFiles: string[];
  complexityRating: string;
  redFlags: Array<{ type: string; message: string; severity: string }>;
  projectSnapshot: {
    totalFiles: number;
    framework: string | null;
    detectedPatterns: string[];
    hasTests: boolean;
    fileCategories: Record<string, number>;
  };
}

function parseScopeContract(raw: string): ScopeContract | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.requestSummary === "string" &&
      Array.isArray(parsed.approvedFiles)
    ) {
      return parsed as ScopeContract;
    }
    return null;
  } catch {
    return null;
  }
}

export async function executeDiffReview(input: {
  scopeContract: string;
  changedFiles: string[];
  addedFiles?: string[];
  deletedFiles?: string[];
  summary: string;
  projectPath?: string;
}): Promise<DiffReviewResult> {
  const contract = parseScopeContract(input.scopeContract);

  if (!contract) {
    return {
      compliant: false,
      score: 0,
      summary: "Could not parse scope contract. Ensure it is valid JSON from a pre_check call.",
      inScopeChanges: [],
      violations: [
        {
          type: "invalid-contract",
          file: "",
          message: "Scope contract is not valid JSON or missing required fields",
          severity: "critical",
        },
      ],
      missingChanges: [],
      recommendedActions: ["Re-run pre_check and provide the output as scopeContract"],
      memoryBankUpdated: false,
    };
  }

  // Read route contract from memory bank if available
  let knownRoutes: string[] = [];
  if (input.projectPath) {
    try {
      const mbContext = await getMemoryBankContext(input.projectPath);
      if (mbContext.exists && mbContext.routes) {
        const routes = parseRoutesTable(mbContext.routes);
        knownRoutes = routes.map((r) => r.route);
      }
    } catch {
      // Memory bank read failed, continue without it
    }
  }

  const approvedSet = new Set(contract.approvedFiles);
  const forbiddenSet = new Set(contract.forbiddenFiles);
  const allowedNewSet = new Set(contract.allowedNewFiles);

  const inScopeChanges: string[] = [];
  const violations: Violation[] = [];
  const addedFiles = input.addedFiles || [];
  const deletedFiles = input.deletedFiles || [];

  // Check changed files against approved list
  for (const file of input.changedFiles) {
    if (approvedSet.has(file)) {
      inScopeChanges.push(file);
    } else if (forbiddenSet.has(file)) {
      violations.push({
        type: "forbidden-file-modified",
        file,
        message: `Modified forbidden file: ${file}`,
        severity: "critical",
      });
    } else {
      violations.push({
        type: "unapproved-change",
        file,
        message: `Modified file not in scope contract: ${file}`,
        severity: "warning",
      });
    }
  }

  // Check added files
  for (const file of addedFiles) {
    if (allowedNewSet.has(file)) {
      inScopeChanges.push(`(new) ${file}`);
    } else {
      violations.push({
        type: "unauthorized-new-file",
        file,
        message: `Created file not pre-approved: ${file}`,
        severity: "warning",
      });
    }
  }

  // Check deleted files
  for (const file of deletedFiles) {
    violations.push({
      type: "file-deleted",
      file,
      message: `Deleted file: ${file}. Verify this was intentional.`,
      severity: "warning",
    });
  }

  // Check route contract violations
  if (knownRoutes.length > 0) {
    const routeFiles = [...input.changedFiles, ...addedFiles].filter(
      (f) =>
        f.toLowerCase().includes("route") ||
        f.toLowerCase().includes("api/") ||
        f.toLowerCase().includes("pages/") ||
        (f.toLowerCase().includes("app/") &&
          (f.endsWith("page.tsx") || f.endsWith("page.jsx") || f.endsWith("route.ts") || f.endsWith("route.js")))
    );

    if (routeFiles.length > 0) {
      const requestLower = contract.requestSummary.toLowerCase();
      if (
        !requestLower.includes("route") &&
        !requestLower.includes("endpoint") &&
        !requestLower.includes("api") &&
        !requestLower.includes("page")
      ) {
        for (const rf of routeFiles) {
          violations.push({
            type: "route-contract-violation",
            file: rf,
            message: `Route file modified/added without route-related request. Check routes.md contract.`,
            severity: "warning",
          });
        }
      }
    }
  }

  // Check for missing approved changes
  const allChangedAndAdded = new Set([...input.changedFiles, ...addedFiles]);
  const missingChanges = contract.approvedFiles.filter(
    (f) => !allChangedAndAdded.has(f)
  );

  // Check for scope drift
  const requestWords = new Set(
    contract.requestSummary.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  );
  const summaryWords = input.summary
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  const newConcepts = summaryWords.filter((w) => !requestWords.has(w));
  const driftRatio = summaryWords.length > 0 ? newConcepts.length / summaryWords.length : 0;

  if (driftRatio > 0.6) {
    violations.push({
      type: "scope-drift",
      file: "",
      message: "Implementation summary introduces many concepts not in original request — possible scope drift",
      severity: "warning",
    });
  }

  // Calculate score
  const totalChecks =
    input.changedFiles.length + addedFiles.length + deletedFiles.length + (missingChanges.length > 0 ? 1 : 0) + 1;
  const failedChecks = violations.length + (missingChanges.length > 0 ? 1 : 0);
  const score = totalChecks > 0 ? Math.max(0, Math.round(((totalChecks - failedChecks) / totalChecks) * 100)) : 100;
  const compliant = violations.filter((v) => v.severity === "critical").length === 0 && score >= 70;

  // Generate recommendations
  const recommendedActions: string[] = [];

  if (violations.some((v) => v.type === "forbidden-file-modified")) {
    recommendedActions.push("Revert changes to forbidden files");
  }
  if (violations.some((v) => v.type === "unapproved-change")) {
    recommendedActions.push("Review unapproved file changes — update scope contract if justified");
  }
  if (violations.some((v) => v.type === "unauthorized-new-file")) {
    recommendedActions.push("Review new files — remove if not necessary");
  }
  if (violations.some((v) => v.type === "route-contract-violation")) {
    recommendedActions.push("Update routes.md if new routes are intentional");
  }
  if (missingChanges.length > 0) {
    recommendedActions.push(`Complete approved changes: ${missingChanges.join(", ")}`);
  }
  if (violations.some((v) => v.type === "scope-drift")) {
    recommendedActions.push("Review implementation for scope creep — remove additions not in original request");
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("Implementation looks good. Ship it!");
  }

  // Build summary
  let summaryText: string;
  if (compliant && violations.length === 0) {
    summaryText = "Implementation fully complies with scope contract.";
  } else if (compliant) {
    summaryText = `Implementation is mostly compliant with ${violations.length} minor issue(s).`;
  } else {
    summaryText = `Implementation has ${violations.length} violation(s) against the scope contract.`;
  }

  // Auto-update memory bank on successful compliance
  let memoryBankUpdated = false;
  if (compliant && input.projectPath) {
    try {
      const hasMb = await memoryBankExists(input.projectPath);
      if (hasMb) {
        const date = new Date().toISOString().split("T")[0];
        const filesChanged = [...input.changedFiles, ...addedFiles].join(", ");
        const summaryShort = input.summary.length > 100 ? input.summary.substring(0, 100) + "..." : input.summary;

        // Append to progress.md
        await appendToMemoryBankFile(
          input.projectPath,
          "progress.md",
          `| ${date} | ${summaryShort} | ${filesChanged} | ${score}/100 |`
        );

        // Append to activeContext.md
        await appendToMemoryBankFile(
          input.projectPath,
          "activeContext.md",
          `\n- **${date}**: Completed — ${summaryShort} (compliance: ${score}/100)`
        );

        await updateActiveContextTimestamp(input.projectPath);
        memoryBankUpdated = true;
      }
    } catch {
      // Memory bank update failed, don't break the review
    }
  }

  return {
    compliant,
    score,
    summary: summaryText,
    inScopeChanges,
    violations,
    missingChanges,
    recommendedActions,
    memoryBankUpdated,
  };
}
