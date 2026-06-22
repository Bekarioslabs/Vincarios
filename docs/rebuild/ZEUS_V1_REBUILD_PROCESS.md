# ZEUS V1 Rebuild Process

## Current Assumption

The current `D:\ZEUS_AGENT` folder has been backed up externally by Beka.

The current folder can therefore be treated as replaceable, but destructive cleanup still needs an explicit final go before execution.

## GitHub Cleanup Reality

A normal commit that deletes old files does not remove them from Git history.

If GitHub should have no prototype remnants, there are three realistic choices:

1. **New repository**
   - cleanest public history
   - no old prototype commits
   - easiest to reason about

2. **Delete/recreate the existing GitHub repository**
   - keeps the name if recreated
   - removes old history
   - requires careful GitHub-side handling

3. **Orphan branch + force-push**
   - reuses the same repository URL
   - replaces visible history with a new root commit
   - powerful but risky; only do after backup and explicit confirmation

For a clean public V1, prefer option 1 or 2. Use option 3 only if preserving the exact remote URL is important.

## Local Folder Strategy

Because Codex has stable context in `D:\ZEUS_AGENT`, the rebuild may reuse this same local folder after cleanup.

Recommended sequence:

1. Confirm final V1 briefing.
2. Confirm external backup exists.
3. Commit or export the rebuild planning docs if desired.
4. Decide GitHub strategy: new repo, recreated repo, or orphan force-push.
5. Clean local project folder.
6. Scaffold V1 from scratch.
7. Add new `AGENTS.md`, README, docs, package setup, and source structure.
8. Run first scaffold audit.

## What Not To Carry Over Blindly

- old `renderer.js`
- old `main.js`
- old inline CSS structure
- old Brain OS files
- old private vault
- old backup BAT
- old action prompt blocks

## What To Use As Reference

- `docs/rebuild/*`
- current tests as inspiration, not as copied architecture
- old action parser lessons
- old permission and context bugs
- old review/diff lessons
- old provider boundary lessons

## Backup BAT Decision

The old `ZEUS_BACKUP.bat` belongs to the prototype setup.

V1 should not inherit it directly.

V1 later needs a clean backup strategy matching the new vault/profile/runtime structure.
