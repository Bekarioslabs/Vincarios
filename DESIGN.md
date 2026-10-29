---
name: vincarios
description: Compact, themeable Markdown workspace with explicit context and reviewed changes.
colors:
  ember: "#f59e0b"
  ember-interactive: "#d97706"
  color-amber-200: "#fde68a"
  color-amber-300: "#fcd34d"
  color-amber-400: "#fbbf24"
  color-green-200: "#bbf7d0"
  color-green-300: "#86efac"
  color-green-400: "#4ade80"
  color-green-500: "#22c55e"
  color-green-600: "#16a34a"
  color-orange-200: "#fed7aa"
  color-orange-300: "#fdba74"
  color-orange-400: "#fb923c"
  color-orange-500: "#f97316"
  color-orange-600: "#ea580c"
  color-red-200: "#fecaca"
  color-red-300: "#fca5a5"
  color-red-400: "#f87171"
  color-red-500: "#ef4444"
  color-red-600: "#dc2626"
  color-blue-200: "#bfdbfe"
  color-blue-300: "#93c5fd"
  color-blue-400: "#60a5fa"
  color-blue-500: "#3b82f6"
  color-blue-600: "#2563eb"
  color-sky-400: "#38bdf8"
  color-violet-200: "#ddd6fe"
  color-violet-300: "#c4b5fd"
  color-violet-400: "#a78bfa"
  color-violet-500: "#8b5cf6"
  color-violet-600: "#7c3aed"
  color-neutral-950: "#0a0a0a"
  color-neutral-900: "#111111"
  color-neutral-850: "#161616"
  color-neutral-800: "#1a1a1a"
  color-neutral-700: "#2a2a2a"
typography:
  ui-xs: { fontFamily: "var(--font-interface)", fontSize: "10px" }
  ui-sm: { fontFamily: "var(--font-interface)", fontSize: "11px" }
  ui-md: { fontFamily: "var(--font-interface)", fontSize: "12px" }
  ui-lg: { fontFamily: "var(--font-interface)", fontSize: "13px" }
  ui-title: { fontFamily: "var(--font-interface)", fontSize: "16px" }
rounded:
  ui-sm: "4px"
  ui-md: "6px"
  ui-lg: "8px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
components:
  tool-button: { backgroundColor: "transparent", textColor: "var(--text-ui-muted)", rounded: "{rounded.ui-md}" }
  panel-header-label: { textColor: "var(--text-ui-section)" }
  flat-row: { backgroundColor: "transparent", textColor: "var(--text-ui)", rounded: "{rounded.ui-md}" }
---

# vincarios Design

## Overview

Compact local work tool: neutral chrome, darker reading surfaces, semantic accents. Source: `docs/rebuild/VINCARIOS_V1_UI_COMPONENT_RULES.md`.

Source in code: `src/renderer/styles/tokens.css`, `src/renderer/styles/components.css`, `src/shared/themes/themePacks.js`, `src/renderer/theme/themeController.js`.

YAML is a snapshot, not a runtime theme. Interaction: UI Component Rules; constraints: `AGENTS.md`.

Lowercase wordmark: `vinca` uses `--text-accent`, `rios` uses `--text-strong`. Dark/light SVG selection follows `data-theme`; assets: `src/renderer/assets/brand/`; markup: `src/renderer/shell/mountShell.js`.

Windows window/package icon: `vincarios-icon.ico`, generated from the dark SVG with `node scripts/generate-app-icon.js`. Regenerate after replacing that SVG; existing EXEs require rebuilding.

## Colors

YAML lists all 36 primitive colors. `ember` = `--color-amber-500`; `ember-interactive` = `--color-amber-600`. Shade families support folder visuals; components consume semantic roles.

Table names omit `--`. Values are exact; RGB helpers/SVG filters remain in source. Dark: `:root`; Light: `:root[data-theme="light"]`; other aliases inherit and resolve against overrides.

| Semantic token | Dark value | Light value | Role |
|---|---|---|---|
| background-primary | `var(--color-neutral-950)` | `#fbfbfa` | Reading/focus surface |
| background-secondary | `var(--color-neutral-900)` | `#f2f2f0` | App chrome |
| background-tertiary | `var(--color-neutral-850)` | `#e8e8e5` | Raised surface |
| background-modifier-form-field | `var(--color-neutral-800)` | `#ffffff` | Fields |
| background-modifier-border | `var(--color-neutral-700)` | `#d2d2cc` | Structural edges |
| background-subtle | `rgba(255,255,255,.018)` | `rgba(24, 24, 22, .025)` | Subtle state fill |
| background-subtle-strong | `rgba(255,255,255,.035)` | `rgba(24, 24, 22, .06)` | Hover fill |
| border-subtle | `rgba(255,255,255,.055)` | `rgba(24, 24, 22, .1)` | Quiet border |
| text-normal | `#e8e8e8` | `#242422` | Main UI text |
| text-muted | `#8a8a8a` | `#686863` | Secondary text |
| text-faint | `#666666` | `#8b8b84` | Tertiary text |
| text-strong | `#ffffff` | `#111110` | Emphasis/wordmark suffix |
| text-readable | `#dddddd` | `#343432` | Reading text |
| text-on-accent | `#050505` | `#1a1200` | Accent button text |
| text-on-primary | `#050505` | `#1a1200` | Primary button text |
| text-accent | `var(--color-amber-500)` | `#b45309` | Ember headings/links |
| interactive-accent | `var(--color-amber-600)` | `var(--color-amber-500)` | Primary action fill |
| selection-background | `rgba(214, 214, 214, 0.1)` | `rgba(77, 77, 72, .14)` | Neutral text selection |
| selection-text | `var(--text-strong)` | `var(--text-strong)` | Selected text |
| metadata-accent | `#d08a22` | `#9a5800` | Properties emphasis |
| metadata-background | `rgba(255,255,255,.022)` | `rgba(180, 83, 9, .08)` | Properties fill |
| metadata-border | `rgba(255,255,255,.08)` | `rgba(180, 83, 9, .22)` | Properties edge |
| markdown-highlight-background | `rgba(var(--text-accent-rgb), .22)` | `rgba(245, 158, 11, .27)` | Markdown mark |
| markdown-highlight-text | `var(--text-strong)` | `#2f2300` | Marked text |
| status-success | `var(--color-green-600)` | `#15803d` | Ready/success |
| status-success-soft | `var(--color-green-400)` | `#166534` | Soft success emphasis |
| status-danger | `var(--color-red-600)` | `#b91c1c` | Danger/missing |
| status-danger-soft | `var(--color-red-400)` | `#991b1b` | Soft danger emphasis |
| status-warning | `var(--color-orange-400)` | `#c2410c` | Stale/warning |
| status-error | `#f08a8a` | `#b91c1c` | Error message |
| action-context | `var(--color-sky-400)` | `#0369a1` | Context action |
| action-read | `var(--color-green-400)` | `#15803d` | Read action |
| action-write | `var(--color-amber-500)` | `#b45309` | Write action |
| action-organize | `var(--color-violet-400)` | `#6d28d9` | Organize color slot |
| diff-add-text | `var(--status-success-soft)` | `#166534` | Added lines |
| diff-add-background | `rgba(var(--status-success-rgb), .1)` | `rgba(21, 128, 61, .1)` | Added-line fill |
| diff-remove-text | `var(--status-danger-soft)` | `#991b1b` | Removed lines |
| diff-remove-background | `rgba(var(--status-danger-rgb), .1)` | `rgba(185, 28, 28, .1)` | Removed-line fill |
| score-strong | `var(--color-green-400)` | `var(--color-green-600)` | Strong match ring |
| score-medium | `var(--color-amber-500)` | `var(--color-amber-400)` | Medium match ring |
| score-weak | `var(--color-orange-400)` | `var(--color-orange-500)` | Weak match ring |
| score-noisy | `var(--color-red-400)` | `var(--color-red-500)` | Low match ring |
| overlay-backdrop-background | `rgba(0, 0, 0, .64)` | `rgba(24, 24, 22, .34)` | Modal dimming |

Aliases: `surface-app/raised/focus/field/hover` map to secondary/tertiary/primary/form-field/subtle-strong backgrounds; `border-structural` to modifier-border. `text-ui`, muted, emphasis, section map to normal, muted, strong, accent.

Packs override these roles; remaining values inherit their base theme (`src/shared/themes/themePacks.js`).

| Token | High Contrast (dark) | Paper (light) |
|---|---|---|
| background-primary | `#000000` | `#f8f1e5` |
| background-secondary | `#080b0d` | `#efe2cd` |
| background-tertiary | `#10161a` | `#e4d1b5` |
| background-modifier-form-field | `#151e23` | `#fffaf1` |
| background-modifier-border | `#4b6672` | `#c9af8d` |
| text-normal | `#f8fafc` | `#332b21` |
| text-muted | `#cbd5e1` | `#6f6253` |
| text-strong | `#ffffff` | `#211a13` |
| text-readable | `#e5f4f8` | `#443729` |
| text-on-accent | `#001114` | `#241306` |
| text-on-primary | `#001114` | `#241306` |
| text-accent | `#67e8f9` | `#a6531a` |
| interactive-accent | `#06b6d4` | `#e9a85c` |
| metadata-accent | `#67e8f9` | `#8d4618` |
| status-success | `#4ade80` | `#27824d` |
| status-danger | `#fb7185` | `#bd3d3d` |
| status-warning | `#fbbf24` | `#c77b17` |
| score-strong | `#4ade80` | `#27824d` |
| score-medium | `#fbbf24` | `#d4941b` |
| score-weak | `#fb923c` | `#d06428` |
| score-noisy | `#fb7185` | `#bd3d3d` |

## Typography

`--font-interface`: `'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`. Bundled Inter: `src/renderer/assets/fonts/InterVariable.woff2`, weights `100 900`, `font-display: swap`.

`--font-monospace`: `'JetBrains Mono', 'Fira Code', Consolas, monospace`; fallback stack, not additional bundled font-face declarations.

| Shared token | Value | Intended scope |
|---|---|---|
| font-size-ui-xs | `10px` | Section labels, counts, secondary packet details |
| font-size-ui-sm | `11px` | Compact metadata and secondary labels |
| font-size-ui-md | `12px` | Standard navigation/action rows |
| font-size-ui-lg | `13px` | Larger UI copy/startup tagline |
| font-size-ui-title | `16px` | UI title step |
| font-weight-ui-medium | `600` | Medium emphasis |
| font-weight-ui-semibold | `650` | Compact strong labels |
| font-weight-ui-strong | `700` | Section/primary emphasis |

Local typography: Preview `14px/1.68`, Source `12px/1.75`; Preview headings `1.85em/1.45em/1.2em/1.05em` (`markdown.css`). Chat `13px/1.5`, headings `1.35em/1.2em/1.08em`. Startup `42px/1.1`; Settings heading `17px/1.2`; Suggestions paths `9px/1.2`.

Section labels often use uppercase/`.08em`; titlebar/navigation also `.12em`. Recorded exceptions, not a universal tracking rule.

## Layout

`src/renderer/styles/layout.css`: titlebar/workspace/statusbar. Workspace: left nav | main | vault. Vault: Files | divider | Actions | divider | Preview. Main: Chat/Search/Suggestions/Home/Review; Context Basket stays in Chat.

| Geometry token | Existing value |
|---|---|
| titlebar-height / statusbar-height | `39px` / `24px` |
| left-nav-width / left-nav-collapsed-width | `168px` / `48px` |
| vault-panel-width | `clamp(var(--min-vault-width), 68vw, calc(100vw - var(--left-nav-width) - var(--min-main-width) - var(--panel-divider-width)))` |
| file-tree-width / selection-actions-width | `260px` / `280px` |
| min-main-width / min-vault-width | `400px` / `392px` |
| min-file-tree-width / max-file-tree-width | `170px` / `340px` |
| min-selection-actions-width / max-selection-actions-width | `220px` / `360px` |
| min-preview-width | `320px` |
| panel-rail-width | `48px` |
| panel-toolbar-height / basket-collapsed-height | `36px` / `36px` |
| panel-divider-width / panel-resize-hit-area | `1px` / `7px` |

CSS defaults; runtime resize/collapse: `src/renderer/layout/panelLayoutState.js`. Files/Actions rails alias `panel-rail-width`. Grid animation: `--transition-fast` (`.15s ease-in-out`), disabled during drag. Regions scroll internally; shell allows horizontal overflow.

Preferred startup window: `1920 x 1080` Electron logical pixels, capped to the primary display's usable work area; minimum remains `980 x 640`. The wider default Vault leaves more room for Preview while retaining Chat's minimum and the existing Files/Actions widths. At a 1920px content width, Chat is about 445px and Preview 764px. Smaller windows may still let Preview yield under the existing minimum-width policy. Dragged sizes are not persisted; no new setting is introduced.

Spacing: `4/8/12/16px`; local `10px` gaps/`14px` padding also remain. Shell minimum `980px`, reduced to `900px` at `max-width: 1100px` in startup.css. Settings breakpoint: `max-width: 960px`. Desktop, not a mobile layout.

Startup: centered `min(100%, 440px)`, `164px` contained logo. Settings: `min(920px, calc(100vw - 56px))` x `min(680px, calc(100vh - 56px))`, `180px` category column. Review width: `min(720px, calc(100vw - 48px))`; Chat cap: `min(720px, 88%)`.

## Elevation & Depth

Surface contrast provides depth; overlays use these exact shared shadows.

| Token | Dark | Light |
|---|---|---|
| shadow-popover | `0 16px 48px rgba(0, 0, 0, .45)` | `0 16px 48px rgba(24, 24, 22, .18)` |
| shadow-modal | `0 24px 70px rgba(0, 0, 0, .45)` | `0 24px 70px rgba(24, 24, 22, .2)` |
| shadow-settings | `0 22px 70px rgba(0, 0, 0, .5)` | `0 22px 70px rgba(24, 24, 22, .22)` |

Local layers, not shared tokens: profile picker `3`; dividers `4`; startup `20`; Settings `30`; Preview link menu `40`; Review `50`; selection menu `80`. Owners: settings/layout/startup/markdown/review CSS. Selection menu shadow: `0 12px 30px rgba(0, 0, 0, .28)`. Stacking contexts still determine actual ordering.

## Shapes

Shared radii are `4px`, `6px`, `8px` (`radius-ui-sm/md/lg`). High Contrast overrides them to `2px`, `3px`, `4px`; Paper to `2px`, `4px`, `6px`. Both packs set `radius-control: 3px`.

Compatibility radii: xs `2px`, compact `5px`, control `7px`, xl `10px`, pill `999px`; sm/md/lg alias UI radii. Settings uses xl; badges/dots use pills.

Utility controls `28px`, icons `14px`; regular `32px`, primary token `40px`; other icons `12px/16px`. Dividers preserve real boundaries; flat rows have no decorative borders.

## Components

| Component family | Existing owner / visual contract |
|---|---|
| Tool button | `src/renderer/styles/components.css`: `.ui-tool-button`, focus/hover, disabled opacity `.45` |
| Panel header | `src/renderer/styles/components.css`: `.ui-panel-header` / `.ui-panel-header-label` |
| Flat row | `src/renderer/styles/components.css`: `.ui-flat-row` |
| Startup | `src/renderer/styles/startup.css`: logo, Open Vault, recents/provider |
| Settings | `src/renderer/styles/settings.css`: two-pane modal |
| Review | `src/renderer/styles/review.css`: proposals, diff, confirmation |
| Markdown Preview/Editor | `src/renderer/styles/markdown.css`: Properties, source, link picker |
| Context Basket | `src/renderer/styles/chat.css`: compact packets |
| Selection Actions | `src/renderer/styles/selectionActions.css`, `src/renderer/selectionActions/actionRegistry.js`: icon/category/execution |
| Suggestions | `src/renderer/styles/suggestions.css`: rows, groups, score rings |
| Status/activity | `src/renderer/styles/activity.css`: global/Preview feedback, Session Log |

Bundled Lucide mappings/rendering: `src/renderer/icons/iconRegistry.js`, `src/renderer/icons/iconRenderer.js`; recoloring via shared SVG filters. Labels/focus/disabled/modal behavior follow UI Component Rules.

## Do's and Don'ts

Naming/accessibility/verification: `AGENTS.md`, Section 6. Ownership/semantic states: UI Component Rules. References are not markup templates.

Recorded inconsistencies, not silently resolved:
- Literal sizes, gaps, compatibility radii, shadows and layers coexist with shared scales.
- `markdown.css`/`search.css`: `--ui-icon-button-size`, `--ui-icon-size`, `--ui-control-radius` have no declarations in `src/`/`index.html`.
- Near colors remain separate roles: text versus interactive accent, metadata, subtle opacities.

### In Code

Content Update budget: native `details`/`summary` inside the instruction form, not a new card/global meter. Reuse `--font-size-ui-sm`, `--space-1`, `--text-muted`, `--status-success-soft`, `--status-warning`, `--status-danger-soft` and the existing focus accent. Always name the state in text; estimates are not exact utilization. Sources: `selectionActions/updateInstructionForm.js`, `styles/selectionActions.css`. No new palette, radius or type scale.

Shared values: `tokens.css`; semantic color/size/radius roles. Reuse `components.css`; area styles own geometry. Naming/inline-style rules: `AGENTS.md`. Prefer existing colors.

`themeController.js`: root `data-theme`/`data-theme-pack`. App: Dark/Light/System (`prefers-color-scheme: dark`). Pack selects base theme and applies token overrides with `root.style.setProperty`, clearing old overrides. Without a pack, vault Dark/Light overrides app mode; Inherit follows app/System. This controlled token application is not ad hoc inline component styling.

Stacking repairs follow global Coding Rules: no `!important`/arbitrary higher z-index/wrapper workaround. Current layers are local numbers. No CSS changes or new policy in this task.

### Room to Deviate

Experiments use existing or new source tokens documented here, not scattered literals (UI Component Rules). New directions need Beka's approval; this snapshot grants no exception.
