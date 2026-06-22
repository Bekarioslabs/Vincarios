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

The AI should prefer proposal plans over direct one-off execution cards for multi-step work.

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

## V1 Actions

Keep the first action set small and schema-driven so new actions can be added later without rewriting chat, review UI, or vault services.

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

- Any existing-file write needs diff.
- Archive/trash actions need explicit confirmation. Permanent deletion is not a normal V1 assistant action.
- Any risky action creates a backup first.
- Any executed action writes an audit entry.

## Non-Goal For V1

Do not build a broad autonomous batch executor. Build a controlled review basket.
