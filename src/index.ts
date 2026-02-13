#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { preCheckSchema, executePreCheck } from "./tools/pre-check.js";
import { specSchema, executeSpec } from "./tools/idea-to-spec.js";
import { diffReviewSchema, executeDiffReview } from "./tools/diff-review.js";
import { memoryBankInitSchema, executeMemoryBankInit } from "./tools/memory-bank-init.js";
import { memoryBankReadSchema, executeMemoryBankRead } from "./tools/memory-bank-read.js";
import { memoryBankUpdateSchema, executeMemoryBankUpdate } from "./tools/memory-bank-update.js";

const server = new McpServer({
  name: "vibe-check",
  version: "1.0.0",
});

// Tool 1: pre_check — unified pre-implementation validation
server.tool(
  "pre_check",
  "Analyzes a project and validates a proposed implementation plan before coding. Combines file-level scope analysis (approved/forbidden files, complexity rating, red flags) with 11 plan-quality checks across scope, complexity, duplication, safety, and architecture. Automatically reads memory bank if available. Call this BEFORE writing code.",
  preCheckSchema,
  async (input) => {
    try {
      const result = await executePreCheck(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `pre_check failed: ${error instanceof Error ? error.message : String(error)}` }) }],
        isError: true,
      };
    }
  }
);

// Tool 2: spec — interactive spec generation
server.tool(
  "spec",
  "Interactive two-phase spec generator. Phase 1 (no answers): returns clarifying questions for the user. Phase 2 (with answers): generates a rich MVP spec with user stories, acceptance criteria, edge cases, file-level changes (create/modify/delete with code-level details), and action plan. Writes spec to memory-bank/features/ if memory bank exists. IMPORTANT: This tool puts the session into PLANNING MODE — present output to user and DO NOT write code until they approve.",
  specSchema,
  async (input) => {
    try {
      const result = await executeSpec(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `spec failed: ${error instanceof Error ? error.message : String(error)}` }) }],
        isError: true,
      };
    }
  }
);

// Tool 3: diff_review — post-implementation compliance check
server.tool(
  "diff_review",
  "Compares actual implementation against a pre_check contract. Call this AFTER coding to verify compliance. Checks for unauthorized file changes, route contract violations, missing approved changes, and scope drift. On successful compliance, auto-updates memory bank (activeContext + progress). Pass projectPath for route checking and auto-updates.",
  diffReviewSchema,
  async (input) => {
    try {
      const result = await executeDiffReview(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `diff_review failed: ${error instanceof Error ? error.message : String(error)}` }) }],
        isError: true,
      };
    }
  }
);

// Tool 4: memory_bank_init — initialize memory bank
server.tool(
  "memory_bank_init",
  "Initializes a memory-bank/ directory in the project with structured context files: projectbrief.md, activeContext.md, techContext.md, systemPatterns.md, routes.md, progress.md, and a features/ directory. Call this once at the start of a project. Will not overwrite existing memory bank.",
  memoryBankInitSchema,
  async (input) => {
    try {
      const result = await executeMemoryBankInit(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `memory_bank_init failed: ${error instanceof Error ? error.message : String(error)}` }) }],
        isError: true,
      };
    }
  }
);

// Tool 5: memory_bank_read — read memory bank files
server.tool(
  "memory_bank_read",
  "Reads memory bank files for project context. Specify a file name (projectbrief.md, activeContext.md, etc.) or 'all' for a summary of everything. Use this to understand project context before making changes.",
  memoryBankReadSchema,
  async (input) => {
    try {
      const result = await executeMemoryBankRead(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `memory_bank_read failed: ${error instanceof Error ? error.message : String(error)}` }) }],
        isError: true,
      };
    }
  }
);

// Tool 6: memory_bank_update — update memory bank files
server.tool(
  "memory_bank_update",
  "Updates a specific memory bank file. Supports 'replace' (overwrite) or 'append' mode. Valid targets: projectbrief.md, activeContext.md, techContext.md, systemPatterns.md, routes.md, progress.md, or features/<slug>.md. Automatically updates activeContext.md timestamp.",
  memoryBankUpdateSchema,
  async (input) => {
    try {
      const result = await executeMemoryBankUpdate(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `memory_bank_update failed: ${error instanceof Error ? error.message : String(error)}` }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("vibe-check MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
