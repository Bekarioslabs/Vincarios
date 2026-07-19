# vitruvios V1 Tests And Audits

## Test Principle

Tests start on day one. Safety-critical behavior must be tested before feature polish.

## Required V1 Test Areas

- path safety: no access outside the selected vault
- dot-folder blocking: `.obsidian`, `.vitruvios`, `.vitruvios_backups`
- action schema validation
- review basket state: open, selected, running, done, failed, rejected, stale
- permission inheritance: direct, inherited, blocked/off
- context builder: only allowed context is included
- Markdown diff and patch behavior
- backup before existing-file changes
- archive/trash instead of normal delete
- audit log without note contents
- provider boundary: providers never read/write files
- renderer runtime parity: renderer modules prefer `window.vitruvios...` browser APIs before Node/CommonJS test fallbacks
- embedding index/model/runtime basics: Markdown-only index schema, vault `.vitruvios/index` storage, project `.vitruvios/models` artifact metadata, hash/mtime updates, local runtime with remote model loading disabled
- Frontmatter Contract: bounded YAML parsing, generic property preservation, malformed-YAML fail-soft behavior, and no unsafe rewrite.
- Metadata and Full-text indexes: opt-in state, freshness, rebuild/delete behavior, watcher-driven incremental metadata updates, and no provider access.
- persistent vault-local state: recent files and non-dismissed Review Basket entries restore safely and prune invalid paths.
- renderer workspaces: Search, Home, Suggestions, Review, and Session Log state remain local and preserve their stated boundaries.
- Editor Light: formatting operations preserve selection/scroll state, dirty-navigation decisions are explicit, and updates still enter Review only.

## Focused Audit Rhythm

Run focused audits after each major block instead of one giant late audit.

1. scaffold and dependency choice
2. vault path/safety layer
3. action schema and review store
4. permissions and context builder
5. provider integration
6. embedding index
7. first full inbox cleanup workflow
8. pre-V1 freeze

## Minimum Commands

The exact command set can change with the stack, but V1 must have:

```text
npm test
npm run check
```

Before public release, add or verify:

- dependency audit through `npm audit --audit-level=high`
- clean-install check through `npm ci`
- lockfile/dependency diff review for every release branch
- secret scan with gitleaks or an equivalent scanner
- Electron/security scan if still using Electron
- GitHub CI for JavaScript syntax checks and Node tests
- release artifact SHA256 checksums
- embedding model artifact source/license/SHA256 verification before release packaging
- embedding runtime smoke: local bundled model path loads offline and returns 384-dimensional vectors
- embedding indexer smoke: selected-vault Markdown files build document vectors under `.vitruvios/index`; a second unchanged run skips all documents.
- explicit unsigned-build warning until code signing is implemented
- build-it-yourself instructions for cautious beta testers

## Manual Smoke Areas

- start screen: version, recent vault open/remove, local provider availability
- open vault and configure vault profile
- File Tree navigation, watcher refresh, and R/W permission inheritance
- Preview: Markdown, YAML Properties, image embed, internal/external links, back/forward, and source mode
- Editor Light: formatting, link picker, dirty-navigation decision, reviewed update, and preview refresh after execution
- Context Basket and provider-bound file/folder context scopes
- Folder Inspect/Summary and Inbox Review reports
- Similar Notes, index freshness/status, and deterministic Search scopes
- Vault Home health, Recent Files, and Review workspace persistence after restart
- Light/Dark/System plus bundled Vault theme packs
- Review diff, selected execution, backup, audit log, stale-content rejection, and error recovery
- create new note and project from presets
- malformed and deeply nested YAML frontmatter: preview and search stay fail-soft; no unsafe frontmatter write proposal
- provider unavailable/offline: visible recovery state, no renderer failure or stuck request
- measured large-vault pass: record note count, search/index duration, and observed UI responsiveness before external beta
- Windows beta install/run path: explicit unsigned-build and SmartScreen guidance

## GitHub CI

V1 uses `.github/workflows/ci.yml` to run the same core checks on GitHub that should pass locally:

```text
npm audit --audit-level=high
npm run check
node --test tests/*.test.js
```

The workflow runs on pushes to `main` and `codex/**`, and on pull requests targeting `main`.

## Audit Records

### 2026-06-30 dependency/security audit

Method:

- Parsed `package-lock.json`.
- Queried the npm Security Advisory bulk endpoint for all locked packages.

Result:

- 13 locked packages checked.
- 0 advisories returned.

Note:

- The local Codex shell did not expose `npm`, so `npm audit` could not be run directly in this environment. The advisory check used the same npm security advisory source over the registry API.

### 2026-06-30 external security audit follow-up

Resolved immediately:

- Pinned Electron from `^42.4.1` to `42.4.1` for release reproducibility.
- Added `engines.node >=22.12.0` to `package.json`.
- Added `npm audit --audit-level=high` to GitHub CI.

Already verified in code/tests before this follow-up:

- Renderer CSP exists in `index.html` and is covered by `tests/browserScriptIsolation.test.js`.
- Payload limits exist in `src/shared/security/payloadLimits.js` and oversized write/provider payloads are covered by focused tests.
- BrowserWindow keeps `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, and `allowRunningInsecureContent: false`; covered by `tests/electronShell.test.js`.

Deferred decisions:

- ASAR/fuse integrity belongs to the future package/build phase.
- Public license choice remains a pre-public-release decision.
- Clipboard image handling belongs to the future image-feature phase.

### 2026-07-18 dependency audit - resolved release gate

Method:

- Ran `npm audit --audit-level=high` against the current lockfile.
- Confirmed the installed dependency path with `npm ls`.

Finding:

- `@huggingface/transformers@4.2.0` -> `onnxruntime-node@1.24.3` -> `adm-zip@0.5.18`.
- npm reports three high-severity findings through this chain, including GHSA-xcpc-8h2w-3j85 / CVE-2026-39244 for crafted-ZIP memory exhaustion in `adm-zip`.
- Vitruvios does not accept arbitrary user ZIP files and the embedding runtime disables remote model loading, which narrows the expected exposure. It does not satisfy the release dependency gate.

Resolution and verification:

- Kept `@huggingface/transformers@4.2.0` and `onnxruntime-node@1.24.3`; added the explicit root override `adm-zip: 0.6.0`.
- Lockfile diff changes only `adm-zip` from `0.5.18` to `0.6.0`; its license remains MIT and Node `>=14` remains compatible with Vitruvios Node `>=22.12.0`.
- `npm ci` completed from the updated lockfile. npm reported unapproved install-script candidates; none were manually approved, and the local `onnxruntime-node` module still loaded successfully.
- `npm audit --audit-level=high` returned `0` vulnerabilities.
- `npm test` passed: `866/866`.
- Offline smoke passed with the local embedding model: one 384-dimensional vector and one real-runtime index build over a Markdown fixture.

Status:

- Resolved for the current V1 dependency gate. Keep the explicit override until a future tested Transformers/ONNX update absorbs the patched dependency; re-run this gate whenever that chain changes.

### 2026-07-18 dependency license inventory - pending Vitruvios license decision

- Inspected license metadata for all 67 locally installed direct and transitive npm packages.
- Observed licenses: MIT (37), BSD-3-Clause (13), Apache-2.0 (7), ISC (5), BSD-2-Clause (2), Python-2.0 (1), MIT OR CC0-1.0 (1), and Apache-2.0 AND LGPL-3.0-or-later (1).
- No package reported AGPL, SSPL, Business Source License, Commons Clause, non-commercial, proprietary, or unknown metadata.
- The sole LGPL-containing package is `@img/sharp-win32-x64@0.34.5`, which reports Apache-2.0 AND LGPL-3.0-or-later. Its packaged third-party notices must be retained and the result rechecked against the final Vitruvios license before distribution.
- This is a metadata inventory, not legal advice. The public Vitruvios license and a final notice-file review remain release gates.
### 2026-07-18 secret scan - release-candidate baseline

- Gitleaks `8.30.1` scanned the complete Git history: 90 commits and approximately 2.7 MB, with no findings.
- It also scanned the 55 changed or untracked working-tree files present at the time, with no findings.
- This confirms the current release candidate only. Repeat the scan after the final release commit and before publishing the repository or a downloadable artifact.
### 2026-07-18 GitHub security configuration

- Repository visibility is private during V1 preparation.
- Dependabot vulnerability alerts are enabled (GitHub API returned `204 No Content`).
- GitHub Secret Scanning is currently disabled for this repository (GitHub API returned `404`). Local Gitleaks scanning therefore remains mandatory before final release commits and published artifacts.
- Recheck GitHub secret-scanning availability and enable it if available when the repository becomes public.
### Release trust baseline

Before external beta or public V1 release, vitruvios must treat supply-chain trust as a release gate, not a feature nice-to-have.

Required release checks:

- install from the lockfile with `npm ci`.
- run `npm audit --audit-level=high` locally or in CI.
- review dependency and lockfile diffs before tagging a release.
- run a secret scan before publishing the repository or release artifacts.
- build release artifacts from a clean checkout.
- publish SHA256 checksums for downloadable artifacts.
- state clearly whether builds are unsigned. Unsigned beta builds must not be marketed as OS-trusted.
- keep a short build-it-yourself path in the README so cautious testers can inspect and build locally.
- publish Windows-only beta scope, unsigned-build/SmartScreen instructions, a privacy-safe bug-report path, and a vault-backup restore guide before inviting external testers.
- do not claim bit-for-bit reproducible Electron artifacts until that property has been separately verified; publish the source revision, lockfile, build steps, and artifact SHA256 instead.

Code signing is desirable before broad public distribution, but it can be tracked separately from the first private beta if the unsigned status is explicit.

### 2026-07-18 portable Windows packaging baseline

- Added a pinned `electron-builder@26.15.3` release toolchain with one V1 target: Windows x64 portable executable.
- The packaged application uses ASAR for app code; `onnxruntime-node` remains unpacked for native loading.
- The verified Apache-2.0 multilingual MiniLM artifact bundle is copied to `resources/vitruvios-models/`; runtime code reads it there and never writes into release resources.
- Portable app-local settings resolve beside the executable under `.vitruvios/`; selected vault metadata remains inside each vault's own `.vitruvios/` folder.
- The first `release-candidate` launch exposed a package-boundary regression: the browser-loaded `third_party/markdown-it/markdown-it.min.js` had been placed only in external resources, so the renderer startup guard correctly rejected the missing `MarkdownItBrowserEngine`. The packaging rule is now covered by a regression test: browser-loaded runtime scripts ship in ASAR; release-only model assets and notices ship as external resources.
- Corrected candidate: `release-candidate-fixed/vitruvios-0.1.0-portable.exe`, SHA256 `A20843B3CA4399D2C3E1DB198BDB24157A6294E96813A43CED069399BCDA115B`. Static ASAR inspection confirms `third_party/markdown-it/markdown-it.min.js` is now present at the runtime path. Independent portable smoke passed on 2026-07-19: startup, portable `.vitruvios` state, Review Basket restoration, local embedding model, and existing indexes all worked outside the source runtime.
- The first build used the default Electron icon intentionally. Replace it with the final multi-size Windows `.ico` before a public release candidate.
- Build output is ignored by Git. A final candidate must still be built from a clean checkout, manually smoke-tested, checksumed, and scanned after the final release commit.
