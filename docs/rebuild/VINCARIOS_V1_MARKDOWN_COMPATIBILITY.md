# vincarios V1 Markdown Compatibility

Status: Active Phase 7.6 reference

## Purpose

This matrix compares the current vincarios Markdown Preview with Obsidian core Markdown behavior.
It is a decision aid, not a promise to reproduce every Obsidian feature.

Primary references:

- https://obsidian.md/help/obsidian-flavored-markdown
- https://obsidian.md/help/Editing%2Band%2Bformatting/Basic%2Bformatting%2Bsyntax
- https://obsidian.md/help/advanced-syntax
- https://obsidian.md/help/properties
- https://obsidian.md/help/embeds
- https://obsidian.md/help/Files%2Band%2Bfolders/Accepted%2Bfile%2Bformats

Obsidian combines CommonMark, GitHub Flavored Markdown, LaTeX, and Obsidian-specific extensions. vincarios keeps a smaller, safe preview surface and documents intentional differences.

## Status Meaning

| Status | Meaning |
|---|---|
| Full | Current vincarios behavior covers the practical Obsidian-core case. |
| Partial | vincarios renders a useful subset but misses valid variants or behavior. |
| Missing | vincarios currently displays source text or does not render the feature. |
| Intentional difference | vincarios deliberately avoids Obsidian behavior for safety or V1 scope. |

## Core Compatibility Matrix

| Area | Obsidian behavior | Current vincarios status | V1 direction |
|---|---|---|---|
| ATX headings | `#` through `######` | Full | Keep and add regression fixture coverage. |
| Setext headings | Underlined headings | Full | Provided by the pinned CommonMark engine. |
| Bold and italic | Asterisk and underscore variants, combinations | Full | Provided by the pinned CommonMark engine. |
| Strikethrough | `~~text~~` | Full | Implemented through the CommonMark/GFM engine. |
| Highlight | `==text==` | Partial | Basic highlights render through the focused Obsidian extension; nested formatting remains later refinement. |
| Paragraph line wrapping | Soft line breaks remain one paragraph | Full | The engine preserves CommonMark soft line breaks without forced `<br>` elements. |
| Unordered lists | Nested and mixed lists | Full | Nested structure is handled by the CommonMark engine. |
| Ordered lists | Nested and mixed numbered lists | Full | Nested structure and valid markers are handled by the CommonMark engine. |
| Task lists | Checked and unchecked Markdown tasks | Partial | Flat tasks render as disabled checkboxes; nested tasks and plugin task metadata need review. |
| Blockquotes | Nested blockquotes and Markdown content | Partial | Current renderer supports a flat contiguous quote block. |
| Callouts | `> [!type]` with fold states and titles | Missing | Strong V1 candidate because it is Obsidian core and common in vaults. |
| Horizontal rules | Hyphen, asterisk, and underscore forms | Full | Provided by the CommonMark engine. |
| Inline code | Variable backtick delimiters | Full | Provided by the CommonMark engine. |
| Fenced code | Backtick or tilde fences, language label | Full for safe source rendering | vincarios preserves code and language classes but does not promise syntax highlighting. |
| Indented code | Four-space or tab-indented code | Missing | Lower-priority standards gap. |
| Tables | GFM-style tables and formatting inside cells | Partial | Basic tables render. Escaped pipes, alignment, and Obsidian's permissive separator rules need work. |
| Markdown links | Internal and external Markdown links | Partial | Internal navigation exists. External URL behavior remains deliberately restricted until a safe explicit open flow exists. |
| Wikilinks | `[[Note]]`, aliases, headings, blocks | Partial | Note and alias navigation exists. Heading/block targeting needs explicit coverage. |
| Markdown images | `![alt](path)` and external images | Partial | Local vault images render through validated asset reads for supported image types. Remote images stay blocked by default. |
| Obsidian embeds | `![[file]]`, optional dimensions, heading/block embeds | Partial | Local image embeds render for supported image types. Dimensions, note embeds, PDF, audio, video, canvas, and Base embeds require separate decisions. |
| Footnotes | Named and inline footnotes | Missing | Evaluate for V1 after images, callouts, and tables. |
| Obsidian comments | `%%hidden text%%` | Partial | Inline comments are hidden by the focused Obsidian extension; broader multiline cases remain to be tested. |
| Block identifiers | `^block-id` and block links | Missing | Keep link text safe; full block navigation can follow later. |
| Tags in body | `#tag` and nested tags | Missing as a special visual element | Plain text remains readable; dedicated tag styling is optional. |
| Escaping | Backslash escapes for Markdown characters | Full | Provided by the CommonMark engine. |
| Raw HTML | Obsidian renders supported HTML but not Markdown inside HTML | Intentional difference | vincarios escapes raw HTML and must not execute scripts or unsafe attributes. |
| Copied inline styling | `<font color="...">text</font>` and `<mark style="background:...">text</mark>` from copied notes | Partial | Narrow allowlisted color/highlight compatibility renders through `markdownFormattingCompat.js` as safe spans/classes. Unsupported copied tags are stripped to inner Markdown text. Raw HTML, event handlers, unknown styles, unsafe URLs, and `unsafe-inline` CSP remain blocked. |
| Math | Inline and block LaTeX | Missing | Separate dependency and security decision. |
| Mermaid | Mermaid code blocks render diagrams | Missing | Keep as safe code until a reviewed renderer dependency is approved. |
| YAML Properties | Text, lists, numbers, booleans, dates, tags, links | Partial | Flat scalar and list properties render. Type-aware presentation needs separate work; nested YAML remains source-only. |

## Image Link Resolution

vincarios resolves local image embeds through the main-process vault read service. The renderer never receives filesystem access.

Resolution order for `![alt](path)` and `![[image.png]]`:

1. Explicit or relative vault path from the current Markdown file.
2. For basename-only Obsidian embeds, one unique matching image filename anywhere in the vault.
3. If multiple images share the same basename, vincarios marks the embed unresolved instead of guessing.

Remote images remain blocked by default in V1.

Future ambiguous-link resolution must stay review-based: choosing one of multiple matching images should create a visible Markdown update proposal, not silently rewrite the note.
## Final V1 Rendering Subset

V1 supports the practical Obsidian-core subset needed for readable vault review:

- CommonMark/GFM basics: headings, paragraphs, emphasis, strikethrough, lists, horizontal rules, code spans, fenced code, blockquotes, tables, and escapes.
- YAML frontmatter as a visible Properties block for flat values and simple lists.
- Markdown task boxes as disabled preview checkboxes.
- Internal Markdown links and wikilinks for navigation.
- Safe external-link confirmation instead of direct opening.
- Obsidian highlights and comments in the focused subset already covered by tests.
- Local Markdown image embeds and standalone image preview for supported V1 image types through validated vault asset reads.

Intentional V1 differences:

- Raw HTML stays escaped except for narrow sanitized copied-formatting compatibility such as allowlisted safe color spans and highlights.
- Remote images stay blocked by default.
- Plugin code is never executed.
- Mermaid, math, Dataview, Templater, Kanban board rendering, note/PDF/audio/video embeds, block IDs, and full callout behavior stay V1.1/V1.2 unless the V1 freeze review reclassifies one as must-have.
- The source editor remains plain Markdown source with reviewed full-note `update_note` proposals. Formatting toolbar, live split preview editing, color tools, and detachable editor are later work.
## Plugin Compatibility Boundary

Obsidian community plugins do not share one renderer standard. Plugins may register Markdown post-processors, custom code blocks, metadata conventions, JavaScript, filesystem access, or network behavior. vincarios does not load or execute Obsidian plugins.

V1 compatibility has three levels:

1. **Native Markdown compatibility**
   Plugin output remains normal Markdown and vincarios renders it normally. Advanced Tables primarily belongs here.
2. **Recognized safe fallback**
   vincarios recognizes an explicit plugin syntax such as a fenced `dataview`, `dataviewjs`, or `tasks` block and shows a standard unsupported-plugin notice plus the untouched source.
3. **Unsupported opaque content**
   Unknown plugin formats stay visible as ordinary source/code. vincarios does not guess a plugin from filenames or prose.

Required fallback copy:

```text
This content belongs to the <Plugin Name> plugin and is not currently rendered by vincarios.
```

The fallback registry must be data-driven and owned by `src/renderer/markdown/`. It may map explicit syntax identifiers to plugin names and documentation links. It must never execute plugin code.

Initial research cohort:

| Plugin/workflow | Safe V1 treatment |
|---|---|
| Advanced Tables | Render the underlying Markdown table; do not reproduce editing commands or formulas. |
| Tasks | Render the base task checkbox and preserve additional task text. Query blocks get a recognized fallback. |
| Dataview / DataviewJS | Recognized fallback only. Never execute queries or JavaScript in V1. |
| Templater | Preserve template source. Never evaluate commands, JavaScript, or system calls. |
| Calendar / Daily Notes workflows | Normal Markdown and properties; no special renderer required. |
| Kanban | Preserve Markdown/frontmatter; specialized board rendering is outside this phase. |
| Iconize / Style Settings | Later metadata/style compatibility research; no execution. |
| Mindmap | Recognized fallback if an explicit block syntax is confirmed; no graph renderer in V1. |
| Make.md | No renderer emulation in V1. Preserve readable Markdown and properties. |
| Excalidraw | Explicitly excluded from this renderer phase. |

## Current Renderer Architecture

Phase 7.6 uses pinned `markdown-it` 14.3.2 under an isolated renderer boundary:

- `markdownEngine.js` owns CommonMark/GFM engine configuration.
- `obsidianMarkdownExtension.js` owns only Obsidian-specific inline syntax and safe link/task rendering, and wires the formatting compatibility module into the Markdown engine.
- `markdownFormattingCompat.js` owns the narrow copied inline styling compatibility model for allowlisted `<font color>` and `<mark background>` cases, plus safe fallbacks for unsupported copied tags.
- `markdownProperties.js` owns frontmatter extraction and Properties presentation.
- `markdownRenderer.js` is the small public facade used by Chat and Markdown Preview.
- `vaultAssetResolver.js` owns safe vault asset target resolution for Markdown embeds and future previewable asset types; `vaultReadService.js` consumes it and serializes validated assets.
- `third_party/markdown-it/` contains the browser build and MIT license; Node tests use the exact pinned npm dependency.

Raw HTML remains disabled. The copied-formatting compatibility layer lives inside `src/renderer/markdown/` as an explicit sanitizer/transformer and shared formatting model, not as general raw HTML execution. The future editor toolbar should reuse that model instead of inventing separate color/highlight serialization. Missing engine modules fail during renderer startup instead of failing later during preview rendering.
## Implementation Order

1. Lock the audit with a representative Markdown fixture.
2. Choose the V1 core subset with Beka before code changes.
3. Improve parsing through focused Markdown modules rather than adding unrelated regular-expression patches to `markdownRenderer.js`.
4. Add local asset resolution only through validated vault APIs.
5. Add the plugin fallback registry after core fenced-code handling is stable.
6. Record intentional V1 differences and manual test expectations.
