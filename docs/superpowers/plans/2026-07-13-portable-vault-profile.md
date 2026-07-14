# Portable Vault Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Vault/.vitruvios/profile.json` the single portable source for standard role mappings and their icon/color identities.

**Architecture:** The main-process vault profile service validates and persists the profile. Settings is the only profile editor. The File Tree consumes the resolved active profile and exposes no profile mutation UI.

**Tech Stack:** Electron main/preload/renderer IPC, local JSON profile, shared Vault Profile helpers, Node tests.

## Global Constraints

- Roles and visuals apply only to existing top-level folders in V1.
- One standard role maps to at most one top-level folder; one folder may not be assigned to two roles.
- No writes to `.obsidian`; `.vitruvios/profile.json` is Vitruvios-owned vault metadata.
- Profile library, custom roles, and multiple project destinations remain V1.1.
- All writes validate in main; no renderer filesystem access.

### Task 1: Portable Profile Service

- [ ] Replace path-keyed `folderVisuals` with role-keyed `roles` and `roleVisuals`.
- [ ] Resolve standard roots as detected defaults only when they physically exist.
- [ ] Migrate legacy visual entries to their matching standard roles when the profile is next written.
- [ ] Add tests for empty foreign vaults, detected standard roots, explicit mappings, duplicate prevention, and migration.

### Task 2: Settings Profile Editor

- [ ] Replace free-text role fields with top-level-folder selects plus `Unassigned`.
- [ ] Add an inline role visual picker and current icon/color preview.
- [ ] Save and reset each role through the dedicated vault profile IPC API.
- [ ] Show neutral state for unassigned roles and never open nested modals.

### Task 3: File Tree Consumer Cleanup

- [ ] Remove File Tree context-menu appearance mutation and its modal module.
- [ ] Render top-level role icons/colors from the active profile only.
- [ ] Reload the profile and tree after a Settings save/reset.
- [ ] Update template creation to obtain its effective profile from the vault profile API.

### Task 4: Verification And Documentation

- [ ] Run targeted service, IPC, settings, file tree, and template tests.
- [ ] Manually test a foreign vault, a standard vault, role reassignment, visual updates, and Create Project destination resolution.
- [ ] Update canonical architecture, UI workflow, and implementation plan docs with the V1.1 boundary.
