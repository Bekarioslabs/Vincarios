# vincarios Release Roadmap

## Current Release

**Target:** `v0.1.0-beta.1` public beta for Windows 10/11.

vincarios V1 is feature-frozen. New work may enter this release only when it resolves a security, data-loss, core-workflow, or external-testing blocker. All other ideas belong in the post-V1 backlog.

## What V1 Delivers

- Local-first Markdown vault navigation, Preview, Editor Light, Search, Vault Home, and Recent Files.
- Local LM Studio and Ollama provider workflows with explicit context and permissions.
- Reviewed note/project creation and whole-note updates with diff, backup, stale-content validation, and audit logging.
- Local Metadata, Embedding, and optional Full-text indexes.
- Vault Profiles, presets, Selection Actions, Suggestions, and built-in theme packs.

See the Product Brief, Architecture, Safety Rules, and UI/Workflow docs for the current contracts.

## Public Beta Gates

### Completed

- [x] V1 feature scope frozen and core workflows manually smoke-tested.
- [x] GPL-3.0-only project license, third-party notices, and contribution terms prepared.
- [x] Dependency, license, model-integrity, and CI policy gates implemented.
- [x] Privacy-safe GitHub issue templates and private vulnerability reporting prepared.
- [x] Public-beta README, release-note draft, and Provider Compatibility matrix prepared.

### Before `v0.1.0-beta.1`

- [ ] Recheck public GitHub security settings after repository visibility changes: Secret Scanning, Push Protection, Dependabot alerts, malware alerts, and security updates where available.
- [ ] Review public-facing repository files and confirm no private vault data, local paths, secrets, or obsolete brand text are tracked.
- [ ] Run the full release command set from the final release commit using a clean checkout.
- [ ] Complete the independent portable smoke test in a separate folder/profile.
- [ ] Record the observed provider/model configurations in `docs/testing/PROVIDER_COMPATIBILITY.md`.
- [ ] Build the Windows portable artifact from the final release commit and publish its SHA256 checksum.
- [ ] Create the `v0.1.0-beta.1` GitHub pre-release with Windows-only and unsigned-build guidance.

## Release Commands

Run from a clean checkout with the committed lockfile:

```text
npm ci
npm run audit:security
npm run licenses:check
npm test
npm run model:verify
gitleaks detect --source . --redact --no-banner
npm run build:win
```

If the embedding model is intentionally absent, run `npm run model:provision` from a trusted network before verification or packaging.

## After V1

- `0.1.x`: public-beta bug fixes, regression fixes, documentation corrections, and release hardening only.
- `0.2.x` and later: planned feature work from [Post-V1 Backlog](VINCARIOS_POST_V1_BACKLOG.md), selected through the same safety and review criteria.
