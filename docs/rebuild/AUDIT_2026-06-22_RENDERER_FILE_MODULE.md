# Renderer File Module Audit - 2026-06-22

## Scope

First extraction of file navigation out of the shell.

Checked:

- shell no longer owns file navigation details
- file navigation state is testable without DOM
- file panel owns file-list rendering and read-only file opening
- breadcrumb and back navigation exist as first cut

## Result

Status: pass.

The renderer shell remains a layout/orchestration layer. File navigation behavior now lives under `src/renderer/files/`.

## Implemented In This Block

- `src/renderer/files/fileNavigator.js`
- `src/renderer/files/mountFilePanel.js`
- `tests/fileNavigator.test.js`
- file panel scripts added to `index.html`
- shell now delegates vault file UI to `mountFilePanel`

## Covered By Tests

- path normalization for renderer file state
- open folder state
- breadcrumb creation
- selected Markdown file state
- back navigation state

## Intentional Boundaries

- no full recursive tree yet
- no R/W permissions yet
- no context module yet
- no Markdown rendering/sanitization yet
- no write actions

## Manual Smoke Test

Run:

```text
npm start
```

Then test:

1. Click `Open Vault`.
2. Select a folder containing Markdown files.
3. Confirm visible folders and `.md` files appear in the Vault panel.
4. Click a folder and confirm breadcrumb changes.
5. Click `Back` and confirm previous folder returns.
6. Click a Markdown file and confirm content appears in Markdown preview.
7. Confirm dot folders such as `.obsidian` are not listed.

## Next Recommended Block

Add Markdown rendering/sanitization as its own module before making file preview richer.