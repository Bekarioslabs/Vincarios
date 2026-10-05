# CODEX_SETUP.md - Environment & Tool Notes

This file covers Codex-specific environment friction and Windows/sandbox workarounds.
It is not product documentation. Do not read this file for architecture or feature decisions.

---

## Environment Assumptions

- Platform: Windows (`<project-root>`; the checkout folder name is not product identity)
- Node runtime: available via `npm` or bundled Node path
- Shell: PowerShell by default, cmd fallback when needed
- Electron: dev dependency, started via `npm start` or `npx electron .`

---

## Known Tool Friction

Handle these quietly and consistently. Do not over-explain repeated issues.

### apply_patch failures

If `apply_patch` fails because of the Windows sandbox helper:
- Use one controlled fallback edit method with exact anchors.
- Immediately inspect the changed region with a diff or targeted read.
- Do not perform broad string rewrites as a substitute.

### Large PowerShell text rewrites

Avoid large PowerShell text rewrites for renderer/UI files.
- Prefer `apply_patch` with exact anchors.
- If unavailable, use targeted Node/PowerShell edits.
- Always follow with a diff and encoding check.

### Read command failures

If a read command fails because of a known Windows or sandbox issue:
- Retry once with an equivalent approved command or a narrower read.
- If sandboxing blocks access, request escalation through the tool.
- Do not invent indirect workarounds.

### Missing optional skill paths

If an optional external skill path is missing:
- Note it briefly and continue with the closest manual process.
- Do not block the task on optional tooling.

### npm unavailable

If `npm` is unavailable in the shell:
- Use the bundled Node runtime to run equivalent check/test commands.
- Check `package.json` scripts for the correct command names.

---

## Standard Commands

```bash
npm test                    # full test suite - run before every commit
npm run check               # JavaScript source check
npm run audit:security      # complete dependency audit; no advisory exceptions
npm run licenses:check      # lockfile-derived runtime license policy
npm run model:provision     # download and verify the pinned embedding artifacts
npm run model:verify        # verify all local embedding artifact hashes
npm run build:win           # verified Windows portable package
npm start                   # start Electron app
start.bat                   # Windows launcher; project-local .vincarios user-data/cache
```

Run targeted tests first for small changes. Reserve `npm test` for commits, safety-sensitive changes, and broad shell/IPC/provider/context changes.

---

## Git Hygiene

Check Git status before committing.

Do not commit:
- private vault data or personal notes
- `node_modules/`
- generated backups or audit output
- local model caches or logs
- unrelated user files

---

## Encoding Note

JavaScript files under `src/` should be UTF-8 without BOM.
After any PowerShell file write, verify encoding with a targeted read before claiming the change is clean.
