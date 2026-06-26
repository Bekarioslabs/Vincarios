# ZEUS Agent

ZEUS Agent is a local, review-first assistant for Obsidian-style Markdown vaults.

It helps users analyze, organize, connect, and update notes through visible, reviewable, reversible actions.

## Status

This repository is a clean V1 rebuild.

The previous prototype is archived outside this working tree and is used only as reference material.

## V1 Focus

- Local-first Markdown vault workflows.
- LM Studio and Ollama as local providers.
- Explicit context and permission control.
- Review Basket for grouped AI suggestions.
- Diff, backup, and audit log before risky changes.
- Local embeddings V1-light for suggestions, not autonomous decisions.

Current implemented foundations include vault opening, file tree plus sanitized Markdown preview with internal link navigation and Reveal in Files, local Source/Edit preview mode, visible YAML properties, Markdown-rendered assistant chat responses, explicit context target display with request-scoped Auto-context toggle, selected-folder read-context preflight with pending scope choices, visible context source labels, central selected-file and folder-listing limits, LM Studio status/chat basics, file-tree Read/Write permission toggles, Review Basket state foundation, shared action schema, proposal-plan parsing, compact diff-preview summaries, a diff review modal, Save as Note proposals from assistant responses, reviewed `create_note` execution with editable-title preview, reviewed `update_note` execution with Apply Update diff preview, backup, stale-content check, audit logging, Basket Dismiss/Clear pending controls, and file-tree refresh that preserves expanded folders.

Permission shortcuts:

- Click `R` or `W`: toggle only the selected file or folder.
- Ctrl+Click `R` or `W`: apply to currently visible/expanded descendants only.
- Shift+Click `R` or `W`: recursively apply to all descendants by listing folder structure only. It does not read Markdown contents or change chat context.

## Planning Docs

Start here:

```text
docs/rebuild/ZEUS_V1_FINAL_BRIEFING.md
```

Detailed planning lives in:

```text
docs/rebuild/
```

## Development Rule

Do not copy the prototype architecture forward.

Use the prototype as reference for lessons learned, not as the new foundation.
