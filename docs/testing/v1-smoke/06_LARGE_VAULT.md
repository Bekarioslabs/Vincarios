# 06 - Large Vault Performance

This is a repeatable manual capacity check, not a benchmark contest. Run it before a beta release or after changing File Tree, vault scanning, indexing, or Search.

## Fixture

Create a separate ignored fixture vault. The generator refuses a non-empty target directory and never changes an existing vault:

```text
node scripts/create-large-vault-fixture.js dev-vault/V1 Large Vault Fixture 3000 30
```

This creates 3,000 deterministic Markdown notes across 30 folders. Remove that fixture folder manually when the check is complete.

## Record

| Check | Result / duration | Notes |
|---|---|---|
| Open fixture vault | | |
| Initial File Tree visible | | |
| Expand three populated folders | | |
| Refresh enabled indexes | | |
| Search names/paths for `Note-1500` | | |
| Search metadata for `large-vault-fixture` | | |
| Search Full-text for `copper forest station` | | |

## Pass Criteria

- [ ] The app remains responsive while the File Tree and indexes load; controls do not become permanently stuck.
- [ ] Initial File Tree load, folder expansion, and local Search complete without crash or visible runaway memory growth.
- [ ] `Refresh enabled indexes` reaches Ready exactly once. Full-text is included only when enabled.
- [ ] Search returns deterministic fixture results in the chosen scope. The shared `copper forest station` phrase may show only the first 100 of 3,000 matches; the UI must say that the visible list is capped.
- [ ] Any delay that feels disruptive is recorded with the device, duration, selected scope, and index state before code is changed.

Do not treat a slow device alone as a product bug. Optimize only after a reproducible bottleneck is identified.
