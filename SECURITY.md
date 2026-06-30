# Security Policy

ZEUS Agent is a local-first Markdown vault assistant. Its security model is built around explicit user control over local files.

## Supported Versions

| Version | Supported |
|---|---|
| V1 rebuild / main branch | Yes |
| Archived prototype | No |

## Security Model

Electron is pinned to an exact version for release reproducibility. Dependency updates should be deliberate: update, review advisories, run tests, then pin the new version.

ZEUS follows these non-negotiable rules:

- Providers never read or write vault files directly.
- Renderer code never gets direct filesystem access.
- Main-process services validate every vault path.
- Vault paths must stay inside the selected vault.
- Dot folders such as `.obsidian`, `.zeus`, and `.zeus_backups` are blocked from normal AI access.
- Existing-file writes require visible review, backup, and audit logging.
- Write permission allows reviewed proposals, not silent execution.
- V1 has no Trusted/Yolo mode.
- Oversized provider and write payloads are rejected before provider calls or file writes happen.

See `docs/rebuild/ZEUS_V1_SAFETY_RULES.md` for the active safety design.

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
- failures caused by manually editing files outside ZEUS while an action is pending
- prototype behavior from archived, unsupported versions

## Privacy Expectations

Local providers such as LM Studio and Ollama are the V1 baseline. Remote/cloud provider support is not V1. If remote providers are added later, private vault context must require a separate explicit approval flow.
