# ZEUS V1 Safety Rules

## Non-Negotiable Laws

1. Providers never read or write vault files directly.
2. Renderer never gets direct filesystem power.
3. Main process validates every vault path.
4. Paths must stay inside the selected vault.
5. Dot folders are blocked from normal AI access.
6. Write actions require visible review.
7. Existing-file changes require backup.
8. Executed actions require audit log entries.
9. Remote providers receive no private vault context by default.
10. Prompt instructions can guide the model, but code enforces safety.

## Permission Model

- Read permission allows context access.
- Write permission allows proposals to be considered.
- Write permission does not mean silent execution.
- V1 has no Trusted/Yolo mode.

## Backup Model

Backup before:

- update
- insert into existing note
- move
- rename
- delete

No backup needed for:

- creating a new file that does not yet exist
- manual ZEUS configuration writes under `.zeus/`, such as Folder Visual Identity settings, because they do not change Markdown content or Obsidian configuration

Manual ZEUS configuration writes are intentional low-risk app settings writes. They do not use the Review Basket, content diff, or note-backup pipeline. Future config history may record them separately from vault-content audit entries.

## Audit Log

Audit log stores metadata, not full note content.

Minimum fields:

- timestamp
- action type
- source path
- target path
- result
- provider/model if relevant
- backup path if created

## Diff Rule

If a write changes an existing Markdown file, show the user what changes before applying.

Large or suspicious diffs must be blocked or escalated to a stronger review mode.

## Cloud Rule

Cloud support is not V1. When added later, it must have separate context approval and sensitive-data warnings.

## Code Rules Vs Brain Rules

Code-side safety laws are the highest authority.

Brain/Core Markdown may explain, reinforce, and configure behavior, but it must not override code-side safety rules.

Priority order:

```text
Code Safety Laws
> App Configuration / Vault Profile
> Brain Core Rules
> Behavior Preferences
> Project Rules
> Current Chat Request
```

Rebuild sequence:

1. Define code-side safety laws and action boundaries first.
2. Define Brain/Core files only after the app laws are clear.
3. Keep Brain/Core concise and non-duplicative.
4. If a Brain rule conflicts with code behavior, fix the Brain rule instead of weakening code safety.


## Payload Size Guards

Main-process services enforce hard payload limits before provider calls or vault writes happen.

V1 defaults:

- create note content: 200000 characters
- update note proposed content: 300000 characters
- provider message payload: 120000 aggregate message characters

These limits live in `src/shared/security/payloadLimits.js` and can be adjusted through Settings limits. Oversized create/update requests fail before writing, backing up, or auditing. Oversized provider requests fail before contacting LM Studio, Ollama, or future providers.

## Renderer Content Security Policy

The renderer declares a static Content Security Policy in `index.html`.

V1 policy goals:

- local scripts only via `script-src 'self'`
- local styles only via `style-src 'self'`
- no `unsafe-inline`
- no `unsafe-eval`
- no renderer network fetches by default via `connect-src 'none'`
- local/data/file images are allowed for UI and vault previews
- object/embed/form targets are blocked

Provider calls stay in the main process through IPC, not in renderer fetches. If a future renderer feature needs network access, update this policy deliberately and add a focused test.
