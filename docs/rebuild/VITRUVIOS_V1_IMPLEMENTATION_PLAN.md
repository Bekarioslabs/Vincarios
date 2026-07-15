# vitruvios V1 Implementation Plan

Audit triage reference: [VITRUVIOS_V1_AUDIT_TRIAGE.md](./VITRUVIOS_V1_AUDIT_TRIAGE.md).

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
- [x] Vault Profile: portable active profile at `Vault/.vitruvios/profile.json`; standard role mapping and role visual identity are configured only in Settings.
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

- [x] Create a clean English development test vault near the project folder: `D:\Vitruvios_AGENT\dev-vault`.
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

- [x] Keep this plan, `VITRUVIOS_V1_UI_AND_WORKFLOWS.md`, and `VITRUVIOS_V1_ARCHITECTURE.md` aligned while implementing 5.4.
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
- [x] Add collapsed `CREATE` preset structure: `New Note` presets and `New Project` presets without wiring fake creation. Presets must stay user-extensible later, including optional curated vitruvios preset packs.
- [x] Keep future left-nav entries as explicit future slots only; placeholders must not look like working features.
- [x] Rework Settings into a two-pane modal: category menu on the left, active category content on the right.
- [x] Keep Providers and Limits app-local; make Vault Profile selected-vault metadata with its own validated service.
- [x] Add V1-ready Settings categories for Templates, Appearance, Embeddings, Safety, and About without fake functionality.
- [x] Add dedicated Markdown Properties/YAML style tokens so metadata can be visually distinct from prose and later controlled by Appearance settings.
- [x] Document project style presets as V1.1 direction: detected through explicit project metadata such as `vitruvios_style_preset`, vitruvios-only in V1, optional Obsidian CSS snippet export later with explicit user confirmation.
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
- [x] Presets remain extensible for custom user presets and later curated vitruvios preset packs through the shared registry shape; user-pack loading is later work.
- [x] No AI improvisation in template creation: the preset registry materializes deterministic create plans.
- [x] Preset UI binds left navigation preset buttons to Review Basket proposals; no direct writes.
- [x] Create proposals are edited in the Review Basket before execution; execution no longer repeats the initial title dialog.
- [x] Markdown preview renders unchecked and checked task-list boxes read-only.

### Phase 7.1.5 - External Markdown Drag And Drop

- [x] External `.md` and `.markdown` files dropped onto the chat become temporary Context Basket items.
- [x] Dropped Markdown is not copied into the vault automatically.
- [x] Dropped Markdown shows a vitruvios chat message with an `Import to Inbox` action.
- [x] `Import to Inbox` adds a reviewed `create_note` proposal; Review Basket edit/execute performs the actual vault write.
- [x] Images, PDFs, vision analysis, automatic sorting, and manual file-tree move drag/drop remain out of this block.

### Phase 7.2 - Manual File Operations V1-Light

Status: complete for V1-light.

- [x] F2 Rename Light for one selected Markdown file in the File Tree.
- [x] Rename Light stays manual and same-folder only; it does not move files.
- [x] Rename Light reports clearly that links are not updated in V1.
- [x] Rename Light writes through main-process vault validation and audit logging, not renderer filesystem access.
- [x] Move drag-and-drop is explicitly V1.1: it must include deterministic Markdown link-update planning and review before it becomes useful enough for vitruvios.
- [x] AI rename/move/archive actions are explicitly V1.1: they need safe services, backlink warnings, undo/repair, and batch review before execution.

### Phase 7.2.5 - Session Activity And Status Messages

Status: complete for V1-light.

Goal: add a lightweight session-only view so important status messages do not disappear after the bottom status bar changes.

- [x] Add `Session Log` under `WORKSPACE` as a main workspace tab/view, reusing the workspace foundation created for Chat and Suggestions.
- [x] Keep the bottom status bar as the latest-message surface only.
- [x] Add an in-memory activity state module for the current app session. It clears on restart and does not write to the vault.
- [x] Route initial app-wide status events through the activity state: vault open and reviewed create/update/template execution. File reads, folder listings, renames, provider errors, and warnings can join the same state when their owning modules are touched.
- [x] Activity entries include local time, type (`info`, `success`, `warning`, `error`), action label, target path when relevant, and detail text.
- [x] Render important parts with visual hierarchy using scoped Session Log styles.
- [x] Keep `.vitruvios/audit.jsonl`, backup history, restore UI, and persistent event history in V1.1/V1.2. Session Log is not audit history.
- [x] Test that activity state is renderer-local, session-only, and does not replace safety/audit services.
### Phase 7.3 - Inbox Cleanup Light

Status: complete for V1-light.

- [x] Cleanup starts as a grouped report, not hundreds of Basket items.
- [x] Report groups include summaries, loose Markdown notes, subfolders, AI response notes, and other files.
- [x] `Inbox Review` in the left navigation scans the Inbox plus one direct subfolder level, generates a saveable report-only vitruvios chat response, and creates no Review Basket actions.
- [x] The report offers an explicit `Scan nested folders` follow-up for deeper Inbox structure scans without reading file contents.
- [x] Large batch execution stays out of V1 unless it later fits the existing review/update safety path.

### Phase 7.4 - Local Embeddings V1-Light Foundation

- [x] Choose local embedding runtime and multilingual-capable base model: Transformers.js / ONNX with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`; use `Xenova/paraphrase-multilingual-MiniLM-L12-v2` as the Transformers.js artifact source.
- [x] Record the Apache-2.0 model/license decision in Settings and app settings normalization.
- [x] Add settings-store foundation for bundled model versus custom local model path. UI controls for choosing a custom path are still pending.
- [x] Prepare embedding model artifact storage outside normal vault notes: bundled model metadata and manifest live under project `.vitruvios/models/embeddings/...`.
- [x] Verify the pinned local artifact set with source, license, expected files, revision, and SHA256 checks. The local development copy lives under project `.vitruvios/models/embeddings/...` and is not committed to Git.
- [x] Add the local embedding runtime service. It loads the bundled model path through Transformers.js/ONNX, disables remote model loading, caches the extractor, and returns vectors only.
- [x] Add Markdown discovery for indexing: recursive Markdown-only scan, protected dot-folder skip, no non-Markdown content.
- [x] Add the local embedding indexer service: chunks Markdown, embeds changed documents, skips unchanged hash/mtime records, and writes document vectors to selected-vault `.vitruvios/index`.
- [x] Defer final embedding distribution choice to the Phase 9 release-artifact gate: decide bundled model versus controlled download, document the license/source/checksum path, and never commit model artifacts to Git.
- [x] Decide index storage boundary: selected-vault `.vitruvios/index` by default. `.vitruvios` is internal app data, not normal vault notes or provider context.
- [x] Index schema includes path, hash, modified time, chunk metadata, vector data, and separate body/frontmatter vector fields for sharper similarity scoring.
- [x] Reindex decision foundation: unchanged hash/mtime skips work; changed hash/mtime or changed model requires reindex. User-facing reindex controls remain pending.
- [x] Embeddings are separate from chat providers; no cloud embeddings in V1.

### Phase 7.5 - Embedding-Backed Suggestions

Status: complete for V1-light. Metadata index remains a documented V1.1 architecture target, not a V1 implementation.

- [x] Similar notes candidates: local index search returns ranked `similar_note` candidates from stored embeddings only. V1 includes percent scores, strong/medium/weak/noisy labels, threshold filtering, max-results defaults, content/metadata/mixed modes, a content/metadata weight slider, session-remembered per-run values, a compact chat summary, a detailed Selection Actions result panel, low-content target warnings, and an explicit `Refresh index first` option for newly added or changed Markdown files. No Review Basket actions are created yet.
- [x] Link candidates moved to V1.1. Do not implement in V1 unless the V1 necessity gate explicitly reclassifies them as must-have.
- [x] Tag candidates: selected Markdown files expose `Suggest tags`, which creates local heuristic `metadata_candidate` suggestions with full `currentContent` and `proposedContent`. Selected candidates can enter the Review Basket as reviewed `update_note` proposals. The V1 heuristic is role-aware, avoids hard-coded project-folder names, ignores sentence-like chat filenames, prefers strong project/file-role/structural-folder/title signals, and avoids broad stopword-list growth. AI/embedding-generated tag candidates remain later refinement work.
- [x] Metadata/YAML assist for V1 create flows: Save as Note, summaries, new-note/project presets, and Markdown imports attach deterministic YAML through the shared generated-note metadata policy. The Create Edit view exposes the full YAML before execution. Existing-note update metadata continues through the separate reviewed `update_note` diff path.
- [x] Metadata index planning only: future structured index is documented under selected-vault `.vitruvios/index/metadata/` for notes, tags, links, template metadata, project/file-role summaries, and source hashes. Do not implement the index in V1 and do not overload the embedding index with this data.
- [x] Folder candidates moved to V1.1. Do not implement in V1 unless the V1 necessity gate explicitly reclassifies them as must-have.
- [x] Suggestions enter grouped reports or Review Basket proposals only through registered suggestion/action types. Current conversion path supports `metadata_candidate` only.
- [x] Concrete suggestion previews are V1-ready for `metadata_candidate` through the shared Markdown diff preview. Move plans, duplicate comparison, link diffs, and merge previews are V1.1 because their executable services are not V1 scope.
- [x] Only selected concrete suggestions are added to the Review Basket.
- [x] Suggestion types must be extensible without rewriting the cleanup/report/review pipeline. Current renderer state/converter boundary supports this for `similar_note` and `metadata_candidate`; planned later types remain `near_duplicate`, `complementary_note`, `related_note`, `version_conflict`, `name_conflict`, `destination_candidate`, and `link_candidate`.

### Phase 7.5.5 - Suggestions Workspace Foundation

- [x] Add a workspace tab foundation for `Chat`, `Suggestions`, and later `Session Log` without moving provider or vault logic into the workspace UI.
- [x] Add a Suggestions renderer module that can show grouped suggestion items, selected-item detail, compact status/score labels, checkboxes, and dismiss controls.
- [x] Move Similar Notes result details from the Selection Actions panel into the Suggestions workspace. Chat gets only a short status line, vitruvios does not auto-switch workspaces, and the Suggestions tab shows an item-count indicator.
- [x] Keep Similar Notes report-only until a future suggestion converter creates concrete Review Basket actions.
- [x] Define the conversion boundary: `Add selected to Review Basket` is disabled until selected suggestions map to supported concrete action types. Current supported conversion is `metadata_candidate` with complete `currentContent` and `proposedContent` into reviewed `update_note`; similar notes remain report-only.
- [x] Preserve the right-side Files/Preview area; Suggestions is a main workspace, not a modal that hides the vault context.

### Phase 7.5.6 - Metadata Defaults For Generated Notes

- [x] Generated notes receive deterministic YAML defaults before their reviewed `create_note` or `create_from_template` proposal is executed.
- [x] Save as Note, file/folder summaries, Markdown imports, and note/project presets mark their origin explicitly.
- [x] Presets supply declarative values; the shared metadata policy validates, merges, orders, and serializes them. V1 fields are `tags`, `type`, `status`, `source`, `created_at`, and `origin_action`; `created_by` is intentionally excluded.
- [x] Every built-in preset file declares a filename-independent semantic role and matching visible metadata. Custom presets can rename files while retaining roles such as `brainstorm`, `references`, `tasks`, or `log`; no filename guessing is required.
- [x] Existing frontmatter is preserved, default tags are deduplicated, and generated-note identity does not rely on later filename inference.
- [x] LLM-generated extra metadata remains optional and reviewed; the Create Edit view keeps the final Markdown/YAML editable before execution.
### Phase 7.6 - Markdown Render And Editor Light

Status: complete for V1 rendering scope. Further plugin rendering, callouts, math/Mermaid, and editor-toolbar work are V1.1/V1.2 unless the Phase 7.7 necessity gate reclassifies a specific item.

- [x] Audit current preview behavior against Obsidian core Markdown and record Full/Partial/Missing/Intentional Difference status in VITRUVIOS_V1_MARKDOWN_COMPATIBILITY.md.
- [x] Add a non-executed compatibility fixture covering core syntax and explicit plugin-code-block examples.
- [x] Confirm the final V1 rendering subset once: CommonMark basics, YAML properties display, wikilinks/Markdown links, task boxes, highlights/comments, image embeds, standalone image preview, and safe external-link confirmation. The subset is documented in `VITRUVIOS_V1_MARKDOWN_COMPATIBILITY.md`.
- [x] Replace the hand-written block/inline regex renderer with pinned `markdown-it` 14.3.0 behind focused engine, Obsidian-extension, Properties, and facade modules.
- [x] Support standards-based soft line breaks, emphasis variants, strikethrough, nested lists, horizontal rules, inline code, and escapes; add basic Obsidian highlight and inline-comment handling.
- [x] Bundle the browser engine and MIT license locally, require all Markdown submodules at startup, and keep raw HTML disabled.
- [x] Plugin block fallback registry decision: do not add a renderer registry in V1. Plugin code remains visible as safe source/code and full plugin fallback rendering stays V1.1/V1.2 unless freeze review reclassifies it as must-have.
- [x] Expand Markdown Preview toward Obsidian-core rendering where practical for current V1 subset: strikethrough, task lists, wikilinks/Markdown links, code fences, tables through markdown-it, and safe HTML escaping.
- [x] Add local image embeds for Markdown Preview through validated Main/Preload asset reads. V1 supports .png, .jpg, .jpeg, .webp, .gif, .svg, .bmp, and .ico as Markdown embeds and file-tree image entries.
- [x] Add standalone image-file preview: selecting a supported image in Files shows it in Preview through the same validated asset read path as Markdown embeds. No vision analysis or write actions are included.
- [x] Keep this as renderer support only. No image editing, import automation, tagging, or vision analysis in this block.
- [x] Compare against Obsidian's default Markdown behavior and document intentional V1 differences instead of chasing plugin behavior.
- [x] Phase 7.6 initially kept formatting controls out of V1 while the renderer foundation was stabilized. Phase 8.3 deliberately reopens only a bounded Editor Light baseline as a V1 completion candidate; richer colors, tables, customization, live editing, and detached workflows remain post-V1.

### Phase 7.6.5 - Safe Copied HTML Styling Compatibility

Status: complete.

- [x] Keep the renderer CSP strict. Do not add `unsafe-inline` for scripts or styles.
- [x] Add `src/renderer/markdown/markdownFormattingCompat.js` as the focused Markdown formatting compatibility module that owns safe inline color/highlight parsing and serialization.
- [x] Support common copied Obsidian/Word/browser inline styling: `<mark style="background:...">`, `<font color="...">`, and safe nested Markdown text inside those spans.
- [x] Convert allowed inline colors/highlights into safe renderer-owned spans/classes before insertion into the preview DOM.
- [x] Strip unsupported copied `<font>`/`<mark>` tags to their inner Markdown text and never render event attributes, scripts, unknown inline styles, or unsafe URLs.
- [x] Design the module so future Editor Light / formatting toolbar actions can reuse the same allowed formatting model for selected text effects such as text color, background color, highlight, bold, and italic.
- [x] Add regression fixtures for nested combinations such as colored text inside highlights and Markdown emphasis inside allowed inline styling.
- [x] Keep this owned by `src/renderer/markdown/`; do not scatter ad-hoc HTML handling through shell, preview controller, chat code, or future editor toolbar code.
### Phase 7.7 - V1 UI/UX Hardening And Polish Gate

Status: accepted into V1 as a controlled UI/UX hardening and polish pass. Work in small testable slices. The external UI/UX proposal files were reviewed as design input and then archived outside the active docs. The accepted goal is to bring their useful fixes and polish into V1 iteratively instead of deferring them wholesale to V1.1.

- [x] Review the external UI/UX proposal files together with Beka. Treat them as design input, map every item through vitruvios ownership boundaries, archive them out of active docs, and implement only through focused app modules/styles.
- [x] 7.7.1 Token/CSS foundation: `tokens.css` now owns primitive/semantic palette comments, status `-rgb` tokens, `--status-warning`, action color tokens, diff/score tokens, radius tokens, `--transition-fast`, and selection/scrollbar theming. Status/diff/suggestion score colors now use tokens without layout behavior changes.
- [x] 7.7.2 CSS hardcode cleanup: raw status/action colors, score colors, diff colors, common radii, icon filters, modal backdrops, and shared shadows are centralized through `tokens.css`. Intentional exceptions remain for geometric values such as `border-radius: 0` on flat file rows and `50%` for circular dots/spinners.
- [x] 7.7.3 Local scrolling and containment: Review Basket and Context Basket now have bounded local scroll areas so long lists do not push the chat input out of view.
- [x] 7.7.4 Permission and disabled-action clarity: Soft-disabled Selection Actions stay neutral/gray by default, show a subtle lock icon, avoid category accent colors until active, and remain clickable for permission guidance. File Tree R/W direct, inherited, and off states have distinct visual signals.
- [x] 7.7.5 Review safety polish: destructive Review Basket clear actions use a distinct subtle danger style and labels, update-instruction cancel protects typed text before removing the form, and modal overlay/focus code was left unchanged in this slice.
- [x] 7.7.6 Empty states and compact feedback: Review Basket, Context Basket, and Suggestions now use compact icon-assisted empty states with short copy, existing Lucide assets, and no fake functionality.
- [x] 7.7.7 Visual polish pass: Settings/category icons, provider-mode privacy badge, subtle active-state glow, centralized file-row update flash, and consistent hover/micro-transition behavior now use the token system. File-row flash is handled through renderer update flash state, applies only to visible rows without tree rebuilds, and stays visually distinct from selected rows. The provider badge is not hard-coded as Local Only; it is provider privacy based so future cloud/external providers can change the label.
  - [x] Settings/category icons: the Providers settings category uses the semantic plug icon, the main-screen Settings button uses the gear icon, and both paths render through existing Lucide icon helpers and tokenized icon filters.
- [x] 7.7.8 Loading and score presentation: provider-backed and embedding-backed waits continue to use the existing lightweight pending chat message with spinner; no extra skeleton layer was added because it would duplicate feedback. Similar Notes/Suggestions should use a real compact score-ring component inspired by `docs/Design_index.html`, not oval score pills or list meter bars. The ring shows the percentage inside the circle; explanatory text can sit beside it for clarity. Score colors use the shared score tokens, not ad-hoc green/amber/orange/red values. Medium/yellow must remain visibly brighter than weak/orange.
- [x] 7.7.9 Final visual reference alignment: compare the app against `docs/Design_index.html`, keep vitruvios compact and utilitarian, and avoid copying demo-only structures that do not fit the real app. Manual visual review is green.
- [x] Before V1 freeze, clarify Suggestions type separation: Similar Notes and Metadata/Tags are visually separated by suggestion group headers. Group headers can select only visible, non-dismissed items in that group. `Clear selected` hides selected suggestions from the current session, while `Add selected to Review Basket` remains limited to convertible suggestion types such as metadata candidates.
- [x] Create a concise V1 request/write flow overview in `VITRUVIOS_V1_ARCHITECTURE.md`, showing UI actions, provider boundaries, Review Basket, Main safety, Vault Services, backup, and audit.
- [x] Classify Recent Files, Homepage light, broken-link/orphan scans, and project-note maintenance as V1.1. They do not block safe, presentable V1 workflows.
- [x] Move non-essential interaction-density and plugin-compatibility ideas to the V1.1/V1.2 Backlog before the Phase 8 scope-freeze review.

### Phase 7.8 - Folder Visual Identity

Status: complete for V1. This replaces the earlier "Folder-Role color dots" idea with a fuller but still small navigation aid.

- [x] Support visual identity only for top-level folders in V1: icon plus color. Active top-level Vault Role mappings render with semantic local Lucide icons and token-driven colors; unknown and nested folders retain the neutral folder icon in V1.
- [x] Store vitruvios-owned standard-role mappings and visual settings under selected-vault `.vitruvios/profile.json`, not `.obsidian`.
- [x] Treat folder visuals as manual low-risk UI configuration writes, not Markdown/content writes. They intentionally bypass Review Basket, content diff, note-backup, and content-audit pipelines through a dedicated main-process service.
- [x] Keep `.obsidian` read-only for future compatibility/import layers such as Iconize; do not write vitruvios UI state there.
- [x] Configure each role through Settings with a built-in Lucide icon picker or safe local SVG list from `Vault/.vitruvios/icons/`, plus a fixed token-color palette. The File Tree remains display-only.
- [x] Make File Tree visual identity display-only; configure role assignments, icons, and colors only through `Settings -> Vault Profile`. `profile.json` preserves unrelated future fields and migrates legacy path-keyed `folderVisuals` to role-keyed visuals when possible.
- [x] Allow a local static SVG per role by listing only validated files already placed in portable `Vault/.vitruvios/icons/`; the profile stores only the relative path. V1 has no file-import dialog and no arbitrary custom colors.
- [x] Defer full Iconize compatibility, per-file visuals, icon packs, and deep-folder styling to V1.1/V1.2.

### Phase 7.9 - UI Density, Visual System, And Collapse

Status: complete for V1. Goal: reduce visible clutter without hiding core safety state or changing action semantics. The visual target is a compact local work tool: quiet raised neutral surfaces, darker Chat/Preview focus surfaces, restrained structural dividers, flat navigation/action rows, and warm amber only for active or primary states.

Implementation rule: work from large visible impact to fine polish. Each block gets a manual visual checkpoint before the next block. Components consume shared tokens and variants; no new local color, radius, icon-size, text-size, or control-size exceptions without a reusable documented purpose.

#### Existing Completed Foundation

- [x] Full-height vault layout foundation: Files, Selection Actions, and Preview are independent local-scroll columns with accessible vertical resizers. The old `--vault-top-height` token and horizontal Preview resizer are removed. Review Basket, Context Basket, and input remain in the Chat workspace stack with their existing bounded local scrolling.
- [x] Selection Action presentation foundation: the registry owns compact labels, semantic local Lucide icon keys, category, full description, and `app`/`embedding`/`provider` execution kind. Rows use semantic icons plus neutral-safe category dots; provider and embedding work use distinct small markers. The underlying action runners and permission behavior are unchanged.
- [x] Selection Actions collapse: the panel can shrink to a persisted 48px icon strip. It keeps semantic icons, category dots, visible lock state, and execution markers; inline-form actions expand the panel before opening their form. Layout preferences remain app-local settings, not vault metadata.
- [x] Left navigation and File Tree collapse: both panels use persisted 48px rails, accessible toggles, and explicit reveal/expand behavior. Preview-local messages render in their dedicated bottom-bar segment.

#### Shared Modal Interaction Foundation

- [x] Settings, preset-create, and Review dialogs use one shared modal behavior: backdrop clicks and Escape do not dismiss; Tab focus stays inside the active dialog; visible Cancel, Close, Save, or confirmed execution actions remain the only close paths. Targeted source tests and manual UI verification are green.

#### 7.9.1 Shared Visual System Foundation

- [x] Inventory current surface, border, text, icon, radius, spacing, and tool-control values before visual changes.
- [x] Define a small semantic token scale for surface roles, text roles, type sizes, icon sizes, control sizes, radius, and spacing. Theme changes must be token-driven.
- [x] Define shared component patterns for compact tool controls, Files/Selection Actions panel headers, and the baseline flat Selection Action row in `components.css`; owner styles retain only local layout and state geometry.
  - [x] Extend shared patterns to flat navigation rows, framed context packets, and active states.
- [x] Keep structural dividers only; remove decorative per-button and redundant toolbar dividers as components migrate.

#### 7.9.2 Left Navigation Refresh

- [x] Move the expanded left navigation from outlined buttons to flat semantic icon/text rows with a subtle active surface.
- [x] Keep section hierarchy through compact muted labels, spacing, and minimal structural separators.
- [x] Preserve the current icon rail behavior, hover titles, keyboard accessibility, preset expansion, and app-local persistence.
- [x] Manual checkpoint: compare expanded and collapsed navigation with the agreed visual references before continuing.

#### 7.9.3 Shared Toolbars And Collapse Geometry

- [x] Apply the shared compact tool-control pattern to navigation collapse, Files refresh/collapse, Selection Actions collapse, and Markdown Back/Forward controls.
- [x] Make Files and Selection Actions header/control geometry aligned in expanded and collapsed states.
- [x] Enforce collapse direction and fixed-neighbor behavior: a collapse must not make sibling panels grow or leak content into Preview.
- [x] Keep the outer Chat/Vault resize usable when Rails are collapsed; inner resize controls only disable where their owned panel is collapsed.
- [x] Manual checkpoint: test every Files/Actions open-collapse combination and outer resize at narrow and wide window sizes.

#### 7.9.4 Files And Selection Actions Visual Refresh

- [x] Simplify the Files toolbar to compact Refresh and Collapse icon controls without decorative vertical dividers.
- [x] Reduce Selection Action row visual weight: flat icon/text actions, semantic category dot and execution marker, clear active/blocked state, no persistent card grid. Targeted checks and manual visual checkpoint are green.
- [x] Keep permission, provider, embedding, lock, and selection state visible without relying on color alone.

#### 7.9.5 Compact Review And Context Baskets

- [x] Make Review Basket and Context Basket default-collapsed with compact headers, counts, and preserved keyboard/accessible state.
- [x] Reduce basket vertical footprint and local list density without hiding review safety state.
- [x] Render Context items as compact framed packets with target icon, short label, and restrained path context.

#### 7.9.6 Preview And Status Polish

- [x] Align Preview toolbar controls with the shared tool-control pattern. History, Reveal, Edit, and Update use compact icon controls with accessible labels and hover descriptions.
- [x] Keep Preview a darker reading/focus surface and preserve its separate local-status ownership in the bottom bar.
- [x] Recheck redundant path/vault labels across Files and Preview. The empty static title is removed; the loaded preview path remains because it identifies the actual reading target when selection and Preview differ.

#### 7.9.7 Responsive, Theme, And Accessibility Final Pass

- [x] Test all collapse combinations, keyboard/focus behavior, tooltips, and local scrolling at narrow and wide desktop widths.
- [x] Verify Dark mode and future Light mode use the same semantic tokens and no component-local recolor exceptions.
- [x] Run UI source/accessibility checks plus the full suite; document any intentionally deferred polish before scope is frozen in Phase 8.

#### Deferred To V1.1: Interaction Density Follow-Ups

- [ ] Move File Tree permission controls (`R`/`W`) to row hover/focus while preserving direct/inherited/off state and keyboard reachability.
- [ ] Decide whether Session Log becomes a compact bottom-bar activity drawer instead of a prominent Workspace entry.
- [ ] Add Focus Mode only after individual collapses are visually stable; it coordinates icon rail, Files, and Context Basket and persists app-locally.

## Phase 8 - V1 Product Readiness And Scope Freeze

Phase 8 finishes the product before release hardening starts. It may add only small, complete, safety-preserving V1 workflows. Each accepted item needs a named owner, targeted tests, manual UI verification, and updated docs. It is not a reopening of broad V1.1 ideas.

### 8.1 Product Identity And First-Run Experience

- [x] Final product name: lowercase `vitruvios`. Public description: `Local-first Markdown assistant.`
- [x] Public positioning leads with an independent local-first Markdown/project workspace; Obsidian-style vault compatibility is a supported workflow with explicit limits.
- [x] Apply the chosen name and description consistently to splash, app chrome, README, package/build metadata, and active release documentation in one controlled branding change.
- [x] Upgrade the splash/start screen into a useful first-run surface: primary Open Vault, two portable recent-vault entries, local-provider availability, and no fake controls. Profile-based New Vault creation stays post-V1.

### 8.2 Folder Actions And AI Response Consistency

- [x] Replace separate List/analyze folder actions with deterministic Inspect Folder: direct-level counts plus grouped Folder/Markdown entries, no note-content reads, and a Check whole tree follow-up using the same structured renderer.
- [x] Add the reusable Folder Scope form foundation. Inspect Folder exposes current folder or subfolders, bounded depth, Markdown-only file type, and max files. Folder Context and Folder Summary adopt the same scope model in their dedicated follow-up steps; the hard total-context cap remains enforced when content is later loaded.
- [x] Make Folder Context add a visible Markdown snapshot package to Context Basket. Each user-chosen packet shows scope, note and total-character limits, reads Markdown only, and stops at the configured bounds; ordinary legacy folder references remain content-free.
- [x] Make Folder Summary use the shared Folder Scope form and shared Markdown scope reader. It sends only explicitly listed Markdown files with the visible scope to the provider; images/PDFs remain excluded in V1 while the configuration model remains extensible for future file types.
- [x] Add Settings -> Action Defaults for Folder Context and Folder Summary. Defaults initialize action forms but per-run choices remain visible and session-local.
- [x] Standardize Inspect Folder and provider-backed file/folder summaries: app-owned Markdown title and scope metadata, readable headings/lists, and concise body-format contracts. Free chat replies remain intentionally flexible; generated-note metadata stays owned by the creating flow.

### V1.1 UI Polish Follow-up

- [ ] Standardize Settings visual rhythm across categories: field groups, labels, helper text, save rows, spacing, and empty states. Reuse shared Settings component rules; do not alter action behavior as part of this polish.

### 8.3 Final V1 Scope Gate

- [ ] Re-evaluate V1.1/V1.2 candidates once against safety, core usefulness, implementation completeness, and regression risk. Reclassify only small, self-contained candidates with a defined owner and test plan.
- [ ] Add a subtle splash/version label sourced from application metadata, never duplicated as a renderer constant.
- [ ] Define and implement the V1 Light/Dark foundation through shared semantic tokens, persisted preference, and one explicit theme owner. Theme presets and broad customization remain later work.
- [ ] Add one dedicated Embeddings index surface that shows index state and exposes an explicit Rebuild/Refresh action. Keep automatic indexing and manual rebuilding under the same index owner.
- [ ] Define the V1 Vault Home, Recent Files, and Search scope before implementation. The decision must state which filename/path, YAML/tag, note-text, and semantic signals are searchable and how Read permissions affect discovery and result use.
- [ ] Add a structured metadata-index foundation under `.vitruvios/index/metadata/`, separate from vector embeddings. V1 integration should support Search and index health without becoming authority for unreviewed writes.
- [ ] Define the Editor Light V1 baseline on top of the existing source editor and reviewed Update flow. Decide the small formatting-control set for V1 and explicitly defer richer colors, tables, toolbar customization, live editing, and detached workflows to V1.1.
- [ ] Move every rejected candidate back to the explicit V1.1/V1.2 Backlog with a short reason.
- [ ] Freeze V1 scope. After this point, only security, data-loss, core workflow, or external-test blockers may enter V1.

## Phase 9 - V1 Freeze And Release Baseline

V1 is done when all current V1 phases are complete and the release gates below are green. New findings after the Phase 8 scope freeze are V1-must only when they block safety, core usefulness, or external testing; otherwise they move to V1.1 or the Parking Lot.

- [ ] README update, including clear beta trust boundaries and build-it-yourself guidance.
- [ ] Architecture docs update.
- [ ] Testing docs update.
- [ ] Manual smoke tests.
- [ ] Focused external audit.
- [ ] GitHub cleanup.
- [ ] Dependency and supply-chain gate: `npm ci`, `npm audit --audit-level=high`, lockfile review, and dependency diff review before release.
- [ ] Secret scan gate with gitleaks or an equivalent tool before public release.
- [ ] Release artifact gate: build from clean checkout, generate SHA256 checksums, and publish checksums with the release notes.
- [ ] Document unsigned-build status until code signing exists; do not imply OS-level trust before signing is implemented.
- [ ] Package/build check.
- [ ] V1 freeze decision and beta release candidate.

## V1.1 / V1.2 Backlog

- [ ] Focused partial edit engine: insert/replace a section without sending or pasting back the whole note.
- [ ] Manual drag-and-drop move with link-update planning and review; embeddings may help suggest destinations, but Markdown link rewriting must be deterministic parser/app logic.
- [ ] AI move/rename/archive note services with link update, backlink warnings, undo/repair, and batch review.
- [ ] Folder Context Index maps if they did not pass the V1 necessity review.
- [ ] Slim Brain OS integration with explicit load order, validation, and no ability to override code-side safety laws.
- [ ] Broken-link/orphan scans and project-note maintenance reports as report-only cleanup foundations.
- [ ] Audit log / backup history UI with restore-oriented controls.
- [ ] End-to-end Electron tests.
- [ ] Async or worker-based deep folder crawling for very large vaults.
- [ ] Backup retention policy and optional cleanup UI.
- [ ] Batch AI actions over multiple notes with grouped diffs.
- [ ] More complete settings UI, including hotkeys and theme presets.
- [ ] Template V1.1 planning input: Beka's private Book project notes are local-only and intentionally ignored by Git. Revisit them when designing richer template/preset workflows.
- [ ] Vault Profile V1.1: named profile library, custom folder roles, and multiple project destinations (for example work/private) that Template creation can select explicitly.
- [ ] Chat action display setting: allow hover actions such as `Save as Note`, `Copy`, and future message actions to render as text, Lucide SVG icons, or icon+text without changing chat action logic.
- [ ] Suggestions score display setting: allow the explanatory match text beside score rings to be hidden for users who only want the ring/percentage. This must be a presentation setting only; score thresholds, suggestion ranking, and Review Basket conversion logic stay unchanged.
- [ ] Context Basket type badge polish: optional distinct badge/border colors for `MD`, `DIR`, future `IMG`, `PDF`, `FILE`, and unknown targets. These colors must remain separate from Selection Action behavior colors.
- [ ] Ambiguous image-link resolver: when `![[image.png]]` matches multiple vault images, show a clear unresolved state, let the user choose the intended image, then propose a reviewed Markdown link update instead of guessing.
- [ ] Detachable/undocked Markdown preview window for multi-monitor workflows.
- [ ] Vision analysis and image tagging gated by model capability.
- [ ] Obsidian plugin compatibility audit for common workflows: Templater, Dataview, Tasks, Advanced Tables, Calendar, Kanban, Iconize, Style Settings, Omnisearch, Smart Connections, Tag Wrangler, Linter, Mindmap, Homepage, Recent Files, and Make.md.
- [ ] Optional Iconize compatibility: detect Iconize metadata when safe and mirror icons in vitruvios UI without requiring Iconize.
- [ ] Style Settings compatibility research: read/import visual settings only through explicit user choice; do not write `.obsidian` automatically.
- [ ] Kanban and Mindmap support should start as rendering/fallback research, not full plugin reimplementation.
- [ ] Export actions: Markdown and HTML first, designed so more formats can be added later.
- [ ] Natural Action Control (V2.1 candidate): optional toggle that lets the model map natural language to existing registered Selection Actions. It must only execute predefined app actions through the same permission, review, backup, and audit boundaries. The recognition layer may use prompts or trigger rules, but it must live in its own module and never create new hidden capabilities.
- [ ] Chat Sessions / conversation history as a later V2 feature: session list, resume, delete, privacy rules, and per-vault/global storage decisions.

- [ ] Persistent Suggestion Sessions: optionally store open suggestion groups under selected-vault `.vitruvios/` with created time, source target, index/model version or file hashes, status, and stale validation. Current V1 Suggestions remain intentionally session-only and disappear on reload/restart.
- [ ] Merge Workspace for similar/complementary notes: compare two source notes, show A/B diff, create a reviewed third merged file, and optionally archive the sources only after explicit confirmation. This must become a dedicated `merge_notes` action, not an overloaded `update_note`.
- [ ] Link candidates from embeddings/metadata: suggest exact Markdown link insertions with a visible line diff before converting to reviewed `update_note` proposals.
- [ ] Folder/destination candidates: suggest target folders using embeddings plus metadata index signals, but execute only through future reviewed move/link-update services.
- [ ] Plugin block fallback registry: detect common unsupported Obsidian plugin blocks, preserve source, and render a clear unsupported-plugin notice without executing plugin code.
- [ ] Editor Light expansion after the V1 baseline: richer colors, tables, toolbar customization, optional live preview, detached editor/preview workflows, and additional Markdown-safe helpers.
## Parking Lot

- [ ] Voice input.
- [ ] Peer-to-peer sync.
- [ ] External HTTP/CLI automation API.
- [ ] Encrypted backups with user-managed passphrases.
- [ ] Vitruvios plugin/extension architecture and any plugin marketplace. Revisit only with a dedicated security model that cannot bypass permissions, review, backup, audit, or provider boundaries.
