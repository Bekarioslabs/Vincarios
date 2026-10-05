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
- [x] Confirmed private security contact: `dev@bekarioslabs.de`. Git commits retain the GitHub noreply identity.
- [x] GitHub Actions requires full commit-SHA pins; current CI actions use reviewed SHA references.
- [x] Dependabot PRs #12/#13 closed as superseded by patched dependencies; major-upgrade PRs #4/#6 deferred beyond the tested beta baseline. Open security alerts: zero on 2026-10-05.

### Before `v0.1.0-beta.1`

- [ ] Recheck public GitHub security settings after repository visibility changes: Secret Scanning, Push Protection, Dependabot alerts, malware alerts, and security updates where available.
- [ ] Activate the prepared default-branch ruleset after making the repository public, then verify deletion/force-push protection and the two required CI checks.
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

## Repository Administration

- Vincarios intentionally uses `GPL-3.0-only`; commercial use is allowed under its terms. No separate commercial license is currently offered. Other Bekarios Labs projects may choose different licenses independently.
- The private repository's current Free plan cannot enforce branch rules. `.github/rulesets/main.json` is the prepared ruleset for the default branch: block deletion and force pushes, require `JS checks and Node tests` and `Windows portable package smoke` from GitHub Actions, and do not require pull-request approval. When protection is active, push a candidate to `codex/**`, wait for both CI checks, then integrate the tested commit into `main`. Keep the rule names aligned with the workflow jobs.
- Activate the template only after public visibility is explicitly approved: `gh api --method POST repos/Bekarioslabs/Vincarios/rulesets --input .github/rulesets/main.json`. Inspect existing rulesets first to avoid duplicates; verify the active rules after applying it.
- Review Dependabot PRs against the patched lockfile. Superseded patches can be closed; major upgrades need a separate compatibility test and are not mandatory when the current version has no known vulnerability.
- No history rewrite is required for the current model-checksum false positives. `.gitleaksignore` contains exact commit/path/rule/line fingerprints only. After any future rewrite, scan the complete history and recreate exceptions only for verified public model checksums; never suppress a whole path or rule.
- Keep the working security email in `SECURITY.md`, README, and release notes. The GitHub profile and Git commit identity retain the noreply address.

## After V1

- `0.1.x`: public-beta bug fixes, regression fixes, documentation corrections, and release hardening only.
- `0.2.x` and later: planned feature work from [Post-V1 Backlog](VINCARIOS_POST_V1_BACKLOG.md), selected through the same safety and review criteria.
