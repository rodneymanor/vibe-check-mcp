# vibe-check-mcp

An MCP server that keeps AI coding agents focused. Provides pre-implementation validation, interactive spec generation, diff review, and a persistent memory bank to prevent over-building and scope creep.

**No LLM calls inside** — pure deterministic logic. The AI agent provides the intelligence; vibe-check provides the discipline.

## The Problem

AI coding agents over-build. They add unnecessary abstractions, install unneeded dependencies, refactor code that doesn't need refactoring, and create files nobody asked for. They also lose project context between sessions.

**vibe-check** solves both problems with 6 tools that enforce structured reasoning before, during, and after code changes — plus a persistent memory bank that keeps project context alive.

## Quick Start

1. Install the MCP server (see [Installation](#installation))
2. Run `memory_bank_init` to set up project context and workflow rules
3. Start building — the workflow rules in `.claude/CLAUDE.md` will guide your agent automatically

## Tools (6)

### `pre_check` — Pre-implementation validation

Call before writing any code. Combines file-level scope analysis (approved/forbidden files, complexity rating, red flags) with 11 plan-quality checks across scope, complexity, duplication, safety, and architecture. Automatically reads memory bank if available.

**When to use:** Before starting any implementation task.

```
Input:
  request: "Add a dark mode toggle to the header"
  projectPath: "/path/to/project"
  proposedFiles: ["src/components/Header.tsx", "src/styles/theme.css"]  (optional)
  proposedChanges: "Add a toggle button and CSS custom properties"      (optional)

Output:
  requestSummary, approvedFiles, forbiddenFiles, allowedNewFiles,
  complexityRating, redFlags, checks (11 plan-quality checks),
  score, passed, recommendation, projectSnapshot, memoryBank
```

When `proposedChanges` is provided, the tool also runs sanity checks that validate your plan against simplest-approach, scope creep, and architecture patterns.

### `spec` — Interactive spec generator (2-phase)

**Phase 1** (no answers): Returns 6 clarifying questions (who, problem, success, scope, patterns, edge cases). Puts session into PLANNING MODE.

**Phase 2** (with answers): Generates a rich MVP spec with user stories, acceptance criteria, edge cases, file-level changes, and action plan. Writes spec to `memory-bank/features/` if memory bank exists.

**When to use:** At the start of a new project or feature.

```
Phase 1 call:
  idea: "A real-time analytics dashboard..."
  → Returns 6 questions for the user

Phase 2 call (with answers):
  idea: "A real-time analytics dashboard..."
  answers: { who: "SaaS founders", problem: "Tools are bloated", ... }
  → Returns full spec + writes to memory-bank/features/<slug>.md
```

### `diff_review` — Post-implementation compliance

Compares actual changes against a `pre_check` contract. Checks for unauthorized file changes, route contract violations, missing approved changes, and scope drift. **Auto-updates** `activeContext.md` and `progress.md` on successful compliance.

**When to use:** After implementation, before committing.

```
Input:
  scopeContract: <JSON from pre_check>
  changedFiles: ["src/components/Header.tsx"]
  addedFiles: ["src/styles/dark-mode.css"]    (optional)
  deletedFiles: []                            (optional)
  summary: "Added dark mode toggle"
  projectPath: "/path/to/project"             (optional, needed for route checks + memory bank updates)

Output:
  compliant: true/false, score, violations[],
  missingChanges[], recommendedActions[],
  memoryBankUpdated: true/false
```

### `memory_bank_init` — Initialize memory bank

Creates a `memory-bank/` directory with structured context files. Also writes workflow rules to `.claude/CLAUDE.md` (creates the file if it doesn't exist, appends to it if it does). Call once at project start.

```
Input:
  projectPath: "/path/to/project"
  projectName: "My App"               (optional)
  techStack: "Next.js, TypeScript"     (optional)
  description: "Brief description"     (optional)

Creates:
  memory-bank/
  ├── projectbrief.md
  ├── activeContext.md
  ├── techContext.md
  ├── systemPatterns.md
  ├── routes.md
  ├── progress.md
  └── features/

  .claude/
  └── CLAUDE.md    (workflow rules — created or appended)
```

### `memory_bank_read` — Read memory bank

Reads specific memory bank files or returns a summary of everything.

```
Input:
  projectPath: "/path/to/project"
  file: "activeContext.md"  (or "all" for everything)
```

### `memory_bank_update` — Update memory bank

Updates a specific memory bank file. Supports replace or append mode.

```
Input:
  projectPath: "/path/to/project"
  file: "routes.md"
  content: "| /api/users | GET | yes | List users | active |"
  mode: "append"    (optional — defaults to "replace")
```

## Memory Bank

The memory bank is a `memory-bank/` directory in your project root that persists project context across sessions:

| File | Purpose | Auto-updated by |
|------|---------|-----------------|
| `projectbrief.md` | What the project is, who it's for | Manual |
| `activeContext.md` | Current scope, priorities, recent changes | `diff_review`, `spec` |
| `techContext.md` | Stack, dependencies, design system | Manual |
| `systemPatterns.md` | Architecture patterns, conventions | Manual |
| `routes.md` | Route contract table | Manual |
| `progress.md` | Cumulative log of completed work | `diff_review` |
| `features/*.md` | Feature specs | `spec` |

**Auto-reads:** `pre_check` reads projectbrief + techContext + routes + systemPatterns + activeContext. All tools degrade gracefully if memory bank doesn't exist.

## CLAUDE.md Workflow Rules

When you run `memory_bank_init`, it automatically writes workflow rules to `.claude/CLAUDE.md` in your project. These rules tell the AI agent when to call each tool:

```markdown
## Vibe Check — Workflow Rules

- At project start, call `memory_bank_init` to set up project context
- Before any implementation, call `pre_check` to get a change contract
- After coding, call `diff_review` to verify compliance
- Use `spec` for any new feature — it will ask clarifying questions first
- Use `memory_bank_read` to review project context before making changes
- Use `memory_bank_update` to keep context current as the project evolves
```

If `.claude/CLAUDE.md` already exists, the rules are appended. If the rules are already present, nothing is duplicated.

## Installation

### Claude Code (local)

```bash
claude mcp add vibe-check -- node /path/to/vibe-check/build/index.js
```

### Claude Code (npm)

```bash
claude mcp add vibe-check -- npx -y vibe-check-mcp
```

### Codex CLI

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.vibe-check]
command = "npx"
args = ["-y", "vibe-check-mcp"]
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibe-check": {
      "command": "npx",
      "args": ["-y", "vibe-check-mcp"]
    }
  }
}
```

## Recommended Workflow

```
1. memory_bank_init  → Initialize project context + CLAUDE.md rules (once)
2. spec              → Scope a new feature (interactive, 2-phase)
3. pre_check         → Validate your plan and lock down file scope
4. [implement]       → Write the code
5. diff_review       → Verify compliance (auto-updates memory bank)
```

## How It Works

All tools use **pure deterministic logic** — no LLM calls, no API keys, no network requests.

- **File scanning**: Recursive directory walk with smart classification (routes, tests, configs, components, utilities)
- **Framework detection**: Auto-detects Next.js, React, Vue, Angular, Express, and 10+ other frameworks from `package.json`
- **Pre-check engine**: File-level scope analysis combined with 11 hardcoded plan-quality checks across scope, complexity, duplication, safety, and architecture
- **Memory bank**: Persistent markdown files that tools auto-read and auto-update
- **Route contracts**: Route table in `routes.md` checked by `pre_check` and `diff_review`
- **Interactive specs**: Two-phase spec generation with clarifying questions, user stories, acceptance criteria, and edge cases

## Development

```bash
git clone https://github.com/yourusername/vibe-check-mcp.git
cd vibe-check-mcp
npm install
npm run build
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT
