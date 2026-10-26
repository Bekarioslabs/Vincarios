# 05 - Review, Persistence, Safety, and Portable Build

## Review Basket UX

- [ ] Open Review from navigation or Home. It is a dedicated workspace and does not depend on Chat being active.
- [ ] Open update, tag, imported-note, create-note, and project proposals from the earlier modules. Rows have stable compact height and clear status icons.
- [ ] Review Diff opens the correct before/after content. Added and removed lines use the shared diff colors.
- [ ] Execute Selected is disabled with no selected executable entries and active only when valid entries are selected.
- [ ] Clear Pending is red/destructive and only clears pending entries. Clear Executed is orange/warning and only clears completed entries.
- [ ] Dismiss works for open and executed entries without misleading disabled text labels.

## Reviewed Write Safety

- [ ] Execute the update for `03 Editor Update Target.md`. Preview refreshes immediately to the committed content.
- [ ] Confirm a backup exists under the vault-local `.vincarios/backups/` hierarchy for the original note.
- [ ] Confirm `.vincarios/audit.jsonl` receives an entry for the executed action without storing unrelated note content.
- [ ] Change the target externally after creating another update proposal, then execute the stale proposal. Vincarios rejects it instead of overwriting newer content.
- [ ] Execute the imported note and create-note proposals. Existing filenames are never silently overwritten.
- [ ] Execute the project proposal. Either every planned folder/file appears or none remains after a forced collision/failure.

## Phase A Write And Startup Checks

- [ ] Use a disposable fixture note: execute two small reviewed updates and confirm two different backups retain the two earlier versions. Equal-clock collisions are additionally covered by automated injected-clock tests.

- [ ] Propose a small addition. Apply Update Preview focuses Cancel and has no extra acknowledgement checkbox.
- [ ] On a disposable note, propose a much shorter replacement or remove its YAML block. The basket warns about a large replacement; Apply is disabled until the labelled acknowledgement is checked and becomes disabled again if unchecked.
- [ ] Cancel the large replacement, reopen its confirmation and verify that acknowledgement is unchecked again. Cancel does not change the note.
- [ ] An empty replacement remains non-executable; a deliberately large but valid rewrite can still be applied after review and acknowledgement.

## Review Persistence

- [ ] Leave at least one open and one executed Review item.
- [ ] Close Vincarios normally, restart it, and reopen `dev-vault`.
- [ ] Both non-dismissed items restore with their correct statuses.
- [ ] Switch to another vault. The `dev-vault` Review history is absent there and returns when `dev-vault` is reopened.

## Activity And Feedback

- [ ] Rename, index refresh, provider request, proposal creation, execution, and a preview-local warning produce useful status/activity entries.
- [ ] Success, warning, and failure use distinguishable semantic colors without hard-coded theme-specific white backgrounds.
- [ ] Click the global bottom activity area. Session Log shows the current-session entries with timestamps and returns to the previous workspace when closed.
- [ ] A successful create/update/rename produces the centralized File Tree update flash when its target row is visible; it does not rebuild or flicker the complete tree.

## Portable Candidate

- [ ] Close the source-launched app. Start `portable-smoke/vincarios-0.1.0-beta.1-portable.exe`.
- [ ] Windows may show the documented unsigned-app warning. Its absence is also valid and does not mean the build is signed; the app and release notes must not claim code signing.
- [ ] Open `dev-vault`. Files, Preview, Settings, indexes, local model, and Review persistence work.
- [ ] Close and reopen the portable EXE. App-local state is restored from `portable-smoke/.vincarios/`.
- [ ] No new Vincarios state is required under `%APPDATA%` for this portable run.
- [ ] Optional technical checksum check: run the PowerShell commands below from the repository root. The final line must print `True`.
```powershell
$actual = (Get-FileHash .\portable-smoke\vincarios-0.1.0-beta.1-portable.exe -Algorithm SHA256).Hash.ToLowerInvariant()
$expected = ((Get-Content .\portable-smoke\vincarios-0.1.0-beta.1-portable.exe.sha256.txt -Raw).Trim().Split()[0]).ToLowerInvariant()
$actual -eq $expected
```

## Final Safety Check

- [ ] No provider action worked without the required R/W state.
- [ ] No write reached the vault without Review.
- [ ] Existing-file writes produced backup and audit evidence.
- [ ] Dot folders stayed blocked.
- [ ] Switching vaults did not leak context, permissions, indexes, recent files, or Review state.
- [ ] Offline provider, malformed YAML, stale proposal, missing recent file, and canceled request all failed visibly and recoverably.
