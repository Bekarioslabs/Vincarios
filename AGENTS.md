# AGENTS.md - ZEUS Agent V1

## Product Boundary

ZEUS is a local-first assistant for Obsidian-style Markdown vault organization.

Do not turn ZEUS into a general-purpose agent harness.

## Development Priorities

1. safety and user control
2. reliable Markdown/vault workflows
3. clear review UX
4. maintainable architecture
5. local-first provider support

## Mandatory Context Before Large Changes

Read:

```text
docs/rebuild/ZEUS_V1_FINAL_BRIEFING.md
docs/rebuild/ZEUS_V1_PRODUCT_BRIEF.md
docs/rebuild/ZEUS_V1_ARCHITECTURE.md
docs/rebuild/ZEUS_V1_ACTION_MODEL.md
docs/rebuild/ZEUS_V1_SAFETY_RULES.md
docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md
```

Do not add features outside V1 without first updating the product brief and asking Beka.

## Code Rules

- Keep provider logic separate from vault safety.
- Keep prompt rules separate from UI rendering.
- Keep action schema shared and testable.
- Add tests with safety-sensitive behavior.
- Prefer small modules over large orchestration files.
- Do not recreate a large `renderer.js`-style catch-all file.

## Safety Laws

- Providers never read or write files.
- Renderer never gets direct filesystem access.
- Main validates every path.
- Writes need review.
- Existing-file writes need backup.
- Executed actions need audit logs.

## Documentation Rule

Docs should be short, active, and decision-oriented.

Archive historical material instead of letting active docs become a long diary.
