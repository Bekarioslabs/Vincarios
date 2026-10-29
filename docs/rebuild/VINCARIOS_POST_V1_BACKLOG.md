# vincarios Historical Post-V1 Ideas

Feature development has ended; there are no planned upstream releases. These earlier ideas are retained as reference for independent forks, not an active backlog, promised features or a delivery schedule. Historical version headings below describe the former plan only. Any fork implementation needs its own design, owner, tests and review-flow checks.

## `0.1.x` - Public Beta Stabilisation

- Fix confirmed beta regressions, safety findings, data-loss risks, and documentation errors.
- Improve provider compatibility records and Windows release guidance.
- Do not add net-new workflows except where external testing proves a V1-critical gap.

## `0.2.x` - Core Workflow Expansion

- Properties/YAML editor for typed frontmatter fields through the shared Frontmatter Contract.
- Focused partial-edit engine with reviewed, section-level diffs.
- Reviewed rename/move/archive workflows with deterministic Markdown link-update planning, backups, stale checks, and audit.
- Vault Profile library with named profiles, custom roles, and explicit project destinations.
- Template/preset expansion, including future book-project workflow evaluation.
- Theme Editor and shareable JSON theme packages.
- Editor Light expansion: richer Markdown-safe formatting, tables, and optional live-preview improvements.
- Audit-log and backup-history UI with restore-oriented controls and retention policy.

## Later Product Areas

- Link and destination candidates with exact diffs before conversion into reviewed actions.
- Similar-note Merge Workspace with source comparison, a reviewed third output note, and optional source archival.
- Persistent Suggestion sessions with stale validation.
- Broken-link/orphan reports and project-maintenance workflows.
- Export actions for Markdown and HTML, designed for further formats.
- Obsidian plugin compatibility research and safe unsupported-block fallbacks.
- Optional Iconize and Style Settings import compatibility; never write `.obsidian` automatically.
- Markdown/media expansion: additional embeds, callouts, math, Mermaid, image ambiguity resolution, and capability-gated vision workflows.
- Multi-window/detached Preview or Editor workflows.

## Deliberately Later

- Natural-language mapping to existing registered actions; it must never bypass permission, review, backup, or audit boundaries.
- Chat sessions and conversation history with explicit privacy/storage rules.
- Plugin platform or general automation API.
- Voice input, peer-to-peer sync, and encrypted backups with user-managed keys.

## Selection Rule

A candidate moves into a release only when it improves local Markdown/vault organisation, has a visible and reviewable user flow, preserves local-first privacy, and fits a clear module boundary.
