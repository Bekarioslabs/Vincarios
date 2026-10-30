# Security Policy

vincarios is a local-first Markdown vault assistant. Its security model is built around explicit user control over local files.

## Supported Versions

| Version | Supported |
|---|---|
| Current source / main branch | No ongoing maintenance |
| Historical versions or self-built applications | No |

Feature development has ended. This is an unmaintained source snapshot: no security updates, fixes, technical support or security-report handling are provided. Reports will not be processed or answered. No official executable is distributed with the source archive.

## Security Model

Electron is pinned to an exact version for reproducibility, not ongoing security. A fork or self-build needs its own dependency review: check advisories, review changes and the lockfile, test, then pin the chosen version. The maintainer's internal Windows build is unsigned and is not an official public download. Previously passing checks do not certify a later checkout, machine or dependency ecosystem.

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

Main enforces the filesystem transaction and trusted-window IPC boundaries. R/W context state and visible review are currently renderer-owned; they are not independently proven human approval in Main. The design does not claim protection from malicious code already executing in the trusted app frame.

See `docs/rebuild/VINCARIOS_V1_SAFETY_RULES.md` for the active safety design.

## Supply-Chain Controls

- `npm ci` installs only the committed lockfile and denies package install scripts by default.
- `npm run audit:security` evaluates the complete dependency tree and fails on every known vulnerability. There are no advisory exceptions.
- `npm run licenses:check` verifies the committed runtime license inventory and rejects missing or unreviewed license expressions.
- The bundled embedding model is pinned to one source revision and six SHA256 checksums. It is verified before first load and before packaging.
- CI pins official GitHub actions to commit SHAs and checks Windows packaging after the test job passes, without uploading the executable. No official binary assets are distributed. Fork maintainers must review their own workflows and downloads rather than assuming this policy applies to them.

## Unmaintained Source Guidance

Use a disposable vault or a backed-up copy when evaluating a self-build. The application parses Markdown/YAML and uses Electron and native inference dependencies; do not assume that archiving or building from source makes it safe for untrusted content. Final closure checks include dependency/license/model verification, a history secret scan and internal candidate tests. Their dated results must not be presented as continuous monitoring or a guarantee that no vulnerability exists.

## Security Reports And Independent Forks

This project does not accept, process or answer security reports. There is no monitored security inbox, report-review service, response deadline or patch program. The general Bekarios Labs contact is not a security-reporting channel.

Do not post private vault contents, local paths, credentials or unredacted logs on GitHub or send them to the creator. Retained historical issue templates are reference material for forks, not an active upstream intake process.

If you need a maintained version or a fix, maintain an independent fork or choose a maintained application. Fork maintainers must establish their own security contact, supported-version policy and reporting process; reports about a fork belong with that fork's maintainer.

## Out Of Scope

The following are not considered security vulnerabilities by themselves:

- model hallucinations without file access or write execution
- provider quality differences
- failures caused by manually editing files outside vincarios while an action is pending
- prototype behavior from archived, unsupported versions

## Privacy Expectations

Local providers such as LM Studio and Ollama are the V1 baseline. A provider endpoint classified as external must receive a separate explicit context-transfer approval; Main enforces that boundary before private vault context can leave the machine.
