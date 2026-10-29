# vincarios Source Archive Checklist

## Closure Target

**Target:** finish the accepted safety hardening, then publish the GPL-3.0-only source and archive the repository after explicit approval. No public EXE, installer or CI binary artifact is planned. The repository has not yet been publicly archived.

Use GitHub's automatically generated `Source code (zip)` / `Source code (tar.gz)` for the approved release tag; do not upload a redundant custom source ZIP. Record the exact source commit. GitHub can regenerate archive compression, so do not promise an indefinitely identical ZIP checksum. Verify extracted contents and a clean setup instead. See [GitHub's archive documentation](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives).

Feature development has ended. Remaining work is bounded to verified closure blockers and accurate documentation, not a new release program. Beka confirmed retaining `0.1.0-beta.1` for the final snapshot on 2026-10-29; this is neither a stable 1.0 claim nor a promise of beta updates. The post-V1 backlog is historical reference for independent forks.

## Closure Order

1. Align public documentation with source-only, unmaintained distribution; preserve useful technical/history documents.
2. Resolve or explicitly disclose remaining safety/core-workflow findings; do not silently expand feature scope.
3. Check dependencies, licenses/assets, model integrity, current files and complete Git history for private material and secrets.
4. Prepare separately approved task commits and identify the exact tested source revision; never stage private audits or working vaults.
5. Verify a clean source setup and an internal Windows build, including native modules, fuses, checksum and manual smoke checks. No artifact upload.
6. Present the final report. Push/merge, public visibility, source release and repository archival each require explicit approval; verify the public source download afterward.

## What V1 Delivers

- Local-first Markdown vault navigation, Preview, Editor Light, Search, Vault Home, and Recent Files.
- Local LM Studio and Ollama provider workflows with explicit context and permissions.
- Reviewed note/project creation and whole-note updates with diff, backup, stale-content validation, and audit logging.
- Local Metadata, Embedding, and optional Full-text indexes.
- Vault Profiles, presets, Selection Actions, Suggestions, and built-in theme packs.

See the Product Brief, Architecture, Safety Rules, and UI/Workflow docs for the current contracts.

## Archive Preparation Gates

### Completed

The entries below record earlier preparation and their stated dates, not fresh remote/security verification or proof that closure is finished.

- [x] V1 feature scope frozen and core workflows manually smoke-tested.
- [x] GPL-3.0-only project license, third-party notices, and contribution terms prepared.
- [x] Dependency, license, model-integrity, and CI policy gates implemented.
- [x] Privacy-safe historical GitHub issue templates retained for independent forks; upstream no longer accepts issues or security reports.
- [x] Public-beta README, release-note draft, and Provider Compatibility matrix prepared.
- [x] Confirmed general creator contact: `dev@bekarioslabs.de`, not a support or security-reporting channel. Git commits retain the GitHub noreply identity.
- [x] GitHub Actions requires full commit-SHA pins; current CI actions use reviewed SHA references.
- [x] Dependabot PRs #12/#13 closed as superseded by patched dependencies; major-upgrade PRs #4/#6 deferred beyond the tested beta baseline. Open security alerts: zero on 2026-10-05.

### Before Public Archival

- [ ] Recheck public GitHub security settings after repository visibility changes: Secret Scanning, Push Protection, Dependabot alerts, malware alerts, and security updates where available.
- [ ] Activate the prepared default-branch ruleset after making the repository public, then verify deletion/force-push protection and the two required CI checks.
- [ ] Review public-facing repository files and confirm no private vault data, local paths, secrets, or obsolete brand text are tracked.
- [ ] Run the full release command set from the final release commit using a clean checkout.
- [x] On 2026-10-29, pin Electron 44.10.0 after approval and verify upstream support as well as npm audit. This replaces EOL 42.11.18; version 44 is currently scheduled to remain supported until 2027-03-02. Native source-runtime tests and Beka's real-app handtest passed; the final-revision packaged build remains a separate gate. Recheck support before actual publication, rather than treating this dated check as permanent. See the [official schedule](https://releases.electronjs.org/schedule).
- [ ] Complete the independent portable smoke test in a separate folder/profile.
- [ ] Record the observed provider/model configurations in `docs/testing/PROVIDER_COMPATIBILITY.md`.
- [ ] Build the internal Windows candidate from the final source revision, verify its fuses/native runtime and retain its checksum locally; publish no binary.
- [x] README, SECURITY and CONTRIBUTING explicitly provide no updates, support, issue/PR processing or security-report responses; historical beta templates and roadmap ideas do not invite active upstream submissions.
- [ ] Verify the selected source ZIP contains required code, lockfile and licenses, but no private working data, model cache, audit material or executables.
- [ ] Review existing GitHub Actions artifacts and Release assets before changing visibility; removing a future upload step does not remove old binaries.
- [ ] Obtain separate approvals for remote operations, then verify public source/license access and actual archival. Do not label the repository archived before it is.
- [x] Final snapshot version remains `0.1.0-beta.1`. On 2026-10-29, Beka approved the same voluntary, no-return Stripe tip link and Bekarios Labs website/legal/privacy links as Tessarios. Funding is not payment for products, services, updates or support. GPL-3.0-only and source-only distribution remain unchanged.
- [ ] Resolve old dependency PRs and repository settings only with approval. Disable Issues and any active private vulnerability-reporting invitation to match the no-intake policy; retained historical templates and ruleset files are not an active support channel.

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

The build command above is an internal verification gate or self-build option, not a public EXE release step. Preserve existing local output or use a checked, separate output directory. A build from an uncommitted worktree is provisional, not a certified final-revision candidate.

## Repository Administration

- Vincarios intentionally uses `GPL-3.0-only`; commercial use is allowed under its terms. No separate commercial license is currently offered. Other Bekarios Labs projects may choose different licenses independently.
- The private repository's current Free plan cannot enforce branch rules. `.github/rulesets/main.json` is the prepared ruleset for the default branch: block deletion and force pushes, require `JS checks and Node tests` and `Windows portable package smoke` from GitHub Actions, and do not require pull-request approval. When protection is active, push a candidate to `codex/**`, wait for both CI checks, then integrate the tested commit into `main`. Keep the rule names aligned with the workflow jobs.
- Activate the template only after public visibility is explicitly approved: `gh api --method POST repos/Bekarioslabs/Vincarios/rulesets --input .github/rulesets/main.json`. Inspect existing rulesets first to avoid duplicates; verify the active rules after applying it.
- Review Dependabot PRs against the patched lockfile. Superseded patches can be closed; major upgrades need a separate compatibility test and are not mandatory when the current version has no known vulnerability.
- No history rewrite is required for the current model-checksum false positives. `.gitleaksignore` contains exact commit/path/rule/line fingerprints only. After any future rewrite, scan the complete history and recreate exceptions only for verified public model checksums; never suppress a whole path or rule.
- Keep `dev@bekarioslabs.de` only as a general creator contact, not a technical-support or security-reporting service. Upstream does not process or answer security reports. Disable Issues and any private reporting invitation before archival; the GitHub profile and Git commit identity retain the noreply address.

## After Closure

- No upstream feature releases, bug fixes, compatibility/security updates, technical support, issue/PR processing or security-report responses are provided.
- [Historical ideas](VINCARIOS_POST_V1_BACKLOG.md) remain available for independent forks; they are not a delivery commitment.
