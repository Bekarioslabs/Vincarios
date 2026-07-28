# vincarios V1 Product Brief

## One-Sentence Product

vincarios is a local-first Markdown and project workspace that helps users safely analyze, organize, connect, and update notes through visible, reviewable, reversible actions. Obsidian-style vault compatibility is a supported workflow, not the product's entire identity.

## Phase 8 Positioning Gate

The Phase 8 positioning decision is complete: the public name is styled as lowercase `vincarios`. External communication leads with an independent local-first Markdown/project workspace and presents Obsidian-style vault compatibility as a supported workflow with explicit limits.
## Product Truth

- vincarios is note-first, not agent-first.
- vincarios complements Obsidian instead of replacing it.
- vincarios works primarily with Markdown files.
- vincarios should make vault organization easier, not become a general automation harness.
- AI suggests; the app validates, previews, backs up, logs, and executes.

## V1 User Promise

vincarios helps users clean up and maintain their vault without hidden file access, cloud dependency, or blind autonomous edits.

## V1 Core Features

1. Open a vault and configure a vault profile.
2. Use local chat providers: LM Studio and Ollama.
3. Browse Markdown notes locally through the File Tree, Preview, and deterministic Search without granting AI context permission.
4. Collect AI suggestions in a review module instead of one-action-at-a-time chat cards.
5. Preview every write with a diff before applying.
6. Create Markdown notes and update existing Markdown notes through reviewed whole-note proposals.
7. Create new notes and projects through deterministic template/preset logic.
8. Provide inbox cleanup reports and grouped suggestions before adding selected concrete actions to the Review Basket.
9. Use local embeddings V1-light with a bundled multilingual-capable model for similar-note discovery, plus deterministic Vault Search over paths, titles, structured metadata, and explicitly enabled full-text data.
10. Keep AI/context access explicit: Read permission controls provider-bound context, while local navigation and Search stay local.
11. Keep backups and audit logs for risky actions.

## V1 Manual File Operations

Manual UI actions are separate from AI actions.

- F2 rename for a single selected file may be V1 if it stays small, visible, and reviewed enough for a manual user action.
- Drag-and-drop move, batch internal linking, and link-update planning are V1.1. They need explicit occurrence/destination selection, visible diffs, and deterministic Markdown-aware exclusions before they can be safe workflows.
- AI-driven rename/move/archive belongs to V1.1 because its real value is link-safety: rename and update links, move and update links, archive with backlink warnings, undo/repair, and batch review.

## Not V1

- Vision and image analysis workflows.
- PDF/audio/video handling.
- Full plugin system.
- Trusted/Yolo mode.
- Cloud providers by default.
- Theme builder or Obsidian theme compatibility.
- Large autonomous vault cleanup.
- AI-driven move/rename/archive with automatic link repair.
- Complex automatic link repair after mass rename.
- Manual drag-and-drop move, batch internal-link insertion, and link-update planning.
- Monetization/Patreon features.
- Complex external web research.
- Mobile version.
- Multi-window.
- Bundled chat LLMs.
- Specialized project dashboards.

## Success Criteria

- A non-technical Obsidian user can open a vault, let vincarios inspect allowed notes, review suggestions, and apply selected changes with confidence.
- No risky write happens without preview, backup, and audit log.
- The codebase is small enough that a new developer can understand the main flow in one session.
