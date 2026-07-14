# Vault Workspace Layout Design

## Goal

Make the vault workspace easier to navigate, act on, and read in long vaults without changing file, review, provider, or permission behavior.

## Chosen Layout

The desktop workspace uses five horizontal regions:

```text
Icon Rail | Active Workspace | Files | Selection Actions | Preview
```

`Files`, `Selection Actions`, and `Preview` use the full available workspace height. Each owns local scrolling. The application shell itself does not scroll.

## Region Responsibilities

- The Icon Rail contains app-level navigation and may collapse to icon-only width.
- The Active Workspace contains Chat, Suggestions, or Session Log. In the Chat workspace, Review Basket, Context Basket, and input remain in the existing workspace stack; their current local scrolling remains intact.
- Files owns vault navigation and stays available by default.
- Selection Actions owns selected-target actions and their inline option forms.
- Preview owns Markdown, image, and source-edit preview rendering.

The Preview remains a reading surface. It is not an action drawer and does not host target-selection controls.

## Sizing And Responsive Rules

- Chat and Preview have protected minimum widths.
- Files has a resizable practical range and can snap-collapse.
- Selection Actions has a resizable practical range and can collapse to a visible icon strip on the right side of Files.
- When the window becomes too narrow, Selection Actions collapses before Files.
- If Files also collapses, its explicit toggle remains visible.
- Focus Mode coordinates Icon Rail, Files, Selection Actions, and Context Basket collapse. It does not hide active Review Basket safety state.

## Selection Actions Expansion

- Selection changes do not automatically expand Selection Actions.
- Clicking a simple action does not change panel width.
- Clicking an action that requires configuration expands a collapsed Selection Actions panel to its saved width, then renders its inline form below the owning action row.
- The panel stays open after submit or cancel until the user explicitly collapses it.
- If there is insufficient width to preserve the Preview minimum, the configuration uses an explicit action dialog rather than compressing the entire workspace.
- If Selection Actions is already open, selecting another configurable action only changes the inline form. It does not change the saved panel width.

## Collapse State

- Collapse is a per-user layout preference and belongs in app-local settings.
- A collapsed area keeps a visible, accessible toggle with `aria-expanded` state and a tooltip.
- Important active state remains discoverable through compact counts or indicators.
- Folder visual identity remains separate vault metadata under `.vitruvios/`; it is not layout state.

## Module Boundaries

- `src/renderer/shell/` composes layout regions and owns shell-level collapse/focus coordination.
- `src/renderer/files/` owns file-tree rendering and local tree-collapse behavior.
- `src/renderer/selectionActions/` owns action panel content and the request to reveal itself for an inline configuration form.
- `src/renderer/markdown/` continues to own preview content, not layout policy.
- `src/renderer/settings/` persists user layout preferences through the existing settings path.
- `src/renderer/styles/layout.css` owns shell-grid and region geometry. Area-specific styles remain in their existing focused stylesheets.

## Non-Goals

- No change to provider, permission, review, backup, audit, or file-read/write logic.
- No movable/detachable Preview in V1.
- No automatic hiding of panels merely because a file or folder selection changes.
- No fake action controls or new action semantics.
- Folder Visual Identity and later File Tree polish start only after this layout foundation is visually accepted; no parallel changes alter the same layout/files boundary.

## Verification

- Targeted layout/resize tests cover the new grid state and collapse state transitions.
- Full `npm test` runs before commit because shell markup and renderer wiring change.
- Manual test: splash opens a vault, Chat/Suggestions/Session Log mount, Files and Actions scroll locally, Preview opens Markdown and images, all collapse toggles remain keyboard accessible, and narrow widths preserve Chat/Preview minimums.
