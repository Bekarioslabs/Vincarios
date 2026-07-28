# 01 - App, Vault, UI, and Files

## Splash And Vault Session

- [ ] Start Vincarios. The splash shows the final logo, current app version, `Open Vault`, at most two recent vaults, and LM Studio/Ollama availability without layout overlap.
- [ ] Open `dev-vault`. The splash closes, Files populate, Chat is active, and no startup error appears.
- [ ] Switch to another test vault and back. File Tree, role visuals, index state, Review state, and recent files belong to the active vault only.
- [ ] Restart Vincarios. `dev-vault` appears in Recent Vaults and opens successfully.

## Navigation And Layout

- [ ] Open Home, Chat, Search, Suggestions, and Review from the left navigation. Exactly one workspace is active each time.
- [ ] Click the bottom activity area. Session Log opens as a drawer/workspace; clicking it again returns to the previous workspace.
- [ ] Collapse and expand left navigation, Files, Selection Actions, Review Basket, and Context Basket where available. State is clean, content does not leak through a collapsed rail, and controls keep useful hover labels.
- [ ] Resize Chat/Vault, Files/Actions, and Actions/Preview at wide and narrow window sizes. No panel disappears past its minimum boundary and each panel keeps local scrolling.
- [ ] Collapse Files. Selection Actions become inactive so a hidden selection cannot be mistaken for the visible Preview target.

## Keyboard And Menu

- [ ] `Ctrl+Shift+H` opens Home, `Ctrl+F` opens Search, `Ctrl+Shift+S` opens Suggestions, and `Ctrl+,` opens Settings.
- [ ] `Ctrl++`, `Ctrl+-`, and `Ctrl+0` zoom in, zoom out, and reset.
- [ ] Navigate menu commands open Home, Search, Suggestions, Review Basket, and Settings.
- [ ] Help -> Repository asks the operating system to open the Vincarios repository.
- [ ] With a modal open, workspace shortcuts do not move the app behind the modal.

## Settings And Themes

- [ ] Open Settings. Clicking the backdrop or pressing Escape does not close it; Tab stays inside; visible Cancel/Close/Save paths work.
- [ ] Switch between Dark, Light, System, High Contrast, and Paper. Text, score rings, icons, disabled controls, and primary buttons remain readable.
- [ ] Restart Vincarios. The selected appearance and collapsed layout state persist as app settings.
- [ ] Change one Vault Profile role icon and color, then Save. The Save control visibly indicates dirty state before saving and returns to neutral afterward.
- [ ] Reopen Settings. The saved folder assignment, icon, and color are still present and reflected in Files.
- [ ] A top-level folder already assigned to one role is unavailable for another role.

## Files And Permissions

- [ ] Expand `00_Inbox/V1 Full Smoke`. The fixture tree scrolls and nested folders expand without shifting panel width.
- [ ] With focus in Files, Up/Down changes selection and Left/Right collapses or expands folders. Page/Home/End scrolling remains bounded to Files.
- [ ] Press `F2` on `10 Rename Target.md`, then `Ctrl+A` inside the rename field. Only the filename text is selected.
- [ ] Rename it to `10 Rename Target - Renamed.md`, verify the Preview/path/Session Log, then rename it back.
- [ ] Toggle R and W on one fixture. Direct state is visible.
- [ ] Enable R on `V1 Full Smoke`, then explicitly disable R on one child. The child shows blocked/off rather than inherited access.
- [ ] Use the recursive permission gesture on `Folder Scope`. Descendant state updates consistently.
- [ ] Protected `.obsidian` and `.vincarios` folders are not exposed as ordinary actionable notes and cannot receive normal R/W actions.

## Watcher And Refresh

- [ ] Create `Watcher External.md` inside `V1 Full Smoke` using Obsidian or Explorer. Files updates automatically or after one explicit Refresh without reopening the vault.
- [ ] Rename that file externally. Files updates and the index indicator becomes stale/orange when appropriate.
- [ ] Delete the external test file. Files and Recent Files remove it without a vault reload.
