# ZEUS V1 Architecture

## Core Shape

```text
UI
-> Review Store
-> Action Parser / Action Builder
-> Safety Gate
-> Vault Services
-> Backup + Audit
-> Provider Layer
-> Embedding Index
```

## Main Principle

The LLM never reads or writes files directly. It returns structured suggestions. The app decides what is valid, visible, reviewable, and executable.

## Suggested Source Structure

```text
src/
  main/
    app/
    vault/
    safety/
    actions/
    backup/
    audit/
    providers/
    embeddings/
    settings/
  renderer/
    shell/
    chat/
    review/
    files/
    context/
    permissions/
    markdown/
    projects/
    settings/
    prompts/
  shared/
    actions/
    schemas/
    vaultProfile/
    pathRules/
    config/
    types/
tests/
docs/
```

## Required Separation

- Provider modules generate text or embeddings only.
- Vault services read/write/list files only after safety validation.
- Safety rules are code-side laws, not prompt wishes.
- Prompt rules live in a dedicated module, not scattered through UI code.
- Renderer modules are browser-first. They must use loaded `window.Zeus...` APIs before CommonJS `require(...)` fallbacks; `require(...)` exists only so the same modules can run in Node tests.
- Review state is its own concept, not just chat messages.
- Context control and permission state are their own modules, not hidden inside chat or file-tree rendering.
- The bootstrap entry should initialize modules only; it must not become a large orchestration file.


## Vault Profile And Folder Roles

App logic should use folder roles instead of hard-coded vault folder names.

Default roles ship with the ZEUS starter structure:

```text
inbox     -> 00_Inbox
daily     -> 01_Tagesnotizen
projects  -> 02_Projekte
knowledge -> 03_Wissen
brain     -> 90_AI_Brain
archive   -> 99_Archiv
```

Consumers should ask for roles such as `inbox`, `projects`, or `knowledge` through `src/shared/vaultProfile/defaults.js`. They should not hard-code these default folder names in workflow logic. Forks and future Options UI can add or override roles through the profile without rewriting consumers.

## Provider Plan

V1:

- LM Studio chat.
- Ollama chat.
- One local embedding provider path.

Later:

- OpenAI-compatible APIs.
- OpenRouter.
- Claude/Anthropic.
- Separate remote-context approvals.

## Embedding Plan V1-Light

Embeddings are search support, not automation authority.

```text
Markdown file -> chunks -> local index -> candidates -> review suggestions
```

Use for:

- similar notes
- possible links
- possible tags
- possible target folders

Index behavior:

- enabled automatically by default
- can be disabled in Options
- has a manual rebuild/update button in Options
- runs as a background job, not as a blocking UI operation
- uses limits and batching for large vaults
- stores data locally and outside Git/private sharing
- uses hashes/modified timestamps so unchanged files are not re-indexed unnecessarily

Do not use for:

- automatic cleanup
- hidden whole-vault ingestion
- irreversible decisions

## First Audits

Run a focused audit after each block:

1. project scaffold and dependency choice
2. vault path/safety layer
3. action schema and review store
4. provider integration
5. embedding index
6. first full cleanup workflow

## Module Responsibility Rules

- `chat` renders messages and sends model requests; it does not own vault writes.
- `review` owns proposal state, selected items, statuses, and execution requests.
- `files` owns file tree navigation and selected path state.
- `context` is split by responsibility: `contextState` stores the active target, `pendingActionState` stores one open request-scoped clarification, `contextIntent` detects selected-file/folder intent from user prompts, `contextLimits` owns central request-size caps, `folderContextController` owns selected-folder scope decisions, and `contextPackageBuilder` builds request-scoped provider context from those inputs. Future dropped Markdown files, folder indexes, and embedding candidates should extend this module family instead of adding hidden rules to chat or file-tree code.
- `permissions` owns Read/Write state and inheritance display.
- `providers` talk to LM Studio/Ollama; they never access files.
- `vault` reads/writes/lists files only after safety validation.
- `embeddings` indexes and searches; it only returns candidates.