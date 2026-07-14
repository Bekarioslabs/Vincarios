# Vitruvios V1 UI Component Rules

This file is the active reference for repeated UI elements in Vitruvios V1. Use it before adding or changing buttons, modals, badges, score indicators, action rows, status feedback, or icon-only controls.

## Source Of Truth

- Shared visual values live in `src/renderer/styles/tokens.css`.
- Shared component primitives live in `src/renderer/styles/components.css`. Owning stylesheets such as `layout.css`, `files.css`, `markdown.css`, `review.css`, `settings.css`, `suggestions.css`, or `activity.css` own only local layout and state geometry.
- Do not add inline CSS to `index.html` or component markup.
- Do not create one-off colors when an existing token or semantic component style already exists.

## Visual System Direction

Vitruvios is a compact local work tool, not a card-heavy dashboard. Its visual character is quiet dark surfaces, precise spacing, restrained depth, and warm amber used only for meaningful active or primary states.

- App chrome and navigation use softly raised neutral surfaces. Chat and Markdown Preview remain the darker reading/focus surfaces.
- Prefer subtle surface contrast and restrained inset/shadow depth over decorative borders. Do not add gradients, glow decoration, or heavy neumorphism.
- Dividers are structural only: keep them for real region boundaries, not between adjacent utility buttons or as decoration.
- Dark and future light themes must change shared semantic tokens, never require a component-by-component recolor.
- Reference images and `docs/Design_index.html` guide hierarchy, compactness, and surface depth. They are not markup or layout templates to copy.

## Shared Scale And Variants

- Reusable visual differences must be introduced through tokens or documented component variants, never scattered literal values.
- Maintain small deliberate scales for spacing, radius, text, icon size, and control size. A new size/color/radius requires a clear reusable purpose and a token in `tokens.css`.
- Use semantic text roles such as `ui`, `muted`, `emphasis`, and `section`; use semantic size steps instead of arbitrary per-component point values.
- Use semantic surface roles such as app chrome, raised surface, focus surface, and field surface. Components consume these roles rather than inventing local grays.
- Component-local structural geometry is allowed only when it cannot be a shared scale value, for example a tree indentation or a grid track.
- One-off visual exceptions must be promoted to a reusable semantic variant before they are used in more than one place.

## Icon-First Familiarity

- Vitruvios users are expected to come from Obsidian. Mature UI surfaces should feel familiar: compact icon-first controls, hover tooltips, accessible labels, and context menus where appropriate.
- Text labels are useful during early scaffolding or for primary/rare actions, but dense repeated actions should move toward icon-only or icon+tooltip patterns once the interaction is clear.
- Icon-only must never mean inaccessible: every icon control needs a semantic name, `aria-label`, keyboard access, and a visible hover/focus explanation.
- Do not hide safety-critical state. Permissions, pending writes, failed actions, and active context must remain discoverable even when labels collapse.

## Buttons

- Primary buttons are for explicit user commands.
- Utility controls such as Collapse, Refresh, Back, Forward, Copy, and Reveal use one shared compact tool-control pattern: one control size, one icon size, one radius, one hover/focus treatment, and semantic tooltips.
- `.ui-tool-button` owns the shared compact utility-control base; `.ui-panel-header` and `.ui-panel-header-label` own the shared Files/Selection Actions header base; `.ui-flat-row` owns the shared borderless icon/text row base. Do not recreate these base rules in an owning stylesheet.
- Utility controls are light, mostly borderless icon buttons. A persistent border is reserved for real inputs, selected states, or explicit primary/destructive commands.
- Navigation rows are not generic outlined buttons. They are flat icon/text rows; the active row uses a subtle raised background instead of a permanent outline.
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
- The Action Registry owns `shortLabel`, `description`, `icon`, `category`, and `executionKind` for every visible action. The renderer must not recreate per-action presentation metadata.
- Action rows combine a semantic icon, compact short label, category dot, full tooltip/accessible label, and optional execution marker. The category dot supplements meaning; it never carries meaning alone.
- `executionKind` is `app`, `embedding`, or `provider`. App actions do not call a model; embedding and provider markers make model-backed work visible without implying identical behavior.
- A collapsed action panel uses the same registry metadata. It may hide labels for density, but must retain semantic icons, accessible labels, category dots, execution markers, and lock state. Inline configuration forms always request expansion first.

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
- Collapse toggles use the shared compact tool-control pattern, not a full-width activation surface.
- Collapse moves the owned panel toward the left without silently resizing sibling panels. Neighbor widths change only through explicit user resize or an intentional future Focus Mode rule.
- Collapsed rails retain their own boundary and must clip internal content completely; no forms, action labels, or buttons may bleed into an adjacent region.
- Files and Selection Actions use aligned header/control geometry in both expanded and collapsed states.
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