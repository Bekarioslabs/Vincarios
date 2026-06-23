# ZEUS V1 Final Briefing

## Product Sentence

ZEUS is a local Obsidian-vault assistant that helps users safely analyze, organize, connect, and update Markdown notes through visible, reviewable, reversible actions.

## Product Boundary

ZEUS V1 is:

- local-first
- Markdown-first
- Obsidian-vault oriented
- review-first
- safety-first

ZEUS V1 is not:

- a second Obsidian
- a general-purpose agent harness
- a cloud AI client
- a media manager
- a plugin ecosystem

## V1 Core Features

1. Vault open and vault profile.
2. Local providers: LM Studio and Ollama.
3. File tree and Markdown preview.
4. Context control with visible context bar.
5. Read/Write permissions with direct, inherited, and blocked/off states.
6. Review Basket for grouped, selectable proposals.
7. Diff and safe Markdown actions.
8. Inbox/project/knowledge cleanup suggestions.
9. Local embeddings V1-light.
10. New Project workflow from templates.

## Not V1

- Vision/images.
- PDF/audio/video.
- Cloud providers.
- Plugin system.
- Trusted/Yolo mode.
- Theme system.
- Large autonomous cleanup.
- Complex link repair after mass rename.
- Monetization.
- External web research.
- Mobile.
- Multi-window.
- Bundled chat LLMs.
- Specialized project dashboards.

## UI Layout

```text
Left navigation | Main workspace | Vault panel
```

Main workspace order:

```text
Chat history
Review Basket
Context bar
Input field
```

Vault panel keeps file tree and preview visible at the same time.

Markdown preview renders sanitized HTML and displays YAML frontmatter as a visible Properties block.

Markdown links should later open notes in preview without automatically expanding the file tree. Use an explicit `Reveal in Files` control and preview back/forward history.

Resizable panes need minimum sizes.

## Review Basket

The Review Basket is a standalone module, not part of chat rendering.

Proposal statuses:

- open
- selected
- running
- done
- failed
- rejected
- stale

The basket is not blindly cleared after execution. It updates proposal statuses and focuses the active view on open, failed, and stale items.

V1 uses automatic safe execution ordering. Manual drag-and-drop ordering is future work.

## Permissions

- Read means ZEUS may use the path as context.
- Write means ZEUS may propose write actions.
- Write never means silent execution.
- Three states: direct, inherited, blocked/off.
- Dot/runtime folders are blocked regardless of UI state.
- Permission shortcuts: Click affects one path, Ctrl+Click affects visible/expanded descendants, Shift+Click recursively affects all descendants through folder listing only.

## Context

Auto-context is enabled by default.

Selected Markdown files can be included automatically if Read is active and limits allow it.

Selected folders are not blindly fully loaded.

Dropped `.md` files become temporary context immediately. They are not automatically imported into the vault. External dropped Markdown files get an `Import to Inbox` action.

## Actions

Read/search:

- `list_folder`
- `read_note`
- `search_index`
- `find_similar`

Write:

- `create_note`
- `update_note`
- `insert_into_note`
- `move_note`
- `rename_note`
- `archive_note`

Suggestions:

- `suggest_links`
- `suggest_tags`
- `suggest_folder`
- `proposal_plan`

`delete_note` is not a normal V1 action. V1 archives first. Permanent deletion is a separate trash-emptying workflow.

## Embeddings V1-Light

Embeddings are local search support, not automation authority.

They provide:

- similar notes
- link candidates
- tag candidates
- folder candidates

Indexing is automatic by default, can be disabled in Options, and can be rebuilt manually.

## New Project

Project creation is deterministic app logic, not LLM improvisation.

Default structure:

```text
02_Projekte/Project_Name/
  Project_Name.md
  Instructions.md
  References.md
  Brainstorm.md
  Tasks.md
  Decisions.md
  Log.md
  Knowledge/
```

The default ships with V1 but must be implemented as a template/preset.

## Options

V1 Options:

- Vault Profile
- Providers
- Limits
- Embeddings
- Safety
- Templates

Not V1 Options:

- themes
- plugins
- cloud providers
- trusted/yolo mode
- monetization
- complex shortcut editor

## Architecture Rules

- Providers never read/write files.
- Renderer never gets direct filesystem power.
- Main validates paths and enforces safety.
- Prompt rules live in a prompt module, not in UI rendering.
- Review state is separate from chat.
- Permissions and context are separate modules.
- The bootstrap entry initializes modules only.

## Brain OS Direction

V1 may include a new slim Brain OS, but only after code-side safety laws and app boundaries are defined.

Priority:

```text
Code Safety Laws
> App Configuration / Vault Profile
> Brain Core Rules
> Behavior Preferences
> Project Rules
> Current Chat Request
```

Brain files may explain and configure behavior. They must not override code safety.

## Test And Audit Rule

Tests start on day one.

Focused audits happen after each major block:

- scaffold
- vault safety
- action/review
- permissions/context
- providers
- embeddings
- first cleanup workflow
- V1 freeze

## Rebuild Rule

The prototype is reference material, not the new foundation.

Do not copy old large orchestration files forward.

Use the same lessons, not the same structure.
