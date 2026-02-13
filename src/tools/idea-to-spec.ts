import { z } from "zod";
import {
  memoryBankExists,
  getMemoryBankContext,
  writeMemoryBankFile,
  appendToMemoryBankFile,
  updateActiveContextTimestamp,
  generateSlug,
  getUniqueSpecPath,
  memoryBankFilePath,
} from "../utils/memory-bank.js";

export const specSchema = {
  idea: z.string().describe("The raw concept or idea"),
  constraints: z
    .array(z.string())
    .optional()
    .describe("Known constraints (e.g., 'must use existing auth', 'no new dependencies')"),
  techStack: z
    .string()
    .optional()
    .describe("Technology stack (e.g., 'Next.js, TypeScript, Prisma')"),
  projectPath: z
    .string()
    .optional()
    .describe("Absolute path to project root — needed to write spec files and read memory bank"),
  answers: z
    .object({
      who: z.string().optional(),
      problem: z.string().optional(),
      success: z.string().optional(),
      scope: z.string().optional(),
      patterns: z.string().optional(),
      edgeCases: z.string().optional(),
    })
    .optional()
    .describe("Answers to clarifying questions from phase 1. Provide this on the second call to generate the full spec."),
};

interface Phase1Result {
  mode: "PLANNING";
  phase: "questions";
  modeInstructions: string;
  questions: Array<{
    id: string;
    category: string;
    question: string;
  }>;
  ideaSummary: string;
}

interface FileChange {
  path: string;
  action: "create" | "modify" | "delete";
  description: string;
  codeChanges: string[];
}

interface Phase2Result {
  mode: "PLANNING";
  phase: "spec";
  modeInstructions: string;
  spec: {
    problemStatement: string;
    userStories: Array<{
      title: string;
      asA: string;
      iWant: string;
      soThat: string;
      acceptanceCriteria: string[];
    }>;
    inScope: string[];
    outOfScope: string[];
    technicalConsiderations: string[];
    edgeCases: Array<{
      scenario: string;
      expectedBehavior: string;
    }>;
    fileChanges: FileChange[];
    actionPlan: Array<{
      step: number;
      description: string;
      files: string[];
    }>;
    suggestedStructure: string[];
  };
  specFile: string | null;
  memoryBankUpdated: boolean;
}

type IdeaToSpecResult = Phase1Result | Phase2Result;

const TECH_STACK_STRUCTURES: Record<string, string[]> = {
  "next.js": ["src/app/", "src/app/api/", "src/components/", "src/lib/", "src/types/"],
  nextjs: ["src/app/", "src/app/api/", "src/components/", "src/lib/", "src/types/"],
  react: ["src/components/", "src/hooks/", "src/utils/", "src/types/"],
  express: ["src/routes/", "src/middleware/", "src/controllers/", "src/utils/", "src/types/"],
  fastify: ["src/routes/", "src/plugins/", "src/schemas/", "src/utils/"],
  svelte: ["src/routes/", "src/lib/", "src/lib/components/", "src/lib/utils/"],
  sveltekit: ["src/routes/", "src/lib/", "src/lib/components/", "src/lib/server/"],
  vue: ["src/components/", "src/composables/", "src/stores/", "src/utils/", "src/types/"],
  nuxt: ["components/", "composables/", "server/api/", "pages/", "utils/"],
  mcp: ["src/", "src/tools/", "src/utils/"],
  default: ["src/", "src/utils/", "src/types/"],
};

function detectTechStructure(techStack: string | undefined): string[] {
  if (!techStack) return TECH_STACK_STRUCTURES.default;
  const stackLower = techStack.toLowerCase();
  for (const [key, structure] of Object.entries(TECH_STACK_STRUCTURES)) {
    if (stackLower.includes(key)) return structure;
  }
  return TECH_STACK_STRUCTURES.default;
}

function extractFeatures(idea: string): string[] {
  const sentences = idea
    .split(/[.!?;]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const features: string[] = [];
  const featurePatterns = [
    /(?:should|must|will|can|need to|wants? to)\s+(.+)/i,
    /(?:allow|enable|let|support|provide|display|show|create|generate|build|send|track|manage)\s+(.+)/i,
    /(?:a|the)\s+(?:way|ability|option|feature)\s+to\s+(.+)/i,
  ];

  for (const sentence of sentences) {
    let matched = false;
    for (const pattern of featurePatterns) {
      if (sentence.match(pattern)) {
        features.push(sentence);
        matched = true;
        break;
      }
    }
    if (!matched && sentences.length <= 3) {
      features.push(sentence);
    }
  }

  if (features.length === 0) features.push(idea);
  return features;
}

function buildUserStories(
  idea: string,
  answers: NonNullable<Parameters<typeof executeSpec>[0]["answers"]>
): Phase2Result["spec"]["userStories"] {
  const stories: Phase2Result["spec"]["userStories"] = [];
  const features = extractFeatures(idea);
  const who = answers.who || "a user";
  const mvpFeatures = features.slice(0, 5);

  for (let i = 0; i < mvpFeatures.length; i++) {
    const feature = mvpFeatures[i];
    const featureShort = feature.length > 60 ? feature.substring(0, 60) + "..." : feature;

    stories.push({
      title: `Story ${i + 1}: ${featureShort}`,
      asA: who,
      iWant: feature.toLowerCase().startsWith("i want") ? feature : `to ${feature.toLowerCase()}`,
      soThat: answers.success || "I can accomplish my goal efficiently",
      acceptanceCriteria: [
        `Feature works as described: ${featureShort}`,
        "No errors in console or UI",
        "Follows existing project conventions",
        ...(answers.edgeCases ? [`Edge case handled: ${answers.edgeCases}`] : []),
      ],
    });
  }

  return stories;
}

function buildEdgeCases(
  answers: NonNullable<Parameters<typeof executeSpec>[0]["answers"]>
): Phase2Result["spec"]["edgeCases"] {
  const cases: Phase2Result["spec"]["edgeCases"] = [
    { scenario: "Empty state / no data", expectedBehavior: "Show helpful empty state, not blank screen" },
    { scenario: "Network error / timeout", expectedBehavior: "Show error message, allow retry" },
    { scenario: "Invalid input", expectedBehavior: "Validate and show clear error message" },
  ];

  if (answers.edgeCases) {
    const userCases = answers.edgeCases.split(/[,;.]/).map((c) => c.trim()).filter(Boolean);
    for (const c of userCases) {
      cases.push({ scenario: c, expectedBehavior: "Handle gracefully (define specific behavior)" });
    }
  }

  return cases;
}

function inferFileExtension(techStack: string | undefined): string {
  if (!techStack) return ".ts";
  const s = techStack.toLowerCase();
  if (s.includes("typescript")) return ".ts";
  if (s.includes("python")) return ".py";
  if (s.includes("ruby")) return ".rb";
  if (s.includes("go") || s.includes("golang")) return ".go";
  if (s.includes("rust")) return ".rs";
  if (s.includes("java") && !s.includes("javascript")) return ".java";
  if (s.includes("javascript")) return ".js";
  return ".ts";
}

function inferComponentExtension(techStack: string | undefined): string {
  if (!techStack) return ".tsx";
  const s = techStack.toLowerCase();
  if (s.includes("vue")) return ".vue";
  if (s.includes("svelte")) return ".svelte";
  if (s.includes("typescript")) return ".tsx";
  if (s.includes("javascript")) return ".jsx";
  return ".tsx";
}

function featureToSlug(feature: string): string {
  return feature
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 30)
    .replace(/-$/, "");
}

function buildFileChanges(
  idea: string,
  features: string[],
  techStack: string | undefined,
  answers: NonNullable<Parameters<typeof executeSpec>[0]["answers"]>,
  constraints: string[] | undefined
): FileChange[] {
  const changes: FileChange[] = [];
  const ext = inferFileExtension(techStack);
  const compExt = inferComponentExtension(techStack);
  const stackLower = (techStack || "").toLowerCase();
  const mvpFeatures = features.slice(0, 5);

  // Determine project structure from tech stack
  const isNextjs = stackLower.includes("next");
  const isReact = stackLower.includes("react") || isNextjs;
  const isExpress = stackLower.includes("express") || stackLower.includes("fastify");
  const isVue = stackLower.includes("vue") || stackLower.includes("nuxt");
  const isSvelte = stackLower.includes("svelte");
  const isMcp = stackLower.includes("mcp");
  const isPython = stackLower.includes("python") || stackLower.includes("django") || stackLower.includes("flask") || stackLower.includes("fastapi");
  const hasDb = stackLower.includes("prisma") || stackLower.includes("drizzle") || stackLower.includes("database") || stackLower.includes("sql");
  const hasTypescript = stackLower.includes("typescript") || ext === ".ts";

  // Types/interfaces file (if TypeScript)
  if (hasTypescript && mvpFeatures.length > 0) {
    const typeEntries = mvpFeatures.map((f) => {
      const slug = featureToSlug(f);
      return `Define interface/type for ${slug} data shape`;
    });
    changes.push({
      path: `src/types/${featureToSlug(idea)}${ext}`,
      action: "create",
      description: "Type definitions for the feature's data models and API contracts",
      codeChanges: [
        ...typeEntries,
        "Export all types for use by other modules",
      ],
    });
  }

  // Per-feature files
  for (const feature of mvpFeatures) {
    const slug = featureToSlug(feature);

    if (isNextjs) {
      // Next.js: route handler + page component
      const needsApi = /api|data|fetch|submit|save|send|create|delete|update|get/i.test(feature);
      if (needsApi) {
        changes.push({
          path: `src/app/api/${slug}/route${ext}`,
          action: "create",
          description: `API route handler for: ${feature}`,
          codeChanges: [
            `Export GET/POST/PUT/DELETE handler as needed`,
            "Add input validation for request body/params",
            "Return typed JSON responses with appropriate status codes",
            "Add error handling with try/catch",
          ],
        });
      }
      changes.push({
        path: `src/components/${slug}${compExt}`,
        action: "create",
        description: `UI component for: ${feature}`,
        codeChanges: [
          `Create ${slug} component with props interface`,
          "Implement core rendering logic",
          "Add loading and error states",
          "Wire up event handlers",
        ],
      });
    } else if (isExpress) {
      // Express/Fastify: route + controller
      changes.push({
        path: `src/routes/${slug}${ext}`,
        action: "create",
        description: `Route definitions for: ${feature}`,
        codeChanges: [
          "Define route paths and HTTP methods",
          "Wire routes to controller functions",
          "Add input validation middleware",
        ],
      });
      changes.push({
        path: `src/controllers/${slug}${ext}`,
        action: "create",
        description: `Business logic for: ${feature}`,
        codeChanges: [
          "Implement request handler functions",
          "Add input validation and error handling",
          "Return appropriate response codes and data",
        ],
      });
    } else if (isMcp) {
      // MCP server: tool definition
      changes.push({
        path: `src/tools/${slug}${ext}`,
        action: "create",
        description: `MCP tool implementation for: ${feature}`,
        codeChanges: [
          `Export schema (Zod) for tool input validation`,
          `Export async execute function with typed input`,
          "Add error handling and return structured result",
        ],
      });
    } else if (isVue) {
      changes.push({
        path: `src/components/${slug}${compExt}`,
        action: "create",
        description: `Vue component for: ${feature}`,
        codeChanges: [
          "Define component props and emits",
          "Implement template with reactive data bindings",
          "Add composable hooks if needed",
        ],
      });
    } else if (isSvelte) {
      changes.push({
        path: `src/lib/components/${slug}${compExt}`,
        action: "create",
        description: `Svelte component for: ${feature}`,
        codeChanges: [
          "Define component props with export let",
          "Implement markup with reactive statements",
          "Add event dispatchers for parent communication",
        ],
      });
    } else if (isPython) {
      changes.push({
        path: `src/${slug}${ext}`,
        action: "create",
        description: `Module for: ${feature}`,
        codeChanges: [
          `Define main function(s) for ${slug}`,
          "Add type hints for function parameters and return values",
          "Add input validation and error handling",
        ],
      });
    } else {
      // Generic: module file
      changes.push({
        path: `src/${slug}${ext}`,
        action: "create",
        description: `Core module for: ${feature}`,
        codeChanges: [
          `Implement main logic for ${slug}`,
          "Export public API (functions/classes)",
          "Add error handling",
        ],
      });
    }
  }

  // Database schema if relevant
  if (hasDb) {
    if (stackLower.includes("prisma")) {
      changes.push({
        path: "prisma/schema.prisma",
        action: "modify",
        description: "Add/update data models for the new feature",
        codeChanges: [
          ...mvpFeatures.map((f) => `Add model for ${featureToSlug(f)} data`),
          "Define relationships between new and existing models",
          "Add necessary indexes",
        ],
      });
    } else if (stackLower.includes("drizzle")) {
      changes.push({
        path: `src/db/schema${ext}`,
        action: "modify",
        description: "Add/update table definitions for the new feature",
        codeChanges: mvpFeatures.map((f) => `Add table definition for ${featureToSlug(f)}`),
      });
    }
  }

  // MCP index registration
  if (isMcp && mvpFeatures.length > 0) {
    changes.push({
      path: `src/index${ext}`,
      action: "modify",
      description: "Register new tool(s) with the MCP server",
      codeChanges: [
        ...mvpFeatures.map((f) => `Import and register ${featureToSlug(f)} tool`),
        "Add tool description and schema binding",
      ],
    });
  }

  // Utility file if complex enough
  if (mvpFeatures.length >= 3) {
    changes.push({
      path: `src/utils/${featureToSlug(idea)}${ext}`,
      action: "create",
      description: "Shared utility functions for the feature",
      codeChanges: [
        "Extract reusable helpers from feature modules",
        "Add validation/transformation utilities",
      ],
    });
  }

  return changes;
}

function buildActionPlan(
  idea: string,
  techStack: string | undefined,
  fileChanges: FileChange[]
): Phase2Result["spec"]["actionPlan"] {
  const features = extractFeatures(idea).slice(0, 5);
  const plan: Phase2Result["spec"]["actionPlan"] = [];
  let step = 1;

  // Step 1: setup & dependencies
  const setupFiles = ["package.json"];
  const ext = inferFileExtension(techStack);
  if (ext === ".ts") setupFiles.push("tsconfig.json");
  plan.push({
    step: step++,
    description: "Set up project structure and dependencies",
    files: setupFiles,
  });

  // Step 2: types/schema (if any create-type or modify-schema files exist)
  const typeFiles = fileChanges.filter(
    (fc) =>
      fc.path.includes("/types/") ||
      fc.path.includes("schema.prisma") ||
      fc.path.includes("/db/")
  );
  if (typeFiles.length > 0) {
    plan.push({
      step: step++,
      description: "Define types, interfaces, and data models",
      files: typeFiles.map((fc) => fc.path),
    });
  }

  // Steps per feature: group file changes by feature slug
  for (const feature of features) {
    const slug = featureToSlug(feature);
    const featureShort =
      feature.length > 80 ? feature.substring(0, 80) + "..." : feature;
    const relatedFiles = fileChanges.filter(
      (fc) =>
        fc.path.includes(slug) &&
        !fc.path.includes("/types/") &&
        !fc.path.includes("schema.prisma") &&
        !fc.path.includes("/db/")
    );
    plan.push({
      step: step++,
      description: `Implement: ${featureShort}`,
      files:
        relatedFiles.length > 0
          ? relatedFiles.map((fc) => fc.path)
          : [`src/${slug}${ext}`],
    });
  }

  // Registration / wiring step (e.g., MCP index, router index)
  const registrationFiles = fileChanges.filter(
    (fc) => fc.action === "modify" && fc.path.includes("index")
  );
  if (registrationFiles.length > 0) {
    plan.push({
      step: step++,
      description: "Wire up new modules (imports, registration, routing)",
      files: registrationFiles.map((fc) => fc.path),
    });
  }

  // Utility extraction step
  const utilFiles = fileChanges.filter(
    (fc) => fc.path.includes("/utils/") && !fc.path.includes("/types/")
  );
  if (utilFiles.length > 0) {
    plan.push({
      step: step++,
      description: "Extract shared utilities and helpers",
      files: utilFiles.map((fc) => fc.path),
    });
  }

  plan.push({
    step: step++,
    description: "Manual smoke test of core flow",
    files: [],
  });

  plan.push({
    step: step++,
    description: "Write README with setup instructions",
    files: ["README.md"],
  });

  return plan;
}

function buildSpecMarkdown(
  idea: string,
  spec: Phase2Result["spec"],
  answers: NonNullable<Parameters<typeof executeSpec>[0]["answers"]>,
  constraints: string[] | undefined
): string {
  const title = idea.length > 80 ? idea.substring(0, 80) + "..." : idea;
  const date = new Date().toISOString().split("T")[0];

  let md = `# Feature: ${title}\n\n`;
  md += `**Created**: ${date}\n`;
  md += `**Status**: Draft\n\n`;

  md += `## Problem Statement\n\n`;
  md += `${answers.problem || idea}\n\n`;

  md += `## User Stories\n\n`;
  for (const story of spec.userStories) {
    md += `### ${story.title}\n`;
    md += `**As a** ${story.asA}\n`;
    md += `**I want** ${story.iWant}\n`;
    md += `**So that** ${story.soThat}\n\n`;
    md += `**Acceptance Criteria:**\n`;
    for (const ac of story.acceptanceCriteria) {
      md += `- [ ] ${ac}\n`;
    }
    md += `\n`;
  }

  md += `## Scope\n\n`;
  md += `### In Scope\n`;
  for (const item of spec.inScope) {
    md += `- ${item}\n`;
  }
  md += `\n### Out of Scope\n`;
  for (const item of spec.outOfScope) {
    md += `- ${item}\n`;
  }
  if (constraints && constraints.length > 0) {
    md += `\n### Constraints\n`;
    for (const c of constraints) {
      md += `- ${c}\n`;
    }
  }

  md += `\n## Technical Considerations\n\n`;
  for (const tc of spec.technicalConsiderations) {
    md += `- ${tc}\n`;
  }

  md += `\n## Edge Cases & Error States\n\n`;
  md += `| Scenario | Expected Behavior |\n`;
  md += `|----------|-------------------|\n`;
  for (const ec of spec.edgeCases) {
    md += `| ${ec.scenario} | ${ec.expectedBehavior} |\n`;
  }

  if (spec.fileChanges.length > 0) {
    md += `\n## File Changes\n\n`;

    const creates = spec.fileChanges.filter((fc) => fc.action === "create");
    const modifies = spec.fileChanges.filter((fc) => fc.action === "modify");
    const deletes = spec.fileChanges.filter((fc) => fc.action === "delete");

    if (creates.length > 0) {
      md += `### New Files\n\n`;
      for (const fc of creates) {
        md += `#### \`${fc.path}\`\n`;
        md += `${fc.description}\n`;
        if (fc.codeChanges.length > 0) {
          md += `\n**Code changes:**\n`;
          for (const cc of fc.codeChanges) {
            md += `- ${cc}\n`;
          }
        }
        md += `\n`;
      }
    }

    if (modifies.length > 0) {
      md += `### Modified Files\n\n`;
      for (const fc of modifies) {
        md += `#### \`${fc.path}\`\n`;
        md += `${fc.description}\n`;
        if (fc.codeChanges.length > 0) {
          md += `\n**Code changes:**\n`;
          for (const cc of fc.codeChanges) {
            md += `- ${cc}\n`;
          }
        }
        md += `\n`;
      }
    }

    if (deletes.length > 0) {
      md += `### Deleted Files\n\n`;
      for (const fc of deletes) {
        md += `- \`${fc.path}\` — ${fc.description}\n`;
      }
      md += `\n`;
    }
  }

  md += `\n## Action Plan\n\n`;
  for (const step of spec.actionPlan) {
    md += `### Step ${step.step}: ${step.description}\n`;
    if (step.files.length > 0) {
      md += `**Files:** ${step.files.join(", ")}\n`;
    }
    md += `\n`;
  }

  if (spec.suggestedStructure.length > 0) {
    md += `## Suggested Structure\n\n`;
    md += "```\n";
    for (const dir of spec.suggestedStructure) {
      md += `${dir}\n`;
    }
    md += "```\n";
  }

  md += `\n## Open Questions\n\n`;
  md += `- [ ] [Add questions that need resolution before implementation]\n`;

  return md;
}

export async function executeSpec(input: {
  idea: string;
  constraints?: string[];
  techStack?: string;
  projectPath?: string;
  answers?: {
    who?: string;
    problem?: string;
    success?: string;
    scope?: string;
    patterns?: string;
    edgeCases?: string;
  };
}): Promise<IdeaToSpecResult> {
  // Phase 1: No answers provided — return clarifying questions
  if (!input.answers) {
    // Read memory bank for extra context if available
    let contextHint = "";
    if (input.projectPath) {
      const ctx = await getMemoryBankContext(input.projectPath);
      if (ctx.exists && ctx.projectBrief) {
        contextHint = " (Memory bank detected — project context will inform the spec)";
      }
    }

    return {
      mode: "PLANNING",
      phase: "questions",
      modeInstructions:
        "You are now in PLANNING MODE. Present these questions to the user and collect their answers. " +
        "Do NOT write any code. Once you have answers, call spec again with the answers parameter." +
        contextHint,
      questions: [
        {
          id: "who",
          category: "User",
          question: "Who is the primary user for this feature?",
        },
        {
          id: "problem",
          category: "Problem",
          question: "What problem does this solve? What's the pain point today?",
        },
        {
          id: "success",
          category: "Success",
          question: "What does 'done' look like? How will we know it works?",
        },
        {
          id: "scope",
          category: "Scope",
          question: "What should this explicitly NOT do? (prevents scope creep)",
        },
        {
          id: "patterns",
          category: "Patterns",
          question: "Are there existing features or patterns to model this after?",
        },
        {
          id: "edgeCases",
          category: "Edge Cases",
          question: "Any known error states or edge cases to handle?",
        },
      ],
      ideaSummary:
        input.idea.length > 200 ? input.idea.substring(0, 200) + "..." : input.idea,
    };
  }

  // Phase 2: Answers provided — generate the full spec
  const answers = input.answers;
  const features = extractFeatures(input.idea);
  const mvpFeatures = features.slice(0, 5);
  const extraFeatures = features.slice(5);

  // Build in-scope from MVP features
  const inScope = mvpFeatures.map((f) =>
    f.length > 100 ? f.substring(0, 100) + "..." : f
  );

  // Build out-of-scope
  const outOfScope = [
    ...extraFeatures.map((f) => (f.length > 100 ? f.substring(0, 100) + "..." : f)),
  ];
  if (answers.scope) {
    const userOutOfScope = answers.scope.split(/[,;.]/).map((s) => s.trim()).filter(Boolean);
    outOfScope.push(...userOutOfScope);
  }
  // Add common scope-creep items
  const commonOutOfScope = [
    "Authentication/authorization (unless core to the idea)",
    "Admin dashboard",
    "Email notifications",
    "Analytics/tracking",
    "Performance optimization",
  ];
  const slotsLeft = Math.max(0, 7 - outOfScope.length);
  outOfScope.push(...commonOutOfScope.slice(0, slotsLeft));

  // Tech considerations
  const techConsiderations: string[] = [];
  if (input.constraints && input.constraints.length > 0) {
    techConsiderations.push(`Respect constraints: ${input.constraints.join(", ")}`);
  }
  if (answers.patterns) {
    techConsiderations.push(`Follow existing patterns: ${answers.patterns}`);
  }
  if (input.techStack) {
    const stackLower = input.techStack.toLowerCase();
    if (stackLower.includes("typescript")) techConsiderations.push("Define types/interfaces before implementation");
    if (stackLower.includes("prisma")) techConsiderations.push("Design database schema before writing queries");
    if (stackLower.includes("next")) techConsiderations.push("Decide between server/client components upfront");
    if (stackLower.includes("react")) techConsiderations.push("Plan component hierarchy and state management");
  }
  techConsiderations.push("Start with the simplest working version, then iterate");

  // Enrich with memory bank if available
  if (input.projectPath) {
    const ctx = await getMemoryBankContext(input.projectPath);
    if (ctx.exists) {
      if (ctx.systemPatterns) {
        techConsiderations.push("Follow conventions documented in memory-bank/systemPatterns.md");
      }
      if (ctx.techContext) {
        techConsiderations.push("Respect tech stack documented in memory-bank/techContext.md");
      }
    }
  }

  const fileChanges = buildFileChanges(input.idea, features, input.techStack, answers, input.constraints);

  const spec: Phase2Result["spec"] = {
    problemStatement: answers.problem || input.idea,
    userStories: buildUserStories(input.idea, answers),
    inScope,
    outOfScope,
    technicalConsiderations: techConsiderations,
    edgeCases: buildEdgeCases(answers),
    fileChanges,
    actionPlan: buildActionPlan(input.idea, input.techStack, fileChanges),
    suggestedStructure: detectTechStructure(input.techStack),
  };

  // Write spec file to disk if projectPath provided
  let specFile: string | null = null;
  let memoryBankUpdated = false;

  if (input.projectPath) {
    const hasMb = await memoryBankExists(input.projectPath);
    if (hasMb) {
      const slug = generateSlug(input.idea);
      const specRelPath = await getUniqueSpecPath(input.projectPath, slug);
      const specContent = buildSpecMarkdown(input.idea, spec, answers, input.constraints);

      await writeMemoryBankFile(input.projectPath, specRelPath, specContent);
      specFile = memoryBankFilePath(input.projectPath, specRelPath);

      // Auto-update activeContext
      const date = new Date().toISOString().split("T")[0];
      await appendToMemoryBankFile(
        input.projectPath,
        "activeContext.md",
        `\n- **${date}**: New feature spec created — [${slug}](features/${slug}.md)`
      );
      await updateActiveContextTimestamp(input.projectPath);
      memoryBankUpdated = true;
    }
  }

  return {
    mode: "PLANNING",
    phase: "spec",
    modeInstructions:
      "You are in PLANNING MODE. Present this spec to the user for review. " +
      "Pay special attention to the fileChanges section — it documents every file to create, modify, or delete along with specific code-level changes. " +
      "Do NOT write any code until the user explicitly approves the plan. " +
      "Ask: 'Does this spec look right? Should I adjust any file changes, features, or constraints before we start building?'" +
      (specFile ? ` Spec saved to: ${specFile}` : ""),
    spec,
    specFile,
    memoryBankUpdated,
  };
}
