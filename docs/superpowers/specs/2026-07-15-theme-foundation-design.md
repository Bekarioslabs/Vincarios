# Vitruvios Theme Foundation

## Goal

Add a small, portable Light/Dark/System theme foundation to Vitruvios V1. It must respect the existing token system and make later theme presets possible without changing component logic.

## Effective Theme

The application resolves the active theme in this order:

1. An opened vault's explicit override: `dark` or `light`.
2. The portable app default: `dark`, `light`, or `system`.

The splash screen has no vault context, so it always uses the portable app default. A vault without an override inherits that default.

## Storage

- App default: `D:\ZEUS_AGENT\.vitruvios\settings.json`, under `theme.mode`.
- Vault override: `<vault>/.vitruvios/profile.json`, under a dedicated appearance field with `inherit`, `dark`, or `light`.
- Vitruvios never writes theme information to `.obsidian`.

## UI

The existing Settings > Appearance category becomes functional.

- App theme: `Dark`, `Light`, `System`.
- Vault theme: `Inherit app theme`, `Dark`, `Light`.
- Changes apply immediately. Vault override controls are disabled until a vault is open.

No theme presets, custom accent pickers, or per-project styles are included in this block.

## Renderer And CSS

- One renderer-owned theme controller resolves the effective theme and applies it through a root `data-theme` attribute.
- `tokens.css` owns dark and light semantic values.
- Components continue using semantic tokens only; no component receives a hard-coded light-mode exception.
- The renderer respects `prefers-color-scheme` only when app mode is `system` and no vault override exists.

## Boundaries

- Theme is Vitruvios UI state, not Markdown content styling.
- Markdown project style presets remain a later, separate workflow.
- The setting affects no provider, permission, review, context, indexing, or vault-write behavior.

## Verification

- Unit tests cover app-theme normalization and effective-theme precedence.
- Targeted renderer tests cover root attribute updates and immediate settings changes.
- Manual test: open splash, switch app mode, open a vault, set/clear override, reopen the vault, and confirm persistence.
- Full test suite before commit.

## Future Theme Packages

V1 prepares, but does not load or manage, shareable theme packages. V1.1 may discover validated JSON files under the portable app path `.vitruvios/themes/`.

- A package extends the built-in `dark` or `light` theme and may override only an allow-listed semantic token registry.
- Allowed values will be colors, a bounded typography scale, control radii, and approved shadow or opacity values.
- Arbitrary CSS, layout geometry, URLs, JavaScript, and component-specific selectors are never valid package content.
- A vault may later select an installed package through its Vault Profile; the package itself remains app-portable and shareable.