# External Markdown Drag Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Allow external `.md`/`.markdown` files dropped onto chat to become temporary context, with an optional reviewed Import to Inbox action.

**Architecture:** Add a focused renderer drop module that owns browser drag/drop events and FileReader usage. It adds dropped Markdown files to the existing Context Basket and creates import proposals through the existing Review Basket create-note path. No main-process write path changes are needed.

**Tech Stack:** Electron renderer, browser File API, existing Context Basket, existing Review Basket `create_note`, Node tests/source tests.

---

### Task 1: Drop Module Foundation

**Files:**
- Create: `src/renderer/chat/markdownDropController.js`
- Modify: `index.html`
- Test: `tests/markdownDropController.test.js`

- [x] Add tests for accepting `.md` and `.markdown`, rejecting non-Markdown, and creating context/import payloads.
- [x] Implement `isMarkdownDropFile`, `createDroppedMarkdownContextItem`, and `createImportProposalFromDrop`.
- [x] Expose browser global `window.ZeusMarkdownDropController` and CommonJS exports for tests.
- [x] Load the module before `mountChat.js` in `index.html`.

### Task 2: Chat Drop Wiring

**Files:**
- Modify: `src/renderer/chat/mountChat.js`
- Test: `tests/markdownDropIntegrationSource.test.js`

- [x] Mount the drop controller from `mountChat` with `chatLog`, `contextState`, `reviewBasket`, and `status`.
- [x] On successful drop, add the context item and append a ZEUS message with an `Import to Inbox` action.
- [x] The action adds a reviewed `create_note` proposal; it does not write directly.

### Task 3: UX Styling And Docs

**Files:**
- Modify: `src/renderer/styles/layout.css`
- Modify: `docs/rebuild/ZEUS_V1_IMPLEMENTATION_PLAN.md`
- Modify: `docs/rebuild/ZEUS_V1_UI_AND_WORKFLOWS.md`

- [x] Add subtle drag-over styling for the chat area.
- [x] Mark `7.1.5 External Markdown Drag & Drop` as the current V1 step.
- [x] Keep images/PDFs/vision explicitly out of this block.

### Task 4: Verification

**Commands:**
- `node scripts/check-js.js`
- `node --test tests/markdownDropController.test.js tests/markdownDropIntegrationSource.test.js tests/reviewBasket.test.js`
- full test suite before reporting completion.