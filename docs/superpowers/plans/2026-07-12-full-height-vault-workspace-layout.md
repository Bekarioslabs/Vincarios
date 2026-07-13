# Full-Height Vault Workspace Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Files/Actions-over-Preview vault grid with independent full-height Files, Selection Actions, and Preview columns while preserving every existing vault workflow.

**Architecture:** `mountShell.js` defines the three vault regions and accessible resize handles. `layout.css` owns the horizontal grid and local scrolling. `paneResize.js` owns only width calculations for vault, file-tree, and selection-action handles; it no longer owns a vertical preview resize. Review Basket, Context Basket, and input remain inside the Chat workspace stack with their existing local scroll behavior. The first implementation slice deliberately excludes collapse state, persisted preferences, Focus Mode, and action-panel auto-expansion.

**Tech Stack:** Electron renderer, browser-first IIFE modules, CSS Grid, Node built-in test runner.

## Global Constraints

- Preserve all current provider, permission, context, review, backup, audit, file navigation, and Markdown preview behavior.
- Keep the renderer sandboxed and do not add renderer filesystem access.
- Use existing CSS tokens; no inline styles or new ad-hoc colors.
- Files, Selection Actions, and Preview scroll locally. The app shell does not scroll.
- Review Basket and Context Basket remain inside Active Workspace and preserve their existing bounded local scrolling.
- All resize controls remain semantic vertical separators with accessible labels.
- Folder Visual Identity and later File Tree polish begin only after this layout foundation is visually accepted.
- Run targeted tests before the full suite. Run `npm test` before each commit.

---

### Task 1: Replace the layout contract tests

**Files:**
- Modify: `tests/uiCss.test.js`
- Modify: `tests/accessibilitySource.test.js`

**Interfaces:**
- Consumes: existing `data-resize` attributes from `src/renderer/shell/mountShell.js`.
- Produces: a test contract for three full-height vault columns and two internal vertical resize handles.

- [ ] **Step 1: Replace the current top-row/preview-below assertions with failing full-height assertions**

```js
test('vault panel uses full-height Files Actions Preview columns', () => {
  assert.match(shell, /class="files-pane"/);
  assert.match(shell, /class="selection-actions-pane"/);
  assert.match(shell, /class="preview-pane"/);
  assert.match(layoutCss, /grid-template-columns:\s*minmax\(var\(--min-file-tree-width\), var\(--file-tree-width\)\)\s+7px\s+minmax\(var\(--min-selection-actions-width\), var\(--selection-actions-width\)\)\s+7px\s+minmax\(var\(--min-preview-width\), 1fr\);/);
  assert.doesNotMatch(layoutCss, /grid-template-rows:\s*minmax\(180px, var\(--vault-top-height/);
  assert.doesNotMatch(layoutCss, /\.preview-pane\s*\{[\s\S]*grid-column:\s*1 \/ -1;/);
});
```

- [ ] **Step 2: Run the focused layout test and confirm it fails against the old grid**

Run: `node --test tests/uiCss.test.js`

Expected: the vault layout assertion fails because the preview still spans the two top columns and `--vault-top-height` still exists.

- [ ] **Step 3: Replace the old preview-resizer accessibility assertion with the new Actions-resizer contract**

```js
test('custom resizers expose vertical separator semantics', () => {
  assert.match(source, /data-resize="vault"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  assert.match(source, /data-resize="files"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  assert.match(source, /data-resize="actions"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  assert.doesNotMatch(source, /data-resize="preview"/);
});
```

- [ ] **Step 4: Run the focused accessibility test and confirm it fails before the shell changes**

Run: `node --test tests/accessibilitySource.test.js`

Expected: the Actions handle is missing and the old preview handle is still present.

### Task 2: Change shell markup and CSS Grid geometry

**Files:**
- Modify: `src/renderer/shell/mountShell.js`
- Modify: `src/renderer/styles/tokens.css`
- Modify: `src/renderer/styles/layout.css`

**Interfaces:**
- Consumes: `data-resize="files"` and the new `data-resize="actions"` handles.
- Produces: three local-scroll full-height columns: `.files-pane`, `.selection-actions-pane`, `.preview-pane`.

- [ ] **Step 1: Replace the preview-horizontal handle in `mountShell.js` with a second vertical handle before Preview**

```html
<section class="files-pane"><div id="file-panel"></div></section>
<div class="pane-resizer" data-resize="files" title="Resize Files and Selection Actions" role="separator" aria-label="Resize Files and Selection Actions" aria-orientation="vertical"></div>
<aside class="selection-actions-pane" data-future-slot="selection-actions" aria-label="Selection actions">...</aside>
<div class="pane-resizer" data-resize="actions" title="Resize Selection Actions and Preview" role="separator" aria-label="Resize Selection Actions and Preview" aria-orientation="vertical"></div>
<section class="preview-pane">...</section>
```

- [ ] **Step 2: Replace the vertical layout token with action-width tokens in `tokens.css`**

```css
--file-tree-width: 260px;
--selection-actions-width: 280px;
--min-file-tree-width: 170px;
--min-selection-actions-width: 220px;
--min-preview-width: 420px;
```

Remove `--vault-top-height`; it describes a layout that no longer exists.

- [ ] **Step 3: Replace the two-row `.vault-panel` Grid with three full-height columns**

```css
.vault-panel {
  display: grid;
  grid-template-columns:
    minmax(var(--min-file-tree-width), var(--file-tree-width))
    7px
    minmax(var(--min-selection-actions-width), var(--selection-actions-width))
    7px
    minmax(var(--min-preview-width), 1fr);
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
}

.files-pane,
.selection-actions-pane,
.preview-pane {
  min-height: 0;
  overflow: hidden;
}

.selection-actions-pane {
  overflow: auto;
}

.preview-pane {
  grid-column: auto;
}
```

Remove `.pane-resizer-horizontal` and the old preview vertical-sizing rules because no horizontal splitter remains.

- [ ] **Step 4: Run the targeted source/style tests and confirm they pass**

Run: `node --test tests/uiCss.test.js tests/accessibilitySource.test.js`

Expected: PASS after the markup, tokens, and Grid contract match.

### Task 3: Replace vertical preview resizing with action-panel width resizing

**Files:**
- Modify: `src/renderer/layout/paneResize.js`
- Modify: `tests/uiCss.test.js`

**Interfaces:**
- Consumes: `data-resize="vault"`, `data-resize="files"`, `data-resize="actions"`.
- Produces: `resizeVault(app, clientX)`, `resizeFiles(app, clientX)`, and `resizeActions(app, clientX)`.

- [ ] **Step 1: Add a failing source-contract assertion for the Action handle and remove the preview expectations**

```js
assert.match(resizeSource, /const actionsHandle = app\.querySelector\('\[data-resize="actions"\]'\)/);
assert.match(resizeSource, /function resizeActions\(app, clientX\)/);
assert.doesNotMatch(resizeSource, /function resizePreview\(app, clientY\)/);
assert.doesNotMatch(resizeSource, /--vault-top-height/);
```

- [ ] **Step 2: Run the focused test and confirm it fails before the resize module is changed**

Run: `node --test tests/uiCss.test.js`

Expected: FAIL because the current module still queries `previewHandle` and implements `resizePreview`.

- [ ] **Step 3: Bind the Actions handle and implement bounded width calculations**

```js
const actionsHandle = app.querySelector('[data-resize="actions"]');

if (actionsHandle) cleanup.push(bindHorizontalResize({
  handle: actionsHandle,
  onMove: (event) => resizeActions(app, event.clientX)
}));

function resizeActions(app, clientX) {
  const vaultPanel = app.querySelector('.vault-panel');
  const filesPane = app.querySelector('.files-pane');
  const actionsPane = app.querySelector('.selection-actions-pane');
  if (!vaultPanel || !filesPane || !actionsPane) return;

  const vaultRect = vaultPanel.getBoundingClientRect();
  const actionsRect = actionsPane.getBoundingClientRect();
  const minActions = readPx(app, '--min-selection-actions-width', 220);
  const minPreview = readPx(app, '--min-preview-width', 420);
  const handleWidth = 14;
  const maxActions = vaultRect.width - filesPane.getBoundingClientRect().width - minPreview - handleWidth;
  const next = clamp(clientX - actionsRect.left, minActions, Math.max(minActions, maxActions));

  app.style.setProperty('--selection-actions-width', Math.round(next) + 'px');
}
```

Update `resizeFiles` so its maximum retains both the minimum action-panel width and preview width:

```js
const minActions = readPx(app, '--min-selection-actions-width', 220);
const minPreview = readPx(app, '--min-preview-width', 420);
const handleWidth = 14;
const maxFiles = rect.width - minActions - minPreview - handleWidth;
```

- [ ] **Step 4: Remove preview-handle binding and `resizePreview`**

The module must not retain unused `previewHandle`, `resizePreview`, `--vault-top-height`, or row-height calculations.

- [ ] **Step 5: Run focused tests and syntax checks**

Run: `node --check src/renderer/layout/paneResize.js`

Run: `node --test tests/uiCss.test.js tests/accessibilitySource.test.js`

Expected: PASS.

### Task 4: Update the active UI plan and run the layout acceptance check

**Files:**
- Modify: `docs/rebuild/ZEUS_V1_IMPLEMENTATION_PLAN.md`
- Modify: `docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md`

**Interfaces:**
- Consumes: the committed layout design and the implemented three-column shell.
- Produces: an active-doc record that the full-height layout foundation is complete and collapse behavior remains the next isolated slice.

- [ ] **Step 1: Update the Phase 7.9 wording**

Record that the first Phase 7.9 slice moved Files, Selection Actions, and Preview to full-height local-scroll columns; it deliberately does not add collapse state, settings persistence, Focus Mode, or auto-expansion yet.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: all JavaScript checks and Node tests pass.

- [ ] **Step 3: Run manual visual acceptance before continuing**

1. Start ZEUS and open a vault from the splash screen.
2. Confirm Chat, Suggestions, and Session Log still switch normally.
3. Open a long vault and confirm Files scrolls independently for the full height.
4. Select Markdown, image, and folder entries; confirm Preview and Selection Actions still render their existing content.
5. Drag the Files/Actions splitter and Actions/Preview splitter. Confirm neither Chat nor Preview can be squeezed below its protected minimum.
6. Confirm the application shell never gains a document-level scrollbar.
7. Confirm all three resize handles have usable hover, focus, and screen-reader labels.
8. In Chat, add enough Review Basket and Context Basket entries to confirm their lists stay locally scrollable and do not expand the whole workspace.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/renderer/shell/mountShell.js src/renderer/layout/paneResize.js src/renderer/styles/layout.css src/renderer/styles/tokens.css tests/uiCss.test.js tests/accessibilitySource.test.js docs/rebuild/ZEUS_V1_IMPLEMENTATION_PLAN.md docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md
git commit -m "Use full-height vault workspace columns"
```

## Self-Review

- Spec coverage: Tasks 1-3 cover the full-height three-column grid, local scroll, protected widths, resizers, and accessibility. Task 4 records scope boundaries and verifies existing workflows.
- Deferred by design: action-panel collapse, icon rail collapse, File Tree collapse, Context Basket default-collapse, Focus Mode, and persisted layout settings are separate follow-up slices after this grid is visually accepted.
- No placeholders: every task names exact files, contracts, commands, and expected outcomes.
