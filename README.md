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

Current implemented foundations include vault opening, file tree plus sanitized Markdown preview, local Source/Edit preview mode, visible YAML properties, explicit context target display, LM Studio status/chat basics, and file-tree Read/Write permission toggles.

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
