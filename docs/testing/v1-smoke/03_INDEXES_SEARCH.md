# 03 - Indexes, Search, Suggestions, and Home

## Index Health And Settings

- [ ] Open Settings -> Vault Indexes. Metadata records, Markdown notes, embedding chunks, and Full-text terms use clear labels.
- [ ] Enable Full-text Search. The disclosure is visible before first use and the switch persists after reopening Settings.
- [ ] Run Refresh enabled indexes. Progress completes once and both Files and Settings indicators reach green without a reload or repeated click.
- [ ] Rename or externally change a fixture. The indicator becomes orange/stale without a permanent background polling service.
- [ ] Refresh again. Enabled Metadata, Embedding, and Full-text indexes become current; disabled indexes do not keep aggregate health stale.

## Deterministic Search

- [ ] Search Names and paths for `Search Metadata`. The fixture appears with filename/path reasons.
- [ ] Search Metadata for `cobalt-compass` and `Indigo Search Beacon`. The fixture appears from tag and alias data.
- [ ] Search Full-text for `silent aurora ledger`. It appears only when Full-text is enabled and current.
- [ ] Open a result. It opens in Preview without automatically revealing Files.
- [ ] Use Reveal in Files. Files expands and selects the result.
- [ ] Edit a fixture tag through a reviewed update and execute it. Metadata search reflects the incremental update without a complete manual rebuild.

## Similar Notes

- [ ] Select `05 Similar Alpha.md`, enable R, and run Find Similar Notes with a permissive threshold.
- [ ] `06 Similar Beta.md` ranks as a strong related result; `07 Similar Noise.md` is absent or clearly weaker.
- [ ] Change scope, minimum match, maximum results, and Content/Metadata sources. Session values persist between runs; saved defaults reappear after restart.
- [ ] Use Refresh index first after changing a fixture. The index indicator reaches current state after the action.
- [ ] The Chat reports whether results were found, but does not force-switch away from Chat.

## Suggestions Workspace

- [ ] Open Suggestions. Similar-note results are grouped under a concise source filename header with the correct type icon.
- [ ] Open one result. The right detail area shows target information and Preview content without a fake write diff.
- [ ] Group checkbox selects only visible items in that group.
- [ ] Clear selected removes only the selected visible suggestions.
- [ ] Dismiss removes one item; an empty source group disappears.
- [ ] Run Suggest Tags on `11 Astronomical Field Notes.md`. Tag candidates use their own presentation without a similarity score ring.
- [ ] Add a tag candidate to Review Basket. It no longer appears as an untreated suggestion that can be added repeatedly.

## Vault Home

- [ ] Open Home. Vault Health shows folders, Markdown notes, images, and current aggregate index state without reading image content.
- [ ] Search, Chat, and Open Review Basket shortcuts open the correct workspaces.
- [ ] Open several fixture notes. Recent Files updates immediately without switching away and back.
- [ ] Delete one recent fixture externally. Selecting or refreshing Recent Files prunes the missing entry instead of retaining a dead row.
