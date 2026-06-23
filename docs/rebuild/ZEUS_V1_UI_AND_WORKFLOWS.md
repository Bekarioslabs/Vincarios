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

The default project structure ships with V1, but the implementation must be template/preset-based so the structure can later become editable in Options without rewriting project creation logic.

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

## Markdown Preview Rendering Decisions

Markdown preview renders sanitized HTML from Markdown source. It supports the V1 baseline: headings, paragraphs, lists, tables, blockquotes, code spans, fenced code blocks, emphasis, Markdown links, Obsidian-style wikilinks, and YAML frontmatter.

YAML frontmatter is shown as a visible Properties block by default. It is not editable in this renderer block. Future Properties editing belongs to action/review workflows, not direct preview editing.

Unsafe raw HTML is escaped. Renderer fallback must use text output, not unsanitized `innerHTML`.

## Markdown Link Navigation Decisions

Markdown rendering and Markdown navigation are separate blocks.

- Wikilinks and relative Markdown links should render safely first.
- A later navigation block makes them clickable.
- Clicking a resolved note link opens the target note in the preview.
- Clicking a link must not automatically expand the file tree.
- The preview should provide a `Reveal in Files` control so the user can intentionally locate the opened note in the tree.
- Preview history should support back/forward navigation after link clicks.
- Link resolution must prefer folder-relative and project-local context before falling back to broader vault search.

This keeps Markdown rendering, vault path resolution, preview history, and file-tree reveal as separate modules instead of coupling them inside the renderer.

## Context System Decisions

Auto-context is enabled by default.

For selected files:

- if Read permission is active and the file is within limits, the selected Markdown file can be included as context automatically.
- the context bar must show what is active.

For selected folders:

- ZEUS may use the folder path and summary-level information.
- ZEUS must not blindly load every file in the folder without an explicit analysis workflow and limits.

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
- persistent tree behavior
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