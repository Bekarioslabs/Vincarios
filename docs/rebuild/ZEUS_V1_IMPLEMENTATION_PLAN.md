# ZEUS V1 Implementation Plan

Audit triage reference: [ZEUS_V1_AUDIT_TRIAGE.md](./ZEUS_V1_AUDIT_TRIAGE.md).

## Phase 0 - Rebuild Setup

- [x] Confirm V1 product sentence.
- [x] Confirm V1 feature list.
- [x] Confirm non-V1 list.
- [x] Create clean project folder.
- [x] Create new `AGENTS.md`.
- [x] Create minimal README.
- [x] Decide whether to reuse the current GitHub repo after archiving the prototype.

## Phase 1 - Foundation

- [x] Electron scaffold.
- [x] Strict preload bridge.
- [x] Main/renderer/shared separation.
- [x] Automated test setup.
- [x] First security/path tests.

## Phase 2 - Vault Core

- [x] Open vault.
- [x] Vault profile foundation.
- [x] File navigation module foundation.
- [x] File-tree refresh preserves expanded folders.
- [x] Markdown read foundation.
- [x] Markdown render/sanitize.
- [x] Assistant chat Markdown rendering through shared renderer.
- [x] Explicit Context Basket foundation for selected Markdown/folder context.
- [x] Selected-folder read-context preflight.
- [x] Recursive folder listing reads structure only, not note contents.
- [x] Local Markdown source/edit preview mode without persistence.
- [x] Markdown link navigation with preview open and explicit Reveal in Files.
- [x] Preview navigation history with back/forward controls.
- [x] Path safety foundation.
- [x] Dot-folder block foundation.

## Phase 3 - Action And Review Core

- [x] Action schema.
- [x] Proposal plan parser.
- [x] Review Basket state foundation.
- [x] Review Basket selection, remove, clear-open, and execute controls.
- [x] Create note service with reviewed execution and audit logging.
- [x] Update note service with reviewed diff execution, backup, stale-content check, and audit logging.
- [x] Diff preview foundation for line-based Markdown summaries in Review Basket.
- [x] Diff review modal for existing-file proposals.
- [x] Backup service foundation for existing Markdown notes.
- [x] Audit log coverage for executed `create_note` and `update_note`.
- [x] Guard tests keep future write workflow actions non-executable until their services exist.

## Phase 4 - Context And Workflow Control

- [x] Refactor folder context flow to `PendingActionState` plus `FolderContextController`.
- [x] Add explicit scope cards for folder actions: current level, all subfolders, cancel.
- [x] Ensure short replies such as `all` or `alle` only resolve an existing pending folder action.
- [x] Keep selected-file, selected-folder, dropped-file, and future embedding context sources visibly separated.
- [x] Add limits for max context size and max listed folders/files per request.
- [x] Add app-level blocked-action retry buttons for missing `R` on selected files/folders, backed by a shared missing-permission foundation for future `W` retries.

## Phase Rules For Remaining V1 Work

Every remaining implementation phase must include focused tests for the behavior it adds. If a phase touches UI shell, provider calls, context handling, permissions, write actions, or vault profile behavior, update the relevant active docs in the same change.

## Phase 5 - Providers And Settings Foundation

- [x] LM Studio chat baseline with provider registry, default URL, active model selection, and topbar provider/model dropdowns.
- [x] Ollama chat baseline through the same registry, topbar provider/model controls, and native Ollama endpoints.
- [x] Real chat abort: request id, `AbortController`, `chat:cancel` IPC, Send-to-Cancel UI state, and ignored late responses.
- [x] Follow-up regression: normal chat messages use the same visible pending/cancel lifecycle as provider-backed Selection Actions. Pressing Cancel removes the pending message and prevents late assistant responses from being appended.
- [x] Provider settings foundation: settings store categories, URL override UI/persistence, active provider persistence, and selected model persistence.
- [x] Limits settings UI: provider timeout, model-list timeout, selected-file context cap, folder/file listing caps, analysis file cap, and review suggestion cap.
- [x] Vault Profile settings bridge: expose existing folder-role foundation without replacing the Phase 2 core profile logic.
- [x] Local-provider URL validation.
- [x] Add manual provider status refresh button in the topbar; no polling/ticker.
- [x] Model/capability display: model dropdown exists and Settings shows provider capability badges.
- [x] Settings persistence in app/user-data storage.
- [x] Focused provider/settings tests for provider URL validation, URL persistence, active provider/model persistence, limits persistence, vault role persistence, settings IPC/preload, capability display, and Settings renderer wiring. Abort tests are in place.

## Phase 5.4 - UX Intent Foundation

This phase is inserted before Reviewed Update Flow because V1 should not rely on broad language triggers for file/folder intent. The app should expose deterministic selection actions and clearer layout first, then let Phase 5.5 build reviewed updates on top of that foundation.

### 5.4.1 Layout Decision

- [x] Rework the right-side vault panel around selected targets: top row contains Files and Selection Actions; Markdown Preview sits below them and spans the full vault-panel width.
- [x] Keep Files and Selection Actions the same top-row height, both with local scrolling. Markdown Preview owns the lower row and can be resized vertically.
- [x] Keep detachable preview out of 5.4. Track it as a future UX/backlog item unless the main layout blocks V1 usability.

### 5.4.2 Explicit Context Basket

- [x] Remove the global `Use Selection`/Auto-context toggle from the provider context path.
- [x] Keep File Tree selection as UI target state only. Selection alone is not provider context.
- [x] Add a visible Context Basket below the Review Basket for explicit context items.
- [x] Context Basket supports item reveal/select in Files, individual remove, and `Clear all`.
- [x] Provider request context is built only from Context Basket items. File items attach Markdown content; folder items attach path context only.
- [x] Keep folder listing scope as an app dialog, not model guessing.

### 5.4.3 Selection Action Panel

- [x] Create a focused Selection Actions module for selected folders/files. Actions are deterministic app flows, not guessed prompt intents.
- [x] Initial module shape implemented as `actionCategories.js`, `actionRegistry.js`, and `mountSelectionActions.js`. No separate state file yet because `contextState` already owns active selection.
- [x] Current Selection Action foundation for folders includes: Use as context, List folder, Analyze folder, and Summarize MD files. `Use as context` is active when `R` is enabled and adds path-only folder context. `List folder` lists the current folder level through app logic and offers `Check whole tree` as a recursive follow-up. `Analyze folder` returns a structure-only analysis based on names and entry types. `Summarize MD files` reads only direct Markdown files and sends capped content to the provider.
- [x] Current Selection Action foundation for Markdown files includes three actions: Summarize file, Use as context, Propose update. `Use as context` and `Summarize file` are active with `R`; `Propose update` is active with loaded content plus `R` and `W`.
- [x] Registry shape supports target kinds separately from shell/chat code; future images, PDFs, and unknown files can be added through the registry.

### 5.4.4 Language Trigger Reduction

- [x] Reduce `contextIntent` to narrow fallback detection only. Remove broad phrases and general prompt guessing.
- [x] Remove selected-target and folder-content prompt execution. Keep only pending scope replies, existing blocked-action retry text, structured model-action fallback, and help-only guidance that points users to Selection Actions.
- [x] UI state and Selection Actions must win over prompt interpretation. Natural-language folder requests show `Use "List folder" in Selection Actions to inspect the selected folder.` instead of executing reads. App-generated folder listings stay visible but do not re-enter provider history as reusable file-list context.

### 5.4.5 English Default Vault

- [x] Create a clean English development test vault near the project folder: `D:\ZEUS_AGENT\dev-vault`.
- [x] Keep development vault data out of Git unless a deliberately tiny fixture vault is created under `tests/fixtures/`.
- [x] Switch target V1 default folder labels to English: `00_Inbox`, `01_Daily`, `02_Projects`, `03_Knowledge`, `90_AI_Brain`, `99_Archive`.

### 5.4.6 Context UX

- [x] Keep explicit context visible below the chat through the Context Basket.
- [x] Add explicit clear/context source controls if Selection Actions do not make state clear enough. Current Context Basket UX is acceptable for V1; visual polish can happen later.
- [x] General questions stay neutral unless explicit Context Basket items are present.

### 5.4.7 Selection Behavior

- [x] Restore scoped selection behavior before Phase 5.5.
- [x] `Ctrl+A` selects only the active or hovered region: chat message, Markdown Preview, File Tree, input, Review Basket, or Context Basket. Empty panel background does not trigger scoped selection.
- [x] Right-click offers safe select/copy actions for concrete content regions.
- [x] Scoped selection lives in `src/renderer/selection/scopedSelection.js`; file-tree navigation lives in `src/renderer/files/fileTreeKeyboard.js`.
- [x] Follow-up: when focus is on a File Tree row, `R` and `W` toggle read/write permission for that selected row only. This ignores interactive controls and does not conflict with future rename/edit shortcuts.

### 5.4.8 Docs And Tests

- [x] Keep this plan, `ZEUS_V1_UI_AND_WORKFLOWS.md`, and `ZEUS_V1_ARCHITECTURE.md` aligned while implementing 5.4.
- [x] Add tests that Selection Actions depend on selected app state, not chat text.
- [x] Add tests that selection alone does not attach context and explicit Context Basket items do attach context.
- [x] Add tests for English default vault roles once the default profile is changed.
- [x] Add tests for scoped `Ctrl+A` and file-tree keyboard navigation.

Recommended execution order: finish 5.4.1 through 5.4.7 first and test them together. Phase 5.5 starts only after this foundation is stable.

## Phase 5.5 - Reviewed Update Flow

This is a V1-critical workflow, not a later comfort feature. The prototype already proved the value of chat-driven file updates; the rebuild must make it reliable and review-safe before larger cleanup features.

- [x] Read-only action foundation before writes: make `Summarize file` functional for one selected readable Markdown file.
- [x] Keep `Analyze folder` V1-light as structure/name/type analysis first. It clearly labels results as structure-based and does not read Markdown contents.
- [x] Add `Summarize Markdown files` on top of the same read-only action path: only direct `.md`/`.markdown` files, no images/PDF/attachments in V1, with max file count and max chars per file coming from Settings/Limits.
- [ ] Keep `Copy path` as a later secondary utility action. Keep `Reveal in Explorer` later because it needs main-process IPC.
- [x] Selection Action generated `update_note` proposals reliably target the selected Markdown file when `R` and `W` allow it. V1 generates whole-note proposals only and routes them into the Review Basket. Chat does not auto-trigger write proposals in V1.
- [x] Missing `R` or `W` produces a clear app-level guidance message, not generic model text about lacking filesystem access. `W` uses the shared missing-permission guidance for reviewed update proposal entry points.
- [x] Edit Mode can create an `update_note` proposal from local source changes instead of writing directly.
- [x] V1 update scope stays whole-note replacement through reviewed diff; complex partial insert/replace is explicitly V1.1 work.
- [x] Diff preview remains mandatory before applying any update through the existing Review Basket update service.
- [x] Backup, stale-content validation, and audit logging stay on the existing `update_note` service path.

## Phase 6 - V1 Release Hardening

- [x] Bundle Inter variable font locally and include its license notice.
- [x] Bundle first Lucide SVG icon set locally with semantic icon registry and license notice.

- [x] Add renderer Content Security Policy.
- [x] Add max-size guards for create/update note content and provider/context payloads.
- [x] Add GitHub Actions CI for JS checks and Node tests.
- [x] Add `CONTRIBUTING.md`.
- [x] Add `CHANGELOG.md`.
- [x] Add `SECURITY.md`.
- [x] Run dependency/security audit.
- [x] Run accessibility pass for custom controls, keyboard operation, contrast, and ARIA labels.
- [ ] Add IPC wrapper/helper only if duplicated validation/error mapping becomes evident.

## Phase 6.5 - UI And Settings Cleanup Before New Features

Phase 6.5 happens before Phase 7 feature work. Its purpose is to make the current app shell and settings surface calm, extensible, and understandable before adding more workflows.

- [x] Refine the left navigation into grouped app actions: `WORKSPACE`, `CREATE`, `VAULT`, and bottom `SETTINGS`.
- [x] Keep `Open Vault` prominent under `VAULT`; keep `Settings` as the stable bottom modal entry.
- [x] Add collapsed `CREATE` preset structure: `New Note` presets and `New Project` presets without wiring fake creation. Presets must stay user-extensible later, including optional curated ZEUS preset packs.
- [x] Keep future left-nav entries as explicit future slots only; placeholders must not look like working features.
- [x] Rework Settings into a two-pane modal: category menu on the left, active category content on the right.
- [x] Keep implemented Settings categories wired to the existing settings store: Providers, Limits, and Vault Profile.
- [x] Add V1-ready Settings categories for Templates, Appearance, Embeddings, Safety, and About without fake functionality.
- [x] Add dedicated Markdown Properties/YAML style tokens so metadata can be visually distinct from prose and later controlled by Appearance settings.
- [x] Document project style presets as V1.1 direction: detected through explicit project metadata such as `zeus_style_preset`, ZEUS-only in V1, optional Obsidian CSS snippet export later with explicit user confirmation.
- [x] Keep Settings and UI tokens extensible for later hotkeys, plugin compatibility, custom actions, theme presets, and theme managers that may change shapes such as button radius.
- [x] Ensure UI-only changes preserve keyboard access, ARIA labels/states, and local scrolling rules.
- [x] Update UI docs and focused source/style tests for the changed shell/settings structure.

## Phase 7 - V1 Feature Work After Scope Alignment

Phase 7 is deliberately smaller than the early product wish list. V1 should be useful and stable, not a broad autonomous vault manager. Anything useful but not required for a presentable V1 moves to V1.1/V1.2.

### Phase 7.0 - Scope Alignment

- [x] Align Product Brief and Implementation Plan around a smaller V1.
- [x] Separate manual UI file operations from AI file-operation actions.
- [x] Keep AI-driven rename/move/archive in V1.1 because their real value is link-safety, undo/repair, and batch review.
- [x] Define cleanup as report-first, not direct Basket flooding.
- [x] Define embeddings as local-first with bundled default model plus optional custom local model path.

### Phase 7.1 - Templates And Creation Presets

- [x] New Note workflow from deterministic presets adds reviewed `create_note` proposals to the Review Basket.
- [x] New Project workflow from deterministic presets enters the Review Basket as one `create_from_template` action. The reviewed execution path creates planned folders first through `createFolder`, then planned Markdown files through `createNote`.
- [x] Template/preset data shape targets vault folder roles instead of hard-coded folder names.
- [x] Presets remain extensible for custom user presets and later curated ZEUS preset packs through the shared registry shape; user-pack loading is later work.
- [x] No AI improvisation in template creation: the preset registry materializes deterministic create plans.
- [x] Preset UI binds left navigation preset buttons to Review Basket proposals; no direct writes.
- [x] Create proposals are edited in the Review Basket before execution; execution no longer repeats the initial title dialog.
- [x] Markdown preview renders unchecked and checked task-list boxes read-only.

### Phase 7.1.5 - External Markdown Drag And Drop

- [x] External `.md` and `.markdown` files dropped onto the chat become temporary Context Basket items.
- [x] Dropped Markdown is not copied into the vault automatically.
- [x] Dropped Markdown shows a ZEUS chat message with an `Import to Inbox` action.
- [x] `Import to Inbox` adds a reviewed `create_note` proposal; Review Basket edit/execute performs the actual vault write.
- [x] Images, PDFs, vision analysis, automatic sorting, and manual file-tree move drag/drop remain out of this block.

### Phase 7.2 - Manual File Operations V1-Light

- [x] F2 Rename Light for one selected Markdown file in the File Tree.
- [x] Rename Light stays manual and same-folder only; it does not move files.
- [x] Rename Light reports clearly that links are not updated in V1.
- [x] Rename Light writes through main-process vault validation and audit logging, not renderer filesystem access.
- [ ] Drag-and-drop move is deferred to V1.1 with automatic link-update planning and review.
- [ ] AI rename/move/archive actions stay non-executable until V1.1 services exist.

### Phase 7.2.5 - Session Activity And Status Messages

- [ ] Add a session-only Activity/Status Messages view under `WORKSPACE`.
- [ ] Keep the bottom status bar as the latest-message surface, but also record structured in-memory status events for the current app session.
- [ ] Activity entries include local time, type (`info`, `success`, `warning`, `error`), action label, target path when relevant, and detail text.
- [ ] Render important parts with visual hierarchy, e.g. action `Renamed` and warning `Links were not updated in V1` can use distinct status colors.
- [ ] Do not persist this V1 activity list to the vault. Long-term audit/history UI remains separate from `.zeus/audit.jsonl` work.
### Phase 7.3 - Inbox Cleanup Light

- [ ] Cleanup starts as a grouped report, not hundreds of Basket items.
- [ ] Report groups include summaries and top candidates first.
- [ ] Opening a group shows concrete previews: tag/property diff, Markdown-line diff, move plan, duplicate comparison, or new-note preview depending on suggestion type.
- [ ] Only selected concrete actions are added to the Review Basket.
- [ ] Large batch execution is not V1 unless it stays within the existing review/update safety path.

### Phase 7.4 - Local Embeddings V1-Light Foundation

- [ ] Choose local embedding runtime and bundled multilingual-capable default model.
- [ ] Add Settings option for bundled model versus custom local model path.
- [ ] Store the embedding model outside normal vault notes.
- [ ] Store index data outside normal vault notes: app cache by default, optional `.zeus/index` only as an explicit per-vault choice.
- [ ] Index schema includes path, hash, modified time, chunk metadata, and vector data.
- [ ] Reindex only changed files; model changes require an explicit reindex notice.
- [ ] Embeddings are separate from chat providers; no cloud embeddings in V1.

### Phase 7.5 - Embedding-Backed Suggestions

- [ ] Similar notes candidates.
- [ ] Link candidates.
- [ ] Tag candidates.
- [ ] Folder candidates.
- [ ] Suggestions enter grouped reports or Review Basket proposals only through registered suggestion/action types.
- [ ] Suggestion types must be extensible without rewriting the cleanup/report/review pipeline.

### Phase 7.6 - Markdown Image Preview Optional

- [ ] Render Markdown image links in Preview if it stays small.
- [ ] Image preview does not include image editing, import automation, tagging, or vision analysis.

### Phase 7.7 - V1 Necessity Review Gate

- [ ] Re-check whether Recent Files/Homepage light, broken-link/orphan scan, and project note maintenance are V1-must or V1.1.
- [ ] Anything not needed for a presentable V1 moves to the V1.1/V1.2 Backlog before Phase 8 freeze work.

## Phase 8 - V1 Freeze And Release Baseline

V1 is done when all current V1 phases are complete and a sober freeze review finds no remaining must-have gaps. New findings are classified as V1-must only when they block safety, core usefulness, or external testing; otherwise they move to V1.1 or the Parking Lot.

- [ ] README update.
- [ ] Architecture docs update.
- [ ] Testing docs update.
- [ ] Manual smoke tests.
- [ ] Focused external audit.
- [ ] GitHub cleanup.
- [ ] Package/build check.
- [ ] V1 freeze decision.

## V1.1 / V1.2 Backlog

- [ ] Focused partial edit engine: insert/replace a section without sending or pasting back the whole note.
- [ ] Manual drag-and-drop move with link-update planning and review; embeddings may help suggest destinations, but Markdown link rewriting must be deterministic parser/app logic.
- [ ] AI move/rename/archive note services with link update, backlink warnings, undo/repair, and batch review.
- [ ] Folder Context Index maps if they did not pass the V1 necessity review.
- [ ] Slim Brain OS integration with explicit load order, validation, and no ability to override code-side safety laws.
- [ ] Search within vault.
- [ ] Audit log / backup history UI with restore-oriented controls.
- [ ] End-to-end Electron tests.
- [ ] Async or worker-based deep folder crawling for very large vaults.
- [ ] Backup retention policy and optional cleanup UI.
- [ ] Batch AI actions over multiple notes with grouped diffs.
- [ ] Plugin-style extension points for community contributions.
- [ ] More complete settings UI, including hotkeys and theme presets.
- [ ] Vault Profile V1.1: multiple named profiles, custom folder roles, and `Choose from Vault folders` path picker with inside-vault validation.
- [ ] Chat action display setting: allow hover actions such as `Save as Note`, `Copy`, and future message actions to render as text, Lucide SVG icons, or icon+text without changing chat action logic.
- [ ] Context Basket type badge polish: optional distinct badge/border colors for `MD`, `DIR`, future `IMG`, `PDF`, `FILE`, and unknown targets. These colors must remain separate from Selection Action behavior colors.
- [ ] Detachable/undocked Markdown preview window for multi-monitor workflows.
- [ ] Vision analysis and image tagging gated by model capability.
- [ ] Obsidian plugin compatibility audit for common workflows: Templater, Dataview, Tasks, Advanced Tables, Calendar, Kanban, Iconize, Style Settings, Omnisearch, Smart Connections, Tag Wrangler, Linter, Mindmap, Homepage, Recent Files, and Make.md.
- [ ] Optional Iconize compatibility: detect Iconize metadata when safe and mirror icons in ZEUS UI without requiring Iconize.
- [ ] Style Settings compatibility research: read/import visual settings only through explicit user choice; do not write `.obsidian` automatically.
- [ ] Kanban and Mindmap support should start as rendering/fallback research, not full plugin reimplementation.
- [ ] Export actions: Markdown and HTML first, designed so more formats can be added later.
- [ ] Editing toolbar light for Markdown edit mode: basic bold, italic, heading/size-like Markdown, and later color/style helpers only if they stay Markdown-safe.
- [ ] ZEUS plugin/extension architecture research: define how future community modules register actions, settings, target types, and review flows without bypassing safety laws.
- [ ] Natural Action Control (V2.1 candidate): optional toggle that lets the model map natural language to existing registered Selection Actions. It must only execute predefined app actions through the same permission, review, backup, and audit boundaries. The recognition layer may use prompts or trigger rules, but it must live in its own module and never create new hidden capabilities.
- [ ] Chat Sessions / conversation history as a later V2 feature: session list, resume, delete, privacy rules, and per-vault/global storage decisions.

## Parking Lot

- [ ] Voice input.
- [ ] Peer-to-peer sync.
- [ ] External HTTP/CLI automation API.
- [ ] Encrypted backups with user-managed passphrases.
- [ ] Full plugin marketplace or broad agent-harness behavior.
