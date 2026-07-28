# Vincarios V1 Manual Smoke Test

Use this checklist for a release candidate or after a cross-cutting change. It covers the complete visible V1 surface without using private vault notes.

## Test Record

| Field | Value |
|---|---|
| Date | |
| Tester | |
| Commit / build | |
| Launch mode | Source / Portable |
| Provider | LM Studio / Ollama / Offline |
| Model | |
| Result | PASS / FAIL / BLOCKED |

## Test Data

- Vault: `dev-vault`
- Fixtures: `dev-vault/00_Inbox/V1 Full Smoke`
- External import: `portable-smoke/V1 External Import Fixture.md`
- Portable candidate: `portable-smoke/vincarios-0.1.0-beta.1-portable.exe`

Only use the fixture folder for write, rename, context, and metadata tests. Existing vault notes are not test targets.

## Run Order

1. [App, Vault, UI, and Files](v1-smoke/01_APP_VAULT_UI.md)
2. [Markdown Preview and Editor](v1-smoke/02_MARKDOWN_EDITOR.md)
3. [Indexes, Search, Suggestions, and Home](v1-smoke/03_INDEXES_SEARCH.md)
4. [Actions, Context, Chat, and Providers](v1-smoke/04_ACTIONS_PROVIDER.md)
5. [Review, Persistence, Safety, and Portable Build](v1-smoke/05_REVIEW_PORTABLE.md)

## Pass Rule

A module passes when every required checkbox is green or has a documented environmental reason for being blocked. A V1 candidate fails when it:

- writes without visible review;
- loses local edits or Review Basket state;
- crosses vault roots or exposes protected dot folders;
- sends context without R or external-endpoint consent;
- freezes, crashes, or leaves an action permanently pending;
- reports success when the requested operation did not happen.

Record the exact module, step, selected path, permission state, provider, and visible message for every failure. Do not attach private vault content or unredacted logs to a public issue.

## Final Verdict

| Module | Result | Notes |
|---|---|---|
| App / Vault / UI | | |
| Markdown / Editor | | |
| Indexes / Search | | |
| Actions / Provider | | |
| Review / Portable | | |

**Release-candidate verdict:** PASS / FAIL / BLOCKED
