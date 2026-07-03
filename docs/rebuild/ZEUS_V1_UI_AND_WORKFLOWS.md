# ZEUS V1 UI And Workflows

## Typography And Assets

- V1 bundles Inter locally from `src/renderer/assets/fonts/InterVariable.woff2`; third-party font licenses live under `third_party/inter/` and must ship with release builds.
- Lucide SVG icons are bundled locally under `src/renderer/assets/icons/lucide/`; semantic mappings live in `src/renderer/icons/iconRegistry.js`, so individual icons can be replaced without touching UI components. License notices live under `third_party/lucide/`.

## Main Layout

V1 should stay simple:

```text
Left: app navigation and actions
Middle: workspace tabs for Chat, Suggestions, and Session Log; Chat owns Review Basket, Context Basket, and input
Right: Files, Selection Actions, and Markdown Preview
```

Chat input auto-grows within bounded limits for longer prompts. Once it reaches the limit, the input scrolls internally. The send/cancel button must remain reachable and the main app layout must not shift unpredictably.

The exact layout can change, but these concepts must remain visible:

- selected vault
- selected file/folder
- read/write permissions
- chat
- review basket
- diff/preview

## New Project Workflow

`New Project` is deterministic app logic, not LLM improvisation.

Fields:

- project name
- short description
- area: personal / work / creative / learning / other
- target project folder

Creates:

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

The app can optionally ask the AI for draft content after the structure exists.

The default project structure ships with V1, but the implementation must be template/preset-based and use vault folder roles so the structure can later become editable in Options without rewriting project creation logic.

Current Phase 7.1 state: deterministic note/project presets live in `src/shared/templates/presetRegistry.js`. `src/renderer/templates/mountCreationPresets.js` renders the left-navigation preset buttons and adds generated review proposals to the Review Basket. Note presets create `create_note` proposals. Project presets create one `create_from_template` proposal containing planned folders and Markdown files. Presets never write directly. Create proposals are edited in the Review Basket before execution; execution does not show a second title prompt. Project preset execution creates folders first through the reviewed vault folder-create boundary, then creates Markdown files through the reviewed create-note boundary.

## Options Menu V1

Keep settings minimal and focused. The confirmed V1 sections are defined below in `Options Menu Decisions`.

## Session Activity Status

The status bar currently shows the latest app status only. V1 should add a lightweight session Activity/Status Messages view under `WORKSPACE` if it stays small.

Activity is not audit history. It is an in-memory per-session UI list that clears when the app restarts. Each entry should carry structured fields such as time, type, action, target path, and detail. This allows messages such as `Renamed: 00_Inbox/01_TODO_TEST.md. Links were not updated in V1.` to render with clearer hierarchy: the action can be success-colored, the path neutral, and the warning amber.

Persistent audit and restore-oriented history belong to `.zeus/audit.jsonl` and later backup/history UI work, not this session activity view.
## Review Basket

The review basket is the central V1 UX.

It groups suggestions by category:

- create
- update
- move/rename
- tags/properties
- links
- archive/trash
- manual review

Each item can be checked or unchecked. The final execute button applies only selected items.

## Inbox Cleanup Workflow

```text
Select Inbox
-> Ask ZEUS to analyze
-> ZEUS reads allowed files
-> embeddings provide similar notes and folder candidates
-> AI creates proposal plan
-> user reviews grouped suggestions
-> selected actions execute
-> backup/audit/validation
```

## Confirmed UI Decisions

Base layout keeps the current mental model:

```text
Left navigation | Main workspace | Vault panel
```

Left navigation contains app-level commands such as New Project, Inbox Review, Review, and Settings.

Main workspace order:

```text
Chat history
Review Basket
Context Basket
Input field
```

Vault panel keeps file tree and preview visible at the same time.

Resizable panes must have minimum sizes so core functions cannot be dragged into unusable states.

Suggested starting minimums:

```text
Left nav:        180-220 px
Main workspace: min 420 px
Vault panel:    min 360 px
File tree:      min 220 px height
Preview:        min 240 px height
```

## Provider Control Decisions

The topbar shows provider state in three separate controls:

- provider status: online/offline indicator only.
- provider dropdown: active provider selection.
- model dropdown: selected model for the active provider.

Default provider URLs live in the provider registry. The topbar must not expose raw URLs. URL overrides belong to the Settings screen and update the same provider settings state instead of adding a parallel provider path. Provider timeout is shown in Settings as seconds and stored internally as milliseconds; local model users can raise it for slower requests without changing provider code.

Provider controls never grant vault access. Providers only receive the context package prepared by app logic.
The topbar also provides a manual provider status refresh button. It reuses the provider status/model refresh flow without polling or changing the selected provider.
## Review Basket Decisions

Review Basket is a standalone module, not part of chat rendering.

The first implemented flow is `Save as Note` under assistant responses. It adds a selected `create_note` proposal targeting `00_Inbox/AI Responses` to the basket. The basket can execute selected `create_note` proposals after a Create Note preview modal. It must not write directly from chat or renderer filesystem access; execution goes through the preload vault API and main process vault write service.

Identical open proposals are de-duplicated by the basket state. Re-clicking Save as Note for the same assistant response should not create another open item. Visible proposals can be dismissed individually. Pending proposals can be cleared as a group. Dismissing a completed item only removes it from the visible basket; audit history remains separate.

It should be collapsible and modular enough that its look, card layout, ordering, grouping, or future controls can change without touching chat, file tree, provider, or vault code.

Each proposal has a status:

- open
- selected
- running
- done
- failed
- rejected
- stale

After executing selected proposals, the basket is not blindly cleared. Executed proposals become done, failed proposals become failed, stale proposals become stale, and unselected proposals remain open until accepted or rejected.

Active view should focus on open, failed, and stale proposals. Done/rejected proposals can move into history/audit views.

V1 does not need manual drag-and-drop execution ordering. The app should apply a safe automatic order and block conflicts.

Manual execution ordering via drag and drop is a future comfort feature after dependency validation exists.

## Permission UI Decisions

V1 uses separate Read and Write permissions.

Meaning:

- Read: ZEUS may read the file/folder as context.
- Write: ZEUS may propose write actions for the file/folder.
- Write never means silent execution.

Permission state has three visible levels:

- direct: permission explicitly set on this file/folder.
- inherited: permission comes from a parent folder.
- blocked/off: permission is not active, or the path is protected.

Folder permissions inherit to children. Child files/folders may override inherited permissions. An explicit child off state must block inherited parent access instead of being treated as unset.

The UI must make direct vs inherited state understandable without making inherited permissions look like an error. Direct on is full accent, inherited on is lighter, and off remains visually inactive.

Dot folders and runtime/private folders such as `.obsidian`, `.zeus`, and `.zeus_backups` remain blocked regardless of UI state.

Permission shortcuts:

- Click `R` or `W`: toggle only the current file or folder.
- Ctrl+Click `R` or `W`: apply to currently visible/expanded descendants only.
- Shift+Click `R` or `W`: recursively apply to all descendants by listing folder structure only.
- Focused File Tree row, `R` or `W`: planned follow-up shortcut to toggle read/write on that row only. It must be disabled while focus is in text inputs, editors, rename fields, or any future inline edit state.
- Focused File Tree row, `F2`: starts Rename Light for one selected Markdown file. Rename Light is same-folder only, writes through the main-process vault service, appends an audit entry, and reports that links are not updated in V1. It is disabled while focus is in text inputs/editors and must not imply link updates. AI rename remains a later reviewed service.

Recursive permission application must not read Markdown contents. It only needs folder/file paths from the vault listing API. Context remains a separate workflow based on the selected file/folder and explicit context rules.

## Chat Request Control Decisions

While a provider request is running, the Send button becomes `Cancel`. Cancel uses the request id and `chat:cancel` IPC to abort the active provider request through `AbortController`. The renderer also checks the active request id before applying a response so late canceled responses cannot appear in chat. Internal provider timeouts are reported as provider errors, not as user-canceled requests.
## Chat Message Metadata

- ZEUS chat messages show hover metadata below the bubble: `Save as Note` and `Copy` on the left, local time on the right. Persistent follow-up actions such as `Check whole tree` stay in the visible action row below the message. Chat session persistence is not V1 and belongs to the future backlog.

## Chat Markdown Rendering Decisions

Assistant chat messages render through the shared Markdown renderer so chat and note preview improve together over time.

User messages stay plain text to preserve exactly what the user typed.

`Save as Note` keeps the raw assistant Markdown content, not rendered HTML.
## Markdown Preview Rendering Decisions

Markdown preview renders sanitized HTML from Markdown source. It supports the V1 baseline: headings, paragraphs, lists, tables, blockquotes, code spans, fenced code blocks, emphasis, Markdown links, Obsidian-style wikilinks, and YAML frontmatter.

YAML frontmatter is shown as a visible Obsidian-like Properties block at the top of the Markdown preview, including simple inline arrays and block-list values such as `tags:\n  - item`. It is not directly editable in this renderer block. The source editor can stage manual full-note updates through the `Update` button; blocked update attempts show visible preview feedback instead of silently failing. Future Properties actions belong to the Selection Actions and review workflows, so metadata suggestions can be proposed and reviewed instead of silently changing frontmatter.

Unsafe raw HTML is escaped. Renderer fallback must use text output, not unsanitized `innerHTML`.

The preview toolbar includes an `Edit` button that switches to local Markdown source mode. Local source edits do not write directly to the vault. When the edited source differs from the loaded source, `Propose update` creates an `update_note` proposal in the Review Basket. Persisted writes still require the existing diff, backup, stale-content validation, and audit logging path.

## Markdown Link Navigation Decisions

Markdown rendering and Markdown navigation are separate blocks.

- Wikilinks and relative Markdown links render safely first, then the preview controller delegates clicks through a navigation callback.
- Clicking a resolved internal Markdown note link opens the target note in the preview.
- Clicking a link must not automatically expand the file tree.
- The preview toolbar provides a `Reveal in Files` control so the user can intentionally locate the opened note in the tree.
- V1 link navigation supports internal Markdown files only. External URLs, images, attachments, and raw HTML interaction remain out of scope for this block.
- Preview back/forward history is available in the preview toolbar. It changes the preview history only and does not auto-expand the file tree.
- Link resolution prefers folder-relative candidates before broader vault-root candidates.

This keeps Markdown rendering, vault path resolution, preview history, and file-tree reveal as separate modules instead of coupling them inside the renderer.


## Selection Actions Decisions

Selection Actions are deterministic app buttons for the currently selected file or folder. They are not prompt triggers.

V1 action categories:

- `Context`: adds explicit context or prepares a context source.
- `Read`: lists, summarizes, or analyzes without writing.
- `Write`: creates or updates only through reviewed write flows.
- `Organize`: reserved for later move/rename/archive workflows.

Missing permissions for Selection Actions are handled by app logic before provider calls. Permission-blocked actions stay visible as muted, clickable soft-disabled buttons. Hover shows the reason; clicking shows a ZEUS chat bubble with the same guidance and a retry action where applicable. Read/context actions explain that `R` is required. Write actions explain that both `R` and `W` are required when they need loaded content plus write permission. These messages come from the shared Selection Action permission text helper, not from duplicated per-action strings. ZEUS does not send these blocked requests to the model and does not silently do nothing.

Current V1 foundation actions:

- selected Markdown file currently shows `Summarize file`, `Use as context`, `Find similar notes`, and `Propose content update`. `Propose content update` stays visible and clickable for Markdown files; when R/W or loaded content are missing it appears visually muted and clicks show app-side guidance. When ready, it asks for an explicit content-change instruction, then adds a reviewed whole-note `update_note` proposal to the Review Basket. Rename, move, archive, and delete remain separate future actions.
- selected folder currently shows `Use as context`, `List folder`, `Analyze folder`, and `Summarize MD files`.
- `Use as context` is active for readable folders and for readable loaded Markdown files. Folder context is path-only; Markdown file context includes loaded note content.
- inactive actions remain visible as intentional V1 slots and must not execute hidden behavior.
- provider-backed Selection Actions show a visible pending chat message with a lightweight spinner while the provider is working. `Summarize MD files` reads only direct Markdown files from the selected folder, applies Settings/Limits caps, ignores images/PDFs/attachments, and returns a normal saveable ZEUS answer. Summary answers suggest editable Save-as-Note titles in the form `Summary - MD - <file name> - YYYY-MM-DD` for Markdown files and `Summary - DIR - <folder name> - YYYY-MM-DD` for folders. They default to `AI Responses/Summaries` under the configured Inbox role.
- future custom actions belong behind Settings and must produce visible proposals or context items, not direct writes.

## Context System Decisions

Selection and context are separate states.

Selected context is explicit, visible, request-scoped, and deterministic:

- selecting a file or folder in Files only changes the active UI target; it does not add provider context.
- the Context Basket below the Review Basket is the only selected-file/folder source attached to provider requests.
- future Selection Actions add files or folders to the Context Basket through app logic, not through broad prompt interpretation.
- Context Basket items can be clicked to reveal/select their target in Files.
- Context Basket items can be removed individually with `x`, or cleared together with `Clear all`.
- file context items attach Markdown content only when they were explicitly added and `R` allowed the read at add time.
- folder context items attach path context only. They do not include file names or file contents. Natural-language folder questions must not list folder contents. Use the `List folder` Selection Action for current-level folder listing. The resulting app message offers `Check whole tree`, which runs the existing recursive folder listing flow and still reads only folder/file names, not Markdown contents.
- Context Basket target types are represented by badges such as `DIR`, `MD`, `IMG`, `PDF`, `FILE`, and unknown. V1 may keep them visually neutral. Later polish may use target-type badge or border colors, but those colors must remain separate from Selection Action behavior colors.
- Selection Actions use behavior categories with stable color slots: Context, Read, Write, and later Organize.
- attached context is not stored back into chat history.
- if Read is not active for an explicit app action, ZEUS must ask the user to enable `R`; it must not guess from the file name or ask for a file upload.
- missing-Read and missing-Write blocks show a clear permission message, but no retry button. After enabling R or W, the user repeats the visible Selection Action or request explicitly. Permission-confirmation text such as es ist freigegeben must not become a broad prompt trigger.
- if the selected target changes before retry, the retry must stop with a clear mismatch message instead of applying the old blocked action to the new target.
- if the selected file has permission but no loaded content, ZEUS should instruct the user to reselect/click the file or refresh the preview inside ZEUS, not switch to external upload instructions.
- folder-scoped follow-up prompts are guidance-only in V1. The app should point the user to Selection Actions instead of inferring a parent folder from wording.
- selected folder listing is executed by the deterministic `List folder` Selection Action when `R` is active. Natural-language folder wording may show only this inline help: `Use "List folder" in Selection Actions to inspect the selected folder.` It must not list, read, or create blocked actions by itself. The `List folder` message may offer `Check whole tree` as a follow-up app button for recursive structure listing. Pending scope replies and existing blocked-action retries remain app-state driven. Supported `list_folder` model-action envelopes remain a fallback and are checked against active app state before execution. Visible app-generated folder listings must not be stored back into provider chat history with their file names; history receives only a short app-result marker so old listings cannot become stale model context. Context intent stays narrow: pending-action replies, existing blocked-action retries, and help-only selection-action guidance. It must not grow into one-off typo lists, deictic "here/it" guesses, or broad fuzzy prompt matching.

For selected folders:
- ZEUS may use the folder path as the active target.
- ZEUS must not blindly load every file in the folder without an explicit analysis workflow and limits.
- Future Folder Context Index workflow: when a folder is selected, ZEUS may count Markdown files and subfolders first, then ask whether to list and remember the folder structure.
- Persistent Folder Context Indexes must be stored in `.zeus/` or a configured cache location, not blindly as normal vault notes.

- Current folder controller: `PendingActionState` plus `FolderContextController` resolves only open scope choices and explicit app flows. Short replies like 'all' or 'alle' only resolve an existing pending folder action; without a pending action they are intercepted with a short app-level clarification and do not reach the provider. Folder listings are capped by `contextLimits` and show explicit limit markers when the cap is reached.

Context sources must remain visible and separated:

- selected file context (`selected_file`)
- selected folder context (`selected_folder`)
- manually attached context
- temporary dropped Markdown files
- embedding candidates
- Brain/Core rules

Markdown drag and drop in V1:

- External `.md` and `.markdown` files dropped into chat become temporary Context Basket items immediately.
- They are not automatically copied into the vault.
- The chat shows a ZEUS message for the drop with an `Import to Inbox` action.
- `Import to Inbox` adds a reviewed `create_note` proposal; Review Basket edit/execute performs the actual vault write.
- The default import target is the configured Inbox role. Filename/title remain editable in the Review Basket before execution.
- Detecting dropped files that already belong to the opened vault is a later refinement; this V1 slice handles external Markdown drops only.

Manual move drag and drop is not part of the Markdown file import flow. It is deferred to V1.1 so Move/Rename can include deterministic Markdown link-update planning, diff/review, backup, and audit. Embeddings may help suggest target folders, but link rewriting must be parser/app logic rather than LLM guessing.

Non-V1 drag and drop:

- images
- PDFs
- audio/video
- automatic media organization


## Settings UI Decisions

The Settings screen is a dedicated renderer module, not shell logic.

Current V1 Settings implementation:

- `Providers` exposes LM Studio/Ollama URL overrides, provider capability badges, active provider persistence, and selected model persistence.
- Provider URLs are validated and persisted through main-process settings services.
- Active provider and selected model are persisted through the provider model service.
- Saving or resetting a provider URL refreshes provider status through an app event, not through direct module coupling.
- `Limits` exposes the V1 caps for provider timeout, model-list timeout, selected-file context, folder/file listing, analysis file count, and review suggestion count.
- `Vault Profile` exposes folder-role overrides through the settings bridge while preserving the Phase 2 vault-profile defaults and helpers.

Future sections such as Embeddings, Safety, Templates, hotkeys, and themes must extend the same settings store categories instead of creating parallel config files or provider-specific state.

## Options Menu Decisions

V1 Options must stay focused.

Required V1 sections:

1. Vault Profile
   - Inbox
   - Projects
   - Knowledge
   - Archive/Trash
   - optional Brain/Core path

2. Providers
   - LM Studio URL
   - Ollama URL
   - active provider
   - selected model

3. Limits
   - max selected-file context size
   - max listed folders/files per request
   - max files per analysis
   - max suggestions per review
   - max index batch size

4. Embeddings
   - automatic indexing on/off
   - update index
   - rebuild index
   - index status

5. Safety
   - show audit log location
   - show backup location
   - backups for risky actions are not disableable in V1
   - writes remain review-required

6. Templates
   - show project template
   - implementation should allow future editing
   - V1 may keep editing minimal/read-only if needed

Not V1 Options:

- themes
- plugins
- cloud providers
- trusted/yolo mode
- monetization
- complex shortcut editor
## Early Scaffold UX Findings

These findings came from the first runnable Electron scaffold. They are product/UX requirements, not just visual polish.

### Startup / Vault Opening

The app should not drop the user directly into an empty workspace.

V1 should start with a simple splash/start screen:

- ZEUS Agent name/logo area
- primary `Open Vault` action
- later: recent vaults if useful

`Open Vault` can remain available inside the app, but the first-run/opening experience should feel intentional and central, similar to the prototype.

### File List / Tree

The prototype file tree felt better than the first scaffold list.

V1 file navigation should move toward:

- compact file rows, not large button-sized rows
- persistent tree behavior, including refresh without collapsing expanded folders
- folders expand/collapse in place instead of replacing the whole tree view
- selected file/folder state remains visible
- tree area owns its own scrolling

The current "enter folder and replace list" behavior is acceptable only as temporary scaffold behavior.

### Vault Panel Layout

V1 should make selected-file/folder actions visible without forcing the chat to infer intent from broad wording.

Target layout:

```text
Vault Panel:
Top row:    Files | Selection Actions
Bottom row: Markdown Preview across both columns
```

Files stays compact and navigational. Selection Actions has the same top-row height as Files and owns its own scrolling. Markdown Preview spans the full vault-panel width below both top panes. Selection Actions is deterministic app UI for the currently selected file or folder, not another chat prompt surface.

Responsive rules:

- Files and Selection Actions keep useful minimum widths.
- Markdown Preview remains readable and should not disappear when the window narrows.
- The whole app shell should not scroll during normal use.
- Scroll should be local to file tree, selection actions, Markdown preview, chat history, and review basket.
- Future detachable preview is a valid follow-up if the combined vault panel becomes too crowded, but it is not part of the first 5.4 cut.

### Selection Actions Panel

The Selection Actions panel replaces broad prompt guessing with explicit app-side actions.

Current V1 foundation actions for selected folders:

- Use as context
- List folder
- Analyze folder
- Summarize MD files

Current V1 foundation actions for selected Markdown files:

- Summarize file
- Use as context
- Find similar notes
- Propose update

Find similar notes uses the local embedding index and keeps the chat output compact. Clicking it opens a compact options form with Settings-backed defaults for mode, minimum match, content/metadata weight, and max results. The same field order is used in Settings and in the per-run form. The form remembers the last used values for the current app session; Settings remain the restart defaults. `Refresh index first` is explicit and should be used after copying, moving, or editing Markdown files outside the index. Results are shown as percentages with strong/medium/weak/noisy labels, content/metadata detail, and a low-content warning. The V1 direction is to show these results in a dedicated Suggestions workspace instead of a long chat bubble or a cramped action panel. It does not create Review Basket actions by itself.

Future actions can be added through the same registry and handler structure, for example `Find related notes`, `Inbox Review`, move/rename, image actions, or later custom actions. Adding a future action or target type such as image, PDF, or unknown file should mean adding it to a registry with clear selection requirements, not adding new prompt phrases to chat or context intent.


## Workspace Tabs Direction

The main work area should support three V1/V1.x workspaces:

- `Chat`: normal conversation, assistant responses, Save as Note, Review Basket, Context Basket, and prompt input.
- `Suggestions`: grouped analysis results such as similar notes, link candidates, tag candidates, folder candidates, and cleanup findings. Suggestions are not writes. They can be dismissed, previewed, or converted into concrete Review Basket actions only when the user selects them.
- `Session Log`: per-session status/audit-style messages for visible app activity such as reads, writes, renames, failures, and warnings. This is a UI convenience layer over the current status stream, not a replacement for persistent audit logs.

Suggestions should behave as an intermediate review layer between analysis and the Review Basket:

```text
analysis action -> grouped suggestions -> user selects suggestions -> preview/diff -> add concrete actions to Review Basket -> reviewed execution
```

Recommended layout for the Suggestions workspace:

- left side: compact suggestion groups/items with checkboxes, status/score labels, dismiss controls, and per-item preview controls.
- right side: detail preview for the selected suggestion. Preview type depends on suggestion kind: text detail, Markdown-line diff, property/tag diff, move plan, duplicate comparison, or create-note preview.
- top or footer action bar: `Add selected to Review Basket` only becomes active when selected suggestions can become concrete actions. It must not mean execute.

Use `Dismiss suggestion` for hiding suggestions. Do not use `Delete` for suggestion rows, because file deletion/archive is a separate vault action with different risk.

### Left Navigation Cleanup

The left navigation should be grouped and quiet:

- `Open Vault` remains prominent.
- `New Entry` is collapsed by default.
- Entry presets expand below `New Entry` and push lower actions down.
- Future large preset lists need scrolling or grouping instead of overflowing the left column.
- Placeholder entries must remain explicit future slots and should not look like fake working features.

### Settings Layout

Settings should not become one long modal with every option stacked together.

V1 target:

```text
Settings Modal:
Left:  settings category menu
Right: active settings category content
```

Current implemented Settings categories are Providers, Limits, and Vault Profile.

V1 target categories are Providers, Limits, Vault Profile, Embeddings, Safety, and Templates.

Later categories such as Theme, About, and hotkeys should extend the same settings module and store shape instead of creating parallel configuration paths.

Later Settings should include a Chat Appearance option for assistant-message hover actions: text labels, Lucide SVG icons, or icon+text. The setting must only affect presentation; message actions remain semantic in chat code.

## Phase 6.5 UI Cleanup Plan

Phase 6.5 is a UI/settings cleanup step before new V1 feature candidates. It must not add new product workflows by itself.

Goals:

- make the left navigation calmer and grouped before adding New Project, Inbox Review, or future plugin-like entries.
- make Settings category-based before adding Embeddings, Safety, Templates, Appearance, or plugin compatibility options.
- keep all visible future slots explicit and non-functional until their real module exists.
- preserve the current modular ownership: shell composes layout, settings owns settings UI, action registries own actions, and styles stay in focused CSS files.

Left navigation target:

```text
WORKSPACE
  Chat
  Home          future slot
  Recent Files  future slot

CREATE
  New Note
    Note
    Todo List
    Article
  New Project
    Default
    Wiki
    DnD Campaign

VAULT
  Open Vault
  Inbox Review
  Review Basket
  Vault Cleanup  future slot

SETTINGS
  Settings
```

`New Note` and `New Project` are preset toggles and are collapsed by default. Expanding them pushes lower actions down. Presets are user-extensible later; curated ZEUS preset packs must use the same preset mechanism instead of hard-coded special paths. If preset lists grow, the left column gets local scrolling or grouped sections instead of overflowing. Left navigation entries must stay app-level commands; target-specific actions belong in Selection Actions.

Settings target:

```text
Settings Modal
- category menu
- active category panel
```

Current wired categories stay Providers, Limits, and Vault Profile. V1-ready categories are Providers, Limits, Vault Profile, Templates, Appearance, Embeddings, Safety, and About. Future/inactive categories may be visible only if they are clearly marked as not configured yet and do not imply fake functionality. Later hotkeys, plugin compatibility, custom actions, and theme presets must extend this same settings module and store shape instead of creating parallel configuration paths.

Current Phase 6.5 Settings implementation: the modal uses a two-pane layout with a left category menu and one active right-side category panel. Providers, Limits, and Vault Profile remain wired to the existing settings store. Templates, Appearance, Safety, and About are visible info-only slots until real modules exist. Embeddings now shows the V1 default decision: MiniLM multilingual default, Apache-2.0 license, Transformers.js / ONNX runtime target, and vault `.zeus/index` storage. It also owns Similar Notes defaults in the same order as the action form: mode, minimum match, content/metadata weight slider, and max results. Custom model path controls and broader rebuild controls remain pending follow-up work; the per-search form already has explicit refresh before search.

Vault Profile and Templates relationship:

- Vault Profile defines where roles live in the vault, for example Inbox, Projects, Knowledge, Archive, and Brain.
- Templates define what gets created, for example a project folder structure or a note draft.
- Templates must target folder roles instead of hard-coded folder names, so a `New Project` preset creates under the configured `projects` role.
- V1 keeps one active editable vault profile. Later versions may add multiple named vault profiles and custom roles such as Assets, Clients, Writing, or Research.
- Future role path selection should prefer a `Choose from Vault folders` picker. It must list folders from the opened vault and validate that the selected path stays inside the vault. A native OS folder picker is not the preferred default because it can point outside the vault.
- Manual path editing may remain available for power users, but it must be validated by the same vault-profile service.

Markdown Properties/YAML display should be visually distinct from normal prose through dedicated CSS tokens such as `--metadata-accent`, `--metadata-background`, and `--metadata-border`. V1 may use an amber/ember-like default, but the color should be token-based so Appearance settings can change it later.

Current Phase 6.5 implementation: Markdown preview Properties use the dedicated metadata tokens in `tokens.css`; only the rendered Properties block uses these tokens, normal prose/code/table styling remains on the general Markdown tokens.

Project style presets are a future workflow, not a Phase 6.5 implementation target. The intended model is:

1. ZEUS app theme controls the application UI.
2. Markdown preview theme controls how notes render inside ZEUS.
3. Optional project style presets can later influence Markdown preview and generated template structure for a project.

Project style presets should be detected through explicit project metadata such as `zeus_style_preset` in a project home note, not guessed from folder names. They must not inject inline HTML/styles into normal Markdown notes. For Obsidian parity, V1 keeps styles ZEUS-only plus Markdown-compatible structure. A future V1.1 feature may optionally export an Obsidian CSS snippet, but only after explicit user confirmation and never by silently writing into `.obsidian`.

Obsidian plugin compatibility direction:

ZEUS does not execute Obsidian plugins. Compatibility means one of three safe things:

1. render common Markdown/plugin output well enough that the vault remains readable.
2. optionally read harmless plugin metadata after explicit user choice.
3. rebuild useful workflows as ZEUS Selection Actions or Review Basket proposals.

Candidate plugins to research after V1 core remains stable: Templater, Dataview, Tasks, Advanced Tables, Calendar, Kanban, Iconize, Style Settings, Omnisearch, Smart Connections, Tag Wrangler, Linter, Mindmap, Homepage, Recent Files, and Make.md.

### Selection UX

The prototype's context-aware selection behavior should be recovered cleanly:

- `Ctrl+A` selects within the relevant hovered/focused concrete content region, not the whole app. Empty panel background must not trigger scoped selection.
- right-click offers safe region-specific selection/copy actions for content regions. File Tree does not expose `Select area` in V1. No write actions belong in this menu for V1.
- selection behavior belongs in `renderer/selection`; file-tree keyboard navigation belongs in `renderer/files`. Do not scatter shortcut logic across shell, chat, and preview code.
- file tree keyboard navigation uses `ArrowUp` / `ArrowDown` for visible rows, `ArrowRight` / `ArrowLeft` for folder expand/collapse, and `PageUp` / `PageDown` / `Home` / `End` for larger navigation. These keys do not trigger write actions.


### Detachable Edit Preview - Future

Later versions should allow the Markdown edit surface to detach into its own window or panel for longer writing sessions. The detached editor should keep the current file context, show live Markdown preview updates for common formatting such as bold and italic, and eventually expose a small formatting toolbar for common Markdown actions. This is not V1-critical; V1 keeps Edit Mode local, reviewed, and proposal-based.

### Implementation Note

Do not solve these by adding more logic to the shell. Keep the shell as layout orchestration and implement these in focused modules:

- startup/splash in `renderer/shell` or `renderer/startup`
- file tree behavior in `renderer/files`
- preview layout in `renderer/markdown` plus shell layout slots
- selection shortcuts in `renderer/shortcuts` or `renderer/selection`
