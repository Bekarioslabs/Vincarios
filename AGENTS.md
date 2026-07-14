# AGENTS.md — Vitruvios V1

> **Quick Reference**
> Vitruvios is a local-first Markdown vault assistant. Safety first. All vault writes are explicit, reviewable, and backed up. Providers generate text only — they never touch files.

---

## 1. Identity & Scope

Vitruvios is a local-first assistant for Obsidian-style Markdown vault organization. It complements Obsidian, it does not replace it.

**Not Vitruvios:** general-purpose agent, cloud AI client, standalone media manager, plugin ecosystem.

Do not add features outside V1 without updating the product brief and asking Beka.

**Priorities:** Safety → Reliable Markdown workflows → Review UX → Maintainable architecture → Local providers

**Language:** English for all code, UI labels, docs, config keys, action names, commit messages, and tests. German is allowed in chat and private vault notes.

---

## 2. Safety Laws

These are enforced in code, not prompts. Non-negotiable.

- Providers never read or write vault files.
- Renderer never gets direct filesystem access.
- Main validates every path.
- Writes require visible review.
- Existing-file writes require backup.
- Executed actions require audit log entries.
- Dot folders (`.obsidian`, `.vitruvios`, `.vitruvios_backups`) are always blocked.
- Remote providers receive no private vault context by default.

**Permission model:**
- Read = Vitruvios may use the path as context.
- Write = Vitruvios may propose write actions. Write never means silent execution.
- V1 has no Trusted/Yolo mode.

**Code beats Brain:** Brain/Core Markdown may explain and configure behavior. It must not override code-side safety laws, permissions, vault profile validation, provider boundaries, or reviewed write flows.

**Data boundaries — keep out of Git:**
Private profiles (e.g. `Oracle.md`), vault data, `.obsidian/`, `.vitruvios/`, `.vitruvios_backups/`, `node_modules/`, model caches, backups. The repo must work without Beka's private vault.

---

## 3. Architecture

### Provider Design

Providers generate model output only.

**Allowed:** list models, stream responses, expose capabilities, generate embeddings.

**Not allowed:** read or write vault files; own vault access, review, backup, audit logging, or path checks; receive private vault context without an explicit approval flow.

Future provider UI slots are allowed only as named integration slots, not fake functionality.

### Module Ownership

When adding behavior, identify the owner first. If unclear, update `docs/rebuild/VITRUVIOS_V1_ARCHITECTURE.md` before coding.

**Renderer modules:**

| Module | Owns |
|---|---|
| `src/renderer/context/contextState.js` | Active target state only |
| `src/renderer/context/contextIntent.js` | Narrow intent groups only. No one-off phrase or typo lists. Prefer deterministic app-state actions over language guessing. |
| `src/renderer/context/pendingActionState.js` | One open request-scoped scope clarification |
| `src/renderer/context/blockedActionState.js` | Retryable blocked actions (missing R or W) |
| `src/renderer/context/contextLimits.js` | Central request-size caps |
| `src/renderer/context/folderContextController.js` | Selected-folder scope decisions |
| `src/renderer/context/contextPackageBuilder.js` | Request-scoped provider context only |
| `src/renderer/files/` | File tree navigation, selected path, reveal/open behavior |
| `src/renderer/permissions/` | Read/Write state, inheritance display, recursive permission helpers |
| `src/renderer/selectionActions/` | Deterministic actions for selected file/folder; app-state driven, not prompt-trigger driven |
| `src/renderer/selection/` | Scoped selection: region-aware `Ctrl+A`, right-click select/copy |
| `src/renderer/chat/` | Message rendering and provider request dispatch only |
| `src/renderer/review/` | Proposal state, selection, status, previews, and execution handoff |
| `src/renderer/markdown/` | Markdown rendering, preview, link resolution, preview history |
| `src/renderer/shell/` | Layout composition and module wiring only |
| `src/renderer/styles/` | Styling per UI area; shared tokens in `tokens.css` |

**Main/shared modules:**

| Module | Owns |
|---|---|
| `src/main/vault/` | Validated vault read/write/list services |
| `src/main/providers/` | Provider health, model listing, chat/embedding calls only |
| `src/main/safety/` | Path validation, dot-folder blocking |
| `src/main/backup/` | Backup before existing-file changes |
| `src/main/audit/` | Audit log entries |
| `src/main/settings/` | Settings persistence and IPC |
| `src/shared/actions/` | Action schema, proposal parsing, diff helpers |
| `src/shared/vaultProfile/` | Folder roles and vault profile defaults |

### Vault Folder Roles

Use folder roles in code, not hard-coded names.
Source of truth: `src/shared/vaultProfile/defaults.js` — always read the file before assuming role names.

Phase 5.4 target (English defaults — may not yet be in code):
```
inbox     → 00_Inbox
daily     → 01_Daily
projects  → 02_Projects
knowledge → 03_Knowledge
brain     → 90_AI_Brain
archive   → 99_Archive
```

If `defaults.js` still contains German names, that is the current canonical state. Do not change role names without Beka's explicit instruction.

### Code Rules

- Keep provider logic separate from vault safety.
- Keep prompt rules separate from UI rendering.
- Renderer modules are browser-first: use `window.Vitruvios...` APIs before any `require(...)` fallback. `require(...)` exists only for Node tests.
- Keep action schema shared and testable.
- Add tests for safety-sensitive behavior.
- Prefer small modules over large orchestration files.
- Do not recreate a large `renderer.js`-style catch-all file.

---

## 4. Agent Discipline

### Architectural Principles

- Prefer structured app state over prompt-word guessing.
- Do not accumulate phrase or typo lists unless Beka explicitly accepts them as temporary scaffolding.
- Do not solve architecture or model-behavior issues with narrow one-off patches.
- If a fix starts to look like a special case, stop and generalize through the owning module.
- If no owning module exists, define the module boundary before implementing the behavior.
- New behavior must be placed where future contributors would expect to find it.
- Do not hide behavior only in prompts, chat history, or undocumented assumptions.

### Reasoning Mode

Higher reasoning is for architecture, safety, and cross-module decisions. It is not permission to widen scope, add clever special cases, or perform larger edits than the current step needs.

### Small Step Protocol

For ordinary implementation work unless Beka asks for a larger batch:

1. State the goal in one sentence.
2. Name the owning module(s).
3. Touch the smallest practical file set — ideally one to three files.
4. Do not combine unrelated UI, logic, documentation, and cleanup in one change.
5. Run targeted tests for the changed behavior.
6. Ask Beka to test visible UI behavior before moving to the next UI step.
7. Run the full test suite before committing or before safety-sensitive claims.

If a small task starts requiring many files or repeated fixes, stop and reframe it as an architecture step.

### Stop Conditions

Pause and reassess when any of these is true:

- A fix adds phrase/typo lists or hidden state instead of deterministic app logic.
- A change touches more than two modules without a clear ownership reason.
- A UI behavior requires hidden state that is not visible in the app flow.
- A safety behavior exists only as prompt text, not code enforcement.
- A test only protects an absurd single input instead of a general behavior.
- A proposed shortcut would make future options, providers, vault profiles, or review flows harder.

State the owning module and the general rule before changing code.

### External Suggestions

Treat suggestions from Claude, ChatGPT, audits, or other tools as design input only. Map each suggestion to Vitruvios ownership boundaries, safety rules, and current V1 docs before implementing. If a suggestion does not fit the architecture, adapt the idea or decline it.

---

## 5. Workflow & Process

### Context Loading — One-Doc Rule

For a change touching one module, load exactly one doc.
Load `FINAL_BRIEFING.md` only for cross-cutting changes spanning two or more doc areas.

**Canonical source per area:**

| Area | Canonical doc |
|---|---|
| Product scope or priorities | `docs/rebuild/VITRUVIOS_V1_PRODUCT_BRIEF.md` |
| Module boundaries, source structure, provider plan, folder roles | `docs/rebuild/VITRUVIOS_V1_ARCHITECTURE.md` |
| Review basket, writes, diffs, action execution | `docs/rebuild/VITRUVIOS_V1_ACTION_MODEL.md` |
| Security, permissions, path handling, provider boundaries | `docs/rebuild/VITRUVIOS_V1_SAFETY_RULES.md` |
| UI, workflows, shortcuts, Markdown preview, layout, context/permission UI | `docs/rebuild/VITRUVIOS_V1_UI_AND_WORKFLOWS.md` |
| Tests, audits, release confidence | `docs/rebuild/VITRUVIOS_V1_TESTS_AND_AUDITS.md` |
| Rebuild process, repository hygiene | `docs/rebuild/VITRUVIOS_V1_REBUILD_PROCESS.md` |
| Phase checklist and open tasks | `docs/rebuild/VITRUVIOS_V1_IMPLEMENTATION_PLAN.md` |
| Cross-cutting or freeze-gate decisions only | `docs/rebuild/VITRUVIOS_V1_FINAL_BRIEFING.md` |

Do not load historical audit files unless the task explicitly asks for audit review.

### Feature Evaluation

Before adding a large feature, verify:

- Does it improve Markdown/vault organization?
- Can it work through visible, reviewable actions?
- Does it preserve local-first privacy?
- Does it fit the current architecture, or does groundwork need to happen first?

If any answer is unclear, update the relevant V1 doc and ask Beka before implementing.

### Verification Levels

| Change type | Verification |
|---|---|
| Docs-only | Format/status check |
| Small isolated code change | Targeted tests + syntax check |
| UI shell, IPC, provider, context, permissions, or write flow | Targeted tests + full suite before claiming completion |
| Before any commit | `npm test` |

---

## 6. UI & Styling

### UX Principle

Important features must be visible in the app flow. Prefer action cards, review baskets, previews, context bars, and status messages over hidden behavior.

### Component Rules

Before adding or changing buttons, modals, badges, score indicators, action rows, status feedback, or icon-only controls, follow `docs/rebuild/VITRUVIOS_V1_UI_COMPONENT_RULES.md`.

### Accessibility Rules

New UI controls must be accessible when they are introduced, not retrofitted later.

- Buttons, toggles, icon-only controls, dialogs, inputs, live status areas, dynamic action rows, and custom resize/selection controls need meaningful labels/states such as `aria-label`, `aria-expanded`, `aria-controls`, `aria-live`, `role`, or `aria-labelledby` when applicable.
- Dynamic accessibility labels must use values that are in the owning component/function scope.
- Important dynamic controls should get focused source or behavior tests in the same change.
- A final V1 accessibility pass is still required, but it is a verification pass, not a substitute for building accessible UI from the start.
### CSS Rules

Use the CSS variable names established in `src/renderer/styles/tokens.css`. Keep naming Obsidian-compatible where possible:

```
--background-primary      --background-secondary
--background-modifier-border
--text-normal             --text-muted             --text-accent
--interactive-accent
--font-interface          --font-monospace
```

Do not add short project-specific aliases (`--bg`, `--bg2`, `--amber`).
Do not add inline CSS to `index.html`. Prefer focused files under `src/renderer/styles/`.

### Placeholder Rules

A placeholder is allowed only for an intentional V1 scaffold near a near-future feature.

Every placeholder must be explicit:
- UI: `data-future-slot="feature-name"`
- Code: `TODO(V1:<feature-name>)` naming the future module

Remove obsolete placeholders immediately when the real module ships.

### UI Shell Verification

After changing app shell, splash, layout mounting, script load order, or shared renderer wiring:

1. Run `npm test`
2. Verify app starts
3. Verify splash `Open Vault` path works
4. Verify main panels still mount
5. Add or update a regression test if the failure was caused by init order or module load order

---

## 7. Documentation Rule

When implementing or changing a visible feature, workflow, permission behavior, action type, provider behavior, or safety rule — update the relevant canonical doc in the same change.

**What to check:**
- The specific V1 doc that owns the behavior (see canonical table in Section 5)
- `README.md` only for user-facing feature, setup, release, or start command changes
- `docs/rebuild/VITRUVIOS_V1_FINAL_BRIEFING.md` only for cross-cutting or freeze-gate changes

Docs should be short, active, and decision-oriented. Archive historical material instead of letting active docs grow into a diary.

---

## 8. Environment

See `docs/CODEX_SETUP.md` for tool friction, Windows/sandbox workarounds, and environment-specific commands.
