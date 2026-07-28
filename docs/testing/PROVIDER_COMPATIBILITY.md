# Provider Compatibility

This matrix records configurations actually exercised against vincarios release candidates. It is not a compatibility guarantee; local model variants, provider versions, hardware, and endpoint settings can change behavior.

## Recording rule

Add a row only after the listed flows pass in the manual smoke pack:

- Chat response and cancellation
- File Summary
- Folder Summary
- Content Update proposal and reviewed execution
- Provider-offline error state

## Tested Configurations

| vincarios build | Windows | Provider | Provider version | Chat model | Embedding model | Result | Notes |
|---|---|---|---|---|---|---|---|
| No public-beta configuration recorded yet | | | | | | | |

## Scope

- LM Studio and Ollama are the supported local-provider baselines for `v0.1.0-beta.1`.
- An unlisted local OpenAI-compatible endpoint may work, but has not been verified for the public beta.
- The bundled embedding artifacts are identified separately in `THIRD_PARTY_NOTICES.md` and verified by `npm run model:verify`.