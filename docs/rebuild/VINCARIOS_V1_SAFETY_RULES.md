# vincarios V1 Safety Rules

## Non-Negotiable Laws

1. Providers never read or write vault files directly.
2. Renderer never gets direct filesystem power.
3. Main process validates every vault path.
4. Paths must stay inside the selected vault.
5. Dot folders are blocked from normal AI access.
6. Write actions require visible review.
7. Existing-file changes require backup.
8. Executed actions require audit log entries.
9. Remote providers receive no private vault context by default.
10. Prompt instructions can guide the model, but code enforces safety.

## Canonical Vault Paths

Normal note access validates protected path segments both before and after resolving filesystem links. An in-vault junction into `.obsidian`, `.vincarios`, or `.git` returns `protected_path`, including new descendants below an existing linked ancestor. The canonical check reuses the shared relative-path rules and their blocked-segment options; it does not inspect the absolute vault root name as a note segment. Ordinary links within the vault remain allowed, while links outside it remain blocked. App-owned index/configuration storage retains its separate internal paths and is not authorized through normal note access.

## Runtime Baseline

The source now pins Electron 44.10.0, replacing the unsupported 42 branch after explicit migration approval. Browser clipboard workflows already use `navigator.clipboard`, not the removed renderer `electron.clipboard` module; no new clipboard bridge or permission was introduced. The native sandbox/IPC/window/clipboard-policy and local inference checks must be repeated when the runtime changes, and a source-runtime pass does not certify a newly packaged executable. Review the [upstream breaking changes](https://www.electronjs.org/docs/latest/breaking-changes) and [support schedule](https://releases.electronjs.org/schedule) before a future self-build or archival snapshot.

## App Settings Recovery

The Main settings store distinguishes a missing file (`ENOENT`) from unreadable data. Missing settings use defaults normally. A read/permission failure uses session defaults but blocks every settings mutation until the file can be read after restart; it must not be called JSON corruption or silently overwritten. Failed saves return an explicit settings error and do not commit the candidate in-memory settings. Provider/model selection restores its previous runtime value when persistence fails.

Malformed JSON or a non-object JSON root is recoverable only after the exact source bytes have been preserved beside the app settings file as a unique `settings.json.corrupt-<timestamp>[-suffix]` copy. Exclusive creation never overwrites an earlier copy; only collisions are retried, up to 100 attempts. On a partial-copy failure, cleanup may remove only the copy created by that attempt. If preservation fails, saving remains blocked. The original settings file is left intact until a later settings save; a successful recovery copy permits saving new defaults/preferences without losing the retained original.

Bootstrap displays one native warning per settings-store startup after creating the main window. The warning distinguishes successful recovery from blocked read/recovery, names the retained copy when available and gives a next action; raw filesystem errors and absolute paths are not sent to the renderer. Valid or genuinely missing settings produce no recovery warning. This is settings-load recovery, not a claim of crash-durable or transactional ordinary settings saves.

## IPC Sender And Error Boundary

Bootstrap passes one Main-only safe registration facade to every existing IPC registration module. `main/ipc/safeHandle.js` owns this boundary; services, channel names, payloads and expected return values remain unchanged. A request must originate from the current live main window's exact WebContents, its main frame, and the exact app `index.html` file URL. Missing frames, child frames (even at the same origin), other windows/documents and destroyed or replaced windows are denied before invoking a service. Sender-check failures deny access; they never become approval.

Unexpected synchronous exceptions and asynchronous handler rejections return `ipc_request_failed` with a short recovery message. Reports contain only the static channel and error code, not request payloads, note content, raw exception text, stacks or absolute paths. Expected service failures such as cancellation, stale content and unavailable indexes pass through unchanged. This boundary does not replace path validation, R/W context rules, Review, backups or vault-session isolation; it does not claim to prevent compromised code already executing inside the trusted main frame.

The policy follows [Electron's sender-validation guidance](https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages), with stricter app-owned window/frame identity checks. The optional `node scripts/probe-ipc-boundary.js` exercises real sandboxed Electron frames/windows using synthetic files and a temporary profile; it never opens a user vault. Its adversarial iframe fixture enables a narrow preload bridge in subframes only for the test, not in the app.

## Whole-Note Update Context Budget

`chat:check-update-budget` uses the trusted sender boundary. This metadata-only preflight sends only model/status GETs to a local provider, never note text or a generation request. A successful preflight is not reusable authorization: `chat:send` with `purpose: whole_note_update` rechecks allocation and caps output. Unsupported/external providers and unknown allocations fail closed for this action. Conservative estimation never authorizes source truncation or context enlargement and does not replace existing write safeguards.

## Permission Model

Startup acquires Electron's single-instance lock before namespace migration, settings loading or IPC registration. A denied lock quits without starting those services; the primary instance restores and focuses its live window on a second launch. Portable executable lock identity still requires the final Windows runtime smoke test.

- Local File Tree navigation, Markdown Preview, deterministic local Search, and local index building do not require Read permission. They remain inside the selected vault and never send note content to a provider by themselves.
- Read permission allows a selected file or folder snapshot to become provider-bound AI context.
- Write permission allows proposals to be considered.
- Write permission does not mean silent execution.
- V1 has no Trusted/Yolo mode.

The permission boundary is intentional: `R` means **AI/context permission**, not a general local-viewing permission. Any future remote provider remains opt-in and must receive no private vault context without a separate explicit approval flow.

## Backup Model

Backup copies use exclusive creation: an existing backup is never overwritten. Equal timestamps receive a numeric suffix, with at most 100 copy attempts; only name collisions are retried. Audit failure removes only the new backup created by that attempt, never a pre-existing copy. Other copy failures and exhausted collisions stop the note operation with `backup_failed`.

Backup before:

- update
- insert into existing note
- move
- rename
- delete

No backup needed for:

- creating a new file that does not yet exist
- manual vincarios configuration writes under `.vincarios/`, such as Folder Visual Identity settings, because they do not change Markdown content or Obsidian configuration

Manual vincarios configuration writes are intentional low-risk app settings writes. They do not use the Review Basket, content diff, or note-backup pipeline. Future config history may record them separately from vault-content audit entries.

## Audit Log

Audit log stores metadata, not full note content.

Minimum fields:

- timestamp
- action type
- source path
- target path
- result
- provider/model if relevant
- backup path if created

## Diff Rule

If a write changes an existing Markdown file, show the user what changes before applying.

The shared diff module derives update risk from complete source text, independently of provider-supplied risk. Empty or unsafe-to-compare replacements are non-executable. High-risk updates require a fresh labelled acknowledgement before Apply becomes available; Cancel receives initial focus for both normal and high-risk updates. Reopening the dialog never restores a previous acknowledgement. Thresholds live in `UPDATE_RISK_LIMITS` in `src/shared/actions/diffPreview.js`: at least 10 removed/replaced lines and 30% of the original lines, replacement length below 60% of the original, or removal of the complete YAML frontmatter block. Deliberate large rewrites remain possible after review; thresholds warn rather than silently reject them.

## Cloud Rule

Cloud support is not V1. When added later, it must have separate context approval and sensitive-data warnings.

## Code Rules Vs Brain Rules

Code-side safety laws are the highest authority.

Brain/Core Markdown may explain, reinforce, and configure behavior, but it must not override code-side safety rules.

Priority order:

```text
Code Safety Laws
> App Configuration / Vault Profile
> Brain Core Rules
> Behavior Preferences
> Project Rules
> Current Chat Request
```

Rebuild sequence:

1. Define code-side safety laws and action boundaries first.
2. Define Brain/Core files only after the app laws are clear.
3. Keep Brain/Core concise and non-duplicative.
4. If a Brain rule conflicts with code behavior, fix the Brain rule instead of weakening code safety.


## Payload Size Guards

Main-process services enforce hard payload limits before provider calls or vault writes happen.

V1 defaults:

- create note content: 200000 characters
- update note proposed content: 300000 characters
- provider message payload: 120000 aggregate message characters

These limits live in `src/shared/security/payloadLimits.js` and can be adjusted through Settings limits. Oversized create/update requests fail before writing, backing up, or auditing. Oversized provider requests fail before contacting LM Studio, Ollama, or future providers.

## Electron Window Boundary

vincarios loads its packaged local shell only. The main BrowserWindow blocks direct `will-navigate` events and denies `window.open` requests. Markdown external links require an explicit preview confirmation and then use the main-process IPC flow, which accepts only `http:` and `https:` URLs before opening the system browser.
## Renderer Content Security Policy

The renderer declares a static Content Security Policy in `index.html`.

V1 policy goals:

- local scripts only via `script-src 'self'`
- local styles only via `style-src 'self'`
- no `unsafe-inline`
- no `unsafe-eval`
- no renderer network fetches by default via `connect-src 'none'`
- local/data/file images are allowed for UI and vault previews
- object/embed/form targets are blocked

Provider calls stay in the main process through IPC, not in renderer fetches. If a future renderer feature needs network access, update this policy deliberately and add a focused test.
