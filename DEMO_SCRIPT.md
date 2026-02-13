# vibe-check-mcp Demo Video Script

**Target length:** 4:00-4:45
**Tone:** Indie dev, conversational, slightly irreverent, technically credible
**Recording setup:** Terminal (dark theme) + VS Code split. Clean desktop. No tabs/bookmarks visible.

---

## Segment 1: The Hook

**Timestamp:** 0:00 - 0:30
**Key message:** AI agents over-build. Everyone knows it. Nobody talks about it.

**On screen:**
- Terminal open. Type a prompt into Claude Code:
  ```
  > Add a "dark mode" toggle to the settings page
  ```
- Fast-forward the agent working (speed up footage 4x). Show the output scrolling:
  ```
  Created src/lib/theme/ThemeProvider.tsx
  Created src/lib/theme/ThemeContext.tsx
  Created src/lib/theme/useTheme.ts
  Created src/lib/theme/theme-constants.ts
  Created src/lib/theme/ThemeFactory.ts
  Created src/hooks/useSystemPreference.ts
  Created src/hooks/useLocalStorage.ts
  Created src/utils/color-converter.ts
  Modified package.json (added 3 dependencies)
  Created src/components/ui/Toggle.tsx
  Created src/components/ui/Toggle.test.tsx
  Created src/styles/themes/light.css
  Created src/styles/themes/dark.css
  Created src/styles/themes/index.ts
  Refactored src/app/layout.tsx
  ```
- Pause. The terminal shows: **15 files changed. 3 packages installed.**

**Voiceover:**

> You ask your AI agent to add a dark mode toggle. It creates 15 files, installs 3 packages, builds a ThemeFactory -- a *factory* -- and refactors your layout. You asked for a toggle. You got an enterprise theme management system. Sound familiar?

---

## Segment 2: The Problem

**Timestamp:** 0:30 - 1:15
**Key message:** This is a systemic problem, not a one-off. And context loss makes it worse.

**On screen:**
Quick cuts between 3-4 terminal examples (2-3 seconds each):

1. Show agent output: `Created src/utils/EventBus.ts` -- caption overlay: **"You asked for a button click handler"**
2. Show agent output: `npm install lodash moment axios` -- caption overlay: **"You asked to format a date"**
3. Show agent output: `Refactored auth module into 4 service layers` -- caption overlay: **"You asked to fix a typo in the login form"**
4. Show a fresh terminal session. Type: `"Continue working on the dashboard"`. Agent responds: `I don't have context about your project. Let me scan the codebase...` -- caption overlay: **"Every. Single. Session."**

**Voiceover:**

> Here's the thing. AI agents are brilliant at writing code. They are terrible at knowing when to stop. They over-abstract, they over-engineer, they install packages you don't need, and they refactor code you didn't ask them to touch.
>
> And every time you close your terminal, all that context? Gone. Next session, the agent is starting from scratch. It doesn't know what you built yesterday, what patterns you use, or what the current priority is.
>
> The intelligence is there. What's missing is discipline.

---

## Segment 3: Introduce vibe-check

**Timestamp:** 1:15 - 1:45
**Key message:** vibe-check adds guardrails. Zero LLM calls. Pure deterministic checks.

**On screen:**
- Clean terminal. Type the install command:
  ```bash
  claude mcp add vibe-check -- npx -y vibe-check-mcp
  ```
- Show the output confirming the MCP server is added.
- Then flash the README tagline on screen (text overlay): **"The AI provides the intelligence. vibe-check provides the discipline."**
- Brief view of the 6 tools listed: `pre_check`, `spec`, `diff_review`, `memory_bank_init`, `memory_bank_read`, `memory_bank_update`

**Voiceover:**

> This is vibe-check. It's an MCP server -- one command to install -- that gives your AI agent guardrails. Six tools. Zero LLM calls inside. No API keys. No network requests. Pure deterministic logic that runs before, during, and after every code change.
>
> Let me show you what that looks like.

---

## Segment 4: Live Demo -- The Workflow

### 4a: memory_bank_init

**Timestamp:** 1:45 - 2:15
**Key message:** Set up persistent project context in one command.

**On screen:**
- In a sample project directory (a Next.js todo app or similar). Show the file tree briefly.
- Type in Claude Code:
  ```
  > Initialize vibe-check for this project
  ```
- Agent calls `memory_bank_init`. Show the output:
  ```
  Memory bank initialized with 6 files.
  Workflow rules written to .claude/CLAUDE.md.

  Created:
    memory-bank/
    ├── projectbrief.md
    ├── activeContext.md
    ├── techContext.md
    ├── systemPatterns.md
    ├── routes.md
    ├── progress.md
    └── features/
  ```
- Quick flash into VS Code: show the `memory-bank/` folder in the sidebar. Open `projectbrief.md` -- it has placeholder sections ready to fill.

**Voiceover:**

> Step one. Initialize the memory bank. This creates a `memory-bank/` directory with structured markdown files: project brief, tech stack, system patterns, route contracts, progress log. It also writes workflow rules into your project's CLAUDE.md so the agent knows when to call each tool. One-time setup. Takes five seconds.

### 4b: spec -- Scope a Feature

**Timestamp:** 2:15 - 2:45
**Key message:** spec forces you to think before you build. Two phases: questions first, then a full spec.

**On screen:**
- Type in Claude Code:
  ```
  > I want to add a notification system that sends emails when tasks are overdue
  ```
- Agent calls `spec` (phase 1). Show the 6 clarifying questions appearing:
  ```
  PLANNING MODE

  Before we build, let me ask a few questions:

  1. Who is the primary user for this feature?
  2. What problem does this solve? What's the pain point today?
  3. What does "done" look like?
  4. What should this explicitly NOT do?
  5. Are there existing patterns to follow?
  6. Any known edge cases?
  ```
- Quick answer montage (show typing brief answers).
- Agent calls `spec` (phase 2). Show the output: user stories, acceptance criteria, file changes, action plan.
- Quick flash: show spec saved to `memory-bank/features/notification-system.md`

**Voiceover:**

> Now let's scope a feature. I tell the agent I want a notification system. Instead of immediately writing code, it stops and asks six clarifying questions. Who's it for? What does "done" look like? What should it *not* do?
>
> I answer. Then it generates a full spec: user stories, acceptance criteria, a specific file change list, and an action plan. Saved to the memory bank automatically. The agent hasn't written a single line of code yet, and we already have a plan we can review.

### 4c: pre_check -- Validate Before Coding

**Timestamp:** 2:45 - 3:30
**Key message:** pre_check catches over-engineering BEFORE it happens. 11 hardcoded checks.

**On screen:**
- Type in Claude Code:
  ```
  > Okay, let's implement the notification system
  ```
- Agent calls `pre_check`. Show the output -- first a PASSING example (briefly):
  ```
  pre_check:
    Score: 95/100
    Complexity: small (3 files)
    Red flags: none
    Checks: 11/11 passed
    Recommendation: Proceed with implementation.
  ```
- Then show a FAILING example. Simulate the agent proposing an over-engineered plan:
  ```
  > I'll create an abstract NotificationFactory with a strategy pattern,
  > install bull for job queues, add a custom event bus, and create a
  > base class for notification types...
  ```
- pre_check output lights up with failures:
  ```
  pre_check:
    Score: 35/100
    Complexity: excessive (12 files)
    Red flags:
      - Creating 8 new files -- is this necessary?
      - Modifying package.json without explicit dependency request
    Checks:
      [FAIL] Simplest approach -- over-engineered patterns: factory, strategy pattern, event bus
      [FAIL] No unnecessary abstractions -- base class, abstract class detected
      [FAIL] No unnecessary dependencies -- plan adds new packages
      [FAIL] No unrequested files -- creates files not explicitly requested
      [PASS] Scope alignment
      [PASS] No duplication
      ...
    Recommendation: Address before proceeding.
  ```
- Show the agent course-correcting: "Let me simplify. I'll add the notification logic directly to the existing task service..."

**Voiceover:**

> Now the agent goes to implement. But before it writes code, it calls pre_check. This runs 11 hardcoded checks against the plan -- scope alignment, simplest approach, unnecessary abstractions, dependency creep, unrequested refactoring -- all deterministic, no LLM involved.
>
> Watch what happens when the agent proposes a factory pattern with a strategy layer and an event bus. Pre-check gives it a 35 out of 100. Flags the abstract classes, flags the unnecessary packages, flags the 8 new files.
>
> The agent reads the feedback and simplifies. *That's the whole point.* The guardrail fires before a single file is created.

### 4d: diff_review -- Verify After Coding

**Timestamp:** 3:30 - 3:50
**Key message:** diff_review closes the loop. Compares what you planned vs. what you built.

**On screen:**
- After implementation (show 2-3 files created in VS Code sidebar).
- Agent calls `diff_review`. Show the output:
  ```
  diff_review:
    Compliant: true
    Score: 100/100
    In-scope changes: src/services/notifications.ts, src/utils/email.ts
    Violations: none
    Missing changes: none
    Memory bank updated: true
    Recommendation: Implementation looks good. Ship it!
  ```
- Quick flash into `memory-bank/progress.md` -- show the new entry auto-logged.
- Quick flash into `memory-bank/activeContext.md` -- show the timestamp updated.

**Voiceover:**

> After coding, diff_review compares what you actually built against the pre_check contract. Did you touch files you weren't supposed to? Did you create unapproved files? Did you drift from the original scope? It checks all of it. And when it passes, it auto-updates the memory bank -- your progress log, your active context. No manual bookkeeping.

---

## Segment 5: Memory Bank Persistence

**Timestamp:** 3:50 - 4:20
**Key message:** Context survives between sessions. Your agent remembers.

**On screen:**
- Close the terminal window entirely. Dramatic pause (1 second of black screen or desktop).
- Open a brand new terminal. Start Claude Code in the same project.
- Type:
  ```
  > What did we do last session? What's the current priority?
  ```
- Agent calls `memory_bank_read`. Show the output -- it pulls from activeContext.md and progress.md:
  ```
  From memory bank:

  Last session (2026-02-13):
  - Completed notification system (compliance: 100/100)
  - Files changed: src/services/notifications.ts, src/utils/email.ts

  Current context:
  - Feature spec: notification-system (features/notification-system.md)
  - Active priorities: [from activeContext.md]
  ```
- Show the agent immediately picking up where you left off, no re-scanning needed.

**Voiceover:**

> Now here's where it gets good. Close your terminal. Go home. Come back tomorrow. Open a new session.
>
> Your agent reads the memory bank and picks up exactly where you left off. It knows what you built, what files you changed, what the current priorities are, and what specs are in progress. No more "let me scan your codebase." No more re-explaining your architecture. The context is just... there.

---

## Segment 6: Close + CTA

**Timestamp:** 4:20 - 4:45
**Key message:** Simple to install, open source, works today.

**On screen:**
- Clean terminal. Show the install command one more time:
  ```bash
  claude mcp add vibe-check -- npx -y vibe-check-mcp
  ```
- Show the GitHub repo page briefly. Star count visible.
- Text overlay:
  ```
  vibe-check-mcp

  6 tools. 0 LLM calls. Pure discipline.

  github.com/rmanor/vibe-check-mcp
  ```

**Voiceover:**

> vibe-check. One install command. Six tools. Zero LLM calls. It won't make your agent smarter -- it'll make it focused.
>
> Star the repo. Try it on your next project. Links are in the description.
>
> Stop letting your agent build theme factories. Give it some discipline.

---

## Production Notes

**Total runtime:** ~4:30

**Editing tips:**
- Use 1.5x-2x speed for agent output scrolling in the "before" scenario (Segment 1)
- Use real-time for the live demo (Segments 4a-4d) so viewers can follow
- Add subtle zoom-ins on key terminal output (red flag messages, check failures, scores)
- The failing pre_check output (Segment 4c) is the money shot -- linger on it for 3-4 seconds
- Use a simple lower-third for caption overlays in Segment 2
- Background music: lo-fi / chill beats, low volume, no lyrics

**Screen recording setup:**
- Terminal: dark theme (One Dark Pro or similar), 16pt font, 80% terminal width
- VS Code: same dark theme, file tree visible on left
- Resolution: 1920x1080 minimum
- No notifications, no personal bookmarks, clean desktop

**Key moments to nail:**
1. The 15-file dark mode disaster (0:00-0:15) -- this is your hook, make it visceral
2. The pre_check failure cascade (2:45-3:15) -- this is the "wow" moment, the product doing its job
3. The terminal close + reopen (3:50-4:05) -- this is the emotional payoff, context persistence
