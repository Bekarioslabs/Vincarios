# vincarios V1 Audit Triage

Source: external audit file `Audit 01.md` from June 25, 2026, compared against the current vincarios V1 rebuild state.

This document keeps only actionable decisions. It is not a full copy of the audit.

## Already Covered Or Largely Addressed

- Main/renderer separation: file access stays in main through IPC.
- Review-first writes: create/update notes go through Review Basket, previews, backups, and audit logs.
- Path safety foundation: unsafe paths, protected dot folders, non-Markdown writes, and stale updates are tested.
- Markdown preview and chat rendering: shared sanitized Markdown renderer is in place.
- Internal Markdown navigation: links, wikilinks, preview history, and Reveal in Files are implemented.
- Folder context safety: selected-folder listing now uses app-side read-context preflight; recursive folder listing reads names only, not note contents.
- Documentation discipline: active rebuild docs and AGENTS.md exist and should remain the source of truth.

## V1 Release Hardening

These are important before calling V1 broadly shareable.

- Add a renderer Content Security Policy in the Electron window setup.
- Add max-size guards for create/update note content and provider/context payloads.
- Add GitHub Actions CI for JavaScript checks and the Node test suite.
- Add basic contributor/release docs: `CONTRIBUTING.md`, `CHANGELOG.md`, and `SECURITY.md`.
- Add a lightweight settings foundation for provider URL/model, request limits, context limits, and future theme settings.
- Add Ollama as the second required local provider after LM Studio.
- Add a small IPC helper/wrapper only if repeated IPC validation/error handling starts duplicating logic.
- Run an accessibility pass for custom controls, keyboard operation, contrast, and ARIA labels.

## V1 Feature Candidates

These fit V1 if they can be implemented without destabilizing the action model.

- Minimal template/preset support for new notes and new projects.
- Basic image handling foundation: image display/import/move/rename through safe IPC, with vision analysis gated by model capability.
- Local embeddings V1-light for similar-note discovery plus conservative local tag/YAML candidates. Link and folder/destination candidates are V1.1 unless the freeze review reclassifies them.
- PendingActionState plus FolderContextController for robust folder-scope decisions before larger folder cleanup/scan workflows.

## V1.1 / V1.2 Backlog

Useful, but not required for the first stable V1 unless they become blockers.

- Search within vault.
- Audit log / backup history UI with restore-oriented controls.
- End-to-end tests with Electron/Playwright for core user flows.
- Async or worker-based deep folder crawling for very large vaults.
- Backup retention policy and optional cleanup UI.
- Batch AI actions over multiple notes with grouped diffs.
- Plugin-style extension points for community contributions.
- More complete settings UI, including hotkeys and theme presets.

## Parking Lot

Interesting, but outside V1 and likely outside the core vincarios identity for now.

- Voice input.
- Peer-to-peer sync.
- External HTTP/CLI automation API.
- Encrypted backup vaults with user-managed passphrases.
- Full plugin marketplace or broad agent-harness behavior.

## Notes For Future Audits

- Do not reintroduce prototype features just because they existed. Each feature must fit the V1 identity: Markdown vault organization, local-first safety, reviewable actions.
- Prototype features worth porting should be rebuilt through the new module boundaries, not copied as legacy flow.
- If an audit suggests a large architectural helper, first check whether duplication exists. Do not add abstractions preemptively.