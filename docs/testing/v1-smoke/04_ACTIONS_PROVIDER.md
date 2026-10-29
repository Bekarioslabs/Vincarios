# 04 - Actions, Context, Chat, and Providers

## Provider State And Chat

- [ ] Start with LM Studio and Ollama offline. Both show a recoverable offline state; opening a vault and local workspaces still works.
- [ ] Send a provider-backed request while offline. Vincarios reports the provider problem without crashing or leaving Send stuck as Cancel.
- [ ] Start LM Studio or Ollama, use Refresh provider state, select a model, and send `Reply with exactly: provider smoke green`. A normal assistant bubble appears.
- [ ] Send a deliberately slow request, then press the X/Cancel control. The UI returns to idle, no late answer is appended, and the local provider request is actually aborted.
- [ ] Every assistant response exposes Save as Note and Copy on hover; the timestamp appears on the opposite side.

## File Context

- [ ] Select `08 File Context.md` with R off. Use as Context is inactive and explains that R is required.
- [ ] Enable R and add it. Context Basket shows one compact MD packet without redundant full-path/type text.
- [ ] Ask `What is the verification phrase and who is the coordinator?` The answer uses `silver cedar observatory` and `Mira`.
- [ ] Remove the packet and ask again in a fresh request. The provider must not claim the fixture details from active context.
- [ ] Add two files, click each Context Basket packet, and confirm Files selects the matching target. Clear All removes every packet.

## Folder Context And Folder Actions

- [ ] Select `Folder Scope`, enable R, and run Inspect Folder at current level. The response uses a structured heading/list and contains Direct A/B but not Deep C.
- [ ] Use Check whole tree or recursive scope. Deep C appears under its nested path; no Markdown body content is claimed by Inspect.
- [ ] Add Folder Scope as Context with current-level bounds. The Context packet visibly states scope and limits.
- [ ] Ask for the direct markers. The answer can use `amber maple station` and `blue harbor station` but not `copper forest station`.
- [ ] Replace the packet with recursive depth that includes Nested. The provider can now use `copper forest station`.
- [ ] Run Summarize MD files with a small visible bound. Only included Markdown notes are sent; images/PDFs are not silently included.

## File Selection Actions

- [ ] Summarize `01 Markdown Rendering.md`. A pending animation appears, the result has app-owned heading/source presentation, and Save as Note is available.
- [ ] Find Similar Notes opens its inline options directly below the action and sends results to Suggestions.
- [ ] Suggest Tags on `11 Astronomical Field Notes.md` is deterministic and does not require a provider call.
- [ ] Propose Content Update on `03 Editor Update Target.md` requires R and W, accepts an instruction, and creates a whole-note reviewed diff rather than writing directly.
- [ ] With the local model loaded, a small note's update form reports likely fit; expandable details distinguish observed context and estimates. Typing and submission recheck. No write occurs before Review execution.
- [ ] Unload the selected model and attempt an update: unknown context, no generation/proposal, instruction retained. Load it manually and retry to recover. A note below the character limit but above the context estimate is similarly blocked. Ordinary chat/manual editing remain unchanged.
- [ ] Collapse Files. File/folder actions are inactive until Files is visible again.

## External Endpoint Consent

- [ ] Temporarily set a provider override to a non-loopback test endpoint. The provider is classified external rather than Local.
- [ ] Attempt to send private Context Basket content. Vincarios requires explicit endpoint-specific consent before Main allows transfer.
- [ ] Cancel and restore the local provider URL. No context is sent to the test endpoint.

## Import, Inbox Review, And Creation

- [ ] Drag `portable-smoke/V1 External Import Fixture.md` into Chat. It becomes temporary dropped context, not an immediate vault file.
- [ ] Use Import to Inbox. A visible reviewed proposal is created with imported-note metadata; no file appears before execution.
- [ ] Run Inbox Review from any workspace. Vincarios switches to Chat and renders grouped headings for subfolders, summary notes, AI responses, and loose Markdown notes.
- [ ] Save the Inbox Review response as a note. It enters Review Basket like other assistant output.
- [ ] Create a Note from a preset. Enter title/content once, then edit the pending proposal before execution; no duplicate second naming prompt appears.
- [ ] Create a default Project. Review Basket shows one grouped project action containing the complete folder/file plan, not one action per artifact.
