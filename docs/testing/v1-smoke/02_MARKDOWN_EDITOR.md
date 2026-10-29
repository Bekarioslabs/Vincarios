# 02 - Markdown Preview and Editor

## Markdown Preview

- [ ] Open `01 Markdown Rendering.md`. The Properties block shows valid YAML fields separately from body text.
- [ ] Headings, bold, italic, strikethrough, highlight, blockquote, inline code, fenced code, lists, task checkboxes, and table render legibly.
- [ ] The colored compatibility text and HTML highlight render through the supported safe formatting layer. No CSP warning count grows from inline style execution.
- [ ] `Beka_Portraits_21.png` appears inside the Markdown Preview.
- [ ] Select the PNG directly in Files. The image itself appears in Preview.
- [ ] Return to a Markdown file. Preview replaces the image instead of retaining stale image content.

## Link Navigation

- [ ] Click `02 Link Target`. It opens inside Preview without forcing a File Tree reveal.
- [ ] Preview Back and Forward navigate between the rendering note and link target.
- [ ] Reveal in Files selects the currently previewed note.
- [ ] Click the external repository link. Vincarios shows an explicit confirmation before opening the system browser.
- [ ] Right-click a previewed file/image and use Copy as Link. The clipboard receives an Obsidian-compatible local link.

## Scoped Selection And Context Menu

- [ ] Drag-select part of Preview text and Copy. Only the selected text is copied.
- [ ] `Ctrl+A` in Preview selects the current Preview region, not every visible text node in the app.
- [ ] In Source editor, Copy, Cut, Paste, and Select Area affect only the editor.
- [ ] Right-clicking does not first replace a partial selection with the entire app.

## Editor Light

- [ ] Open `03 Editor Update Target.md` in Source mode.
- [ ] Apply Bold, Italic, Strikethrough, Highlight, H2, unordered list, ordered list, and task list. Each command changes the intended selection without jumping to the end.
- [ ] Switching one list type to another replaces the existing list marker instead of stacking markers.
- [ ] Use Link. Search for `02 Link Target`, select the filename result, and insert a valid Wikilink.
- [ ] Click another note while unsent local edits exist. The dirty-navigation dialog names the edited source note and offers an explicit stay/discard path.
- [ ] Send the edit to Review Basket. Continue editing the same source and send again. The existing open proposal updates instead of leaving an obsolete duplicate.
- [ ] Update is blocked with clear R/W guidance when permissions are missing and becomes available when both are enabled.

## Close, Reload And Line Endings (A07)

- [ ] Open a Windows CRLF fixture note, enter and leave Source without editing: Update remains disabled and neither navigation nor closing reports an unsaved edit.
- [ ] Edit a disposable note, close the window and select Stay (or close the confirmation). The app and exact local draft remain open. Discard changes closes without writing the draft to the vault.
- [ ] In the development app, repeat with View > Reload, View > Force Reload, Ctrl+R and Ctrl+Shift+R while the app is foreground. Stay preserves the draft; Discard reloads. Repeat after returning to Preview with local edits.
- [ ] On a copy, execute a small reviewed edit to a CRLF note. The saved file retains CRLF, the backup retains the exact original and reopening Source does not show phantom changes. LF notes retain LF. Removing a final newline deliberately remains a real edit.
- [ ] In the final portable build, View has no Reload/Force Reload items. Window close still offers Stay/Discard for unsaved local edits.
- [ ] Optional developer probe: `node scripts/probe-editor-unload.js` runs hidden real Electron windows with synthetic notes and an isolated temporary profile. It verifies native reload/menu/close paths and cleans up its owned fixture; foreground keyboard accelerators still require the manual check above.

## Markdown Extension Consistency (A08)

- [ ] In a disposable vault, open `.markdown` and `.MARKDOWN` notes. Preview, Summary/Context/Similar/Tags/Update actions and context badges treat them like `.md` notes without bypassing R/W checks.
- [ ] Execute one reviewed editor addition to each extension. Verify content, original-version backup and clean editor readback; no `not_markdown` error and no double `.md` suffix.
- [ ] An extensionless relative wikilink opens a nearby `.markdown` note even without an index. The Link Picker includes indexed `.markdown` results and retains that suffix in inserted links; selecting `Guide.markdown` beside `Guide.md` must open the chosen long-extension note, not its sibling. Extensionless cross-folder lookup still reaches the vault-root candidate after a relative miss.
- [ ] After an external `.markdown` edit, metadata search picks up changed tags via the existing incremental flow. A later external deletion removes its metadata record. Embedding/full-text freshness remains an independent status, not proof of metadata failure.
- [ ] Rename a disposable `.markdown` note first with an explicit `.markdown` suffix, then without a suffix. The supported extension is preserved; links are not automatically updated by Rename Light.

## New Names (A08)

- [ ] New Note/New Project: device names such as `CON` or `AUX.txt`, `Bad#Name`, `Bad[Name]`, trailing period/space and empty input show an error. The dialog stays open and adds no proposal; no silently renamed output appears.
- [ ] Create `Aurora  Lab!` and a note with an explicit `.MARKDOWN` suffix through Review. Preview, Review and actual filesystem names agree, including repeated internal spaces, punctuation and suffix case.
- [ ] F2 a disposable note to `NUL.md`, `Bad#Name` and a name with a trailing space. Each fails without changing the original. A valid new name preserves the original extension when omitted.
- [ ] Open an existing note named `Old [draft] #1.md` directly in Files and apply one small reviewed edit. The old name remains readable and unchanged. Existing unusual folder names do not prevent creating an ordinarily named child.
- [ ] Developer boundary checks cover 255/256 UTF-16 units, suffix overhead, control characters and direct Main/template requests; the UI is not the only gate.

## Malformed Frontmatter

- [ ] Open `09 Malformed Frontmatter.md`. Its Markdown body remains readable and malformed YAML remains visible.
- [ ] Run Suggest Tags. No write proposal is created; the message explains that YAML cannot be updated safely and offers Open Source Editor.
- [ ] Open Source Editor from that message. It opens the correct note and preserves the malformed source for manual repair.
