# Feature: Enhanced idea_to_spec + Memory Bank System

**Created**: 2026-02-12
**Status**: Draft

## Problem Statement

The current `idea_to_spec` tool is a single-shot, shallow MVP scoper. It doesn't ask clarifying questions, doesn't produce rich specs (user stories, acceptance criteria, edge cases), and doesn't persist anything to disk. Meanwhile, AI agents lose project context between sessions because there's no structured memory system. The `/spec` skill from Gen C A solves both problems but only works as a prompt — it can't be reused across projects or clients.

## User Stories

### Story 1: Interactive spec generation
**As a** developer starting a new feature
**I want** the AI agent to ask me clarifying questions before generating a spec
**So that** the spec reflects my actual intent and constraints, not the agent's assumptions

**Acceptance Criteria:**
- [ ] `idea_to_spec` returns clarifying questions on first call (who, problem, success, scope, patterns, edge cases)
- [ ] Agent presents questions to user, collects answers
- [ ] Second call with answers produces a full rich spec
- [ ] Spec includes: problem statement, user stories with acceptance criteria, in/out scope, technical considerations, edge cases table, action plan with file references
- [ ] Spec is written to `memory-bank/features/<slug>.md`
- [ ] Session stays in PLANNING MODE until user approves

### Story 2: Memory bank initialization
**As a** developer starting a new project
**I want** to initialize a memory bank with structured context files
**So that** the AI agent has persistent project knowledge across sessions

**Acceptance Criteria:**
- [ ] `memory_bank_init` creates `memory-bank/` directory with template files
- [ ] Creates: projectbrief.md, activeContext.md, techContext.md, systemPatterns.md, routes.md
- [ ] Creates empty directories: features/
- [ ] Templates include section headers and placeholder guidance
- [ ] Detects existing memory bank and warns (does not overwrite)

### Story 3: Memory bank reads enrich existing tools
**As a** developer using scope_lock or sanity_check
**I want** those tools to automatically read memory bank context if available
**So that** scope contracts and sanity checks are informed by project knowledge

**Acceptance Criteria:**
- [ ] `scope_lock` reads projectbrief.md and techContext.md for framework/stack awareness
- [ ] `scope_lock` reads routes.md to validate route changes
- [ ] `sanity_check` reads systemPatterns.md to check convention compliance
- [ ] `sanity_check` reads activeContext.md to understand current scope
- [ ] Tools degrade gracefully if memory bank doesn't exist

### Story 4: Memory bank updates (manual + automatic)
**As a** developer who just finished a feature
**I want** memory bank files to stay current — automatically when possible, manually when needed
**So that** future sessions have accurate context without extra work

**Acceptance Criteria:**
- [ ] `memory_bank_update` accepts a file target and new content (manual updates)
- [ ] Supports updating any core file (projectbrief, activeContext, techContext, systemPatterns, routes)
- [ ] Supports appending to progress tracking
- [ ] Validates file target is a known memory bank file
- [ ] Updates activeContext.md last-updated timestamp
- [ ] `diff_review` auto-updates activeContext.md + progress.md on successful compliance (automatic)
- [ ] `idea_to_spec` auto-updates activeContext.md to reference the new feature spec (automatic)

### Story 5: Route contract management
**As a** developer working on a web application
**I want** a routes file that tracks all application routes as a contract
**So that** agents don't add unauthorized routes and existing routes aren't broken

**Acceptance Criteria:**
- [ ] routes.md is part of the memory bank
- [ ] `scope_lock` reads routes.md and flags route changes as red flags if not in the request
- [ ] `diff_review` checks actual route changes against the routes contract
- [ ] Format: table with route path, method, auth requirement, description, status

## Scope

### In Scope
- Interactive `idea_to_spec` (two-phase: questions → spec generation)
- Rich spec output matching /spec template (user stories, acceptance criteria, edge cases, action plan)
- Writing spec files to `memory-bank/features/<slug>.md`
- `memory_bank_init` tool — creates memory bank structure
- `memory_bank_read` tool — reads specific memory bank files, returns content
- `memory_bank_update` tool — updates specific memory bank files
- Enriching `scope_lock` and `sanity_check` with memory bank context
- Routes contract file in memory bank

### Out of Scope
- Auto-generating memory bank content from codebase analysis (future)
- Syncing memory bank across repos
- Version history / diffing of memory bank files
- Memory bank search/query tool
- Integration with external tools (Notion, Linear, etc.)

## Technical Considerations

**Affected Areas:**
- `src/tools/idea-to-spec.ts` — Major rewrite: interactive flow, rich output, file writing
- `src/tools/scope-lock.ts` — Add memory bank reads
- `src/tools/sanity-check.ts` — Add memory bank reads
- `src/tools/diff-review.ts` — Add routes contract checking
- `src/utils/file-scanner.ts` — Add memory bank detection
- `src/tools/memory-bank-init.ts` — NEW: initialization tool
- `src/tools/memory-bank-read.ts` — NEW: read tool
- `src/tools/memory-bank-update.ts` — NEW: update tool
- `src/utils/memory-bank.ts` — NEW: shared memory bank utilities
- `src/index.ts` — Register 3 new tools (total: 7 tools)

**Existing Patterns to Follow:**
- Tool registration pattern in `src/index.ts` (zod schema + execute function)
- File I/O patterns from `src/utils/file-scanner.ts`

**Data Model — Memory Bank Structure:**
```
memory-bank/
├── projectbrief.md      # What the project is, who it's for
├── activeContext.md      # Current scope, priorities, recent changes (auto-updated by diff_review + idea_to_spec)
├── techContext.md        # Stack, dependencies, design system
├── systemPatterns.md     # Architecture patterns, conventions
├── routes.md             # Route contract table
├── progress.md           # Cumulative log of completed work (auto-appended by diff_review)
└── features/             # Feature specs from idea_to_spec
    └── <feature-slug>.md
```

## Edge Cases & Error States

| Scenario | Expected Behavior |
|----------|-------------------|
| Memory bank doesn't exist | Tools work normally, skip memory bank enrichment |
| Memory bank partially exists | Read what's available, don't error on missing files |
| idea_to_spec called without prior questions phase | Return questions (phase 1 behavior) |
| idea_to_spec called with answers but no idea | Error: idea is required |
| memory_bank_init called when bank exists | Return warning, do not overwrite existing files |
| memory_bank_update targets unknown file | Error: list valid targets |
| routes.md is empty | scope_lock skips route checking |
| Spec slug conflicts with existing file | Append numeric suffix |

## Action Plan

### Step 1: Add memory bank utility module
**New file:** `src/utils/memory-bank.ts`
- Constants for file paths, templates, known file targets
- `readMemoryBankFile(projectPath, fileName)` — read a memory bank file
- `writeMemoryBankFile(projectPath, fileName, content)` — write/update a file
- `memoryBankExists(projectPath)` — check if memory bank is initialized
- `getMemoryBankContext(projectPath)` — read all core files, return structured context
- Template strings for each memory bank file

### Step 2: Implement memory_bank_init tool
**New file:** `src/tools/memory-bank-init.ts`
- Input: `projectPath`, optional `projectName`, `techStack`, `description`
- Creates directory structure and template files
- Pre-fills projectbrief.md and techContext.md if inputs provided

### Step 3: Implement memory_bank_read tool
**New file:** `src/tools/memory-bank-read.ts`
- Input: `projectPath`, `file` (which file to read — or "all" for summary)
- Returns file content or summary of all files

### Step 4: Implement memory_bank_update tool
**New file:** `src/tools/memory-bank-update.ts`
- Input: `projectPath`, `file`, `content`, optional `mode` (replace/append)
- Validates target, writes content, updates activeContext timestamp

### Step 5: Rewrite idea_to_spec for interactive flow
**Modify:** `src/tools/idea-to-spec.ts`
- Phase 1 (no `answers` provided): return clarifying questions
- Phase 2 (`answers` provided): generate full rich spec + write to disk
- Add `answers` and `projectPath` to input schema
- Generate slug from idea, write to `memory-bank/features/<slug>.md`
- Rich output: user stories, acceptance criteria, edge cases, action plan

### Step 6: Enrich scope_lock with memory bank
**Modify:** `src/tools/scope-lock.ts`
- Read projectbrief.md + techContext.md + routes.md if available
- Include memory bank context in project snapshot
- Flag route changes against routes.md contract

### Step 7: Enrich sanity_check with memory bank
**Modify:** `src/tools/sanity-check.ts`
- Read systemPatterns.md + activeContext.md if available
- Add convention checks based on systemPatterns content
- Add scope checks based on activeContext priorities

### Step 8: Enrich diff_review with routes contract + auto-update memory bank
**Modify:** `src/tools/diff-review.ts`
- Read routes.md if available
- Check for unauthorized route additions/removals
- On successful compliance (compliant: true), automatically:
  - Append a summary entry to `memory-bank/activeContext.md` under "Recent Changes" with date + what was implemented
  - Append a progress entry to `memory-bank/progress.md` (create if missing) with date, feature summary, files changed, and compliance score
  - Update the `Last updated` timestamp in activeContext.md
- Include `memoryBankUpdated: true/false` in the response so the agent knows it happened

### Step 9: Wire everything in index.ts
**Modify:** `src/index.ts`
- Register 3 new tools: memory_bank_init, memory_bank_read, memory_bank_update
- Total: 7 MCP tools

### Step 10: Update README
- Document all 7 tools
- Document memory bank structure
- Document interactive idea_to_spec flow
- Add memory bank initialization to recommended workflow

## Open Questions

- [ ] Should memory_bank_init auto-detect tech stack from package.json and pre-fill techContext.md?
- [ ] Should routes.md be auto-populated by scanning the project (e.g., Next.js app/ directory)?
