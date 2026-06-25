# AGENTS.md — ZEUS Agent V1

> **Quick Reference**
> ZEUS is a local-first Markdown vault organizer. Safety and user control come first. All vault writes are explicit, reviewable, and backed up. Providers generate text only — they never touch files.

---

## 1. Identity & Scope

### Product Boundary

ZEUS is a local-first assistant for Obsidian-style Markdown vault organization.

Do not turn ZEUS into a general-purpose agent harness. Do not add features outside V1 without first updating the product brief and asking Beka.

### Development Priorities

1. Safety and user control
2. Reliable Markdown/vault workflows
3. Clear review UX
4. Maintainable architecture
5. Local-first provider support

### Language Rule

Use English for all code-facing and product-facing artifacts:

- UI labels and visible app text
- Code identifiers, comments, TODO markers, and commit messages
- Documentation intended for contributors or GitHub
- Configuration keys, action names, provider names, and test names

The user may chat with the assistant in German. Private vault notes may use any language.

---

## 2. Safety — Read This First

These rules are non-negotiable and enforced in code, not just in prompts.

### Core Safety Laws

- Providers never read or write files.
- Renderer never gets direct filesystem access.
- Main validates every path.
- Writes need review.
- Existing-file writes need backup.
- Executed actions need audit logs.

### Data Boundaries

Keep these out of Git and normal app fixtures:

- Private user profiles such as `Oracle.md`
- Private vault folders and personal projects
- `.obsidian/`, `.zeus/`, `.zeus_backups/`
- `node_modules/`
- Local model caches, logs, and backup output

The repository must remain usable without Beka's private vault data.

### Action Model Rule

Vault access must remain explicit and reviewable. Never silently broaden read/write scope.

Risky future actions — batch edit, archive, link-safe rename, export, trusted writes — require stricter previews and approval flows before implementation.

---

## 3. Architecture

### Provider Design

Providers generate model output only. They must not own vault access, permissions, backups, or safety decisions.

**Allowed:**
- List models, stream responses, expose capabilities, generate embeddings.

**Not allowed:**
- Directly read or write vault files.
- Own vault access, review, backup, audit logging, or path checks.
- Remote/cloud providers may not receive private vault context unless an explicit future approval flow exists.

Future provider UI slots are allowed only as named integration slots, not fake functionality.

### Module Ownership

When adding behavior, identify the owner first. If the owner is unclear, update `docs/rebuild/ZEUS_V1_ARCHITECTURE.md` before coding.

**Renderer modules:**

| Module | Owns |
|---|---|
| `src/renderer/context/contextState.js` | Active target state only |
| `src/renderer/context/contextIntent.js` | Generic intent groups only — no one-off typo or phrase lists |
| `src/renderer/context/contextPackageBuilder.js` | Request-scoped provider context only |
| `src/renderer/files/` | File tree navigation, selected path, reveal/open behavior |
| `src/renderer/permissions/` | Read/Write state, inheritance display, recursive permission helpers |
| `src/renderer/chat/` | Message rendering and provider request dispatch only |
| `src/renderer/review/` | Proposal state, selection, status, previews, and execution handoff |
| `src/renderer/markdown/` | Markdown rendering, preview, link resolution, preview history |
| `src/renderer/shell/` | Layout composition and module wiring only |
| `src/renderer/styles/` | Styling split by UI area with shared tokens in `tokens.css` |

**Main/shared modules:**

| Module | Owns |
|---|---|
| `src/main/vault/` | Validated vault read/write/list services |
| `src/main/providers/` | Provider health, model listing, chat/embedding calls only |
| `src/shared/actions/` | Action schema, proposal parsing, diff helpers |
| `src/shared/vaultProfile/` | Folder roles and vault profile defaults |

### Code Rules

- Keep provider logic separate from vault safety.
- Keep prompt rules separate from UI rendering.
- Renderer modules are browser-first: use loaded `window.Zeus...` APIs before any CommonJS `require(...)` fallback. `require(...)` in renderer modules is only for Node-based tests and must never be the primary browser path.
- Keep action schema shared and testable.
- Add tests for safety-sensitive behavior.
- Prefer small modules over large orchestration files.
- Do not recreate a large `renderer.js`-style catch-all file.

---

## 4. Agent Discipline

### Architectural Principles

- Do not solve architecture or model-behavior issues with narrow one-off patches.
- Prefer structured app state over prompt-word guessing.
- Do not accumulate phrase or typo lists unless Beka explicitly accepts them as temporary scaffolding.
- If a fix starts to look like a special case, stop and generalize through the owning module.
- If no owning module exists, define the module boundary before implementing the behavior.
- New behavior must be placed where future contributors would expect to find it.
- Do not hide implemented behavior only in prompts, chat history, or undocumented assumptions.

### Reasoning Mode

Higher reasoning may be used for architecture, safety, and cross-module decisions. Implementation must stay conservative.

When working with high or extra-high reasoning:

- Do not add extra features beyond the current request.
- Do not invent clever special cases.
- Do not broaden scope because a larger idea seems attractive.
- Prefer the smallest clean architectural cut over a quick local patch.
- Explain when a task should be split before implementing it.

For small scoped implementation, use ordinary reasoning and follow existing module boundaries.

### Stop Conditions

Pause and reassess before editing when any of these is true:

- A fix would add a special-case word, phrase, typo, or prompt workaround.
- A change touches more than two modules without a clear ownership reason.
- A UI behavior requires hidden state that is not visible in the app flow.
- A safety behavior exists only as prompt text rather than code enforcement.
- A test only protects an absurd single input instead of a general behavior.
- A proposed shortcut would make future options, providers, vault profiles, or review flows harder.

If a stop condition is hit: state the owning module and the general rule to implement before changing code.

---

## 5. Workflow & Process

### Context Loading

Load context intentionally. Do not read every V1 document for small or narrow changes.

Read the most relevant active document before changing a related area:

- Product scope or priorities → `docs/rebuild/ZEUS_V1_PRODUCT_BRIEF.md`
- App structure or module boundaries → `docs/rebuild/ZEUS_V1_ARCHITECTURE.md`
- Review basket, writes, diffs, or action execution → `docs/rebuild/ZEUS_V1_ACTION_MODEL.md`
- Security, permissions, path handling, or provider boundaries → `docs/rebuild/ZEUS_V1_SAFETY_RULES.md`
- Visible UI, workflows, shortcuts, Markdown preview, or layout → `docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md`
- Tests, audits, release confidence, or validation strategy → `docs/rebuild/ZEUS_V1_TESTS_AND_AUDITS.md`
- Rebuild process or repository hygiene → `docs/rebuild/ZEUS_V1_REBUILD_PROCESS.md`

For large cross-cutting changes, read all of the above plus `docs/rebuild/ZEUS_V1_FINAL_BRIEFING.md`.

Avoid loading historical audit files unless the task explicitly asks for audit review or old decisions.

### Feature Evaluation

Before adding a large feature, verify:

- Does it improve Markdown/vault organization?
- Does it make notes easier to maintain, connect, verify, or reuse?
- Can it work through visible, reviewable actions?
- Does it preserve local-first privacy?
- Does it fit the current architecture, or does required groundwork need to happen first?

If any answer is unclear, update the relevant V1 doc and ask Beka before implementing.

### Before Committing

```bash
npm test
```

Check Git status before committing. Do not commit private vault data, generated dependency folders, local backups, or unrelated user files.

---

## 6. UI & Styling

### UX Principle

Important features must be visible in the app flow. Avoid hidden behavior where users must guess what ZEUS can do.

Prefer clear action cards, review baskets, previews, context bars, status messages, and settings. Recurring workflows should use custom app UI. Native dialogs are acceptable only as temporary scaffolding or OS file pickers.

### Theme & CSS Rules

Keep styling centralized and theme-friendly. Use Obsidian-like CSS variable names:

- `--background-primary`, `--background-secondary`, `--background-modifier-border`
- `--text-normal`, `--text-muted`, `--text-accent`
- `--interactive-accent`
- `--font-interface`, `--font-monospace`

Avoid short project-specific names like `--bg`, `--bg2`, `--amber`, or `--muted`.

Do not add inline CSS to `index.html` unless there is a narrow technical reason. Prefer focused files under `src/renderer/styles/`.

### Placeholder & Future Slot Rules

Avoid placeholder code by default. A placeholder is allowed only when it is an intentional V1 scaffold for a near-future feature.

Every placeholder must be explicit and searchable:

- UI placeholders use clear DOM ids/classes and `data-future-slot="feature-name"` where useful.
- Code placeholders include a `TODO(V1:<feature-name>)` comment naming the future module or owner.
- Visual placeholders must be functional layout slots, not decorative filler.
- Remove obsolete placeholders immediately when the real module is implemented.

### UI Shell Verification

After changing app shell, splash screen, layout mounting, script load order, or shared renderer wiring:

1. Run `npm test`
2. Verify the app starts
3. Verify the splash `Open Vault` path is clickable
4. Verify that the main visible panels still mount
5. Add or update a regression test if the failure was caused by initialization order, missing handlers, or module load order

Do not claim the UI shell is clean if these checks were not performed.

---

## 7. Operations

*These rules govern agent runtime behavior — not architecture.*

### Known Tool Friction

Handle recurring environment issues quietly and consistently:

- If a read command fails because of a known Windows or sandbox issue, retry once with an equivalent approved command or a narrower read.
- If a command fails because of sandboxing or restricted access, request escalation through the tool instead of inventing indirect workarounds.
- If an optional external skill path is missing, note it briefly and continue with the closest manual process.
- Do not over-explain repeated tool friction. Mention it only when it blocks the task or changes the result.
- Prefer stable project-local checks (`npm test`, targeted `node --test`, `git diff --check`, `rg`) over exploratory command retries.

### Execution Efficiency

Reduce unnecessary token use without lowering safety:

- For small changes, inspect only the owning module, its tests, and the relevant V1 doc.
- Prefer targeted tests first, then full `npm test` before claiming completion.
- Summarize repeated findings once — do not restate long historical context unless needed for a decision.
- Keep user updates concise: what is being changed, what is intentionally not being changed, and what verification will run.
- When a known issue already has a documented follow-up, reference the owning doc instead of re-discussing it.

---

## 8. Documentation Rule

Docs should be short, active, and decision-oriented. Archive historical material instead of letting active docs become a long diary.

When implementing or changing a visible feature, workflow, shortcut, permission behavior, action type, provider behavior, or safety rule — update the relevant active documentation in the same change.

At minimum, check:
- `README.md`
- `docs/rebuild/ZEUS_V1_FINAL_BRIEFING.md`
- The specific V1 doc that owns the behavior

Do not leave implemented behavior only in code, chat history, or commit messages.
