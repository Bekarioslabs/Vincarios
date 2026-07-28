# vincarios Theme Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add portable Dark, Light, and System modes with an optional vault-specific Dark/Light override.

**Architecture:** A shared pure theme module owns normalization and precedence. Portable app settings own the default mode; the selected vault profile owns only an optional override. A renderer theme controller resolves the effective mode and sets one root `data-theme` attribute that `tokens.css` consumes.

**Tech Stack:** Electron, sandboxed preload IPC, browser-first renderer modules, Node test runner, CSS custom properties.

## Global Constraints

- App default lives only in `.vincarios/settings.json`; vault override lives only in `<vault>/.vincarios/profile.json`.
- Never write to `.obsidian`.
- V1 supports built-in `dark`, `light`, and `system` only.
- Shareable package loading is V1.1: validated files in `.vincarios/themes/`, never arbitrary CSS.
- Components consume semantic tokens only; no hard-coded component light-mode exceptions.
- Use test-first changes and run the full suite before the final commit.

---

### Task 1: Shared Theme Contract And App Setting

**Files:**
- Create: `src/shared/settings/theme.js`
- Modify: `src/main/settings/settingsStore.js`
- Modify: `src/main/settings/settingsService.js`
- Modify: `src/main/ipc/registerSettingsIpc.js`
- Modify: `src/shared/ipc/channels.js`
- Modify: `src/preload/index.js`
- Test: `tests/themeSettings.test.js`, `tests/settingsStore.test.js`, `tests/settingsIpc.test.js`

**Produces:** `normalizeAppTheme(value)`, `normalizeVaultThemeOverride(value)`, `resolveEffectiveTheme(appMode, vaultOverride, systemIsDark)`, and `api.settings.setTheme({ mode })`.

- [ ] Write a failing test covering `dark`, `light`, `system`, invalid values, and override precedence.

~~~js
assert.equal(resolveEffectiveTheme('system', 'inherit', true), 'dark');
assert.equal(resolveEffectiveTheme('light', 'dark', false), 'dark');
assert.equal(normalizeVaultThemeOverride('unknown'), 'inherit');
~~~

- [ ] Run `node --test tests/themeSettings.test.js`; expect failure because the module is missing.
- [ ] Implement the pure shared contract and make Settings Store persist only normalized app mode.
- [ ] Add one `SETTINGS_SET_THEME` IPC channel, service method, and preload method. It accepts `{ mode }` and returns normalized settings.
- [ ] Run `node --test tests/themeSettings.test.js tests/settingsStore.test.js tests/settingsIpc.test.js`; expect all focused tests to pass.
- [ ] Commit this isolated contract: `git commit -m "Add portable app theme setting"`.

### Task 2: Vault Profile Appearance Override

**Files:**
- Modify: `src/main/vault/vaultProfileService.js`
- Modify: `src/renderer/vaultProfile/vaultProfileState.js`
- Modify: `src/main/ipc/registerVaultIpc.js`
- Modify: `src/shared/ipc/channels.js`
- Modify: `src/preload/index.js`
- Test: `tests/vaultProfileService.test.js`, `tests/vaultProfileState.test.js`, `tests/vaultIpc.test.js`

**Produces:** `vaultProfileService.setAppearance({ themeOverride })`, `api.vault.setProfileAppearance({ themeOverride })`, and `vaultProfileState.getThemeOverride()`.

- [ ] Write failing tests for profile persistence, invalid override normalization to `inherit`, renderer-state exposure, and IPC validation.
- [ ] Run `node --test tests/vaultProfileService.test.js tests/vaultProfileState.test.js tests/vaultIpc.test.js`; expect failure because profile appearance does not exist.
- [ ] Extend `normalizeProfile` with `appearance: { themeOverride }`; add a dedicated `setAppearance` service path. Do not pass theme data through `setRole`.
- [ ] Mirror normalized appearance in Vault Profile State while preserving role visuals and custom icon hydration.
- [ ] Run the focused tests; expect pass.
- [ ] Commit: `git commit -m "Add vault theme override"`.

### Task 3: Renderer Theme Controller And Light Tokens

**Files:**
- Create: `src/renderer/theme/themeController.js`
- Modify: `index.html`
- Modify: `src/renderer/bootstrap.js`
- Modify: `src/renderer/shell/mountShell.js`
- Modify: `src/renderer/styles/tokens.css`
- Test: `tests/themeController.test.js`, `tests/stylesSource.test.js`, `tests/scaffold.test.js`

**Produces:** `createThemeController({ api, document, matchMedia })` with `load()`, `setAppTheme(theme)`, `setVaultOverride(themeOverride)`, and `snapshot()`.

- [ ] Write failing controller tests using a fake document root and media query.

~~~js
await controller.load();
assert.equal(document.documentElement.dataset.theme, 'dark');
controller.setAppTheme({ mode: 'light' });
assert.equal(document.documentElement.dataset.theme, 'light');
controller.setVaultOverride('dark');
assert.equal(document.documentElement.dataset.theme, 'dark');
~~~

- [ ] Run `node --test tests/themeController.test.js`; expect failure because the controller is missing.
- [ ] Add the browser-first controller. It is the only renderer owner that writes `data-theme` on `document.documentElement`.
- [ ] Register the script before Shell and bootstrap validation. Shell loads the app theme before rendering Splash and refreshes vault override after profile load.
- [ ] Add `:root[data-theme="light"]` semantic token overrides for all surface, text, border, selection, metadata, action, status, diff, score, icon filter, overlay, and shadow tokens needed for a readable light UI. No component CSS gets raw light colors.
- [ ] Run `node --test tests/themeController.test.js tests/stylesSource.test.js tests/scaffold.test.js`; expect pass.
- [ ] Commit: `git commit -m "Apply semantic light and dark themes"`.

### Task 4: Appearance Settings And Open-Vault Wiring

**Files:**
- Modify: `src/renderer/settings/mountSettingsPanel.js`
- Modify: `src/renderer/styles/settings.css`
- Modify: `src/renderer/shell/mountShell.js`
- Test: `tests/settingsRendererIntegrationSource.test.js`, `tests/electronShell.test.js`

**Consumes:** Theme Controller and Vault Profile State from Shell.

- [ ] Write failing integration assertions for `[data-settings-app-theme]`, `[data-settings-vault-theme]`, `api.settings.setTheme`, and `api.vault.setProfileAppearance`.
- [ ] Run `node --test tests/settingsRendererIntegrationSource.test.js tests/electronShell.test.js`; expect failure because Appearance is a placeholder.
- [ ] Replace the placeholder with App Theme (`Dark`, `Light`, `System`) and Vault Theme (`Inherit app theme`, `Dark`, `Light`) selectors.
- [ ] Disable Vault Theme with explanatory text until a vault is open. Apply successful settings immediately through the controller.
- [ ] After each successful vault open, load the profile override. On no/failed vault, reset controller override to `inherit`.
- [ ] Run the focused tests; expect pass.
- [ ] Manual check: splash uses app choice; Vault A persists Light; Vault B without override inherits app choice; `.obsidian` remains untouched.
- [ ] Commit: `git commit -m "Add theme appearance controls"`.

### Task 5: Documentation And Full Verification

**Files:**
- Modify: `docs/rebuild/VINCARIOS_V1_UI_AND_WORKFLOWS.md`
- Modify: `docs/rebuild/VINCARIOS_V1_ARCHITECTURE.md`
- Modify: `docs/rebuild/VINCARIOS_V1_IMPLEMENTATION_PLAN.md`
- Modify: `README.md`
- Test: `tests/stylesSource.test.js`

- [ ] Document the exact precedence rule: vault override, then app default, with System resolved locally.
- [ ] Document V1.1 package direction: allow-listed token JSON under `.vincarios/themes/`; no arbitrary CSS or package loader in V1.
- [ ] Add only token-boundary source assertions that protect the Light-mode design.
- [ ] Run `npm test`; expect the full suite to pass.
- [ ] Commit: `git commit -m "Document portable theme behavior"`.

## Plan Self-Review

- Storage, precedence, renderer application, settings UI, and future package limits each have one owner and test gate.
- No feature writes to `.obsidian` or gives renderer filesystem access.
- V1 does not include custom package discovery, import, export, custom CSS, or a theme marketplace.