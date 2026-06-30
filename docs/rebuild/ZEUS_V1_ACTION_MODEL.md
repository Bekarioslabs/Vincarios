# ZEUS V1 Action Model

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

Current implemented slice: assistant `Save as Note` creates a selected `create_note` proposal. The Review Basket can select, dismiss any visible entry, clear pending suggestions, clear executed suggestions, show compact diff summaries, and open dedicated preview modals. Selected `create_note` proposals execute after an in-app Create Note preview with an editable title field. After a successful create, the app refreshes the Files tree through the file panel refresh path so the new note becomes visible without manual refresh. After a successful update, the app refreshes the currently loaded preview when it matches the updated target path. Selected `update_note` proposals are executable only when they carry `targetPath`, `currentContent`, and `proposedContent`; they are unselected by default, require an Apply Update diff preview, write through the preload vault API, create a backup in `.zeus/backups/YYYY-MM-DD/...`, reject stale content if the file changed since proposal creation, update the Markdown file, and append audit entries in `.zeus/audit.jsonl`. No-change update proposals remain visible for diagnosis but are marked non-executable. Failed review executions display the returned vault error on the basket item so stale content, no-change, and frontmatter/update issues are visible without guessing.

Phase 3 is complete at this core foundation boundary. `insert_into_note`, `move_note`, `rename_note`, and `archive_note` remain known schema types so model output can be classified safely, but they are deliberately non-executable until their own reviewed services exist. This prevents accidental execution while keeping the future action vocabulary stable.
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

Read-context actions are a separate lightweight chat path, not direct provider file access. Selected-folder listing requests are handled first by a request-scoped preflight: when the current selection is a folder with `R` active, the renderer calls the preload vault API and appends the folder listing as a ZEUS message before provider generation. Supported `list_folder` model-action envelopes remain a fallback: the renderer parses them, verifies that the requested folder is inside the active selected folder or selected-file parent folder, calls the preload vault API, and appends the folder listing as a ZEUS message. Unsupported or out-of-selection read actions are blocked instead of being executed or shown as raw tool-call text.

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

## Important Rule

The user should not need to know action names. The UI and model choose the correct action type from the user's intent.

## Write Rules

- New-file `create_note` actions need a Create Preview and explicit confirmation.
- Any existing-file write needs diff. `update_note` is the only implemented existing-file write in Phase 3: it requires current/proposed content, explicit Apply Update confirmation, backup, stale-content validation, and audit logging. Other existing-file write types remain non-executable until their services exist.
- Archive/trash actions need explicit confirmation. Permanent deletion is not a normal V1 assistant action.
- Any risky action creates a backup first. `update_note` already calls the backup service before writing; future insert/move/rename/archive services must do the same where applicable.
- Any executed action writes an audit entry.

## Non-Goal For V1

Do not build a broad autonomous batch executor. Build a controlled review basket.
