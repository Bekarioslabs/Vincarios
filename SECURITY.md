# Security Policy

vincarios is a local-first Markdown vault assistant. Its security model is built around explicit user control over local files.

## Supported Versions

| Version | Supported |
|---|---|
| V1 rebuild / main branch | Yes |
| Archived prototype | No |

## Security Model

Electron is pinned to an exact version for release reproducibility. Dependency updates should be deliberate: update, review advisories, run tests, review the lockfile diff, then pin the new version. Release builds should come from a clean checkout, use the lockfile, and publish SHA256 checksums. Until code signing exists, beta builds must be described as unsigned.

vincarios follows these non-negotiable rules:

- Providers never read or write vault files directly.
- Renderer code never gets direct filesystem access.
- Main-process services validate every vault path.
- Vault paths must stay inside the selected vault.
- Dot folders such as `.obsidian`, `.vincarios`, and `.vincarios_backups` are blocked from normal AI access.
- Existing-file writes require visible review, backup, and audit logging.
- Write permission allows reviewed proposals, not silent execution.
- V1 has no Trusted/Yolo mode.
- Oversized provider and write payloads are rejected before provider calls or file writes happen.

See `docs/rebuild/VINCARIOS_V1_SAFETY_RULES.md` for the active safety design.

## Supply-Chain Controls

- `npm ci` installs only the committed lockfile and denies package install scripts by default.
- `npm run audit:security` requires a clean runtime audit and permits only the documented Electron Builder build-time advisory `GHSA-mh99-v99m-4gvg`. Any other advisory fails.
- `npm run licenses:check` verifies the committed runtime license inventory and rejects missing or unreviewed license expressions.
- The bundled embedding model is pinned to one source revision and six SHA256 checksums. It is verified before first load and before packaging.
- CI pins official GitHub actions to commit SHAs and builds a Windows portable smoke artifact after the test job passes.

The remaining brace-expansion advisory is confined to the development packaging toolchain and is not part of the application runtime. It stays visible and release-blocking if its advisory identity or dependency path changes; it must be removed when a compatible upstream Electron Builder chain becomes available.

## Beta Trust Guidance

vincarios is local-first and intentionally uses a small dependency surface, but beta builds should still be treated as software from a small/new project. Cautious testers should use a test vault first or build from source. Public release preparation must include dependency audit, secret scan, clean-install check, and release checksums.

## Reporting A Vulnerability

Please report security issues privately instead of opening a public issue.

Use GitHub Security Advisories if available for this repository, or contact Bekarios Labs through the project owner account.

A useful report includes:

- affected version or commit
- operating system
- exact steps to reproduce
- expected result
- actual result
- whether private vault data could be exposed, modified, or deleted

## Out Of Scope

The following are not considered security vulnerabilities by themselves:

- model hallucinations without file access or write execution
- provider quality differences
- failures caused by manually editing files outside vincarios while an action is pending
- prototype behavior from archived, unsupported versions

## Privacy Expectations

Local providers such as LM Studio and Ollama are the V1 baseline. A provider endpoint classified as external must receive a separate explicit context-transfer approval; Main enforces that boundary before private vault context can leave the machine.
