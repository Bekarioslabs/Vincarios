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
- [ ] Test Noto Sans Variable as a closer bundled alternative to the current Segoe UI/systemfont look.
- [x] Bundle first Lucide SVG icon set locally with semantic icon registry and license notice.

- [x] Add renderer Content Security Policy.
- [x] Add max-size guards for create/update note content and provider/context payloads.
- [x] Add GitHub Actions CI for JS checks and Node tests.
- [x] Add `CONTRIBUTING.md`.
- [x] Add `CHANGELOG.md`.
- [x] Add `SECURITY.md`.
- [x] Run dependency/security audit.
- [ ] Run accessibility pass for custom controls, keyboard operation, contrast, and ARIA labels.
- [ ] Add IPC wrapper/helper only if duplicated validation/error mapping becomes evident.

## Phase 7 - V1 Feature Candidates

Phase 7 is not a promise to ship every candidate. Before implementing this phase, do a short V1 necessity review and keep only items that are needed for a presentable V1. Anything useful but not essential moves to V1.1.

### V1 Priority Candidates

- [ ] New Project workflow from deterministic template/preset logic.
- [ ] Minimal template/preset support for new notes and projects.
- [ ] Local embeddings V1-light: choose runtime, store private index, suggest similar notes/tags/links/folders.
- [ ] Review Basket integration for embedding-backed suggestions.
- [ ] Inbox cleanup workflow with reviewable suggestions.
- [ ] Selected folder analysis with explicit scope, limits, and reviewable output.
- [ ] Project note maintenance suggestions if they reuse the same review/update pipeline.

### V1 Optional Candidate

- [ ] Basic image handling foundation only if it stays limited to display/import/move/rename through safe IPC and does not delay core Markdown workflows.

Candidates that do not pass the V1 necessity review are tracked only in the V1.1 / V1.2 Backlog below.

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
- [ ] Move/rename/archive note services if they did not pass the V1 necessity review.
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
- [ ] Chat action display setting: allow hover actions such as `Save as Note`, `Copy`, and future message actions to render as text, Lucide SVG icons, or icon+text without changing chat action logic.
- [ ] Context Basket type badge polish: optional distinct badge/border colors for `MD`, `DIR`, future `IMG`, `PDF`, `FILE`, and unknown targets. These colors must remain separate from Selection Action behavior colors.
- [ ] Detachable/undocked Markdown preview window for multi-monitor workflows.
- [ ] Vision analysis and image tagging gated by model capability.
- [ ] Natural Action Control (V2.1 candidate): optional toggle that lets the model map natural language to existing registered Selection Actions. It must only execute predefined app actions through the same permission, review, backup, and audit boundaries. The recognition layer may use prompts or trigger rules, but it must live in its own module and never create new hidden capabilities.
- [ ] Chat Sessions / conversation history as a later V2 feature: session list, resume, delete, privacy rules, and per-vault/global storage decisions.

## Parking Lot

- [ ] Voice input.
- [ ] Peer-to-peer sync.
- [ ] External HTTP/CLI automation API.
- [ ] Encrypted backups with user-managed passphrases.
- [ ] Full plugin marketplace or broad agent-harness behavior.
