# vincarios V1 Tests And Audits

## Test Principle

Safety-critical behavior is tested at the owning boundary. Release claims require fresh command output; historical pass counts are not release evidence.

## Required V1 Coverage

- path containment, canonical root identity, dot-folder blocking, and vault-session isolation
- reviewed action schema, stale checks, backup, atomic write, rollback, and audit behavior
- Read/Write permission and provider-context boundaries
- renderer/preload IPC parity and sandboxed Electron configuration
- bounded Markdown, YAML, diff, provider, and index payloads
- Metadata, Embedding, and Full-text index freshness, incremental updates, cancellation, and single-flight refresh
- Review Basket persistence and atomic template execution
- Markdown Preview, Editor Light, Search, Home, Suggestions, Review, and Session Log ownership
- bundled embedding-model availability, offline loading, pinned revision, and SHA256 verification
- dependency advisories, install scripts, runtime license inventory, and release packaging contracts

## Release Commands

Run these from a clean checkout with Node.js 24 and the committed lockfile:

```text
npm ci
npm run audit:security
npm run licenses:check
npm run check
npm test
npm run model:verify
gitleaks detect --source . --redact --no-banner
npm run build:win
```

If the model is intentionally absent from a clean source checkout, run `npm run model:provision` from a trusted network before `model:verify` or `build:win`.

## CI Contract

`.github/workflows/ci.yml` pins official GitHub actions to commit SHAs.

- Ubuntu job: clean install, advisory policy, license policy, JavaScript checks, and all Node tests.
- Windows job on `main` and pull requests: clean install, pinned model provisioning, portable package build, and short-lived artifact upload.
- Runtime install scripts are denied by default. Only the reviewed native ONNX and Windows packaging scripts are allowed; the protobufjs informational script is denied.

## Current Supply-Chain Baseline

### npm dependencies - 2026-07-26

- Runtime audit (`npm audit --omit=dev --audit-level=high`): no known vulnerabilities.
- Patched transitive versions are pinned or overridden: `adm-zip@0.6.0`, `protobufjs@7.6.5`, `fast-uri@3.1.4`, `sharp@0.35.3`, and `tar@7.5.22`.
- Full audit has one documented build-only advisory chain: `GHSA-mh99-v99m-4gvg` in Electron Builder tooling through `brace-expansion`.
- `scripts/audit-dependencies.js` accepts only that exact advisory through the reviewed build-package chain. Any new advisory or runtime package fails the gate.
- Do not use `npm audit fix --force`; its suggested dependency downgrade is not an accepted repair.

### Licenses - 2026-07-26

- `licenses/npm-runtime-licenses.json` is generated from every non-development package resolution in `package-lock.json` and currently contains 84 unique package/version/license entries, including optional platform variants.
- `npm run licenses:check` rejects missing or unreviewed license expressions and fails if the committed inventory is stale.
- `THIRD_PARTY_NOTICES.md` covers the bundled UI assets, Electron, direct runtime libraries, embedding model, and Sharp/libvips binary notices.
- No AGPL, SSPL, Commons Clause, non-commercial, proprietary, or unknown runtime license metadata is present in the current lockfile.
- The project itself is GPL-3.0-only. `LICENSE`, package metadata, and public documentation must remain aligned before publication.

### Embedding model - 2026-07-26

- Artifact source: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`.
- Pinned source revision: `2c4055b12046f11709e9df2c122e59ffbdc2f900`.
- Six required files have pinned SHA256 values; the ONNX artifact hash is `66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc`.
- The runtime verifies all artifacts before first load. Provisioning downloads only from the pinned revision into a staging folder, verifies each file, and swaps the complete model atomically.
- Packaging fails when the model is missing or modified.

## Manual Smoke Areas

The repeatable, fixture-backed release checklist is [V1 Manual Smoke Test](../testing/V1_MANUAL_SMOKE_TEST.md).

- splash: version, recent vaults, provider state, and Open Vault
- two vaults opened in sequence with no permissions, settings, indexes, or Review state crossing roots
- migration conflict: both legacy and current namespace data stop startup without merge or overwrite
- File Tree navigation, watcher refresh, R/W inheritance, rename, and index freshness
- Preview and Editor Light: Markdown, properties, images, links, dirty-navigation prompt, reviewed update, and refresh after execution
- Context Basket plus local provider file/folder context; deliberate external provider URL requires separate approval
- Folder Inspect/Summary, Inbox Review, Similar Notes, Search, Home, Suggestions, Review, and Session Log
- note/project template creation failure after a later artifact: no partial project remains
- malformed and deeply nested YAML: fail-soft preview/search and no unsafe metadata proposal
- provider offline: visible recovery state and no stuck request
- generated large-vault fixture: record index/search duration and observed UI responsiveness
- portable Windows candidate launched from a separate folder/profile with app-local state, model, indexes, Review persistence, and notices available

## Release Artifact Rules

- Build from a clean checkout after all gates pass.
- Publish source revision and SHA256 checksum for every downloadable artifact.
- State clearly that the V1 build is Windows-only and unsigned until code signing exists.
- Keep SmartScreen and build-from-source instructions in release guidance.
- Do not claim bit-for-bit reproducibility until separately demonstrated.
- Re-run dependency, license, secret, model, test, and package gates after the final release commit.
