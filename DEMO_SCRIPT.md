# vibe-check-mcp — Vibeathon 2026 Demo Video Script

**Target length:** 3:45–4:00 (tight — every second earns votes)
**Tone:** Confident, conversational, technically credible. Not salesy.
**Recording:** Terminal only (dark theme, large font). No slides. No landing page. Just the tool working.

**Judging weights to optimize for:**
- Usefulness: 40% → Lead with the pain. Show the tool solving it.
- Impact: 25% → Show breadth (works with any MCP client, cross-session persistence).
- Execution: 20% → Clean install, real demo, polished output.
- Innovation: 15% → Zero LLM calls. Memory bank. Nobody else does this.

---

## 1. THE HOOK — Show the Pain (0:00–0:30)

**Goal:** Every voter has felt this. Make them nod in the first 10 seconds.

**On screen:**
Terminal open. Type into Claude Code:
```
> Add a dark mode toggle to the settings page
```
Speed up agent output (4x). Show files scrolling:
```
Created src/lib/theme/ThemeProvider.tsx
Created src/lib/theme/ThemeContext.tsx
Created src/lib/theme/useTheme.ts
Created src/lib/theme/ThemeFactory.ts
Created src/hooks/useSystemPreference.ts
Created src/hooks/useLocalStorage.ts
Created src/utils/color-converter.ts
Created src/components/ui/Toggle.tsx
Created src/components/ui/Toggle.test.tsx
Created src/styles/themes/light.css
Created src/styles/themes/dark.css
Created src/styles/themes/index.ts
Modified package.json (+3 dependencies)
Refactored src/app/layout.tsx
```
Terminal settles. Output reads: **15 files changed. 3 packages installed.**

Pause. Let it breathe for 2 seconds.

**Narration:**
> "You ask your AI agent to add a dark mode toggle. It creates 15 files, installs 3 packages, and builds a ThemeFactory. A factory. You asked for a CSS toggle."
>
> "Sound familiar?"

**Why this works:** Voters are scanning dozens of submissions. This earns you 30 more seconds of attention because they've lived this exact moment.

---

## 2. INTRODUCE VIBE-CHECK — One-Liner + Install (0:30–1:00)

**Goal:** Name the tool, explain what it does, show the install. 30 seconds. No fluff.

**On screen:**
Clean terminal. Type:
```bash
claude mcp add vibe-check -- npx -y mcp-vibe-check
```
Output confirms:
```
Added MCP server: vibe-check
```

Then briefly flash the 6 tool names (text overlay or terminal output):
```
Tools: pre_check · spec · diff_review · memory_bank_init · memory_bank_read · memory_bank_update
```

**Narration:**
> "I built vibe-check. It's an MCP server — one command to install — that gives your AI coding agent discipline."
>
> "Six tools. Zero LLM calls. No API keys. No token costs. Pure deterministic guardrails that run before, during, and after every code change."
>
> "Let me show you what that looks like."

**Why this works:** Voters now know: what it is (MCP server), what it does (agent discipline), what makes it different (zero LLM calls), and how to get it (one command). All in 30 seconds.

---

## 3. LIVE DEMO — The Tool Working (1:00–2:30)

**Goal:** This is 60% of your judging score (Usefulness + Execution). Show the full loop: spec → pre_check → code → diff_review. Use a real project.

### 3a. Spec a Feature (1:00–1:30)

**On screen:**
Type into Claude Code:
```
> I want to add email notifications when tasks are overdue
```

Agent calls `spec` (phase 1). Show clarifying questions:
```
Before building, let me clarify:
1. Who is the primary user?
2. What does "done" look like?
3. What should this NOT do?
4. Any edge cases?
```

Quick-cut: show brief answers typed. Agent calls `spec` (phase 2). Output:
```
Feature Spec: overdue-notifications
├── User Stories (3)
├── Acceptance Criteria (5)
├── File Changes:
│   CREATE src/services/notifications.ts
│   CREATE src/utils/email.ts
│   MODIFY src/services/tasks.ts
├── Edge Cases (2)
└── Saved to: memory-bank/features/overdue-notifications.md
```

**Narration:**
> "I tell the agent I want email notifications. Instead of immediately writing code, it asks clarifying questions. Who's it for? What does done look like? What should it NOT do?"
>
> "Then it generates a full spec — user stories, acceptance criteria, specific file changes — and saves it to the memory bank. Not a single line of code written yet. We have a plan first."

### 3b. Pre-Check Catches Over-Engineering (1:30–2:10)

**On screen:**
Type:
```
> Implement the notification feature
```

Agent proposes a plan. pre_check runs. **Show the FAIL first** — this is the money shot:
```
pre_check:
  Score: 35/100
  Complexity: EXCESSIVE (11 files)

  Red Flags:
    ⚠ 8 files outside approved scope
    ⚠ 2 new dependencies not requested

  Failed Checks:
    ✕ Simplest approach — factory pattern, event bus detected
    ✕ No unnecessary abstractions — base class detected
    ✕ No unrequested dependencies — adds bull, nodemailer
    ✕ No unrequested files — creates 8 unapproved files

  Recommendation: Simplify before proceeding.
```

Pause 3 seconds on this output. Let voters read it.

Then show the agent course-correcting:
```
Let me simplify. Using only the 3 approved files...
```

Agent re-plans. pre_check runs again:
```
pre_check:
  Score: 95/100
  Complexity: small (3 files)
  Red Flags: none
  Checks: 11/11 passed
  Recommendation: Proceed.
```

**Narration:**
> "Now the agent goes to build. But before it writes any code, pre_check runs 11 hardcoded checks. Scope alignment. Simplest approach. Unnecessary abstractions. Dependency creep."
>
> "Watch. The agent proposes a factory pattern with an event bus and two new packages. Pre-check gives it 35 out of 100. Flags the abstractions, flags the dependencies, flags the 8 unapproved files."
>
> "The agent reads the feedback and simplifies. Three files. 95 out of 100. That's the whole point — the guardrail fires before a single file is created."

### 3c. Diff Review Closes the Loop (2:10–2:30)

**On screen:**
After implementation (quick cut). Agent calls `diff_review`:
```
diff_review:
  Compliant: ✓
  In-scope: src/services/notifications.ts, src/utils/email.ts, src/services/tasks.ts
  Violations: none
  Missing: none
  Memory bank: auto-updated ✓
```

**Narration:**
> "After coding, diff_review compares what was built against the plan. Did you touch files you weren't supposed to? Did you drift from scope? When it passes, it auto-updates your memory bank. No manual bookkeeping."

---

## 4. MEMORY BANK — The "I Need This" Moment (2:30–3:15)

**Goal:** This is the Innovation + Impact play. Cross-session persistence is something everyone wants.

**On screen:**
Close the terminal window. Screen goes to desktop for 2 seconds.

Open a brand new terminal. Start Claude Code in the same project.

Type:
```
> What did we work on last session? What's next?
```

Agent calls `memory_bank_read`. Output:
```
From memory bank:

Last session (2026-02-13):
  ✓ Completed: overdue-notifications (compliance: 95/100)
  Files: src/services/notifications.ts, src/utils/email.ts

Current context:
  Tech stack: Next.js 14, TypeScript, Prisma
  Active spec: overdue-notifications (shipped)
  Patterns: service layer, no ORMs in routes

Next priorities: [from activeContext.md]
```

Agent immediately continues with full context. No re-scanning.

**Narration:**
> "Now close your terminal. Go home. Come back tomorrow."
>
> "New session. Your agent reads the memory bank and picks up exactly where you left off. It knows what you built, what files changed, what your tech stack is, and what patterns you follow."
>
> "No more 'let me scan your codebase.' No more re-explaining your architecture. The context is just... there."

---

## 5. COMPATIBILITY — It Works Everywhere (3:15–3:30)

**Goal:** Quick breadth play for the Impact score.

**On screen:**
Text overlay or terminal list:
```
Works with:
  Claude Code (CLI)
  Claude Desktop (App)
  Cursor (IDE)
  Windsurf (IDE)
  Codex CLI (CLI)
  Any MCP client (Protocol)
```

**Narration:**
> "vibe-check works with any MCP-compatible client. Claude Code, Cursor, Windsurf, Codex — if it speaks MCP, vibe-check works. You're not locked into one tool."

---

## 6. CLOSE — End on the Install Command (3:30–3:50)

**Goal:** Last thing on screen = how to get it. Burn it into their brain.

**On screen:**
Clean terminal. The install command, large and centered:
```
npx -y mcp-vibe-check
```

Then text overlay:
```
vibe-check

6 tools. 0 LLM calls. Pure discipline.

Free & open source · MIT License
github.com/rodneymanor/vibe-check-mcp
```

**Narration:**
> "One install command. Six tools. Zero LLM calls. Free, open source, MIT licensed."
>
> "Stop letting your agent build theme factories. Give it some discipline."

---

## Production Notes

**Total runtime:** ~3:50

**Three moments that must land:**
1. **The 15-file disaster (0:00–0:15)** — This is the hook. Make it visceral. Speed up the output so it feels overwhelming.
2. **The pre_check failure (1:30–2:00)** — This is the product demo. Linger on the 35/100 score for 3 seconds. Voters need to read the red flags.
3. **The terminal close + reopen (2:30–2:50)** — This is the emotional payoff. The pause on the blank desktop is deliberate — it makes the memory bank reveal feel magical.

**Recording setup:**
- Terminal: dark theme, 18pt+ font, ~80% screen width
- Resolution: 1920x1080 minimum
- No notifications, no personal bookmarks, no tabs visible
- Background music: lo-fi, low volume, no lyrics — drop it entirely during the hook
- Use real-time speed for the demo sections (segments 3-4). Only speed up the "before" disaster in segment 1.

**Editing checklist:**
- [ ] Subtle zoom on pre_check failure output
- [ ] 2-second pause on blank desktop before reopening terminal
- [ ] Install command appears at both the beginning (0:35) and end (3:35)
- [ ] No transitions or fancy effects — hard cuts between segments
- [ ] Total runtime under 4:00 — respect voters' time
