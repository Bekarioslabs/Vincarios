# Vincarios V1 Manual Smoke Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create one repeatable manual V1 smoke test that covers the complete visible product surface with isolated local fixtures and explicit expected results.

**Architecture:** The canonical guide lives under `docs/testing/`. Reusable Markdown fixtures live in one clearly named folder inside the ignored development vault, while the drag-and-drop import fixture stays outside the vault. The pack is divided into provider-independent, local-provider, persistence, and portable-release blocks so failures can be isolated and rerun.

**Tech Stack:** Markdown documentation, Obsidian-style Markdown fixtures, local `dev-vault`, Windows portable Electron candidate.

## Global Constraints

- Do not modify Vincarios application code.
- Do not overwrite existing vault notes or existing smoke fixtures.
- Keep provider-dependent expectations tolerant of wording differences while requiring the correct app flow.
- Every write test must use Review Basket, backup, stale validation, and audit behavior.
- The fixture pack must be safe to remove as one folder after testing.

---

### Task 1: Fixture Pack

**Files:**
- Create: `dev-vault/00_Inbox/V1 Full Smoke/`
- Create: `portable-smoke/V1 External Import Fixture.md`

- [x] Add focused fixtures for Markdown rendering, editor updates, malformed YAML, Search, Similar Notes, links, image embeds, file context, and recursive folder scope.
- [x] Keep all fixture names unique and all frontmatter deterministic.
- [x] Verify the fixture tree and internal links.

### Task 2: Master Guide

**Files:**
- Create: `docs/testing/V1_MANUAL_SMOKE_TEST.md`
- Modify: `docs/rebuild/VINCARIOS_V1_TESTS_AND_AUDITS.md`

- [x] Cover splash, layout, Settings, Vault Profiles, Files, permissions, Preview, Editor Light, Search, indexes, Suggestions, Context, providers, Selection Actions, Inbox Review, creation presets, Review execution, Home, Session Log, restart persistence, watcher behavior, and portable state.
- [x] Give every step one observable expected result.
- [x] Separate destructive or provider-dependent tests and include a final release verdict.
- [x] Link the master guide from the canonical Tests and Audits document.

### Task 3: Verification

- [x] Scan the guide for placeholders, stale Vitruvios/ZEUS names, unsupported V1 claims, and missing fixture references.
- [x] Confirm all referenced fixture paths exist.
- [x] Run Markdown/Git whitespace checks.
