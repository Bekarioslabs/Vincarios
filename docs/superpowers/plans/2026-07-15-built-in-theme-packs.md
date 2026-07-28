# Built-In Theme Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two safe built-in Vault theme packs without weakening the existing Dark, Light, or System theme contract.

**Architecture:** Dark, Light, and System remain base modes. A Vault Profile can additionally select one registered built-in pack; the renderer Theme Controller is the only code that writes its validated token overrides to the document root. The profile stores only `themeOverride` and `themePackId`; arbitrary CSS and JavaScript are not loaded.

**Tech Stack:** Electron, browser-first renderer modules, shared JavaScript IIFEs, CSS custom properties, Node tests.

## Global Constraints

- Keep all vault writes through the existing Vault Profile IPC flow.
- Never read or write `.obsidian`.
- Theme packs use a fixed token allowlist and fixed control-radius values only.
- No external theme-package discovery or editor in this step.

### Task 1: Shared registry and profile contract

**Files:** `src/shared/themes/themePacks.js`, `src/shared/settings/theme.js`, `src/main/vault/vaultProfileService.js`, `src/renderer/vaultProfile/vaultProfileState.js`, focused tests.

- [x] Write failing tests for `high-contrast`, `paper`, invalid pack fallback, and portable profile persistence.
- [x] Add a shared registry with `id`, `label`, `baseTheme`, and allow-listed semantic token values.
- [x] Add normalized `themePackId` to Vault Profile appearance data; default to `default`.
- [x] Run focused tests.

### Task 2: Renderer application and Appearance selector

**Files:** `index.html`, `src/renderer/bootstrap.js`, `src/renderer/theme/themeController.js`, `src/renderer/settings/mountSettingsPanel.js`, focused tests.

- [x] Write failing tests for controller pack application and selector wiring.
- [x] Load the registry before the Theme Controller.
- [x] Apply only registered tokens after the base Dark/Light theme resolves; clear prior pack overrides before changing packs.
- [x] Extend the Vault selector with `High Contrast` and `Paper`, mapping each selection to its base mode and pack id.
- [x] Run focused tests and manual renderer test.

### Task 3: Documentation and verification

**Files:** `docs/rebuild/VINCARIOS_V1_ARCHITECTURE.md`, `docs/rebuild/VINCARIOS_V1_UI_AND_WORKFLOWS.md`, `docs/rebuild/VINCARIOS_V1_IMPLEMENTATION_PLAN.md`, `README.md` if user-facing theme copy exists.

- [x] Document precedence and the fixed built-in pack boundary.
- [x] State that JSON imports and the Theme Editor remain a future, validated extension.
- [ ] Run `npm test` and `git diff --check` before committing.