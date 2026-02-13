[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9C%93-brightgreen.svg)](https://github.com/rodneymanor/vibe-check-mcp)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

# vibe-check-mcp

**"You asked for a button. Your AI agent refactored the entire app."**

Stop AI coding agents from over-building, losing context, and going rogue. **vibe-check** is an MCP server that gives your agent discipline — so you can vibe-code without the chaos.

Zero LLM calls. Zero API keys. Pure deterministic guardrails.

---

## The Problem Everyone Has

You say: *"Add a dark mode toggle."*

Your AI agent delivers:
- A new design system with 47 CSS custom properties
- A refactored component library you didn't ask for
- 3 new utility files and an abstraction layer
- A "bonus" settings page with persistence

**Sound familiar?**

## Before & After

```
 WITHOUT vibe-check                        WITH vibe-check
 ─────────────────────                     ────────────────────
 You: "Add a login page"                   You: "Add a login page"

 Agent: Sure! I'll also...                 Agent: pre_check says:
  - Set up an auth provider                  Approved: Login.tsx, login.css
  - Create a user dashboard                  Forbidden: auth/, dashboard/
  - Add role-based permissions               Complexity: Low
  - Refactor the router                      Red flags: None
  - Install 5 new packages                   Score: 9/10 — Proceed.
  - Create 15 files
                                            Agent builds exactly what you asked for.
 Result: 15 files changed                  Result: 2 files changed
 "Wait... I just wanted a form"            "Perfect. Exactly what I needed."
```

---

## What You Get

- **Scope lock** — Your agent can only touch files you approved
- **Drift detection** — Catch unauthorized changes before they hit your codebase
- **Persistent memory** — Project context survives across sessions, no more repeating yourself
- **Structured specs** — Turn vague ideas into clear, scoped feature specs with guardrails
- **Zero config** — No API keys, no accounts, no network calls. Install and go.

---

## Quick Start

**One command. 30 seconds. Done.**

```bash
claude mcp add vibe-check -- npx -y vibe-check-mcp
```

Then in any project:

```
> memory_bank_init → sets up project context (run once)
> pre_check        → validates your plan before coding
> diff_review      → verifies compliance after coding
```

That's it. Your agent now has guardrails.

---

## 6 Tools, Zero LLM Calls

Everything is pure deterministic logic. The AI agent provides the intelligence — vibe-check provides the discipline.

| Tool | What It Does |
|------|-------------|
| **`pre_check`** | Validates plans before coding. Scans files, rates complexity, flags risks, runs 11 quality checks. Your agent's preflight checklist. |
| **`spec`** | Turns ideas into structured specs. Asks 6 clarifying questions, then generates user stories, acceptance criteria, and a scoped action plan. |
| **`diff_review`** | Post-implementation audit. Compares what changed vs. what was approved. Catches scope drift and unauthorized files. |
| **`memory_bank_init`** | Sets up persistent project context. One command creates structured markdown files your agent reads every session. |
| **`memory_bank_read`** | Reads project context. Your agent always knows what the project is, what was done last, and what the conventions are. |
| **`memory_bank_update`** | Keeps context current. Updates automatically on diff review, or manually when the project evolves. |

---

## Works With

- **Claude Code** (CLI)
- **Claude Desktop**
- **Codex CLI** (OpenAI)
- **Any MCP-compatible client**

---

## How It Works

```
  You have an idea
       |
       v
    [ spec ]  ──→  Clarifying questions → Scoped feature spec
       |
       v
  [ pre_check ]  ──→  File scope lock + 11 quality checks + complexity rating
       |
       v
   You build
       |
       v
 [ diff_review ]  ──→  Compliance audit + auto-update memory bank
       |
       v
  Ship it.
```

All tools use **file scanning** and **hardcoded heuristics** — no LLM calls, no API keys, no network requests. It auto-detects Next.js, React, Vue, Angular, Express, and 10+ frameworks from your `package.json`.

---

## Installation

### Claude Code (recommended)

```bash
claude mcp add vibe-check -- npx -y vibe-check-mcp
```

### Claude Code (local clone)

```bash
git clone https://github.com/rodneymanor/vibe-check-mcp.git
cd vibe-check-mcp && npm install && npm run build
claude mcp add vibe-check -- node /path/to/vibe-check-mcp/build/index.js
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

---

## Recommended Workflow

```
1. memory_bank_init  → Initialize project context + workflow rules (once per project)
2. spec              → Scope a new feature (interactive, 2-phase)
3. pre_check         → Validate your plan and lock down file scope
4. [implement]       → Write the code
5. diff_review       → Verify compliance + auto-update memory bank
```

When you run `memory_bank_init`, it writes workflow rules to `.claude/CLAUDE.md` so your agent automatically follows the workflow. If the file already exists, rules are appended without duplication.

---

## Memory Bank

The memory bank is a `memory-bank/` directory in your project root that persists context across sessions:

| File | Purpose | Auto-updated by |
|------|---------|-----------------|
| `projectbrief.md` | What the project is, who it's for | Manual |
| `activeContext.md` | Current scope, priorities, recent changes | `diff_review`, `spec` |
| `techContext.md` | Stack, dependencies, design system | Manual |
| `systemPatterns.md` | Architecture patterns, conventions | Manual |
| `routes.md` | Route contract table | Manual |
| `progress.md` | Cumulative log of completed work | `diff_review` |
| `features/*.md` | Feature specs | `spec` |

`pre_check` auto-reads projectbrief + techContext + routes + systemPatterns + activeContext. All tools degrade gracefully if the memory bank doesn't exist.

---

<details>
<summary><strong>Detailed API Reference</strong></summary>

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

Compares actual changes against a `pre_check` contract. Checks for unauthorized file changes, route contract violations, missing approved changes, and scope drift. Auto-updates `activeContext.md` and `progress.md` on successful compliance.

**When to use:** After implementation, before committing.

```
Input:
  scopeContract: <JSON from pre_check>
  changedFiles: ["src/components/Header.tsx"]
  addedFiles: ["src/styles/dark-mode.css"]    (optional)
  deletedFiles: []                            (optional)
  summary: "Added dark mode toggle"
  projectPath: "/path/to/project"             (optional, for route checks + memory bank)

Output:
  compliant: true/false, score, violations[],
  missingChanges[], recommendedActions[],
  memoryBankUpdated: true/false
```

### `memory_bank_init` — Initialize memory bank

Creates a `memory-bank/` directory with structured context files. Also writes workflow rules to `.claude/CLAUDE.md`.

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

</details>

---

## Development

```bash
git clone https://github.com/rodneymanor/vibe-check-mcp.git
cd vibe-check-mcp
npm install
npm run build
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

---

## License

MIT — use it, fork it, build on it.

---

**If vibe-check saved you from an AI-generated mess, give it a star.**

[Star this repo on GitHub](https://github.com/rodneymanor/vibe-check-mcp)
