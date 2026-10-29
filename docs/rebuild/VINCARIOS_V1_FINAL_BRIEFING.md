# vincarios V1 Final Briefing

## Closure Direction

Feature development has ended. Complete accepted safety hardening and internal Windows verification, then prepare a source-only GPL archive. No public EXE or ongoing beta/support program is planned; the repository has not yet been publicly archived. Product descriptions below document implemented behavior, not new feature commitments. Historical future-version references are ideas for independent forks. The source archive checklist owns the remaining publication gates.

Audit triage reference: [VINCARIOS_V1_AUDIT_TRIAGE.md](./VINCARIOS_V1_AUDIT_TRIAGE.md).

## Product Sentence

vincarios is a local-first Markdown and project workspace that helps users safely analyze, organize, connect, and update notes through visible, reviewable, reversible actions. Obsidian-style vault compatibility is a supported workflow, not the product's entire identity.

This is the V1 product positioning. The product name is styled as lowercase `vincarios` in user-facing text; PascalCase `Vincarios...` remains valid for internal JavaScript identifiers.

## Product Boundary

vincarios V1 is:

- local-first
- Markdown-first
- compatible with Obsidian-style vault workflows
- review-first
- safety-first

vincarios V1 is not:

- a second Obsidian
- a general-purpose agent harness
- a cloud AI client
- a media manager
- a plugin ecosystem

## V1 Core Features

1. Vault open and vault profile.
2. Local providers: LM Studio and Ollama.
3. File tree and Markdown preview.
4. Context control with visible Context Basket.
5. Read/Write permissions with direct, inherited, and blocked/off states.
6. Review Basket for grouped, selectable proposals.
7. Diff and safe Markdown actions.
8. Inbox cleanup reports and grouped Suggestions workspace.
9. Local embeddings V1-light for similar-note discovery plus deterministic Search over metadata and opt-in Full-text data.
10. New Note and New Project workflows from deterministic presets.
11. Vault-local settings for profiles, providers, action defaults, indexes, and built-in Light/Dark theme packs.
12. Basic image preview and safe Markdown image-embed handling.

## Not V1

- Vision analysis and full image workflows.
- PDF/audio/video.
- Cloud providers.
- Plugin system.
- Trusted/Yolo mode.
- Theme Editor, shareable JSON theme packages, and Obsidian theme compatibility.
- Large autonomous cleanup.
- Complex link repair after mass rename.
- Monetization.
- External web research.
- Mobile.
- Multi-window.
- Bundled chat LLMs.
- Specialized project dashboards.

## UI Layout

```text
Left navigation | Main workspace | Vault panel
```

Main workspace choices:

```text
Chat: Chat history -> Context Basket -> Input field
Review: Dedicated Review Basket workspace
Search / Suggestions / Home: Dedicated local workspaces
```

Vault panel keeps Files, Selection Actions, and Markdown Preview visible in the same workspace.

Markdown preview renders sanitized HTML and displays YAML frontmatter as a visible Properties block. Assistant chat messages use the same shared Markdown renderer; user messages remain plain text, and `Save as Note` stores raw Markdown rather than rendered HTML.

The preview toolbar can switch to local Markdown source mode. Persisting edits is handled later through Review/Write, not by direct preview writes.

Internal Markdown links and wikilinks can open resolved notes in the preview without automatically expanding the file tree. The preview toolbar provides back/forward history for preview navigation and `Reveal in Files` when the user intentionally wants the file tree to open and select the previewed note.

Resizable panes need minimum sizes.

## Review Basket

The Review Basket is a standalone module, not part of chat rendering.

Current foundation: shared action schema and proposal-plan parsing normalize V1 action suggestions into Review Basket items. Assistant responses can add a `create_note` proposal for `Save as Note` into the Review Basket. Identical open proposals are de-duplicated. Proposals can be selected, dismissed from the visible basket, and pending proposals can be cleared as a group. Selected `create_note` proposals execute after an in-app Create Preview with an editable title field; main validates paths, refuses overwrites, writes the Markdown file, and appends an audit entry. Selected `update_note` proposals are unselected by default, require current/proposed content, show an Apply Update diff preview, create a `.vincarios/backups` copy, reject stale file content, write the proposed Markdown, and append audit entries. Phase 3 stops at this foundation: `insert_into_note`, `move_note`, `rename_note`, and `archive_note` are known schema types but remain non-executable until their dedicated reviewed services exist.

Proposal statuses:

- open
- selected
- running
- done
- failed
- rejected
- stale

The basket is not blindly cleared after execution. It updates proposal statuses and focuses the active view on open, failed, and stale items.

V1 uses automatic safe execution ordering. Manual drag-and-drop ordering is future work.

## Reviewed Update Flow

Reliable file updating is V1-critical. vincarios must be able to turn chat or local Edit Mode changes into reviewed `update_note` proposals for the selected Markdown file when `R` and `W` allow it. The V1 scope is reliable whole-note replacement through reviewed diff, not a complex partial-edit engine. The app should produce clear permission guidance when access is missing, instead of letting the model fall back to generic filesystem disclaimers. All applied updates still go through diff preview, backup, stale-content validation, and audit logging. Focused insert/replace by section is V1.1 work.

## Permissions

- Read means vincarios may use the path as context.
- Write means vincarios may propose write actions.
- Write never means silent execution.
- Three states: direct, inherited, blocked/off. Explicit child off overrides inherited parent access.
- Dot/runtime folders are blocked regardless of UI state.
- Permission shortcuts: Click affects one path, Ctrl+Click affects visible/expanded descendants, Shift+Click recursively affects all descendants through folder listing only.

## Context

Selection and provider context are separate states.

Selecting a file or folder in Files only changes the active UI target. It does not automatically attach content to provider requests.

The Context Basket is the explicit selected-file/folder context source. Items are added through app flows such as Selection Actions, shown in the Chat workspace, removable individually, clearable together, and clickable to reveal/select their target in Files.

File context items attach Markdown content only when explicitly added with `R`. Folder Context creates a visible bounded Markdown snapshot after an explicit scope choice: current folder or subfolders, depth, maximum files and total-character limits. The packet records included paths/content, effective scope and truncation. It is not a live folder feed; replace it explicitly to capture later note changes. Legacy path-only folder items still contain no note content. Attached context is request-scoped and is not stored in chat history.

If Read is not active for the selected file/folder or one of its parent folders, vincarios must ask the user to enable `R`; it must not guess from the file name or ask for a file upload.

Missing Read/Write blocks show a clear permission message in chat or the relevant panel. V1 does not show permission retry buttons, because they look too similar to real follow-up actions. After enabling the missing permission, the user repeats the original Selection Action or request explicitly. If the selected file has permission but no loaded content, vincarios should instruct the user to reselect/click the file or refresh the preview inside vincarios, not switch to external upload instructions.

Selecting a folder does not load it into chat. With explicit Context Basket items, ordinary folder questions continue to the provider instead of being replaced by selection guidance. Without explicit items, folder-content wording may show `Use "Inspect Folder" in Selection Actions to inspect the selected folder.` It does not itself list or read the folder. `Inspect folder` is deterministic and reads structure only; `Check whole tree` uses bounded recursion. Existing pending scope replies and blocked-action retries remain separate app-state flows. Supported `list_folder` / `list_directory` envelopes remain a validated fallback, not provider filesystem access; generated listing filenames are not stored in provider history.

Persistent local indexes are separate from explicit Context Basket snapshots. Index health, metadata search, Similar Notes and opt-in full-text data live under the app-owned `.vincarios/` namespace, not in normal vault notes. Local indexing alone does not attach notes to a provider request.

Context package sources are visibly separated with source labels such as `context_basket`; future dropped Markdown and embedding candidate sources must use their own labels instead of blending into the active selection. Dropped `.md` files become temporary context immediately. They are not automatically imported into the vault. External dropped Markdown files get an `Import to Inbox` action.

Selection Actions are deterministic app buttons for selected targets. Action colors represent behavior categories (`Context`, `Read`, `Write`, later `Organize`); target types use neutral badges such as `DIR`, `MD`, `IMG`, and `FILE`. Current folder actions are Context, Inspect and Summary; Markdown actions are Summary, Context, Similar Notes, Suggest tags and Propose content update. Folder Context and Summary share explicit bounded Markdown scope. Future actions must enter through the same action registry and permission checks.
## Actions

Read/search:

- `list_folder`
- `read_note`
- `search_index`
- `find_similar`

Write:

- `create_note` - executable in Phase 3
- `update_note` - executable in Phase 3 with diff, backup, stale-content check, and audit
- `create_from_template` - executable as one reviewed Main-owned transaction
- `insert_into_note` - known, non-executable until its focused service exists
- `move_note` - known, non-executable until its focused service exists
- `rename_note` - known, non-executable until its focused service exists
- `archive_note` - known, non-executable until its focused service exists

Suggestions:

- `suggest_links`
- `suggest_tags`
- `suggest_folder`
- `proposal_plan`

`delete_note` is not executable in V1. Automatic archive and trash-emptying workflows are not implemented; do not present their schema vocabulary as available file operations.

## Embeddings V1-Light

Embeddings are local search support, not automation authority.

V1 provides similar-note discovery from the local vector index. Tag/YAML suggestions in V1 use conservative local metadata heuristics and may later be improved by metadata-index inputs. Link candidates and folder/destination candidates move to V1.1 because they need exact diff/review and safe move/link-update services before they can become executable.

Settings exposes index health and one refresh flow for enabled indexes. Full-text search is an explicit opt-in. Watcher-driven freshness/incremental updates do not promise automatic embedding rebuilds after every change; the displayed state determines whether a manual refresh is needed.

## New Project

Project creation is deterministic app logic, not LLM improvisation.

Default structure:

```text
02_Projects/Project_Name/
  Project_Name.md
  Instructions.md
  References.md
  Brainstorm.md
  Tasks.md
  Decisions.md
  Log.md
  Knowledge/
```

The default ships with V1 but must be implemented as a template/preset.

## Provider And Chat Request Control

Current Phase 5 provider foundation: LM Studio uses default URL `http://127.0.0.1:1234` with OpenAI-compatible chat/model endpoints. Ollama uses default URL `http://127.0.0.1:11434` with native `/api/tags` and `/api/chat` endpoints. Both share the same provider registry, persisted active provider/model selection, provider capability display, and topbar provider/model dropdowns. Settings can override local provider URLs, edit V1 limits, and override vault folder roles through a dedicated settings store, IPC bridge, and Settings panel without changing provider modules. Provider modules generate model output and model metadata only; they never read or write vault files.

Current chat cancellation: running provider requests use request ids, `AbortController`, `chat:cancel` IPC, Send-to-Cancel button state, and late-response protection. Cancel is a real provider abort, not only UI-side ignoring.

## Options

V1 Options:

- Vault Profile
- Providers: persisted local URL overrides, active provider, selected model, capability display
- Limits: provider timeout, model-list timeout, context/listing/analysis/review caps
- Vault Indexes
- Safety
- Templates
- Appearance: Light/Dark/System plus built-in Vault theme packs

Not V1 Options:

- Theme Editor, shareable theme packages, and Obsidian theme compatibility
- plugins
- cloud providers
- trusted/yolo mode
- monetization
- complex shortcut editor

## Architecture Rules

- Providers never read/write files.
- Renderer never gets direct filesystem power.
- Main validates paths and enforces safety.
- Main enforces filesystem transactions and the trusted-window IPC boundary; visible review and R/W context state are currently renderer-owned, not independently proven human approval in Main.
- Prompt rules live in a prompt module, not in UI rendering.
- Review state is separate from chat.
- Permissions and context are separate modules.
- The bootstrap entry initializes modules only.

## V1 Freeze Gate

Phase 8 is the final product-readiness and scope-freeze gate: decide public identity, complete only the explicitly accepted small V1 workflows, then freeze scope. Phase 9 is release hardening and baseline verification. V1 is done when both phases are complete and a sober release review finds no remaining must-have gaps. After scope freeze, a new finding becomes V1-must only if it blocks safety, core usefulness, or external testing. Useful but non-blocking ideas move to V1.1 or the Parking Lot.

## Brain OS Direction

A new slim Brain OS is not a shortcut around app architecture. It may be added only after code-side safety laws, app boundaries, load order, and validation are defined.

Priority:

```text
Code Safety Laws
> App Configuration / Vault Profile
> Brain Core Rules
> Behavior Preferences
> Project Rules
> Current Chat Request
```

Brain files may explain and configure behavior. They must not override code safety, permissions, vault profile validation, provider boundaries, or reviewed write flows.

## Test And Audit Rule

Tests start on day one and continue in every implementation phase.

Focused audits happen after each major block:

- scaffold
- vault safety
- action/review
- permissions/context
- providers and real chat abort
- embeddings
- reviewed update flow
- first cleanup workflow
- V1 freeze

## Rebuild Rule

The prototype is reference material, not the new foundation.

Do not copy old large orchestration files forward.

Use the same lessons, not the same structure.

The implemented UI uses grouped left navigation, a main workspace and resizable Files, Selection Actions and Markdown Preview panes. Two-pane Settings, visible YAML Properties, scoped selection and file-tree keyboard navigation remain the current foundation. This document describes that implementation; historical phase labels are not new build instructions.
