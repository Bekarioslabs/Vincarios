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

## Malformed Frontmatter

- [ ] Open `09 Malformed Frontmatter.md`. Its Markdown body remains readable and malformed YAML remains visible.
- [ ] Run Suggest Tags. No write proposal is created; the message explains that YAML cannot be updated safely and offers Open Source Editor.
- [ ] Open Source Editor from that message. It opens the correct note and preserves the malformed source for manual repair.
