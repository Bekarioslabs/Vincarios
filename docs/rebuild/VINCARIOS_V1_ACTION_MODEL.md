# vincarios V1 Action Model

## Core Workflow

```text
User request
-> AI analysis
-> structured proposal plan
-> review module
-> user selects items
-> app validates again
-> diff/preview
-> backup
-> execute
-> audit log
-> validation result
```

## Proposal Plan

The AI should prefer proposal plans over direct one-off execution cards for multi-step work. V1 has a shared action schema in `src/shared/actions/actionSchema.js`, a proposal-plan parser in `src/shared/actions/proposalPlan.js`, and a line-based Markdown diff preview helper in `src/shared/actions/diffPreview.js`; the Review Basket can ingest normalized plan items, but only implemented executable actions may run.

Example categories:

- read context
- create note
- update note
- insert into note
- move note
- rename note
- archive note
- add tags/properties
- add links
- needs manual review

"add tags/properties" is reserved for the V1.1 Properties/YAML editor. V1 does not expose a separate direct Add Tag action; any persisted property change will continue to use the reviewed update flow.

## Supported Markdown Extensions

`src/shared/fileTypes.js` owns `.md` and `.markdown` recognition, case-insensitively, in Main and the renderer. Its browser API is loaded before consumers and validated at startup. Selection Actions, context badges, summaries, tag filename hints, link picker and title evidence use the same contract as reviewed updates, backups, watcher classification and incremental metadata/freshness updates. File-type recognition does not grant provider context or write permission; the existing Main path, stale-content, diff, backup and audit gates remain in force.

Rename Light preserves an explicitly supplied supported extension. If the new name omits it, the source extension, including its case, is retained; renaming a `.markdown` note never silently adds `.md`. Direct `create_note` requests also retain a supported suffix; otherwise new notes default to `.md`. Note presets likewise retain an explicitly supplied Markdown suffix instead of appending a second one; project presets retain their declared artifact filenames. Preview, proposal and actual created path must agree, including suffix case. Existing notes are not renamed or rewritten by classification.

Extensionless internal links try `.md`, then `.markdown`, within each existing folder-relative/root candidate location. Folder-relative candidates still precede vault-root candidates; explicit extensions remain exact. Only supported Markdown candidates are read; an unreadable extensionless intermediate candidate must not prevent the later vault-root lookup. Indexed fallback still refuses ambiguous or truncated results. Link-picker insertions keep the non-default `.markdown` suffix to distinguish a selected note from its `.md` sibling; the usual `.md` omission is unchanged. Rename Light still does not repair existing links.

## New Write Names

`src/shared/pathRules/newNames.js` owns new-name validation for Main writes and browser template previews. It is explicitly loaded and startup-validated. New notes, F2 rename destinations, newly created folder segments and all reviewed-template artifacts reject unsafe names before mutation; rejected input is not silently cleaned up, truncated or renamed to a different target. Existing parent folders are not newly created names, so an existing folder containing `#` can still receive a safely named new note. Read/list/update paths do not acquire this new-name restriction.

- A name is required. Valid Unicode, punctuation such as `!` and `&`, and repeated internal spaces are retained exactly.
- Reject leading/trailing whitespace, trailing periods, ASCII control characters (including DEL), Windows-reserved filename characters (`< > : " / \\ | ? *`), and the link delimiters `[ ] # ^`.
- Reject Windows device stems case-insensitively even before multiple extensions: CON, PRN, AUX, NUL, COM1-COM9 and LPT1-LPT9, including the Windows superscript 1/2/3 forms. A space before the extension cannot disguise the reserved stem.
- Limit each final new component to 255 UTF-16 code units, including any automatically added extension. Validate the original name as well as the final filename; adding `.md` must not hide an invalid trailing dot or space. This is a component limit, not a guarantee that every volume or complete path is supported.
- An invalid creation-dialog name leaves the dialog open with an error; nothing is added to Review. Main independently enforces the same rules. Failed F2 validation keeps the original file and name. Existing unusual names remain discoverable, readable and editable; no migration or batch renaming occurs.
- Note-preset proposals retain the complete planned filename as their title so the write target cannot change when a name contains another Markdown-looking suffix, dots or spaces before the final extension. Review's Edit Note/Project dialog also validates without sanitizing; invalid changes keep the original proposal and dialog open with an accessible inline error.

Windows compatibility basis: [Naming Files, Paths, and Namespaces](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file) and [Maximum Path Length Limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation). The link-delimiter restriction and leading-whitespace rejection are Vincarios write policies, not claims that Windows forbids those characters.

## Review Module

New notes are opened with exclusive creation (`wx`) before writing. A competing file appearing after validation returns `file_exists` and remains untouched. Rollback only removes a note after this operation successfully acquired its new file descriptor; partial owned writes and audit failures still remove the app-created output.

Every `update_note` receives derived `updateRisk` (`normal`, `high`, or `blocked`) from the existing shared diff API when added, restored or edited. Supplied risk/diff fields cannot override that derivation. A blocked update cannot be selected or executed. High-risk items display a warning and require a fresh acknowledgement in the Apply Update Preview; Apply stays disabled until checked. All update confirmation dialogs focus Cancel initially. The thresholds and distinction between a warning and a hard block are defined in SAFETY_RULES; provider risk remains a hint, not execution authority.

Each proposal item should show:

- category
- affected file
- source path
- target path if relevant
- reason
- confidence
- risk
- checkbox
- preview/diff if applicable

The user can select multiple items and click one execute button.

Current implemented slice: assistant `Save as Note` creates a selected `create_note` proposal, and external Markdown drops can create reviewed `create_note` import proposals through `Import to Inbox`. The Review Basket can select, dismiss any visible entry, clear pending suggestions, clear executed suggestions, show compact diff summaries, and open dedicated preview modals. Selected `create_note` proposals execute after an in-app Create Note preview with an editable title field. After a successful create, the app refreshes the Files tree through the file panel refresh path so the new note becomes visible without manual refresh. After a successful update, the app refreshes the currently loaded preview when it matches the updated target path. Selected `update_note` proposals are executable only when they carry `targetPath`, `currentContent`, and `proposedContent`; they are unselected by default, require an Apply Update diff preview, write through the preload vault API, create a backup in `.vincarios/backups/YYYY-MM-DD/...`, reject stale content if the file changed since proposal creation, update the Markdown file, and append audit entries in `.vincarios/audit.jsonl`. No-change update proposals remain visible for diagnosis but are marked non-executable. Failed review executions display the returned vault error on the basket item so stale content, no-change, and frontmatter/update issues are visible without guessing. Review Basket state is stored per vault in `.vincarios/review-basket.json`: open, done, failed, rejected, and stale entries are restored as local working history; dismissed items are omitted. Restore is view-only and never bypasses the normal execution-time permission, stale-content, diff, backup, or audit gates. Cache writes are atomic, path-validated, size-bounded, and never touch normal Markdown notes. `create_from_template` proposals cross one dedicated preload boundary into `reviewedTemplateService`: Main validates every folder/file under the reviewed project root, rejects existing targets before mutation, creates the complete tree as one audited transaction, and removes every newly created file/folder if any mutation or audit step fails. The renderer never loops over template filesystem writes.

Phase 3 is complete at this core foundation boundary. `insert_into_note`, `move_note`, `rename_note`, and `archive_note` remain known schema types so model output can be classified safely, but they are deliberately non-executable until their own reviewed services exist. Manual F2 Rename Light is separate from AI `rename_note`: it is same-folder only, app-initiated from the File Tree, audited, and explicitly does not update links in V1. This prevents accidental AI execution while keeping the future action vocabulary stable.

Review execution forwards optional generation provenance without changing the write API or granting approval. New AI responses/updates preserve the provider and resolved request model; Source edits and local metadata suggestions carry their own origin. Main allowlists those informational claims and computes content hashes/byte counts itself. See SAFETY_RULES, Audit Log, for the byte-level contract and privacy/trust limits. Legacy pending proposals remain executable through normal review even when their provenance is unknown.

## Cleanup Reports

V1 cleanup must not flood the Review Basket with every discovered suggestion. The flow is:

```text
scan/index candidates -> grouped cleanup report -> user opens a group -> concrete previews -> selected actions enter Review Basket -> reviewed execution
```

Report groups may include possible duplicates, tag/property suggestions, link candidates, folder candidates, or new-note/MOC candidates. Opening a group must show the appropriate preview type: property diff, Markdown-line diff, move plan, duplicate comparison, or create-note preview. The Review Basket remains the execution layer and should receive only selected concrete actions, not the whole analysis result.

## Selection Action Update Proposals

V1 supports update proposals through the selected Markdown file action `Propose content update`. The action is visually muted but still clickable when R/W or loaded content are missing, so the app can explain the missing permission without calling the provider. The app supplies the selected `targetPath` and `currentContent`; the provider returns a structured proposal with full `proposedContent`. The proposal is added to the Review Basket as `update_note` with `updateMode: whole_note` and is never written directly from chat or by the provider. Proposal failures are reported by stage (`provider`, `parser`, `review_basket`, or `provider_exception`) with target path, content length, sent context length, instruction length, and truncation status so model, parser, and review failures can be diagnosed before fixing.

An open provider-backed content update is a single named draft per target note. A later `Propose content update` for that same note uses the existing proposal content as its model input and replaces that one basket item rather than creating a competing whole-note replacement. The original on-disk `currentContent` remains the stale-content baseline, so an external change still blocks execution safely. Manual source-editor drafts remain a separate local draft kind.

Whole-note AI updates require the complete note or open draft as request input. The request builder rejects content above its effective character limit (20,000 by default) before calling the provider, using `note_too_large_for_whole_note_update` with a manual-edit/split-note suggestion. It never generates a whole-note replacement from truncated application input, and a rejected draft refresh leaves the existing Review Basket entry unchanged. This character gate does not establish the provider's effective token budget; Main also checks loaded context.

Dedicated requests carry `purpose: whole_note_update`. `main/providers/providerUpdateBudget.js` owns exact loaded-model matching and conservative estimates of all prepared messages, response allowance and headroom. `providerChatService.js` rechecks immediately before generation; `providerProtocol.js` caps the output. LM Studio requires native `loaded_instances[].config.context_length`; Ollama requires `/api/ps` `context_length`. Theoretical model maxima are not loaded allocations. Unknown, ambiguous or insufficient allocations block generation, without source truncation, model loading or context enlargement. Ollama echoes only its observed allocation. Explicit response-length termination cannot become a proposal.

This is conservative estimation, not exact tokenization or a guarantee of model behavior; borderline requests can be refused. Review, parser validation, destructive-change confirmation, backups and stale-content checks remain mandatory. Ordinary chat, summaries and manual editor proposals do not acquire this dedicated-update gate.

Proposal parsing uses whitespace trimming only to reject empty content. Leading whitespace, Markdown hard-break spaces, and the original disk baseline's trailing-newline suffix are preserved, including the absence of a final newline. The remainder of the note's line-ending style is handled separately from this parser rule.

Manual source edits from the Markdown preview use the same reviewed update path. The editor keeps the originally loaded source as `currentContent`, uses the local edited source as `proposedContent`, and adds an `update_note` proposal to the Review Basket. The preview editor never writes directly to the vault.

`src/shared/text/lineEndings.js` owns editor comparison and write-style preservation. Dirty checks normalize CRLF/CR/LF only; spaces, blank lines and final newline changes remain meaningful. The original `currentContent` stays byte-for-byte unchanged for the Main-process stale check. Reviewed replacements use the dominant disk line ending (first occurrence breaks ties; LF is the default without an existing ending), and Main validates the final expanded payload before backup/write. Normalized-identical text returns the untouched original, including mixed endings, and is not written as a no-op. Proposed final newline presence/count is preserved. The Review Basket uses the same helper on ingestion/restore/edits; committed notes are read back through the normal preview refresh so the editor does not remain spuriously dirty.

If `R` or `W` is missing, the app blocks proposal generation before any provider call and presents an app-level permission message. Permission-blocked Selection Actions are soft-disabled: visually muted, still clickable, and routed to the same retryable guidance path. Selection Action permission wording is centralized so later write actions such as rename/move can reuse the same R/W guidance. The model must not generate generic filesystem-access explanations for these cases.

Required gates before proposal generation:

- selected target is a Markdown file
- selected content is loaded in the preview/context state
- `R` is enabled for context use
- `W` is enabled for proposing a reviewed write
- user provides an explicit update instruction through the `Propose update` action

This is intentionally whole-note content replacement for V1. The provider must preserve complete YAML frontmatter and every unrelated Markdown line, changing or deleting text only when the explicit instruction requires it. It must not rename, move, retarget, create, archive, or delete files. Partial insert/replace and richer diff editing belong to V1.1/V1.2 and should extend the same proposal/review/update service boundary instead of creating a second write path.

Review diffs stay compact for ordinary Markdown changes. When a change touches standard YAML frontmatter, the full frontmatter block is shown so metadata changes are reviewable; a body-only change never shows an isolated trailing YAML property as misleading context. This presentation rule belongs to the shared diff engine, so tag suggestions, provider updates, manual editor proposals, and later YAML editing use the same behavior.

Read-context actions are a separate lightweight chat path, not direct provider file access. Selected-folder listing requests are handled first by a request-scoped preflight: when the current selection is a folder with `R` active, the renderer calls the preload vault API and appends the folder listing as a vincarios message before provider generation. Supported `list_folder` model-action envelopes remain a fallback: the renderer parses them, verifies that the requested folder is inside the active selected folder or selected-file parent folder, calls the preload vault API, and appends the folder listing as a vincarios message. Unsupported or out-of-selection read actions are blocked instead of being executed or shown as raw tool-call text.

## V1 Actions

Keep the first action set small and schema-driven so new actions can be added later without rewriting chat, review UI, or vault services. Unknown action types become non-executable manual-review items instead of running.

Read/search actions:

- `list_folder`
- `read_note`
- `search_index`
- `find_similar`

Write actions:

- `create_note`
- `update_note`
- `insert_into_note`
- `move_note`
- `rename_note`
- `archive_note`

Suggestion actions:

- `suggest_links`
- `suggest_tags`
- `suggest_folder`
- `proposal_plan`

`delete_note` is not a normal V1 user action. Deleting first means `archive_note`: move into the configured archive/trash area. Permanent deletion is a separate explicit archive-emptying/trash-emptying workflow, not a casual AI action.


## Suggestion Workspace Boundary

Suggestions are not Review Basket actions. A suggestion is an analysis result that may later become one or more concrete reviewed actions.

Current V1 suggestion state is session-only renderer state. Suggestions intentionally disappear on app restart or reload. Persistent suggestion sessions are later work and must live under `.vincarios/`, not normal vault notes. A persisted suggestion must carry enough validation data such as creation time, source target, index/model version or file hashes, status, and stale-state checks before it can be shown again.

V1 direction:

```text
candidate/report -> suggestion item -> preview/diff -> selected conversion -> Review Basket proposal
```

Examples:

- a future link suggestion previews the Markdown-line change that would add a wikilink, then converts to an `update_note` proposal. This is V1.1+ unless the V1 necessity gate reclassifies it.
- a tag suggestion previews a YAML/property diff, then converts to an `update_note` proposal. Current V1 conversion foundation supports `metadata_candidate` only when it carries `currentContent` and `proposedContent`; the selected-file `Suggest tags` action can generate this shape through local heuristics.
- a future folder/destination suggestion previews a move plan, then later converts to a move/rename action once those services exist. This is V1.1+ because safe move/link-update services are not V1 scope.
- a duplicate/similar-note suggestion may remain report-only until the user chooses a concrete operation.

The Review Basket must receive only selected concrete actions. It must not receive every raw search result, cleanup finding, or embedding candidate.
Planned suggestion types and handling rules:

- `similar_note`: embedding-backed relation only. It shows ranked context and may stay report-only.
- `near_duplicate`: two notes are nearly identical with small differences. Show a comparison/diff first; possible later actions are keep one, merge missing lines, archive one, or ignore. Never delete automatically.
- `complementary_note`: notes share context but contain different useful information. Prefer merge/link/new consolidation-note previews over duplicate handling.
- `related_note`: notes share a topic or project but have different roles. Prefer link candidates, not merging.
- `version_conflict`: normalized names or imported variants indicate older/newer drafts such as `.md.md` or copied core files. First compare; then suggest skip, merge missing sections, or keep as variant.
- `name_conflict`: file names collide or normalize to an existing note. First compare target existence and content before proposing rename/import/skip.
- `destination_candidate`: a note appears to belong in another folder. V1.1+ work; reviewed move/link-update actions must exist before conversion is executable.
- `link_candidate`: two notes should likely link. V1.1+ work; preview the exact Markdown line diff before converting to an `update_note` proposal.
- `metadata_candidate`: tags/properties/status values are likely missing or inconsistent. Preview YAML/property diff before converting to an `update_note` proposal. V1 currently generates conservative tag candidates from selected-file path/title/frontmatter only. The local tag heuristic uses strong sources only: existing YAML tags for dedupe, vault-profile folder roles, project name from the configured projects role, exact standard file roles such as `References.md` or `Tasks.md`, selected structural folders such as `Wiki`, identifier-like filenames, and conservative title/proper-name extraction. Sentence-like chat filenames are ignored instead of filtered through broad stopword lists. AI/embedding-generated metadata candidates and structured metadata-index inputs are later refinement work.

Classification should be conservative. High similarity alone is not enough to merge; the UI should distinguish duplicates, complementary overlap, same-topic relation, and version/name conflicts before offering concrete Review Basket actions.

## Future Merge Workspace

Merging similar notes is later work, not part of the current V1 executable action set. When it is implemented, it should be a dedicated merge flow instead of an overloaded `update_note`.

Minimum flow:

1. User selects two source notes from a suggestion group such as `near_duplicate` or `complementary_note`.
2. vincarios shows a comparison diff between source A and source B, including overlaps, additions, and conflicts.
3. vincarios creates or requests a reviewed merged version as a third file candidate.
4. User reviews the final merged file, target folder, and file name before execution.
5. Execution creates the merged file and records an audit entry.
6. Archiving source A and source B is optional and must require explicit confirmation. Conservative mode keeps both sources in place.

Future action type shape:

- `merge_notes`
- `sourcePaths: [A, B]`
- `targetPath`
- `mergedContent`
- `archiveSources: true | false`
- `diffSummary`
- `conflicts`

The Review Basket should execute only the final concrete plan. Source files must never be deleted silently; if sources are moved after merge, they go to archive/backup through a reviewed archive/move service.

## Important Rule

The user should not need to know action names. The UI and model choose the correct action type from the user's intent.

## Write Rules

- New-file `create_note` actions need a Create Preview and explicit confirmation.
- Create and write flows support reviewed Metadata/YAML assist where useful. Save as Note, summaries, Markdown imports, and note/project presets receive deterministic metadata before entering the Review Basket. The existing Create Edit view exposes the resulting YAML as part of the editable Markdown content, so the user can change or remove it before execution.
- Metadata responsibility is split deliberately: a preset or create flow supplies declarative values such as `type`, `tags`, or a more specific `source`; `src/shared/metadata/generatedNoteMetadata.js` validates those values, adds app-owned origin fields, merges them into existing frontmatter, and serializes YAML consistently. Presets never implement their own YAML writer.
- Preset files also declare a stable internal semantic `role` such as `brainstorm`, `references`, `tasks`, or `log`. The filename may be translated or renamed without changing that role. `role` guides vincarios internally; visible YAML `type` and `tags` are preset-provided values. Future custom presets must declare these values instead of relying on filename inference.
- Existing frontmatter values are preserved. Default tags are merged without duplicates; other defaults are added only when the field is missing. This keeps imported Markdown intact while still recording its reviewed import origin.
- App-owned fields are `tags`, `type`, `status`, `source`, `created_at`, and `origin_action`. vincarios does not emit `created_by`. Current origins are Save as Note, file summary, folder summary, Markdown import, preset creation, and the reserved future AI-draft origin.
- LLM-generated extra metadata remains optional and must enter the same visible review boundary. Providers do not write or silently enrich metadata.
- Any existing-file write needs diff. `update_note` is the only implemented existing-file write in Phase 3: it requires current/proposed content, explicit Apply Update confirmation, backup, stale-content validation, and audit logging. Other existing-file write types remain non-executable until their services exist.
- Archive/trash actions need explicit confirmation. Permanent deletion is not a normal V1 assistant action.
- Any risky action creates a backup first. `update_note` already calls the backup service before writing; future insert/move/rename/archive services must do the same where applicable.
- Any executed action writes an audit entry.

## Non-Goal For V1

Do not build a broad autonomous batch executor. Build a controlled review basket.
