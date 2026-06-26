# ZEUS V1 Final Briefing

Audit triage reference: [ZEUS_V1_AUDIT_TRIAGE.md](./ZEUS_V1_AUDIT_TRIAGE.md).

## Product Sentence

ZEUS is a local Obsidian-vault assistant that helps users safely analyze, organize, connect, and update Markdown notes through visible, reviewable, reversible actions.

## Product Boundary

ZEUS V1 is:

- local-first
- Markdown-first
- Obsidian-vault oriented
- review-first
- safety-first

ZEUS V1 is not:

- a second Obsidian
- a general-purpose agent harness
- a cloud AI client
- a media manager
- a plugin ecosystem

## V1 Core Features

1. Vault open and vault profile.
2. Local providers: LM Studio and Ollama.
3. File tree and Markdown preview.
4. Context control with visible context bar.
5. Read/Write permissions with direct, inherited, and blocked/off states.
6. Review Basket for grouped, selectable proposals.
7. Diff and safe Markdown actions.
8. Inbox/project/knowledge cleanup suggestions.
9. Local embeddings V1-light.
10. New Project workflow from templates.
11. Minimal settings foundation.
12. Basic image file handling foundation only if it remains safe, small, and does not delay core Markdown workflows.

## Not V1

- Vision analysis and full image workflows.
- PDF/audio/video.
- Cloud providers.
- Plugin system.
- Trusted/Yolo mode.
- Theme system beyond basic CSS-variable readiness.
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

Main workspace order:

```text
Chat history
Review Basket
Context bar
Input field
```

Vault panel keeps file tree and preview visible at the same time.

Markdown preview renders sanitized HTML and displays YAML frontmatter as a visible Properties block. Assistant chat messages use the same shared Markdown renderer; user messages remain plain text, and `Save as Note` stores raw Markdown rather than rendered HTML.

The preview toolbar can switch to local Markdown source mode. Persisting edits is handled later through Review/Write, not by direct preview writes.

Internal Markdown links and wikilinks can open resolved notes in the preview without automatically expanding the file tree. The preview toolbar provides back/forward history for preview navigation and `Reveal in Files` when the user intentionally wants the file tree to open and select the previewed note.

Resizable panes need minimum sizes.

## Review Basket

The Review Basket is a standalone module, not part of chat rendering.

Current foundation: shared action schema and proposal-plan parsing normalize V1 action suggestions into Review Basket items. Assistant responses can add a `create_note` proposal for `Save as Note` into the Review Basket. Identical open proposals are de-duplicated. Proposals can be selected, dismissed from the visible basket, and pending proposals can be cleared as a group. Selected `create_note` proposals execute after an in-app Create Preview with an editable title field; main validates paths, refuses overwrites, writes the Markdown file, and appends an audit entry. Selected `update_note` proposals are unselected by default, require current/proposed content, show an Apply Update diff preview, create a `.zeus/backups` copy, reject stale file content, write the proposed Markdown, and append audit entries. Phase 3 stops at this foundation: `insert_into_note`, `move_note`, `rename_note`, and `archive_note` are known schema types but remain non-executable until their dedicated reviewed services exist.

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

Reliable file updating is V1-critical. ZEUS must be able to turn chat or local Edit Mode changes into reviewed `update_note` proposals for the selected Markdown file when `R` and `W` allow it. The V1 scope is reliable whole-note replacement through reviewed diff, not a complex partial-edit engine. The app should produce clear permission guidance when access is missing, instead of letting the model fall back to generic filesystem disclaimers. All applied updates still go through diff preview, backup, stale-content validation, and audit logging. Focused insert/replace by section is V1.1 work.

## Permissions

- Read means ZEUS may use the path as context.
- Write means ZEUS may propose write actions.
- Write never means silent execution.
- Three states: direct, inherited, blocked/off.
- Dot/runtime folders are blocked regardless of UI state.
- Permission shortcuts: Click affects one path, Ctrl+Click affects visible/expanded descendants, Shift+Click recursively affects all descendants through folder listing only.

## Context

Auto-context is enabled by default and has a visible toggle in the context bar.

Selected Markdown files are attached only for the current provider request, only when the user's prompt clearly targets the selected/current file or note. General questions stay neutral. Attached selected-file content is not stored in chat history.

If Auto-context is off, ZEUS may know the selected path but must not claim to know the file content.

If Read is not active for the selected file or one of its parent folders, ZEUS must ask the user to enable `R`; it must not guess from the file name or ask for a file upload.

Follow-up prompts after enabling Read, such as `ok hab es aktiviert`, `try now`, or `this file is selected`, must still target the selected file. If the selected file has permission but no loaded content, ZEUS should instruct the user to reselect/click the file or refresh the preview inside ZEUS, not switch to external upload instructions.

Selected folders expose the folder path only. They are not blindly fully loaded. When `R` is active, direct folder-content prompts are handled by a request-scoped read-context preflight through the preload vault API. Folder scope is controlled by `PendingActionState` plus `FolderContextController`: ambiguous folder work creates explicit current-level, all-subfolders, and cancel choices; short replies such as `all` or `alle` only resolve an existing pending folder action; without a pending action they are intercepted with a short app-level clarification and do not reach the provider. Current-level and recursive folder listings are capped by central context limits and show explicit limit markers when a cap is reached. Supported `list_folder` model-action envelopes remain a fallback, are checked against the active selection, and are returned as a ZEUS message instead of raw tool-call text.

Future Folder Context Index: selected folders can be counted first, then listed and remembered only after user approval. Persistent folder indexes belong in `.zeus/` or a configured cache location, not blindly in normal vault notes. They should later combine with embeddings for folder candidates, similar-note lookup, and stale-index detection.

Context package sources are visibly separated with source labels such as `selected_file` and `selected_folder`; future dropped Markdown and embedding candidate sources must use their own labels instead of blending into the active selection. Dropped `.md` files become temporary context immediately. They are not automatically imported into the vault. External dropped Markdown files get an `Import to Inbox` action.

## Actions

Read/search:

- `list_folder`
- `read_note`
- `search_index`
- `find_similar`

Write:

- `create_note` - executable in Phase 3
- `update_note` - executable in Phase 3 with diff, backup, stale-content check, and audit
- `insert_into_note` - known, non-executable until its focused service exists
- `move_note` - known, non-executable until its focused service exists
- `rename_note` - known, non-executable until its focused service exists
- `archive_note` - known, non-executable until its focused service exists

Suggestions:

- `suggest_links`
- `suggest_tags`
- `suggest_folder`
- `proposal_plan`

`delete_note` is not a normal V1 action. V1 archives first. Permanent deletion is a separate trash-emptying workflow.

## Embeddings V1-Light

Embeddings are local search support, not automation authority.

They provide:

- similar notes
- link candidates
- tag candidates
- folder candidates

Indexing is automatic by default, can be disabled in Options, and can be rebuilt manually.

## New Project

Project creation is deterministic app logic, not LLM improvisation.

Default structure:

```text
02_Projekte/Project_Name/
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

V1 provider work must include real chat cancellation, not only UI-side ignoring. A running chat request needs a request id, cancellable provider call, `chat:cancel` IPC, Send-to-Cancel button state, and protection against late cancelled responses appearing in chat.

## Options

V1 Options:

- Vault Profile
- Providers
- Limits
- Embeddings
- Safety
- Templates

Not V1 Options:

- themes
- plugins
- cloud providers
- trusted/yolo mode
- monetization
- complex shortcut editor

## Architecture Rules

- Providers never read/write files.
- Renderer never gets direct filesystem power.
- Main validates paths and enforces safety.
- Prompt rules live in a prompt module, not in UI rendering.
- Review state is separate from chat.
- Permissions and context are separate modules.
- The bootstrap entry initializes modules only.

## V1 Freeze Gate

V1 is done when all current V1 phases are complete and a sober freeze review finds no remaining must-have gaps. A new finding becomes V1-must only if it blocks safety, core usefulness, or external testing. Useful but non-blocking ideas move to V1.1 or the Parking Lot.

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
