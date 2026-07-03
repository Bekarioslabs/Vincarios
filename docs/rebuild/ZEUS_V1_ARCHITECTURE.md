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
    selectionActions/
    suggestions/
    sessionLog/
    selection/
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
- Suggestions are their own concept between analysis and Review Basket execution. They must not be hidden in chat text.
- Context control and permission state are their own modules, not hidden inside chat or file-tree rendering.
- The bootstrap entry should initialize modules only; it must not become a large orchestration file.


## Vault Profile And Folder Roles

App logic should use folder roles instead of hard-coded vault folder names.

Current source of truth: `src/shared/vaultProfile/defaults.js`. Always read that file before assuming role names.

Phase 5.4 defaults are English:

```text
inbox     -> 00_Inbox
daily     -> 01_Daily
projects  -> 02_Projects
knowledge -> 03_Knowledge
brain     -> 90_AI_Brain
archive   -> 99_Archive
```

Consumers should ask for roles such as `inbox`, `projects`, or `knowledge` through the vault profile helpers. They should not hard-code default folder names in workflow logic. Forks and future Options UI can add or override roles through the profile without rewriting consumers.
## Settings Plan

Settings are app configuration, not provider logic.

V1 Settings categories:

- `providers`: active provider, selected models, local URL overrides.
- `limits`: provider timeout, model-list timeout, selected-file context cap, folder/file listing caps, analysis file cap, and review suggestion cap.
- `vaultProfile`: folder role overrides for Inbox, Daily, Projects, Knowledge, Brain, and Archive.
- `theme`: basic mode/accent readiness through CSS variables.
- `safety`: review-required and future trusted-mode flags. Trusted mode is not V1 behavior.

The settings store persists normalized JSON under the portable app data folder `ZEUS_AGENT/.zeus/settings.json`, not under Windows `AppData`. If a legacy `userData/settings.json` exists, startup migrates it to the portable path and removes the old file. Provider services consume the provider category through `providerSettingsState`, but providers do not own settings persistence, UI, vault access, backups, or safety rules. The Vault Profile settings bridge exposes role overrides for future consumers; it does not replace the Phase 2 folder-role helpers.

## Provider Plan

V1:

- LM Studio chat through the shared provider registry and OpenAI-compatible chat/model endpoints.
- Ollama chat through the shared provider registry and Ollama-native `/api/tags` and `/api/chat` endpoints.
- Provider definitions own default URLs and endpoint paths; Settings can override local provider URLs without changing provider modules.
- The topbar shows provider and model dropdowns. The Provider layer still never reads or writes vault files.
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

- enabled automatically by default only after the user has opened a vault and accepted local indexing behavior.
- can be disabled in Settings.
- has a manual rebuild/update button in Settings.
- runs as a background job, not as a blocking UI operation.
- uses limits and batching for large vaults.
- uses hashes/modified timestamps so unchanged files are not re-indexed unnecessarily.
- stores index data outside normal vault notes in the selected vault's `.zeus/index` folder by default. `.zeus` remains blocked from normal AI/file-tree context and is used only by internal main-process services.

Model behavior:

- V1 base model decision: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`.
- V1 Transformers.js artifact source: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, because that repo is explicitly structured for Transformers.js with ONNX weights.
- Default license follows the Apache-2.0 base model card.
- Default dimensions: 384.
- Runtime target: Transformers.js / ONNX.
- Model artifact storage is prepared under project `.zeus/models/embeddings/...` through `src/main/embeddings/embeddingModelStore.js`. Local development artifacts are verified against source, license, revision, expected file list, and the recorded ONNX SHA256 before use.
- Current expected artifact set is `config.json`, tokenizer files, `unigram.json`, and `onnx/model_quantized.onnx`; the quantized ONNX SHA256 is recorded in the model store before download wiring.
- `src/main/embeddings/embeddingRuntimeService.js` owns local inference. It loads the local model path through Transformers.js/ONNX, sets `allowRemoteModels=false`, caches the extractor, and returns vectors only. It must not read vault files, write vault files, or call chat providers.
- `src/main/embeddings/embeddingMarkdownSource.js` owns Markdown discovery for indexing. It scans recursively, reads Markdown files only, and skips protected dot folders such as `.zeus` and `.obsidian`.
- `src/main/embeddings/embeddingIndexer.js` coordinates Markdown source, runtime, and index store. It splits YAML frontmatter from body text, chunks Markdown, embeds changed documents, reindexes legacy records that lack split vectors, skips unchanged hash/mtime records, and stores vectors under the selected vault `.zeus/index`.
- `src/main/embeddings/embeddingSimilaritySearch.js` owns local similar-note lookup. It reads stored vectors, supports `content`, `metadata`, and `mixed` scoring modes, applies Settings/default thresholds and result limits, can explicitly rebuild the selected vault index before a search when requested, computes ranked `similar_note` candidates, and never creates review actions by itself.
- Packaging direction: keep model artifacts out of Git. Prefer bundling the embedding model with official release builds/installer if size remains acceptable. Developer/source users can use a controlled download script or app download flow.
- Settings may allow a custom local embedding model path.
- `intfloat/multilingual-e5-small` remains a later optional custom-model candidate, not the bundled default, because its license is MIT rather than Apache-2.0.
- Switching embedding models requires a clear reindex notice.
- Embedding models are separate from chat providers and must not grant providers vault access.
- No cloud embeddings in V1.

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
- `files` owns file tree navigation, file-tree keyboard navigation, and selected path state.
- `selectionActions` owns deterministic actions shown for the currently selected file/folder. It must use app state and action registries, not broad prompt phrases. `actionCategories` owns behavior color categories, `actionRegistry` owns target-to-action mapping, and `mountSelectionActions` owns the visible panel.
- `suggestions` owns grouped analysis results before they become Review Basket proposals. It should store suggestion groups/items, selected suggestion state, dismiss state, and selected-detail preview state. It must not execute vault writes.
- `sessionLog` owns per-session UI messages for visible app activity. Persistent audit logs remain main-side audit service responsibility.
- `selection` owns scoped selection behavior such as region-aware `Ctrl+A` and right-click select/copy commands.
- `context` is split by responsibility: `contextState` stores the active target and explicit Context Basket items, `mountContextBasket` owns the visible basket UI, `pendingActionState` stores one open request-scoped clarification, `blockedActionState` stores retryable app actions that were blocked by missing permissions or stale target state, `contextIntent` remains a narrow fallback only, `contextLimits` owns central request-size caps, `folderContextController` owns selected-folder scope decisions, and `contextPackageBuilder` builds request-scoped provider context from explicit Context Basket items. Future dropped Markdown files, folder indexes, and embedding candidates should extend this module family instead of adding hidden rules to chat or file-tree code.
- `permissions` owns Read/Write state and inheritance display.
- `providers` talk to LM Studio/Ollama; they never access files.
- `vault` reads/writes/lists files only after safety validation. Reviewed template writes may create folders through `createFolder` and notes through `createNote`; folders are created before files.
- `embeddings` discovers Markdown, chunks content, runs local embeddings, stores indexes, and searches. It only returns candidates; it never performs cleanup or writes vault notes.
- `settings` owns app configuration categories, normalization, persistence, and Settings UI/IPC. Settings UI should use a category menu plus active content pane instead of a single ever-growing modal body. Provider modules consume provider settings but do not own settings storage.
- `templates` owns deterministic note/project preset definitions, materialization, and conversion from create plans to review proposals. Presets target vault folder roles instead of hard-coded folder names and return create plans; they do not write files directly. Multi-folder/multi-file project presets enter review as one `create_from_template` proposal instead of flooding the basket with separate file entries.
