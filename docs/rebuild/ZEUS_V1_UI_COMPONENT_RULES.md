# ZEUS V1 UI Component Rules

This file is the active reference for repeated UI elements in ZEUS V1. Use it before adding or changing buttons, modals, badges, score indicators, action rows, status feedback, or icon-only controls.

## Source Of Truth

- Shared visual values live in `src/renderer/styles/tokens.css`.
- Component styles live in the owning stylesheet, for example `layout.css`, `files.css`, `markdown.css`, `review.css`, `settings.css`, `suggestions.css`, or `activity.css`.
- Do not add inline CSS to `index.html` or component markup.
- Do not create one-off colors when an existing token or semantic component style already exists.

## Icon-First Familiarity

- ZEUS users are expected to come from Obsidian. Mature UI surfaces should feel familiar: compact icon-first controls, hover tooltips, accessible labels, and context menus where appropriate.
- Text labels are useful during early scaffolding or for primary/rare actions, but dense repeated actions should move toward icon-only or icon+tooltip patterns once the interaction is clear.
- Icon-only must never mean inaccessible: every icon control needs a semantic name, `aria-label`, keyboard access, and a visible hover/focus explanation.
- Do not hide safety-critical state. Permissions, pending writes, failed actions, and active context must remain discoverable even when labels collapse.

## Buttons

- Primary buttons are for explicit user commands.
- Compact rows should prefer icon-only controls for utility actions such as copy, remove, dismiss, reveal, or retry.
- Icon-only controls must use semantic icon mappings from `src/renderer/icons/iconRegistry.js` and rendering helpers from `src/renderer/icons/iconRenderer.js`.
- Replacing an icon should usually mean changing the semantic mapping, not every call site.
- Disabled controls stay neutral/gray. They must not show category accent colors while inactive.
- Destructive cleanup controls use subtle danger styling only when available or hovered.

## Selection Actions

- Selection Actions are deterministic app controls, not prompt examples.
- Action category colors belong to the action registry and only become visually prominent when the action is available or meaningful.
- Missing-permission actions stay visible, muted, and clickable for guidance.
- Inactive action rows must not use dashed decorative accents or glow effects.
- Inline option forms open directly below the owning action row.

## Suggestions

- Similar-note suggestions use compact score rings for numeric similarity.
- Do not render similarity scores as oval pills.
- Metadata and tag candidates use type badges such as `TAG`; they must not show fake `0%` score rings.
- Report-only suggestions and actionable suggestions must remain visually distinguishable. Group headers may use standard three-state checkboxes to select visible items only; batch clearing means dismissing suggestions from the session, not deleting vault files. Header labels should stay compact: category prefix/icon plus target basename, with the full path in hover/title when needed.
- Dismiss controls use the shared compact icon button pattern, not plain text links in dense rows.

## Modals And Forms

- Settings-like modals use a stable two-pane layout with category navigation on the left and the active panel on the right.
- Modal size should stay stable; the body scrolls when content is long.
- Review and diff modals are for review/confirmation flows, not general status messages.
- Input fields should stay near the action they configure.
- Main flows should avoid browser prompts. Use app forms, Review Basket items, or action panels instead.
- Field labels and icon-only actions need accessible labels.

## Status And Feedback

- Global status belongs to the app status area.
- Preview-local status belongs to `#markdown-preview-status`. It may appear as a preview segment in the bottom bar, but it must not be mixed into the global status stream.
- Per-session activity belongs to the Session Log.
- File update flash belongs to `src/renderer/feedback/updateFlashState.js`.
- Do not add scattered one-off flash state or direct row effects in unrelated modules.

## Color And Score Rules

- Use shared tokens for neutral text, borders, surfaces, and semantic states.
- Similarity score tones must use the shared score palette:
  - strong: green
  - medium: bright amber/yellow
  - weak: orange
  - noisy/low: red
- Action category colors may have their own stable palette, but they must not fight disabled, warning, or score colors.

## Collapse Controls

- Collapsible areas need a visible toggle, a keyboard path, and accessible expanded/collapsed state.
- Collapsed panels must keep important active state discoverable, for example counts for Context Basket items or active Suggestions.
- Collapse state is layout preference unless it describes vault content. Layout preferences belong to app settings, not vault metadata.
- Focus Mode may coordinate multiple collapses, but each owned module still controls its own rendering details.
## Accessibility

- Icon-only buttons need `aria-label` and a useful `title` when hover help matters.
- Expandable sections expose expanded state.
- Dialogs and dynamic status areas expose meaningful roles or labels where applicable.
- Disabled-looking but clickable guidance controls must still be keyboard reachable if they perform an explanatory action.

## Review Checklist

Before finishing a UI component change, check:

- Is there a clear owning module and stylesheet?
- Can an existing component class be reused instead of creating a new variant?
- Are colors token-based?
- Does the disabled state stay neutral?
- Is the icon semantic?
- Are status and flash feedback centralized?
- Does the change need a doc or test update?