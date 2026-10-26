# vincarios V1 UI And Workflows

## Typography And Assets

- V1 bundles Inter locally from `src/renderer/assets/fonts/InterVariable.woff2`; third-party font licenses live under `third_party/inter/` and must ship with release builds.
- Lucide SVG icons are bundled locally under `src/renderer/assets/icons/lucide/`; semantic mappings live in `src/renderer/icons/iconRegistry.js`, so individual icons can be replaced without touching UI components. License notices live under `third_party/lucide/`.
- `docs/Design_index.html` is the active visual reference for Phase 7.7 polish patterns such as soft-disabled locks, empty states, trust badges, score presentation, hover behavior, and token usage. Use it as design direction, but adapt patterns through existing vincarios modules and tokens instead of copying demo markup blindly.
- Repeated UI element rules live in `docs/rebuild/VINCARIOS_V1_UI_COMPONENT_RULES.md`. Use that file before changing buttons, modals, badges, score indicators, action rows, status feedback, or icon-only controls.

## Main Layout

V1 should stay simple:

```text
Left: app navigation and actions
Middle: workspaces for Home, Chat, Search, Suggestions, and Review; Chat owns Context Basket and input, while Session Activity opens from the bottom status surface
Right: Files, Selection Actions, and Markdown Preview
```

Chat input auto-grows within bounded limits for longer prompts. Once it reaches the limit, the input scrolls internally. The send/cancel button must remain reachable and the main app layout must not shift unpredictably.

The native Windows menu remains available in V1. Its View menu owns explicit app-local zoom shortcuts: Ctrl++ to zoom in, Ctrl+- to zoom out, and Ctrl+0 to reset. Navigate exposes Home (Ctrl+Shift+H), Search (Ctrl+F), Suggestions (Ctrl+Shift+S), Review Basket, and Settings (Ctrl+,); native menu events and renderer shortcuts use the same validated workspace command path. Help links to the public repository in the system browser. Reindexing deliberately has no shortcut: it remains a visible Settings action. Navigation does nothing while a modal dialog is open.

## Visual Direction

vincarios V1 uses a compact, tool-first visual system: softly raised neutral app surfaces, darker Chat and Preview focus surfaces, restrained structural dividers, and warm amber only for active or primary states. Navigation and Selection Actions favor flat icon/text rows over a grid of outlined buttons. Repeated utility controls share one compact icon-control treatment.

Collapse is deterministic space management. A panel contracts toward the left, retains a visible boundary, clips its own contents, and must not silently resize its neighbors. Resize remains an explicit user operation. Layout preferences remain app-local and persist across restarts.

Context Basket starts collapsed by default. Context items are compact framed packets with a target-type icon, short label, and restrained path context. Review Basket is a dedicated Workspace so reviewed changes have room without competing with Chat context.

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

Folder Context and Folder Summary defaults initialize their visible scope forms. Each execution stays editable and never overwrites a saved default.

Keep settings minimal and focused. The confirmed V1 sections are defined below in `Options Menu Decisions`.

## Action Output Presentation

Inspect Folder uses app-owned Markdown reports: a clear heading, compact path metadata, grouped entries, and an explicit no-content-read notice. File and Folder Summary responses use the same presentation boundary: vincarios supplies the title and source/scope metadata; the provider supplies a concise Markdown body with stable section headings. File Summary reads up to its portable `Settings -> Actions -> File Summary -> Source chars` default (1,000â€“60,000; 12,000 by default) and discloses truncation in the app-owned source metadata. Folder Summary requests `### Included notes` entries as a bold code-styled filename followed by a separated muted italic purpose description, scoped only to summary messages. This keeps Save as Note readable without making free chat replies artificially rigid.

## Session Activity Status

V1 includes a lightweight `Session Log` workspace internally, opened and closed from the clickable global segment of the bottom status bar. The bottom status bar remains a compact latest-message surface; it is not a history view.

Session Log is renderer-local and in-memory only. It clears when the app restarts and must not write to normal vault notes. A central Activity Reporter owns the shared Bottom Bar + Session Log contract. Structured actions such as vault opening, reviewed writes, completed File Tree operations, and provider results produce typed entries. Direct visible module statuses and warnings use the reporter's shared status sink so a Bottom Bar message is not silently lost from the current-session history. Reporter-owned transient progress without an activity payload may remain Bottom Bar only. Structured paths must not create an additional generic duplicate entry.

Each entry should carry structured fields:

- local time
- type: `info`, `success`, `warning`, or `error`
- action label
- target path when relevant
- detail text

The UI should make the action and warning readable without turning the list into a second audit system. Example: `Renamed` can use success color, the path stays neutral, and `Links were not updated in V1` can use warning color.

Session Log is not audit history. Persistent audit and restore-oriented history belong to `.vincarios/audit.jsonl` and later backup/history UI work, not this session activity view.
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
-> Ask vincarios to analyze
-> vincarios reads allowed files
-> embeddings provide similar-note candidates
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

Left navigation contains app-level commands such as New Project, Inbox Review, Review, and Settings. It can collapse into a persisted 48px icon rail. In that state, semantic Lucide icons retain accessible names and tooltips; section labels become quiet divider lines, and preset sublists close before the rail contracts. Selecting New Note or New Project from the compact rail expands it before showing the preset list.

Main workspace order:

```text
Chat history
Context Basket
Input field
```

Vault panel keeps file tree and preview visible at the same time. Files can snap-collapse into a persisted icon rail; its local toolbar toggle stays visible, the resize handle is disabled while collapsed, and explicit Reveal in Files actions expand the tree before navigating.

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

The topbar also shows a provider privacy badge driven by the active provider definition. V1 local providers show `Local`; future cloud or external providers can show `Cloud` or `External` without changing the shell layout. The badge is an informational provider-mode indicator, not a blanket app-wide `Local Only` claim.
## Review Basket Decisions

Review Basket is a standalone module and dedicated Workspace, not part of chat rendering. The Workspace navigation shows the current open-item count; Context Basket remains in Chat because it describes that conversation's explicit provider context.

The first implemented flow is `Save as Note` under assistant responses. It adds a selected `create_note` proposal targeting `00_Inbox/AI Responses` to the basket. The basket can execute selected `create_note` proposals after a Create Note preview modal. It must not write directly from chat or renderer filesystem access; execution goes through the preload vault API and main process vault write service.

Review Basket clear actions are cleanup/destructive UI actions. Clear pending stays red and Clear executed uses the warning/orange treatment; both remain neutral while unavailable and remove entries without executing vault writes. Open, executed, failed, rejected, and stale entries restore per vault as local working history; dismissed entries do not. Restore never executes an action and preserves all normal review gates. Update-instruction forms protect typed text on cancel instead of silently discarding it.

Empty states should stay compact and functional. Review Basket, Context Basket, and Suggestions use existing Lucide icons plus short copy to explain the empty state without implying unavailable functionality.

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

- Read: vincarios may read the file/folder as context.
- Write: vincarios may propose write actions for the file/folder.
- Write never means silent execution.

Permission state has three visible levels:

- direct: permission explicitly set on this file/folder.
- inherited: permission comes from a parent folder.
- blocked/off: permission is not active, or the path is protected.

Folder permissions inherit to children. Child files/folders may override inherited permissions. An explicit child off state must block inherited parent access instead of being treated as unset.

The UI must make direct vs inherited state understandable without making inherited permissions look like an error. Direct on is full accent with an inner accent signal, inherited on is lighter with a dashed outline, and off remains visually inactive. Selection Actions that are blocked by missing R/W stay clickable so they can show app guidance. Their default state stays neutral/gray with a subtle lock icon. Category accent colors appear only when the action is actually available; hover may show normal subtle feedback and the tooltip explains the blocked reason without adding noisy warning styling.

Dot folders and runtime/private folders such as `.obsidian`, `.vincarios`, and `.vincarios_backups` remain blocked regardless of UI state.

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

- vincarios chat messages show hover metadata below the bubble: `Save as Note` and `Copy` on the left, local time on the right. Persistent follow-up actions such as `Check whole tree` stay in the visible action row below the message. Chat session persistence is not V1 and belongs to the future backlog.

## Chat Markdown Rendering Decisions

Assistant chat messages render through the shared Markdown renderer so chat and note preview improve together over time.

User messages stay plain text to preserve exactly what the user typed.

`Save as Note` keeps the raw assistant Markdown content, not rendered HTML.
## Preview Status Decisions

Preview-local messages render in the preview segment of the bottom status bar, not in the global status segment and not inside the File Tree header. This includes missing internal links, blocked external links, unresolved image assets, and local source-edit notices. The visual surface is shared with the bottom bar, but ownership stays with the Markdown/Image Preview through `#markdown-preview-status`.

The global status bar remains reserved for app-wide events such as vault opening, file reads, folder listings, renames, provider state, and reviewed proposal execution.
## Markdown Preview Rendering Decisions

Markdown Preview supports a preview context-menu action `Copy as link` for the currently loaded preview target. Markdown files copy as Obsidian wikilinks such as `[[Folder/Note]]`; images copy as embeds such as `![[Folder/Image.png]]`.

External Markdown links do not open directly. Clicking an `http` or `https` link shows a confirmation dialog with `Open in browser`, `Copy link`, and `Cancel`. The OS-browser open action goes through a small app IPC channel and accepts only validated `http` and `https` URLs.

HTML remains escaped by default. V1 includes a narrow safe copied-formatting compatibility layer for common Markdown notes that contain `<mark style="background:...">` and `<font color="...">`. The renderer transforms allowlisted color/highlight markup into sanitized renderer-owned spans/classes and strips unsupported copied tags to their inner Markdown text. Event handlers, scripts, unsafe URLs, unknown inline styles, and `unsafe-inline` CSP remain blocked. The allowed formatting model is reusable by future Editor Light toolbar actions, so text color, background/highlight color, bold, and italic do not become separate ad-hoc implementations.


Markdown preview renders sanitized HTML from Markdown source. It supports the V1 baseline: headings, paragraphs, lists, tables, blockquotes, code spans, fenced code blocks, emphasis, Markdown links, Obsidian-style wikilinks, and YAML frontmatter.

YAML frontmatter is shown as a visible Obsidian-like Properties block at the top of the Markdown preview, including simple inline arrays and block-list values such as `tags:\n  - item`. It is not directly editable in this renderer block. The source editor can stage manual full-note updates through the `Update` button; blocked update attempts show visible preview feedback instead of silently failing. V1.1 will add a dedicated Properties/YAML editor for typed frontmatter fields and preserved custom properties through the shared Frontmatter Contract; it replaces the rejected idea of a one-off V1 `Add Tag` control. Persisted changes still remain reviewed proposals, never direct writes.

Unsafe raw HTML is escaped. Renderer fallback must use text output, not unsanitized `innerHTML`. The copied-formatting compatibility layer is limited to allowlisted inline text styling and stays owned by `src/renderer/markdown/markdownFormattingCompat.js`.

The preview toolbar includes an `Edit` button that switches to local Markdown source mode. In V1 Editor Light, source mode exposes a compact local toolbar for Bold, Italic, Strikethrough, H2 headings, bullet/numbered/task lists, internal note links, and Highlight; each operation changes only the textarea source and keeps the active selection. `Link` opens a compact local picker over the existing Metadata index Names and paths scope: it returns Markdown notes only, never uses embeddings, Full-text, provider calls, or R permission, and inserts an Obsidian wikilink. Link Picker results show the Markdown file name as the primary label and the vault-relative path below it; extracted H1 or metadata titles remain available to indexing/search but are intentionally not rendered in this picker. Selected source text becomes the alias; an empty cursor inserts the bare note link. Local source edits do not write directly to the vault. When the edited source differs from the loaded source, `Propose update` creates an `update_note` proposal in the Review Basket. Repeating it for the same open manual source edit replaces that proposal with the newest local draft while preserving its selection state; it never silently writes or merges changes. Before a File Tree, internal Markdown link, search result, or image selection replaces a dirty local source, vincarios shows an explicit decision: `Stay`, `Add to Review`, or `Discard changes`. The File Tree selection and preview remain unchanged until that decision permits navigation. Persisted writes still require the existing diff, backup, stale-content validation, and audit logging path.


Editor dirty state ignores only line-ending representation differences introduced by the textarea; opening a Windows CRLF note does not create unsaved changes. Closing the window or reloading with a real local draft raises a native `Stay` / `Discard changes` confirmation, with Stay as both default and cancel. The unload guard reads the existing live editor dirty check in Source and Preview modes; it does not add a second dirty-state flag or write anything. Adding a proposal to Review Basket does not mean the note is saved to disk. Reload and Force Reload remain guarded development commands and are omitted from the packaged View menu. This protects ordinary close/reload, not crashes or forced process termination.

Markdown image embeds:

- V1 resolves Markdown image syntax and Obsidian image embeds through the main-process vault read service, not through renderer filesystem access.
- Supported V1 image extensions are `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`, `.bmp`, and `.ico`.
- The renderer first creates safe image placeholders. The preview controller then asks `api.vault.readImageAsset` for a validated Data URL scoped to the opened vault.
- File Tree lists supported image files with image icons. Selecting a supported image file shows the image in Markdown Preview through the same validated asset pipeline used by Markdown embeds. Image Selection Actions remain a separate follow-up block.
- Image editing, importing, tagging, vision analysis, and automatic media organization remain out of this Markdown renderer block.
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

Missing permissions for Selection Actions are handled by app logic before provider calls. Permission-blocked actions stay visible as muted, clickable soft-disabled buttons. Hover shows the reason; clicking shows a vincarios chat bubble with the same guidance and a retry action where applicable. Read/context actions explain that `R` is required. Write actions explain that both `R` and `W` are required when they need loaded content plus write permission. These messages come from the shared Selection Action permission text helper, not from duplicated per-action strings. vincarios does not send these blocked requests to the model and does not silently do nothing.

Current V1 foundation actions:

- selected Markdown file currently shows `Summarize file`, `Use as context`, `Find similar notes`, `Suggest tags`, and `Propose content update`. `Suggest tags` creates local heuristic metadata suggestions from the selected file path/title/frontmatter and sends them to Suggestions as `metadata_candidate` items; it does not call the provider or write directly. `Propose content update` stays visible and clickable for Markdown files; when R/W or loaded content are missing it appears visually muted and clicks show app-side guidance. When ready, it asks for an explicit content-change instruction, then adds or refreshes one reviewed whole-note `update_note` draft for that file in the Review Basket. Rename, move, archive, and delete remain separate future actions.
- selected folder currently shows `Use as context`, `List folder`, `Analyze folder`, and `Summarize MD files`.
- `Use as context` is active for readable folders and for readable loaded Markdown files. Folder context is path-only; Markdown file context includes loaded note content.
- inactive actions remain visible as intentional V1 slots and must not execute hidden behavior.
- Selection Action presentation comes from the Action Registry: short labels keep rows scannable, semantic Lucide icons remain centrally replaceable, category dots show Context/Read/Write/Organize as a supporting cue, and tooltips/accessible labels keep the full action meaning available. Action rows do not use category-color borders.
- Execution kinds are explicit: `app` means deterministic app work with no model call; `embedding` means local similarity inference; `provider` means a local provider request when the action is submitted. File/folder context and tag suggestions are currently `app`, Similar Notes is `embedding`, and summaries/content-update proposals are `provider`.
- provider-backed Selection Actions show a visible pending chat message with a lightweight spinner while the provider is working. `Summarize MD files` reads only direct Markdown files from the selected folder, applies Settings/Limits caps, ignores images/PDFs/attachments, and returns a normal saveable vincarios answer. Summary answers suggest editable Save-as-Note titles in the form `Summary - MD - <file name> - YYYY-MM-DD` for Markdown files and `Summary - DIR - <folder name> - YYYY-MM-DD` for folders. They default to `AI Responses/Summaries` under the configured Inbox role.
- future custom actions belong behind Settings and must produce visible proposals or context items, not direct writes.

## Context System Decisions

Selection and context are separate states.

Selected context is explicit, visible, request-scoped, and deterministic:

- selecting a file or folder in Files only changes the active UI target; it does not add provider context.
- the Context Basket in Chat is the only selected-file/folder source attached to provider requests.
- future Selection Actions add files or folders to the Context Basket through app logic, not through broad prompt interpretation.
- Context Basket items can be clicked to reveal/select their target in Files.
- Context Basket items can be removed individually with `x`, or cleared together with `Clear all`.
- file context items attach Markdown content only when they were explicitly added and `R` allowed the read at add time.
- folder context items are explicit bounded Markdown snapshots created by the Folder Context Selection Action. The visible packet records path, scope, limits, included files, and truncation state. Current-level scope reads direct Markdown children; recursive scope forwards depth and file limits to the shared scope reader and may include nested Markdown content. Natural-language folder questions must not create or replace these packets implicitly.
- When the Context Basket contains explicit items, ordinary chat questions continue to the provider even if a folder remains selected. The read-context preflight must not replace them with Selection Action guidance or implicitly list/read a folder. This applies to folder snapshots, file items, and temporarily dropped Markdown. Existing pending scope choices and explicit blocked-action retries keep their earlier handling; request context limits and provider consent remain unchanged.
- Context Basket target types are represented by badges such as `DIR`, `MD`, `IMG`, `PDF`, `FILE`, and unknown. V1 may keep them visually neutral. Later polish may use target-type badge or border colors, but those colors must remain separate from Selection Action behavior colors.
- Selection Actions use behavior categories with stable color slots: Context, Read, Write, and later Organize.
- attached context is not stored back into chat history.
- if Read is not active for an explicit app action, vincarios must ask the user to enable `R`; it must not guess from the file name or ask for a file upload.
- missing-Read and missing-Write blocks show a clear permission message, but no retry button. After enabling R or W, the user repeats the visible Selection Action or request explicitly. Permission-confirmation text such as es ist freigegeben must not become a broad prompt trigger.
- if the selected target changes before retry, the retry must stop with a clear mismatch message instead of applying the old blocked action to the new target.
- if the selected file has permission but no loaded content, vincarios should instruct the user to reselect/click the file or refresh the preview inside vincarios, not switch to external upload instructions.
- Without explicit Context Basket items, folder-scoped follow-up prompts are guidance-only in V1. The app should point the user to Selection Actions instead of inferring a parent folder from wording.
- selected folder listing is executed by the deterministic `List folder` Selection Action when `R` is active. Natural-language folder wording may show only this inline help: `Use "List folder" in Selection Actions to inspect the selected folder.` It must not list, read, or create blocked actions by itself. The `List folder` message may offer `Check whole tree` as a follow-up app button for recursive structure listing. Pending scope replies and existing blocked-action retries remain app-state driven. Supported `list_folder` model-action envelopes remain a fallback and are checked against active app state before execution. Visible app-generated folder listings must not be stored back into provider chat history with their file names; history receives only a short app-result marker so old listings cannot become stale model context. Context intent stays narrow: pending-action replies, existing blocked-action retries, and help-only selection-action guidance. It must not grow into one-off typo lists, deictic "here/it" guesses, or broad fuzzy prompt matching.

For selected folders:
- vincarios may use the folder path as the active target.
- vincarios must not blindly load every file in the folder without an explicit analysis workflow and limits.
- Future Folder Context Index workflow: when a folder is selected, vincarios may count Markdown files and subfolders first, then ask whether to list and remember the folder structure.
- Persistent Folder Context Indexes must be stored in `.vincarios/` or a configured cache location, not blindly as normal vault notes.

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
- The chat shows a vincarios message for the drop with an `Import to Inbox` action.
- `Import to Inbox` adds a reviewed `create_note` proposal; Review Basket edit/execute performs the actual vault write.
- The default import target is the configured Inbox role. Filename/title remain editable in the Review Basket before execution.
- Detecting dropped files that already belong to the opened vault is a later refinement; this V1 slice handles external Markdown drops only.

Manual move drag and drop is not part of the Markdown file import flow. It is deferred to V1.1 so Move/Rename can include deterministic Markdown link-update planning, diff/review, backup, and audit. Embeddings may help suggest target folders, but link rewriting must be parser/app logic rather than LLM guessing.

Non-V1 drag and drop:

- images
- PDFs
- audio/video
- automatic media organization



## UI Density And Collapse Direction

This is planned as a focused pre-freeze UI-density pass, not a redesign.

Icon-first direction: users should feel at home coming from Obsidian. Repeated actions should prefer compact icons with hover/focus text or context-menu entries instead of always-visible text labels, while safety-critical state remains visible and accessible.

Collapse candidates:

- Left navigation rail: full label mode can collapse to icon-only mode around 48px. The toggle lives at the top of the rail. Labels remain available through tooltips or accessible names.
- File Tree: snap-collapse can temporarily hide the tree in addition to drag-resize, especially while working in Chat or Suggestions.
- Context Basket: default-collapsed is acceptable when empty or inactive. When context exists, show a compact header/count so active context is not hidden.
- Review Basket: is a dedicated Workspace and remains primary attention when proposals exist; its navigation count must make open items visible from every workspace.
- Selection Actions: the V1 panel can collapse to a persisted 48px icon strip. The strip retains semantic icons, category dots, and lock state; hover/focus keeps full action meaning available. Actions that open an inline configuration form expand the panel first. Existing direct actions remain direct and do not expand it unnecessarily.
- Suggestions: groups should be collapsible by type, especially once Similar Notes, Metadata/Tags, and future cleanup/link candidates coexist.

Visual noise reduction:

- File Tree permission controls should not create permanent row noise across large trees. Prefer showing `R`/`W` controls on row hover/focus while preserving visible state, tooltips, keyboard access, and accessibility labels.
- Check whether `.file-vault-name` and breadcrumb repeat the same information. If they overlap, keep one primary path signal and make the other quieter or remove it.

Bottom bar / activity direction:

- Session Log remains a workspace internally and is exposed through the compact, clickable global bottom-bar activity drawer instead of a large `WORKSPACE` button. Closing it restores the previously active workspace.
- Preview-local messages use a dedicated preview segment in the bottom status bar instead of a separate preview-local block. Ownership stays preview-local even though the visual surface is shared.
- Global status, preview status, and activity history must remain distinguishable in state/code even when presented in one bottom bar.

Focus Mode:

- A Focus Mode can collapse the left icon rail, File Tree, and Context Basket together.
- It is intended for writing-heavy workflows such as book or long-form note work.
- It should be a small layout-state feature, not a new editor or workspace.

Persistence:

- Collapse states and Focus Mode are app-local user preferences.
- Store them in app settings, not selected-vault `.vincarios/` metadata.
- Folder Visual Identity is portable vault metadata because it describes that vault's top-level structure. The six standard Vault Roles (`inbox`, `daily`, `projects`, `knowledge`, `brain`, `archive`) receive semantic icon/color identities through the active top-level role mapping. Unknown and nested folders remain neutral, even if their names match a default root. Settings > Vault Profile is the sole configuration surface: each role selects an actual top-level folder, a built-in Lucide icon or a validated static local SVG already placed in `Vault/.vincarios/icons/`, plus one fixed token-palette color. `.vincarios/profile.json` stores only a relative SVG path, never a machine-specific path. V1 deliberately has no SVG file-import dialog and no arbitrary custom hex colors. The File Tree is display-only. Reset restores detected standard-role defaults when present, otherwise leaves the role unassigned. While Settings stays open, each role keeps its own local draft: only changed rows enable Save, saving one row preserves other unsaved rows, and top-level folders assigned to another effective role are disabled in that row's dropdown. Closing Settings discards unsaved drafts; main-process uniqueness validation remains the final safeguard.

Implementation ownership:

- Shell owns global layout/collapse state and Focus Mode composition.
- Files owns File Tree snap-collapse and permission-row hover/focus controls.
- Context Basket owns its collapsed/default-collapsed behavior.
- Activity/session log owns the bottom-bar drawer.
- Settings owns persistence and defaults.
## Settings UI Decisions

The Settings screen is a dedicated renderer module, not shell logic. Settings category icons use semantic Lucide assets through the shared icon registry; Providers uses `plug`, while the main-screen Settings entry uses the gear/settings icon.

Current V1 Settings implementation:

- `Providers` exposes LM Studio/Ollama URL overrides, provider capability badges, active provider persistence, and selected model persistence.
- Provider URLs are validated and persisted through main-process settings services.
- Active provider and selected model are persisted through the provider model service.
- Saving or resetting a provider URL refreshes provider status through an app event, not through direct module coupling.
- `Limits` exposes the V1 caps for provider timeout, model-list timeout, selected-file context, folder/file listing, analysis file count, and review suggestion count.
- `Vault Profile` configures the opened vault through a portable `.vincarios/profile.json`, while preserving the Phase 2 vault-profile helpers for consumers.

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

V1 starts with a compact, useful splash/start screen:

- The wordmark is tokenized: `Vinca` uses the active accent and `rios` uses strong interface text.
- A subdued version label is sourced from application metadata after startup initialization; the renderer never owns a duplicate version constant.
- `Open Vault` is the primary action and remains available inside the app.
- The two most recently opened vault roots are stored in portable app-local settings. A recent entry reuses the validated vault-root IPC path. Removing it only clears history; it never touches vault files.
- A quiet local-provider preview shows LM Studio and Ollama availability only. It does not expose model selectors or provider configuration.
- The screen has no reindex toggle, theme selector, or fake New Vault control.

A profile-based `New Vault` flow and vault-bound theme selection remain future work. The first-run/opening experience should feel intentional and central, similar to the prototype.

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

Current V1 layout:

```text
Vault Panel:
Files | Selection Actions | Markdown Preview
```

Files, Selection Actions, and Markdown Preview use the full available vault-panel height and own local scrolling. Files stays compact and navigational; Selection Actions stays deterministic app UI for the currently selected file or folder; Preview remains the reading surface. Context Basket and input remain inside the Chat workspace stack; Review Basket owns bounded local scrolling in its dedicated Workspace.

Responsive rules:

- Files stays within `170-340px`; Selection Actions stays within `220-360px`. Shared resize logic protects the adjacent panel before applying those caps.
- Markdown Preview is the flexible remainder. At narrow widths it may shrink to `0px`, but it must never push Files or Selection Actions outside the visible Vault panel.
- The whole app shell does not gain a document-level vertical scrollbar during normal use.
- Scroll remains local to file tree, Selection Actions, Markdown Preview, chat history, Review Basket, and Context Basket.
- Collapsed Context Basket rows follow their compact content height and must not reserve empty spacer rows in Chat.
- The current full-height layout supports persisted collapse for left navigation, Files, and Selection Actions. Context Basket is compact and default-collapsed; Review Basket uses its dedicated Workspace; Focus Mode remains a V1.1 follow-up.
- Future detachable preview remains a valid follow-up but is not part of V1.

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

Find similar notes uses the local embedding index and keeps the chat output compact. Clicking it opens a compact options form directly below the related Selection Action, with Settings-backed defaults for Search source (`Content`, `Metadata`, or `Both`), minimum match, and max results. `Both` is a fixed balanced combination; percentage weights are intentionally not exposed. Each run also exposes an explicit scope: `Relevant area` is the default and searches the configured Vault Role, or the current top-level area when no role is assigned; `Whole vault` is intentional and only permits cross-role candidates with deterministic title or path evidence. Selection Action option forms are owned by their action row; only one inline action form should be open at a time. The form remembers the last used values for the current app session; saving Similar Notes defaults in Settings clears that temporary session override immediately, so the next form uses the new saved defaults. `Refresh index first` is explicit and should be used after copying, moving, or editing Markdown files outside the index; it refreshes through the same health service as Settings so the shared index indicator returns to Ready when the rebuild succeeds. Results are shown in the Suggestions workspace as grouped candidates with calibrated relevance percentages, strong/medium/weak/noisy labels, concise reasons such as `Same vault role` or `Nearby project path`, content/metadata diagnostics, and a report-only relationship label: `Exact duplicate`, `Possible duplicate`, or `Related note`. An exact duplicate means the current indexed hashes are equal, not merely that the model considered the notes similar. A selected Similar Note has `Open in Preview`; it delegates to Files, reveals and activates the target, and opens it in the normal local Markdown Preview path. Local Preview does not require R; R is required only if the user later sends the file to an AI/context flow. It does not create a diff. The displayed percentage is not raw cosine similarity. Chat receives only a short status line. vincarios does not automatically switch workspaces; the Suggestions workspace button shows an item-count indicator while open suggestion items exist. If no candidates are returned, vincarios keeps the result in chat/status and does not open an empty Suggestions group. This action does not create Review Basket actions by itself.

Future actions can be added through the same registry and handler structure, for example `Find related notes`, `Inbox Review`, move/rename, image actions, or later custom actions. Adding a future action or target type such as image, PDF, or unknown file should mean adding it to a registry with clear selection requirements, not adding new prompt phrases to chat or context intent.

### Phase 8 Folder Action Consolidation

Folder Context and Folder Summary share one reusable Folder Scope model. V1 scope controls are current folder/subfolders, bounded depth, Markdown-only files, max files, and the existing hard total-context cap. The resulting Context Basket item is a visible snapshot package with scope and effective-limit metadata, never a silent unbounded tree read.

`Inspect Folder` replaces the separate `List folder` and `Analyze folder` actions. It is deterministic and content-free: direct-level counts plus grouped folders and Markdown files, with a `Check whole tree` follow-up rendered by the same structured formatter. Folder Summary uses the same scope model but calls the provider only after the bounded Markdown selection is visible. Images and PDFs remain excluded in V1; the scope data shape must allow future target-type extensions without changing folder-action ownership.

Settings -> Action Defaults will hold restart defaults for Folder Context and Folder Summary. Per-run forms remain explicit and may use session-local last values, just like Similar Notes. Similar Notes stays under Embeddings because its settings belong to index/search behavior rather than folder scope.


## V1 Search, Metadata, Home, And Recent Files

V1 Search is a local deterministic workspace feature, not an AI action. It lives in the central Workspace area alongside Chat, Suggestions, and Session Log. It never sends vault data to a provider and does not require R merely to discover or locally preview a result.

User-facing rule:

- filename/path, title, and supported YAML fields answer exact navigation and filter questions.
- full-text is an explicit per-vault opt-in for exact text and heading matches.
- embeddings answer "what is semantically similar?" only in an explicitly labeled semantic mode after V1.
- Search results show compact source reasons and open locally in Preview without expanding Files. Each result has a separate Reveal in Files control; Use as Context remains a separate explicit R-gated action. To keep large-vault search bounded, only the first 100 sorted matches are rendered; when that cap applies, the workspace and session status report the visible and total result counts.
- Review Basket remains the only path from a search-derived candidate to a write.

Home is a separate Workspace view, opened explicitly from the left navigation. Opening a vault continues to enter Chat. Home starts with a read-only Vault Health card: visible-folder and file-type counts (Markdown, images, PDFs, and other files) plus the combined index state. The inventory scans names and extensions only, skips dot folders, and never reads file content or image data. Its index indicator has no refresh control and directs users to Settings. Supported Markdown and image files directly in the vault root appear as an optional `Unassigned root items` disclosure with their regular file-type icons: this is a navigation aid only, never a synthetic folder, automatic move, or inferred role. PDFs and other files remain outside this disclosure until V1 supports an equivalent preview flow. Compact Quick Actions open Search, open Review Basket, or return to Chat. Home also shows the 12 most recently opened Markdown notes for the selected vault. A successfully persisted recent-file entry refreshes the visible Recent Files list immediately through Shell composition; no workspace switch is required. Recent Files are stored only as normalized relative paths plus `openedAt` under `<vault>/.vincarios/recent-files.json`; no note body, provider context, or R permission is involved. Missing notes are pruned when the list is read. Each row opens the note in Preview or reveals it separately in Files. The cache is ignored by Git and remains app metadata, not a user-note write.

Index language is deliberate and consistent: `Vault Index` covers names, paths, titles, tags, and other YAML properties; `Similar Notes` uses local text segments for meaning-based matches; optional `Full-text Search` adds exact note-body and heading search. Full-text opt-in must show a short disclosure before its first build, identify `<vault>/.vincarios/index/search/` as the storage location, and provide a persistent Enable/Disable switch plus a Delete local index control in Settings. One `Refresh enabled indexes` action below the index sections updates the Vault Index, Similar Notes, and Full-text only when Full-text is enabled. A retained cache remains deletable after Full-text is disabled. The Search workspace explains when a Full-text query cannot run because this opt-in cache is disabled or stale. No V1 encryption option is shown.

Later examples:

- `Find related notes` can explain matches with tags, links, role hints, and semantic similarity.
- link candidates can use known unresolved/outgoing links plus similarity, then show an exact insertion diff before review.
- folder candidates can use configured folder roles, project paths, tags, and semantic similarity, then propose a reviewed move/link-update action only after future move services exist.
- richer tag suggestions can prefer tag patterns already present in the vault instead of growing broad word/stopword lists.

The metadata index must live under selected-vault `.vincarios/index/metadata/`, remain hidden from normal vault context, and be rebuildable. It must not produce automatic cleanup or silent file edits.
## Workspace Tabs Direction

The main work area should support three V1/V1.x workspaces:

- `Chat`: normal conversation, assistant responses, Save as Note, Review Basket, Context Basket, and prompt input.
- `Suggestions`: grouped analysis results such as similar notes, tag/YAML candidates, and cleanup findings. Suggestions are not writes. They can be dismissed, previewed, or converted into concrete Review Basket actions only when the selected suggestion type has a supported converter. Link and folder/destination candidates are V1.1.
- `Session Log`: per-session status/audit-style messages for visible app activity such as reads, writes, renames, failures, and warnings. This is a UI convenience layer over the current status stream, not a replacement for persistent audit logs.

Suggestions should behave as an intermediate review layer between analysis and the Review Basket. Current V1 conversion foundation supports `metadata_candidate` only when the suggestion already contains `currentContent` and `proposedContent`; local `Suggest tags` creates that shape for conservative YAML tag updates, including AI response notes when useful title/content signals exist. Generated summaries should later receive deterministic YAML during creation, but existing or manually created files with a structured `Summary - ...` filename may still receive a conservative `summary` tag proposal. Files under the configured `AI Responses` folder may also receive `ai-responses` as a structural folder tag when it is missing; this is path metadata, not prompt-word matching. It converts into a reviewed `update_note` proposal and still uses the normal diff, backup, stale check, and audit path. After successful conversion, the source metadata candidates are dismissed from the current Suggestions session so they cannot be added repeatedly; this never deletes a vault file. Similar-note suggestions remain report-only. Suggestions preview uses the shared diff-line renderer so add/remove lines match the Review Basket diff colors:

```text
analysis action -> grouped suggestions -> user selects suggestions -> preview/diff -> add concrete actions to Review Basket -> reviewed execution
```

Recommended layout for the Suggestions workspace:

- left side: compact suggestion groups/items with checkboxes, score rings for similarity items, dismiss controls, and per-item preview controls. Each visible group header has a three-state checkbox that selects only visible, non-dismissed items in that group. Group headers show a compact category prefix/icon plus the target basename; the full source path remains available as tooltip. Similarity scores should not render as oval pills.
- right side: detail preview for the selected suggestion. Preview type depends on suggestion kind: text detail, Markdown-line diff, property/tag diff, move plan, duplicate comparison, or create-note preview.
- top or footer action bar: `Add selected to Review Basket` only becomes active when selected suggestions can become concrete actions. It must not mean execute. `Clear selected` hides selected suggestions from the current session and uses the same dismissal semantics as per-item dismiss, not vault deletion.

Suggestions that are report-only must be visually separated from actionable suggestions. Before V1 freeze, the workspace should group or section suggestions by type, such as Similar Notes for report-only embedding findings and Metadata/Tags for suggestions that can become Review Basket actions. This avoids implying that every suggestion can be executed.

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
  Home          vault health, quick navigation, vault-local Recent Files, and Review Basket access

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

`New Note` and `New Project` are preset toggles and are collapsed by default. Expanding them pushes lower actions down. Presets are user-extensible later; curated vincarios preset packs must use the same preset mechanism instead of hard-coded special paths. If preset lists grow, the left column gets local scrolling or grouped sections instead of overflowing. Left navigation entries must stay app-level commands; target-specific actions belong in Selection Actions.

Settings target:

```text
Settings Modal
- category menu
- active category panel
```

Current wired categories stay Providers, Limits, Vault Profile, and Appearance. V1-ready categories are Providers, Limits, Vault Profile, Templates, Appearance, Embeddings, Safety, and About. Future/inactive categories may be visible only if they are clearly marked as not configured yet and do not imply fake functionality. Later hotkeys, plugin compatibility, custom actions, and theme presets must extend this same settings module and store shape instead of creating parallel configuration paths.

Current Settings implementation: the modal uses a two-pane layout with a left category menu and one active right-side category panel. Providers and Limits remain app-local settings; Vault Profile is a dedicated portable vault-profile editor. Appearance provides app-level Dark, Light, and System modes plus a vault-level selector for Inherit, Dark, Light, High Contrast, and Paper. App preference lives in portable app settings; the chosen Vault appearance lives in that vault's `.vincarios/profile.json`. Appearance resolves in this order: an active built-in Vault pack determines its own base mode; otherwise the Vault Dark/Light override wins; otherwise the app mode applies, with System following the operating system. Templates, Safety, and About remain visible info-only slots until real modules exist. Embeddings shows the V1 MiniLM decision, Apache-2.0 license, Transformers.js / ONNX runtime target, and vault `.vincarios/index` storage. Its dedicated Embedding index section reads status only until the user explicitly selects Build, Refresh, or Rebuild; it shows no vault, no index, ready, stale, indexing, rebuild-required, unavailable-model, and invalid-index states with safe disabled behavior. Files shows the same compact status dot beside refresh: green is ready, amber is stale/rebuild/indexing, red is no index/unavailable/invalid, and tooltip/accessible text explains the state. The active vault watcher applies safe direct Markdown changes to Metadata only, so title/tag/path Search becomes current without rebuilding the vault; embeddings and enabled Full-text become stale only when their stored file inventory no longer matches the current vault; explicit refresh rebuilds them when needed. Similar Notes defaults remain independent below it: Search source (`Content`, `Metadata`, or `Both`), minimum match, and max results. V1.1 may add a compatible custom local model selector; it must surface a rebuild requirement rather than mix vectors.

Phase 7.7 polish: settings category buttons may use existing semantic Lucide icons. Icons are decorative, rendered by the settings module through VincariosIconRenderer, and styled through shared icon filter tokens so themes can adjust them later.

Phase 7.7 polish keeps micro-interactions tokenized: active navigation/settings states use subtle inset glow, recently written visible file rows flash after reviewed writes, and reduced-motion users keep instant file-row state changes. File-row update flash is owned by the centralized renderer update flash state, toggles classes on visible rows only, and must not rebuild or auto-expand the file tree.

Phase 7.7 loading/score decision: local provider and embedding operations use the existing pending chat message with spinner as the canonical wait state. Suggestions use a compact score-ring component for similarity scores, inspired by `docs/Design_index.html` and implemented through vincarios modules/tokens rather than copied demo markup. Do not use oval score pills or inline list meter bars for similarity scores. The ring shows the percentage inside the circle; optional explanatory text such as `Strong match`, `Medium match`, `Possible match`, or `Weak match` may appear beside it. Later Appearance/Settings can hide that explanatory text for users who only need the ring. Medium/yellow must use a visibly brighter amber/yellow token than weak/orange.

Vault Profile and Templates relationship:

- Vault Profile defines where roles live in the vault, for example Inbox, Projects, Knowledge, Archive, and Brain.
- Templates define what gets created, for example a project folder structure or a note draft.
- Templates must target folder roles instead of hard-coded folder names, so a `New Project` preset creates under the configured `projects` role.
- V1 keeps one active editable vault profile, maps only the six standard roles, and uses a top-level folder dropdown sourced from the opened vault. A foreign vault begins unassigned unless a standard root is actually present.
- V1.1 may add multiple named profiles, custom roles such as Assets, Clients, Writing, or Research, and multiple project destinations such as work/private. Create Project will then select a configured destination role instead of hard-coding a path.

Markdown Properties/YAML display should be visually distinct from normal prose through dedicated CSS tokens such as `--metadata-accent`, `--metadata-background`, and `--metadata-border`. V1 may use an amber/ember-like default, but the color should be token-based so Appearance settings can change it later.

Current Phase 6.5 implementation: Markdown preview Properties use the dedicated metadata tokens in `tokens.css`; only the rendered Properties block uses these tokens, normal prose/code/table styling remains on the general Markdown tokens.

Project style presets are a future workflow, not a Phase 6.5 implementation target. The intended model is:

1. vincarios app theme controls the application UI.
2. Markdown preview theme controls how notes render inside vincarios.
3. Optional project style presets can later influence Markdown preview and generated template structure for a project.

Project style presets should be detected through explicit project metadata such as `vincarios_style_preset` in a project home note, not guessed from folder names. They must not inject inline HTML/styles into normal Markdown notes. For Obsidian parity, V1 keeps styles vincarios-only plus Markdown-compatible structure. A future V1.1 feature may optionally export an Obsidian CSS snippet, but only after explicit user confirmation and never by silently writing into `.obsidian`.

Built-in Vault packs are fixed, app-shipped profiles, not arbitrary theme files. V1 does not scan vault folders for CSS or JSON themes. Future shareable packages and a Theme Editor may use `.vincarios/themes/`, but only through a validated token allowlist and the existing Theme Controller; they must never evaluate CSS/JavaScript supplied by a vault.

Obsidian plugin compatibility direction:

The active Obsidian-core compatibility matrix, intentional differences, plugin fallback boundary, and implementation order live in `docs/rebuild/VINCARIOS_V1_MARKDOWN_COMPATIBILITY.md`. Phase 7.6 changes must update that matrix instead of scattering compatibility claims through renderer code or unrelated docs.

Current Phase 7.6 foundation: vincarios uses pinned `markdown-it` behind focused renderer modules for the standard engine, Obsidian-specific syntax, Properties, and the public rendering facade. Raw HTML is disabled. Chat and Markdown Preview consume the same facade, so later core improvements apply consistently without duplicating parsing logic.

### User-Facing Error Feedback

Known Main-process result codes are translated by `renderer/feedback/userFeedbackMessages.js` at visible renderer boundaries. The module owns concise next-step copy for provider availability, unavailable vault indexes, disabled Full-text Search, missing files, and missing vault roots. It does not alter Main-process error semantics or safety behavior. Unknown errors retain their original message so diagnostics are not hidden; R/W permission copy remains owned by `renderer/selectionActions/permissionText.js`. Preview-local failures and warnings also create one structured Session Log entry through `ActivityReporter.record`; normal local-edit hints deliberately stay preview-local so typing does not flood the log.

vincarios does not execute Obsidian plugins. Compatibility means one of three safe things:

1. render common Markdown/plugin output well enough that the vault remains readable.
2. optionally read harmless plugin metadata after explicit user choice.
3. rebuild useful workflows as vincarios Selection Actions or Review Basket proposals.

Candidate plugins to research after V1 core remains stable: Templater, Dataview, Tasks, Advanced Tables, Calendar, Kanban, Iconize, Style Settings, Omnisearch, Smart Connections, Tag Wrangler, Linter, Mindmap, Homepage, Recent Files, and Make.md.

### Selection UX

The prototype's context-aware selection behavior should be recovered cleanly:

- `Ctrl+A` selects within the relevant hovered/focused concrete content region, not the whole app. Empty panel background must not trigger scoped selection.
- right-click offers safe region-specific selection/copy actions for content regions. File Tree does not expose `Select area` in V1. No write actions belong in this menu for V1.
- selection behavior belongs in `renderer/selection`; file-tree keyboard navigation belongs in `renderer/files`. Do not scatter shortcut logic across shell, chat, and preview code.
- file tree keyboard navigation uses `ArrowUp` / `ArrowDown` for visible rows, `ArrowRight` / `ArrowLeft` for folder expand/collapse, and `PageUp` / `PageDown` / `Home` / `End` for larger navigation. These keys do not trigger write actions.


### Detachable Edit Preview - Future

Later versions should allow the Markdown edit surface to detach into its own window or panel for longer writing sessions. The detached editor should keep the current file context, show live Markdown preview updates for common formatting such as bold and italic, and eventually expose a small formatting toolbar for common Markdown actions. Formatting toolbar actions such as text color, background color/highlight, bold, and italic should reuse `markdownFormattingCompat.js`, the Markdown formatting compatibility model introduced for safe copied inline styling. This is not V1-critical; V1 keeps Edit Mode local, reviewed, and proposal-based.

### Implementation Note

Do not solve these by adding more logic to the shell. Keep the shell as layout orchestration and implement these in focused modules:

- startup/splash in `renderer/shell` or `renderer/startup`
- file tree behavior in `renderer/files`
- preview layout in `renderer/markdown` plus shell layout slots
- selection shortcuts in `renderer/shortcuts` or `renderer/selection`
