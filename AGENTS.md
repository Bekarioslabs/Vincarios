# AGENTS.md - ZEUS Agent V1

## Product Boundary

ZEUS is a local-first assistant for Obsidian-style Markdown vault organization.

Do not turn ZEUS into a general-purpose agent harness.

## Development Priorities

1. safety and user control
2. reliable Markdown/vault workflows
3. clear review UX
4. maintainable architecture
5. local-first provider support

## Mandatory Context Before Large Changes

Read:

```text
docs/rebuild/ZEUS_V1_FINAL_BRIEFING.md
docs/rebuild/ZEUS_V1_PRODUCT_BRIEF.md
docs/rebuild/ZEUS_V1_ARCHITECTURE.md
docs/rebuild/ZEUS_V1_ACTION_MODEL.md
docs/rebuild/ZEUS_V1_SAFETY_RULES.md
docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md
```

Do not add features outside V1 without first updating the product brief and asking Beka.


## Language Rule

Use English for all code-facing and product-facing project artifacts:

- UI labels and visible app text
- code identifiers, comments, TODO markers, and commit messages
- documentation intended for contributors or GitHub
- configuration keys, action names, provider names, and test names

The user may still chat with the assistant in German. Private vault notes may use any language chosen by the user.


## Feature Evaluation Rule

Before adding a large feature, check:

- Does it improve Markdown/vault organization?
- Does it make notes easier to maintain, connect, verify, or reuse?
- Can it work through visible, reviewable actions?
- Does it preserve local-first privacy?
- Does it fit the current architecture, or does required groundwork need to happen first?

If the answer is unclear, update the relevant V1 doc and ask Beka before implementing.

## UX Principle

Important features must be visible in the app flow.

Avoid hidden behavior where users must guess what ZEUS can do. Prefer clear action cards, review baskets, previews, context bars, status messages, and settings.

Recurring workflows should use custom app UI. Native dialogs are acceptable only as temporary scaffolding or operating-system file pickers.

## Theme And CSS Rules

Keep styling centralized and theme-friendly.

Use Obsidian-like CSS variable names where practical:

- `--background-primary`
- `--background-secondary`
- `--background-modifier-border`
- `--text-normal`
- `--text-muted`
- `--text-accent`
- `--interactive-accent`
- `--font-interface`
- `--font-monospace`

Avoid short project-specific color names such as `--bg`, `--bg2`, `--amber`, or `--muted`.

Do not add inline CSS to `index.html` unless there is a narrow technical reason. Prefer focused files under `src/renderer/styles/`.

## Data Boundaries

Do not commit or expose private vault data.

Keep these out of Git and normal app fixtures:

- private user profiles such as `Oracle.md`
- private vault folders and personal projects
- `.obsidian/`
- `.zeus/`
- `.zeus_backups/`
- `node_modules/`
- local model caches, logs, and backup output

The repository must remain usable without Beka's private vault data.

## Provider Design

Providers generate model output only. They must not own vault access, permissions, backups, or safety decisions.

- Provider modules may list models, stream responses, expose capabilities, and later generate embeddings.
- Provider modules must not directly read or write vault files.
- Vault access, review, backup, audit logging, and path checks belong to the app.
- Remote/cloud providers must receive no private vault context unless an explicit future approval flow exists.

Future provider UI slots are allowed only as named integration slots, not fake functionality.

## Action Model Rule

Vault access must remain explicit and reviewable.

Never silently broaden read/write scope. Risky future actions such as batch edit, archive, link-safe rename, export, or trusted writes require stricter previews and approval flows.

## Code Rules

- Keep provider logic separate from vault safety.
- Keep prompt rules separate from UI rendering.
- Keep action schema shared and testable.
- Add tests with safety-sensitive behavior.
- Prefer small modules over large orchestration files.
- Do not recreate a large `renderer.js`-style catch-all file.


## Placeholder And Future Slot Rules

Avoid placeholder code by default. A placeholder is allowed only when it is an intentional V1 scaffold for a near-future feature or visual planning slot.

Every placeholder or future UI/code slot must be explicit and searchable:

- UI placeholders use clear DOM ids/classes and `data-future-slot="feature-name"` where useful.
- Code placeholders include a short `TODO(V1:<feature-name>)` comment naming the future module or owner.
- Visual placeholders must be functional layout slots, not decorative filler.
- Remove obsolete placeholders immediately when the real module is implemented.
- Do not leave unused CSS classes, dead buttons, fake data labels, or dormant code paths.
- If a placeholder is only for visual planning, document it in the relevant V1 doc before or with the code change.

Provider, Review Basket, Context, Settings, and New Project placeholders are acceptable only as named integration slots that can later be wired without rewriting the surrounding shell.

## Safety Laws

- Providers never read or write files.
- Renderer never gets direct filesystem access.
- Main validates every path.
- Writes need review.
- Existing-file writes need backup.
- Executed actions need audit logs.

## Documentation Rule

Docs should be short, active, and decision-oriented.

Archive historical material instead of letting active docs become a long diary.

When implementing or changing a visible feature, workflow, shortcut, permission behavior, action type, provider behavior, or safety rule, update the relevant active documentation in the same change. At minimum, check `README.md`, `docs/rebuild/ZEUS_V1_FINAL_BRIEFING.md`, and the specific V1 doc that owns the behavior.

Do not leave implemented behavior only in code, chat history, or commit messages.

## Before Committing

Run at least:

```bash
npm test
```

Check Git status before committing. Do not commit private vault data, generated dependency folders, local backups, or unrelated user files.
