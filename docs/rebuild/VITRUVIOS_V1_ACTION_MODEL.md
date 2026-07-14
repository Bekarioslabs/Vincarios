# Vitruvios V1 Action Model

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

## Review Module

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

Current implemented slice: assistant `Save as Note` creates a selected `create_note` proposal, and external Markdown drops can create reviewed `create_note` import proposals through `Import to Inbox`. The Review Basket can select, dismiss any visible entry, clear pending suggestions, clear executed suggestions, show compact diff summaries, and open dedicated preview modals. Selected `create_note` proposals execute after an in-app Create Note preview with an editable title field. After a successful create, the app refreshes the Files tree through the file panel refresh path so the new note becomes visible without manual refresh. After a successful update, the app refreshes the currently loaded preview when it matches the updated target path. Selected `update_note` proposals are executable only when they carry `targetPath`, `currentContent`, and `proposedContent`; they are unselected by default, require an Apply Update diff preview, write through the preload vault API, create a backup in `.vitruvios/backups/YYYY-MM-DD/...`, reject stale content if the file changed since proposal creation, update the Markdown file, and append audit entries in `.vitruvios/audit.jsonl`. No-change update proposals remain visible for diagnosis but are marked non-executable. Failed review executions display the returned vault error on the basket item so stale content, no-change, and frontmatter/update issues are visible without guessing.

Phase 3 is complete at this core foundation boundary. `insert_into_note`, `move_note`, `rename_note`, and `archive_note` remain known schema types so model output can be classified safely, but they are deliberately non-executable until their own reviewed services exist. Manual F2 Rename Light is separate from AI `rename_note`: it is same-folder only, app-initiated from the File Tree, audited, and explicitly does not update links in V1. This prevents accidental AI execution while keeping the future action vocabulary stable.

## Cleanup Reports

V1 cleanup must not flood the Review Basket with every discovered suggestion. The flow is:

```text
scan/index candidates -> grouped cleanup report -> user opens a group -> concrete previews -> selected actions enter Review Basket -> reviewed execution
```

Report groups may include possible duplicates, tag/property suggestions, link candidates, folder candidates, or new-note/MOC candidates. Opening a group must show the appropriate preview type: property diff, Markdown-line diff, move plan, duplicate comparison, or create-note preview. The Review Basket remains the execution layer and should receive only selected concrete actions, not the whole analysis result.

## Selection Action Update Proposals

V1 supports update proposals through the selected Markdown file action `Propose content update`. The action is visually muted but still clickable when R/W or loaded content are missing, so the app can explain the missing permission without calling the provider. The app supplies the selected `targetPath` and `currentContent`; the provider returns a structured proposal with full `proposedContent`. The proposal is added to the Review Basket as `update_note` with `updateMode: whole_note` and is never written directly from chat or by the provider. Proposal failures are reported by stage (`provider`, `parser`, `review_basket`, or `provider_exception`) with target path, content length, sent context length, instruction length, and truncation status so model, parser, and review failures can be diagnosed before fixing.

Manual source edits from the Markdown preview use the same reviewed update path. The editor keeps the originally loaded source as `currentContent`, uses the local edited source as `proposedContent`, and adds an `update_note` proposal to the Review Basket. The preview editor never writes directly to the vault.

If `R` or `W` is missing, the app blocks proposal generation before any provider call and presents an app-level permission message. Permission-blocked Selection Actions are soft-disabled: visually muted, still clickable, and routed to the same retryable guidance path. Selection Action permission wording is centralized so later write actions such as rename/move can reuse the same R/W guidance. The model must not generate generic filesystem-access explanations for these cases.

Required gates before proposal generation:

- selected target is a Markdown file
- selected content is loaded in the preview/context state
- `R` is enabled for context use
- `W` is enabled for proposing a reviewed write
- user provides an explicit update instruction through the `Propose update` action

This is intentionally whole-note content replacement for V1. It must not rename, move, retarget, create, archive, or delete files. Partial insert/replace and richer diff editing belong to V1.1/V1.2 and should extend the same proposal/review/update service boundary instead of creating a second write path.

Read-context actions are a separate lightweight chat path, not direct provider file access. Selected-folder listing requests are handled first by a request-scoped preflight: when the current selection is a folder with `R` active, the renderer calls the preload vault API and appends the folder listing as a Vitruvios message before provider generation. Supported `list_folder` model-action envelopes remain a fallback: the renderer parses them, verifies that the requested folder is inside the active selected folder or selected-file parent folder, calls the preload vault API, and appends the folder listing as a Vitruvios message. Unsupported or out-of-selection read actions are blocked instead of being executed or shown as raw tool-call text.

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

Current V1 suggestion state is session-only renderer state. Suggestions intentionally disappear on app restart or reload. Persistent suggestion sessions are later work and must live under `.vitruvios/`, not normal vault notes. A persisted suggestion must carry enough validation data such as creation time, source target, index/model version or file hashes, status, and stale-state checks before it can be shown again.

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
2. Vitruvios shows a comparison diff between source A and source B, including overlaps, additions, and conflicts.
3. Vitruvios creates or requests a reviewed merged version as a third file candidate.
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
- Preset files also declare a stable internal semantic `role` such as `brainstorm`, `references`, `tasks`, or `log`. The filename may be translated or renamed without changing that role. `role` guides Vitruvios internally; visible YAML `type` and `tags` are preset-provided values. Future custom presets must declare these values instead of relying on filename inference.
- Existing frontmatter values are preserved. Default tags are merged without duplicates; other defaults are added only when the field is missing. This keeps imported Markdown intact while still recording its reviewed import origin.
- App-owned fields are `tags`, `type`, `status`, `source`, `created_at`, and `origin_action`. Vitruvios does not emit `created_by`. Current origins are Save as Note, file summary, folder summary, Markdown import, preset creation, and the reserved future AI-draft origin.
- LLM-generated extra metadata remains optional and must enter the same visible review boundary. Providers do not write or silently enrich metadata.
- Any existing-file write needs diff. `update_note` is the only implemented existing-file write in Phase 3: it requires current/proposed content, explicit Apply Update confirmation, backup, stale-content validation, and audit logging. Other existing-file write types remain non-executable until their services exist.
- Archive/trash actions need explicit confirmation. Permanent deletion is not a normal V1 assistant action.
- Any risky action creates a backup first. `update_note` already calls the backup service before writing; future insert/move/rename/archive services must do the same where applicable.
- Any executed action writes an audit entry.

## Non-Goal For V1

Do not build a broad autonomous batch executor. Build a controlled review basket.
