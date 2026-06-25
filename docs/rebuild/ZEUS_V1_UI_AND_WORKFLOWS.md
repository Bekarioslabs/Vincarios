# ZEUS V1 UI And Workflows

## Main Layout

V1 should stay simple:

```text
Left: app navigation and actions
Middle: chat, review basket, context bar, and input
Right: vault file tree and selected-file preview
```

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

The app can optionally ask the AI for draft content after the structure exists.

The default project structure ships with V1, but the implementation must be template/preset-based and use vault folder roles so the structure can later become editable in Options without rewriting project creation logic.

## Options Menu V1

Keep settings minimal and focused. The confirmed V1 sections are defined below in `Options Menu Decisions`.

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
Context bar
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

Folder permissions inherit to children. Child files/folders may override inherited permissions.

The UI must make direct vs inherited state understandable without making inherited permissions look like an error.

Dot folders and runtime/private folders such as `.obsidian`, `.zeus`, and `.zeus_backups` remain blocked regardless of UI state.

Permission shortcuts:

- Click `R` or `W`: toggle only the current file or folder.
- Ctrl+Click `R` or `W`: apply to currently visible/expanded descendants only.
- Shift+Click `R` or `W`: recursively apply to all descendants by listing folder structure only.

Recursive permission application must not read Markdown contents. It only needs folder/file paths from the vault listing API. Context remains a separate workflow based on the selected file/folder and explicit context rules.

## Chat Markdown Rendering Decisions

Assistant chat messages render through the shared Markdown renderer so chat and note preview improve together over time.

User messages stay plain text to preserve exactly what the user typed.

`Save as Note` keeps the raw assistant Markdown content, not rendered HTML.
## Markdown Preview Rendering Decisions

Markdown preview renders sanitized HTML from Markdown source. It supports the V1 baseline: headings, paragraphs, lists, tables, blockquotes, code spans, fenced code blocks, emphasis, Markdown links, Obsidian-style wikilinks, and YAML frontmatter.

YAML frontmatter is shown as a visible Properties block by default. It is not editable in this renderer block. Future Properties editing belongs to action/review workflows, not direct preview editing.

Unsafe raw HTML is escaped. Renderer fallback must use text output, not unsanitized `innerHTML`.

The preview toolbar includes an `Edit` button that switches to local Markdown source mode. In this block, source mode is for inspection and local preview edits only. Saving to the vault must wait for the Review/Write core because persisted writes require review, backup, and audit logging.

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

## Context System Decisions

Auto-context is enabled by default and can be toggled in the context bar below the Review Basket.

Selected Markdown context is request-scoped:

- the selected file path is always visible in the context bar.
- loaded Markdown content is attached to the provider request only when the user's prompt clearly refers to the selected/current file or note.
- general questions must stay neutral and must not be forced into the selected file context.
- attached selected-file content is not stored back into chat history.
- if Auto-context is off, ZEUS may mention the selected path but must not claim to know the file content.
- if Read is not active for the selected file or one of its parent folders, ZEUS must ask the user to enable `R`; it must not guess from the file name or ask for a file upload.
- follow-up prompts after enabling Read, such as `ok hab es aktiviert`, `try now`, or `this file is selected`, must still target the selected file.
- if the selected file has permission but no loaded content, ZEUS should instruct the user to reselect/click the file or refresh the preview inside ZEUS, not switch to external upload instructions.
- folder-scoped follow-up prompts such as `find similar files in this folder` should map the selected file to its parent folder only when that parent folder has active `R`; ZEUS must not switch to generic local-file-upload language.
- selected folder listing requests are handled by a request-scoped read-context preflight when `R` is active. Supported `list_folder` model-action envelopes remain a fallback and are executed through the preload vault API only when the requested folder is inside the active selected folder or selected-file parent folder. The raw tool-call text must not be displayed as the final answer.

For selected folders:

- ZEUS may use the folder path as the active target.
- ZEUS must not blindly load every file in the folder without an explicit analysis workflow and limits.
- Future Folder Context Index workflow: when a folder is selected, ZEUS may count Markdown files and subfolders first, then ask whether to list and remember the folder structure.
- Persistent Folder Context Indexes must be stored in `.zeus/` or a configured cache location, not blindly as normal vault notes.
- Folder indexes are navigation aids and embedding companions, not authority. If files changed since the scan, ZEUS must mark the index as possibly stale and offer to refresh it.

Context sources must remain visible and separated:

- active selection
- manually attached context
- temporary dropped Markdown files
- embedding candidates
- Brain/Core rules

Markdown drag and drop in V1:

- `.md` files dropped into chat become temporary context immediately.
- They are not automatically copied into the vault.
- Dropped external files show an `Import to Inbox` action/button near the context item, similar to saving an AI answer as a note.
- Importing is a separate reviewed write action with editable target name and default target Inbox.
- If the dropped file already belongs to the opened vault, ZEUS should treat it as an existing vault file, not as an external import.

Non-V1 drag and drop:

- images
- PDFs
- audio/video
- automatic media organization

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
   - max context size
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

The first scaffold places files above preview. This is not the desired V1 layout.

V1 should use the full app height better:

```text
Vault Panel:
File Tree | Preview
```

or an equivalent layout where file navigation and preview stay visible side by side.

The whole app shell should not scroll during normal use. Scroll should be local to:

- file tree
- Markdown preview
- chat history
- review basket when needed

### Selection UX

The prototype's context-aware selection behavior should be recovered cleanly:

- `Ctrl+A` selects within the relevant hovered/focused region, not the whole app.
- right-click can offer region-specific selection/copy actions.
- selection behavior belongs in a focused shortcuts/selection module, not scattered across shell, chat, and preview code.

### Implementation Note

Do not solve these by adding more logic to the shell. Keep the shell as layout orchestration and implement these in focused modules:

- startup/splash in `renderer/shell` or `renderer/startup`
- file tree behavior in `renderer/files`
- preview layout in `renderer/markdown` plus shell layout slots
- selection shortcuts in `renderer/shortcuts` or `renderer/selection`
