# Suggestions Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated Suggestions workspace so analysis results such as Similar Notes are visible, selectable, and previewable without flooding chat or the Review Basket.

**Architecture:** Suggestions live between deterministic analysis actions and Review Basket proposals. `selectionActions` may create suggestion groups, `suggestions` owns suggestion state and UI, and `review` remains the only execution layer. Similar Notes remains report-only until a converter maps selected suggestions to concrete action types.

**Tech Stack:** Electron renderer modules, browser-first IIFE modules with CommonJS test fallbacks, Node test runner, existing CSS token system.

---

## File Structure

- Create `src/renderer/workspace/workspaceState.js`: active workspace tab state for `chat`, `suggestions`, and future `sessionLog`.
- Create `src/renderer/suggestions/suggestionState.js`: grouped suggestion data, selection, dismiss, selected-detail state.
- Create `src/renderer/suggestions/mountSuggestionsWorkspace.js`: Suggestions workspace UI, empty state, group list, detail panel, disabled conversion action bar.
- Modify `src/renderer/shell/mountShell.js`: mount workspace tabs and wire Chat/Suggestions containers without moving provider or vault logic.
- Modify `src/renderer/selectionActions/mountSelectionActions.js`: route Similar Notes details into suggestion state instead of rendering a result panel in Selection Actions.
- Modify `src/renderer/styles/layout.css`: workspace tab and Suggestions layout styles using existing tokens.
- Add tests under `tests/`: workspace state, suggestion state, source integration, CSS source checks.

## Task 1: Workspace State Foundation

- [ ] Write tests for `workspaceState`: default is `chat`, can switch to `suggestions`, rejects unknown keys by falling back to `chat`, notifies subscribers.
- [ ] Implement `src/renderer/workspace/workspaceState.js` as a focused state module with browser global `window.ZeusWorkspaceState` and CommonJS export.
- [ ] Add script load order in `index.html` before shell.
- [ ] Run targeted tests.

## Task 2: Suggestions State Foundation

- [ ] Write tests for grouped suggestions: add group, select item, toggle checkbox, dismiss item, clear group, expose selected detail.
- [ ] Implement `src/renderer/suggestions/suggestionState.js` with no vault or provider access.
- [ ] Add script load order in `index.html` before shell.
- [ ] Run targeted tests.

## Task 3: Suggestions Workspace UI

- [ ] Write source/CSS tests for a two-column Suggestions workspace: left list, right detail preview, disabled `Add selected to Review Basket` when no converter exists.
- [ ] Implement `mountSuggestionsWorkspace.js` with compact items, score/status labels, checkbox selection, dismiss, and selected detail panel.
- [ ] Add styles in `layout.css` using `--background-*`, `--text-*`, `--interactive-accent`, and existing action category tones.
- [ ] Run targeted tests.

## Task 4: Shell Workspace Tabs

- [ ] Write source tests that shell mounts Chat and Suggestions as workspace panels and passes suggestion/workspace state into the relevant modules.
- [ ] Modify `mountShell.js` to add workspace tabs. Chat remains the default visible workspace and keeps Review Basket, Context Basket, and input.
- [ ] Ensure right-side Files/Selection Actions/Preview remains unchanged.
- [ ] Run targeted tests and manually verify Chat still works.

## Task 5: Similar Notes Routing

- [ ] Write tests that Similar Notes creates a Suggestions group instead of a long chat report or Selection Actions result panel.
- [ ] Modify `mountSelectionActions.js` so Similar Notes adds a group with candidate items and switches workspace to `suggestions`.
- [ ] Chat receives only a compact status message such as `Similar notes found. Opened Suggestions workspace.`
- [ ] `Add selected to Review Basket` remains disabled for Similar Notes until concrete converters exist.
- [ ] Run targeted tests.

## Task 6: Verification And Docs

- [ ] Update `ZEUS_V1_UI_AND_WORKFLOWS.md`, `ZEUS_V1_ACTION_MODEL.md`, and `ZEUS_V1_IMPLEMENTATION_PLAN.md` if implementation deviates from this plan.
- [ ] Run `npm test`.
- [ ] Manual test: Similar Notes opens Suggestions, selecting candidates changes the detail preview, dismiss hides a suggestion, Chat remains clean, Review Basket is unchanged.
- [ ] Commit after manual acceptance.
