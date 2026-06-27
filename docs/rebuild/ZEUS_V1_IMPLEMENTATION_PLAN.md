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
- [x] Request-scoped selected Markdown context with visible Auto-context toggle.
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
- [x] Provider settings foundation: settings store categories, URL override UI/persistence, active provider persistence, and selected model persistence.
- [x] Limits settings UI: provider timeout, model-list timeout, selected-file context cap, folder/file listing caps, analysis file cap, and review suggestion cap.
- [x] Vault Profile settings bridge: expose existing folder-role foundation without replacing the Phase 2 core profile logic.
- [x] Local-provider URL validation.
- [x] Model/capability display: model dropdown exists and Settings shows provider capability badges.
- [x] Settings persistence in app/user-data storage.
- [x] Focused provider/settings tests for provider URL validation, URL persistence, active provider/model persistence, limits persistence, vault role persistence, settings IPC/preload, capability display, and Settings renderer wiring. Abort tests are in place.

## Phase 5.4 - UX Intent Foundation

This phase is inserted before Reviewed Update Flow because V1 should not rely on broad language triggers for file/folder intent. The app should expose deterministic selection actions and clearer layout first, then let Phase 5.5 build reviewed updates on top of that foundation.

- [ ] Rework the vault panel into a sustainable three-zone layout: top-left Files, top-right Selection Actions, and Markdown Preview below both columns at full vault-panel width.
- [ ] Keep the layout responsive: files and actions must keep useful minimum widths; preview remains readable; scrolling stays local to Files, Actions, Preview, Chat, and Review Basket.
- [ ] Add a focused Selection Actions module for selected folders/files. Actions are deterministic app flows, not guessed prompt intents.
- [ ] Provide folder actions such as List folder, List with subfolders, Analyze folder, Find similar files, and role-aware Inbox Review where applicable.
- [ ] Provide file actions such as Summarize file, Use as context, Propose update, Find related notes, and Reveal/Open preview.
- [ ] Reduce `contextIntent` to narrow fallback detection only. Remove broad phrases and keep retry behavior tied to blocked app actions or explicit UI buttons.
- [ ] Reorganize the left navigation into clean grouped actions. `Open Vault` stays prominent, `New Entry` stays collapsed by default, and future presets expand in a controlled list.
- [ ] Rework Settings into a two-pane layout: left settings menu, right active settings category. Do not keep adding unrelated sections into one long modal body.
- [ ] Improve YAML/frontmatter display in Markdown Preview as an Obsidian-like Properties area at the top, with later action hooks for metadata-related suggestions.
- [ ] Create a clean English development test vault near the project folder and switch V1 default folder labels to English: `00_Inbox`, `01_Daily`, `02_Projects`, `03_Knowledge`, `90_AI_Brain`, `99_Archive`.
- [ ] Restore scoped selection behavior: `Ctrl+A` selects only the active/hovered region, and right-click offers area-specific select/copy actions.
- [ ] Track detachable preview as a near-future UX need, but do not implement it inside this phase unless the main layout still blocks V1 usability.

## Phase 5.5 - Reviewed Update Flow

This is a V1-critical workflow, not a later comfort feature. The prototype already proved the value of chat-driven file updates; the rebuild must make it reliable and review-safe before larger cleanup features.

- [ ] Chat-generated `update_note` proposals reliably target the selected Markdown file when `R` and `W` allow it.
- [ ] Missing `R` or `W` produces a clear app-level guidance message, not generic model text about lacking filesystem access. `W` must use the shared blocked-action foundation when reviewed write execution is gated.
- [ ] Edit Mode can create an `update_note` proposal from local source changes instead of writing directly.
- [ ] V1 update scope stays whole-note replacement through reviewed diff; complex partial insert/replace is explicitly V1.1 work.
- [ ] Diff preview remains mandatory before applying any update.
- [ ] Backup, stale-content validation, and audit logging stay on the existing `update_note` service path.

## Phase 6 - V1 Release Hardening

- [ ] Add renderer Content Security Policy.
- [ ] Add max-size guards for create/update note content and provider/context payloads.
- [ ] Add GitHub Actions CI for JS checks and Node tests.
- [ ] Add `CONTRIBUTING.md`.
- [ ] Add `CHANGELOG.md`.
- [ ] Add `SECURITY.md`.
- [ ] Run dependency/security audit.
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
- [ ] Vision analysis and image tagging gated by model capability.

## Parking Lot

- [ ] Voice input.
- [ ] Peer-to-peer sync.
- [ ] External HTTP/CLI automation API.
- [ ] Encrypted backups with user-managed passphrases.
- [ ] Full plugin marketplace or broad agent-harness behavior.
