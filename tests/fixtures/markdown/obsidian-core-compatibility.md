---
tags:
  - markdown-test
status: draft
rating: 5
favorite: true
date: 2026-07-09
related:
  - "[[Referenced Note]]"
---

# Heading 1

## Heading 2

Plain **bold**, *italic*, ~~strikethrough~~, ==highlight==, and `inline code`.

Soft
line break.

- First item
  - Nested item
- [ ] Open task
  - [x] Completed nested task

1. Ordered item
   1. Nested ordered item

> Quote
>
> [!note] Core callout
> Callout content.

---

| Name | Status |
| --- | --- |
| vitruvios | Active |

[[Referenced Note|Wikilink alias]]
[[Referenced Note#Heading]]
[[Referenced Note#^block-id]]

![Markdown image](assets/example.png)
![[assets/example.png|320]]

Footnote reference[^1].

Hidden comment: %%not rendered%%

Block target. ^block-id

```dataview
TABLE status
FROM #project
```

```dataviewjs
dv.list(dv.pages())
```

```tasks
not done
```

[^1]: Footnote text.

