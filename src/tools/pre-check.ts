import { z } from "zod";
import { scanProject, type FileInfo } from "../utils/file-scanner.js";
import { relative } from "node:path";
import { getMemoryBankContext, parseRoutesTable } from "../utils/memory-bank.js";

export const preCheckSchema = {
  request: z.string().describe("The user's original request"),
  projectPath: z.string().describe("Absolute path to the project root"),
  proposedFiles: z
    .array(z.string())
    .optional()
    .describe("Files the agent plans to touch (relative or absolute paths)"),
  proposedChanges: z
    .string()
    .optional()
    .describe("Description of planned changes"),
};

type ComplexityRating = "trivial" | "small" | "medium" | "large" | "excessive";

interface RedFlag {
  type: string;
  message: string;
  severity: "warning" | "critical";
}

interface CheckResult {
  id: string;
  category: string;
  description: string;
  passed: boolean;
  message: string;
}

interface PreCheckResult {
  // Contract section (consumed by diff_review)
  requestSummary: string;
  approvedFiles: string[];
  forbiddenFiles: string[];
  allowedNewFiles: string[];
  complexityRating: ComplexityRating;

  // Combined flags
  redFlags: RedFlag[];

  // Sanity checks (only populated when proposedChanges provided)
  checks: CheckResult[];

  // Unified verdict
  score: number;
  passed: boolean;
  recommendation: string;

  // Context
  projectSnapshot: {
    totalFiles: number;
    framework: string | null;
    detectedPatterns: string[];
    hasTests: boolean;
    fileCategories: Record<string, number>;
  };
  memoryBank: {
    exists: boolean;
    projectBrief: string | null;
    techStack: string | null;
    knownRoutes: string[];
    activeScope: string | null;
  };
}

// --- File-level helpers (from scope-lock) ---

function rateComplexity(
  proposedFiles: string[],
  _totalProjectFiles: number
): ComplexityRating {
  const count = proposedFiles.length;
  if (count === 0) return "trivial";
  if (count <= 2) return "small";
  if (count <= 5) return "medium";
  if (count <= 10) return "large";
  return "excessive";
}

function detectRedFlags(
  proposedFiles: string[],
  projectFiles: FileInfo[],
  request: string,
  knownRoutes?: string[]
): RedFlag[] {
  const flags: RedFlag[] = [];
  const requestLower = request.toLowerCase();

  for (const file of proposedFiles) {
    const fileLower = file.toLowerCase();

    // Config file changes
    if (
      fileLower.includes("config") ||
      fileLower === "package.json" ||
      fileLower === "tsconfig.json" ||
      fileLower.startsWith(".")
    ) {
      flags.push({
        type: "config-change",
        message: `Modifying config file: ${file}`,
        severity: "warning",
      });
    }

    // CI/CD changes
    if (
      fileLower.includes(".github/") ||
      fileLower.includes(".gitlab") ||
      fileLower.includes("dockerfile") ||
      fileLower.includes("docker-compose")
    ) {
      flags.push({
        type: "ci-change",
        message: `Modifying CI/deployment file: ${file}`,
        severity: "critical",
      });
    }

    // Migration files
    if (fileLower.includes("migration")) {
      flags.push({
        type: "migration",
        message: `Creating/modifying migration: ${file}`,
        severity: "critical",
      });
    }

    // New route/endpoint when not requested
    if (
      (fileLower.includes("route") || fileLower.includes("api/")) &&
      !requestLower.includes("route") &&
      !requestLower.includes("endpoint") &&
      !requestLower.includes("api")
    ) {
      flags.push({
        type: "unrequested-route",
        message: `Adding/modifying route not mentioned in request: ${file}`,
        severity: "warning",
      });
    }
  }

  // Check for excessive scope
  const existingFilePaths = new Set(projectFiles.map((f) => f.relativePath));
  const newFiles = proposedFiles.filter((f) => !existingFilePaths.has(f));
  if (newFiles.length > 3) {
    flags.push({
      type: "too-many-new-files",
      message: `Creating ${newFiles.length} new files — is this necessary?`,
      severity: "warning",
    });
  }

  // Check for package.json changes (new deps)
  if (proposedFiles.some((f) => f === "package.json")) {
    if (!requestLower.includes("install") && !requestLower.includes("dependency") && !requestLower.includes("package")) {
      flags.push({
        type: "unrequested-dependency",
        message: "Modifying package.json without explicit dependency request",
        severity: "warning",
      });
    }
  }

  // Check route changes against route contract
  if (knownRoutes && knownRoutes.length > 0) {
    for (const file of proposedFiles) {
      const fileLower = file.toLowerCase();
      if (
        (fileLower.includes("route") || fileLower.includes("api/") || fileLower.includes("pages/") || fileLower.includes("app/")) &&
        !requestLower.includes("route") &&
        !requestLower.includes("endpoint") &&
        !requestLower.includes("api") &&
        !requestLower.includes("page")
      ) {
        flags.push({
          type: "route-contract-violation",
          message: `Modifying route file "${file}" — check routes.md contract. Known routes: ${knownRoutes.slice(0, 5).join(", ")}`,
          severity: "warning",
        });
      }
    }
  }

  return flags;
}

// --- Sanity check helpers (from sanity-check) ---

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

function checkScopeAlignment(request: string, proposed: string): CheckResult {
  const requestTokens = new Set(tokenize(request));
  const proposedTokens = tokenize(proposed);

  const scopeExpansionKeywords = [
    "refactor", "restructure", "reorganize", "migrate",
    "upgrade", "rewrite", "optimize", "redesign",
  ];

  const unrequestedExpansions = scopeExpansionKeywords.filter(
    (kw) => proposedTokens.includes(kw) && !requestTokens.has(kw)
  );

  if (unrequestedExpansions.length > 0) {
    return {
      id: "scope-alignment",
      category: "Scope",
      description: "Plan stays within the original request",
      passed: false,
      message: `Proposed changes introduce unrequested scope: ${unrequestedExpansions.join(", ")}`,
    };
  }

  return {
    id: "scope-alignment",
    category: "Scope",
    description: "Plan stays within the original request",
    passed: true,
    message: "Changes appear aligned with request scope",
  };
}

function checkNoUnrequestedFiles(request: string, proposed: string): CheckResult {
  const proposedLower = proposed.toLowerCase();
  const requestLower = request.toLowerCase();

  const newFileIndicators = ["create new", "add new file", "new component", "new module", "new service"];
  const creatingNewFiles = newFileIndicators.some((ind) => proposedLower.includes(ind));

  if (creatingNewFiles && !requestLower.includes("create") && !requestLower.includes("add") && !requestLower.includes("new")) {
    return {
      id: "no-unrequested-files",
      category: "Scope",
      description: "No unrequested files or endpoints",
      passed: false,
      message: "Plan creates new files not explicitly requested",
    };
  }

  return {
    id: "no-unrequested-files",
    category: "Scope",
    description: "No unrequested files or endpoints",
    passed: true,
    message: "No unrequested file creation detected",
  };
}

function checkNoUnrequestedRefactoring(request: string, proposed: string): CheckResult {
  const requestLower = request.toLowerCase();
  const proposedLower = proposed.toLowerCase();

  const refactorTerms = ["refactor", "clean up", "reorganize", "rename", "restructure"];
  const isRefactorRequested = refactorTerms.some((t) => requestLower.includes(t));
  const isRefactorProposed = refactorTerms.some((t) => proposedLower.includes(t));

  if (isRefactorProposed && !isRefactorRequested) {
    return {
      id: "no-unrequested-refactoring",
      category: "Scope",
      description: "No unrequested refactoring",
      passed: false,
      message: "Plan includes refactoring that was not requested",
    };
  }

  return {
    id: "no-unrequested-refactoring",
    category: "Scope",
    description: "No unrequested refactoring",
    passed: true,
    message: "No unrequested refactoring detected",
  };
}

function checkSimplestApproach(proposed: string): CheckResult {
  const proposedLower = proposed.toLowerCase();

  const overEngineeringIndicators = [
    "factory", "abstract", "decorator", "observer pattern",
    "strategy pattern", "dependency injection", "service locator",
    "event bus", "pub/sub", "message queue", "microservice",
  ];

  const found = overEngineeringIndicators.filter((ind) => proposedLower.includes(ind));

  if (found.length > 0) {
    return {
      id: "simplest-approach",
      category: "Complexity",
      description: "Uses the simplest approach possible",
      passed: false,
      message: `Potentially over-engineered patterns detected: ${found.join(", ")}. Are these really necessary?`,
    };
  }

  return {
    id: "simplest-approach",
    category: "Complexity",
    description: "Uses the simplest approach possible",
    passed: true,
    message: "No over-engineering patterns detected",
  };
}

function checkNoUnnecessaryAbstractions(proposed: string): CheckResult {
  const proposedLower = proposed.toLowerCase();

  const abstractionSignals = [
    "base class", "abstract class", "generic wrapper", "utility class",
    "helper class", "manager class", "handler class", "provider pattern",
    "higher-order",
  ];

  const found = abstractionSignals.filter((s) => proposedLower.includes(s));

  if (found.length > 0) {
    return {
      id: "no-unnecessary-abstractions",
      category: "Complexity",
      description: "No unnecessary abstractions, factories, or wrappers",
      passed: false,
      message: `Abstraction patterns detected: ${found.join(", ")}. Consider if direct implementation would suffice.`,
    };
  }

  return {
    id: "no-unnecessary-abstractions",
    category: "Complexity",
    description: "No unnecessary abstractions, factories, or wrappers",
    passed: true,
    message: "No unnecessary abstractions detected",
  };
}

function checkNoUnnecessaryDependencies(proposed: string): CheckResult {
  const proposedLower = proposed.toLowerCase();

  if (
    proposedLower.includes("install") ||
    proposedLower.includes("npm add") ||
    proposedLower.includes("new dependency") ||
    proposedLower.includes("new package")
  ) {
    return {
      id: "no-unnecessary-deps",
      category: "Complexity",
      description: "No unnecessary new dependencies",
      passed: false,
      message: "Plan adds new dependencies. Verify these are essential and can't be done with existing packages or built-in APIs.",
    };
  }

  return {
    id: "no-unnecessary-deps",
    category: "Complexity",
    description: "No unnecessary new dependencies",
    passed: true,
    message: "No new dependencies introduced",
  };
}

function checkNoDuplication(proposed: string): CheckResult {
  const proposedLower = proposed.toLowerCase();

  const duplicationSignals = [
    "similar to existing", "copy of", "duplicate",
    "re-implement", "reimplement", "write our own",
    "custom implementation of",
  ];

  const found = duplicationSignals.filter((s) => proposedLower.includes(s));

  if (found.length > 0) {
    return {
      id: "no-duplication",
      category: "Duplication",
      description: "No duplicating existing utilities or patterns",
      passed: false,
      message: `Potential duplication detected: ${found.join(", ")}. Check if existing code can be reused.`,
    };
  }

  return {
    id: "no-duplication",
    category: "Duplication",
    description: "No duplicating existing utilities or patterns",
    passed: true,
    message: "No duplication concerns detected",
  };
}

function checkPreservesExistingFunctionality(proposed: string): CheckResult {
  const proposedLower = proposed.toLowerCase();

  const breakingSignals = [
    "remove existing", "delete existing", "replace all",
    "completely rewrite", "start from scratch", "breaking change",
    "remove backward", "drop support",
  ];

  const found = breakingSignals.filter((s) => proposedLower.includes(s));

  if (found.length > 0) {
    return {
      id: "preserves-functionality",
      category: "Safety",
      description: "Preserves existing functionality",
      passed: false,
      message: `Potentially destructive changes: ${found.join(", ")}. Ensure existing behavior is preserved.`,
    };
  }

  return {
    id: "preserves-functionality",
    category: "Safety",
    description: "Preserves existing functionality",
    passed: true,
    message: "No destructive changes detected",
  };
}

function checkMentionsTests(proposed: string, hasTests: boolean): CheckResult {
  const proposedLower = proposed.toLowerCase();
  const mentionsTests =
    proposedLower.includes("test") ||
    proposedLower.includes("spec") ||
    proposedLower.includes("verify");

  if (hasTests && !mentionsTests) {
    return {
      id: "mentions-tests",
      category: "Safety",
      description: "Considers testing when modifying code with existing tests",
      passed: false,
      message: "Project has tests but the plan doesn't mention updating or running them",
    };
  }

  return {
    id: "mentions-tests",
    category: "Safety",
    description: "Considers testing when modifying code with existing tests",
    passed: true,
    message: hasTests
      ? "Plan acknowledges testing"
      : "No existing test suite to consider",
  };
}

function checkFollowsConventions(proposed: string, framework: string | null, systemPatterns: string | null): CheckResult {
  const proposedLower = proposed.toLowerCase();

  // Check against documented system patterns from memory bank
  if (systemPatterns) {
    const patternsLower = systemPatterns.toLowerCase();

    const antiPatternSection = patternsLower.match(/## anti-patterns([\s\S]*?)(?=##|$)/);
    if (antiPatternSection) {
      const antiPatternLines = antiPatternSection[1]
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter((l) => l.length > 5);

      for (const antiPattern of antiPatternLines) {
        const keyWords = antiPattern.split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
        const matchCount = keyWords.filter((w) => proposedLower.includes(w)).length;
        if (matchCount >= 2) {
          return {
            id: "follows-conventions",
            category: "Architecture",
            description: "Follows documented project conventions (from memory bank)",
            passed: false,
            message: `Proposed changes may conflict with documented anti-pattern: "${antiPattern.substring(0, 100)}"`,
          };
        }
      }
    }

    return {
      id: "follows-conventions",
      category: "Architecture",
      description: "Follows documented project conventions (from memory bank)",
      passed: true,
      message: "Changes appear consistent with documented system patterns",
    };
  }

  if (!framework) {
    return {
      id: "follows-conventions",
      category: "Architecture",
      description: "Follows existing project conventions",
      passed: true,
      message: "No specific framework conventions to check",
    };
  }

  const antiPatterns: Record<string, string[]> = {
    "Next.js": ["express server", "custom server", "webpack config"],
    React: ["direct dom manipulation", "document.getelementby"],
    Angular: ["jquery", "direct dom"],
    Vue: ["react component", "jsx"],
  };

  const frameworkAntiPatterns = antiPatterns[framework] || [];
  const found = frameworkAntiPatterns.filter((p) => proposedLower.includes(p));

  if (found.length > 0) {
    return {
      id: "follows-conventions",
      category: "Architecture",
      description: "Follows existing project conventions",
      passed: false,
      message: `Potential convention violation for ${framework}: ${found.join(", ")}`,
    };
  }

  return {
    id: "follows-conventions",
    category: "Architecture",
    description: "Follows existing project conventions",
    passed: true,
    message: `Changes appear consistent with ${framework} conventions`,
  };
}

function checkActiveScopeAlignment(proposed: string, activeContext: string | null): CheckResult {
  if (!activeContext) {
    return {
      id: "active-scope-alignment",
      category: "Architecture",
      description: "Aligns with current project priorities (from memory bank)",
      passed: true,
      message: "No active context available to check against",
    };
  }

  const scopeSection = activeContext.match(/## Current scope([\s\S]*?)(?=##|$)/i);
  const prioritiesSection = activeContext.match(/## Current priorities([\s\S]*?)(?=##|$)/i);

  if (!scopeSection && !prioritiesSection) {
    return {
      id: "active-scope-alignment",
      category: "Architecture",
      description: "Aligns with current project priorities (from memory bank)",
      passed: true,
      message: "Active context exists but has no scope/priority sections to check",
    };
  }

  return {
    id: "active-scope-alignment",
    category: "Architecture",
    description: "Aligns with current project priorities (from memory bank)",
    passed: true,
    message: "Active context available — agent should verify proposed changes align with documented priorities",
  };
}

// --- Main execution ---

export async function executePreCheck(input: {
  request: string;
  projectPath: string;
  proposedFiles?: string[];
  proposedChanges?: string;
}): Promise<PreCheckResult> {
  // Single project scan
  const snapshot = await scanProject(input.projectPath);

  const proposed = (input.proposedFiles || []).map((f) =>
    f.startsWith("/") ? relative(input.projectPath, f) : f
  );

  // Single memory bank read (union of what both tools needed)
  const mbContext = await getMemoryBankContext(input.projectPath);
  let knownRoutes: string[] = [];
  let projectBriefSummary: string | null = null;
  let techStackSummary: string | null = null;
  let activeScopeSummary: string | null = null;
  let systemPatterns: string | null = null;
  let activeContext: string | null = null;

  if (mbContext.exists) {
    if (mbContext.routes) {
      const routes = parseRoutesTable(mbContext.routes);
      knownRoutes = routes.map((r) => `${r.method} ${r.route}`);
    }
    projectBriefSummary = mbContext.projectBrief
      ? mbContext.projectBrief.substring(0, 500)
      : null;
    techStackSummary = mbContext.techContext
      ? mbContext.techContext.substring(0, 500)
      : null;
    activeScopeSummary = mbContext.activeContext
      ? mbContext.activeContext.substring(0, 500)
      : null;
    systemPatterns = mbContext.systemPatterns;
    activeContext = mbContext.activeContext;
  }

  // --- File classification (scope_lock logic) ---
  const existingPaths = new Set(snapshot.files.map((f) => f.relativePath));

  const approvedFiles: string[] = [];
  const forbiddenFiles: string[] = [];
  const allowedNewFiles: string[] = [];

  for (const file of proposed) {
    if (existingPaths.has(file)) {
      const fileInfo = snapshot.files.find((f) => f.relativePath === file);
      if (fileInfo?.category === "config" || fileInfo?.category === "migration") {
        forbiddenFiles.push(file);
      } else {
        approvedFiles.push(file);
      }
    } else {
      allowedNewFiles.push(file);
    }
  }

  // Build category counts
  const fileCategories: Record<string, number> = {};
  for (const file of snapshot.files) {
    fileCategories[file.category] = (fileCategories[file.category] || 0) + 1;
  }

  const redFlags = detectRedFlags(proposed, snapshot.files, input.request, knownRoutes);
  const complexityRating = rateComplexity(proposed, snapshot.totalFiles);

  // --- Sanity checks (only when proposedChanges provided) ---
  const checks: CheckResult[] = [];

  if (input.proposedChanges) {
    checks.push(
      checkScopeAlignment(input.request, input.proposedChanges),
      checkNoUnrequestedFiles(input.request, input.proposedChanges),
      checkNoUnrequestedRefactoring(input.request, input.proposedChanges),
      checkSimplestApproach(input.proposedChanges),
      checkNoUnnecessaryAbstractions(input.proposedChanges),
      checkNoUnnecessaryDependencies(input.proposedChanges),
      checkNoDuplication(input.proposedChanges),
      checkPreservesExistingFunctionality(input.proposedChanges),
      checkMentionsTests(input.proposedChanges, snapshot.hasTests),
      checkFollowsConventions(input.proposedChanges, snapshot.framework, systemPatterns),
      checkActiveScopeAlignment(input.proposedChanges, activeContext),
    );
  }

  // --- Unified verdict ---
  const hasCriticalRedFlags = redFlags.some((f) => f.severity === "critical");
  const checksAllPass = checks.length === 0 || checks.every((c) => c.passed);
  const checkPassedCount = checks.filter((c) => c.passed).length;

  let score: number;
  if (checks.length > 0 && proposed.length > 0) {
    // Both file-level and plan-level: weighted combination
    const fileScore = redFlags.length === 0 ? 100 : Math.max(0, 100 - redFlags.length * 15);
    const checkScore = Math.round((checkPassedCount / checks.length) * 100);
    score = Math.round(fileScore * 0.4 + checkScore * 0.6);
  } else if (checks.length > 0) {
    // Plan-level only
    score = Math.round((checkPassedCount / checks.length) * 100);
  } else {
    // File-level only (or neither)
    score = redFlags.length === 0 ? 100 : Math.max(0, 100 - redFlags.length * 15);
  }

  const passed = !hasCriticalRedFlags && checksAllPass;

  let recommendation: string;
  if (passed && score >= 90) {
    recommendation = "Proceed with implementation.";
  } else if (passed) {
    recommendation = `Minor concerns noted. Review red flags before proceeding: ${redFlags.map((f) => f.message).join("; ")}`;
  } else {
    const issues: string[] = [];
    if (hasCriticalRedFlags) {
      issues.push(...redFlags.filter((f) => f.severity === "critical").map((f) => f.message));
    }
    const failedChecks = checks.filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      issues.push(...failedChecks.map((c) => c.message));
    }
    recommendation = `Address before proceeding: ${issues.join("; ")}`;
  }

  return {
    requestSummary: input.request,
    approvedFiles,
    forbiddenFiles,
    allowedNewFiles,
    complexityRating,
    redFlags,
    checks,
    score,
    passed,
    recommendation,
    projectSnapshot: {
      totalFiles: snapshot.totalFiles,
      framework: snapshot.framework,
      detectedPatterns: snapshot.detectedPatterns,
      hasTests: snapshot.hasTests,
      fileCategories,
    },
    memoryBank: {
      exists: mbContext.exists,
      projectBrief: projectBriefSummary,
      techStack: techStackSummary,
      knownRoutes,
      activeScope: activeScopeSummary,
    },
  };
}
