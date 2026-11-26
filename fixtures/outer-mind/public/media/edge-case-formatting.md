---
type: transmission
title: "An Exceptionally Long Transmission Title That Keeps Going Past Any Reasonable Width, to Test Wrapping in Cards, Headers, Feeds and the Wiki"
slug: edge-case-formatting
date: 2022-05-01
updated: 2022-06-15
summary: "Edge case: every heading level, lists, quotes, code, a table, footnotes, an inline image, a missing-image reference avoided, and links of every kind."
tags:
  - "topic/fixtures"
  - "theme/open-protocols"
author:
  - "The Open Machine"
  - "A Second Author"
---

Opening paragraph with **bold**, *italic*, ***both***, `inline code`, a [plain link](https://example.org), an internal link to [[substrate]], a titled one to [[toward-a-nomad-web|the nomad web essay]], and a footnote.[^1]

# Heading one

## Heading two

### Heading three

#### Heading four

##### Heading five

###### Heading six

- An unordered list
- with a second item
  - and a nested item
- and a third

1. An ordered list
2. with a second item
3. and a third

> A block quote, which may run long enough to wrap onto a second line so that the left rule and padding can be checked across lines.
>
> — Someone, somewhere

```js
// a fenced code block
function hello(name) {
  return `hello, ${name}`
}
```

| Column | Another column |
|---|---|
| a cell | another cell |
| a longer cell that wraps | 42 |

![An inline image](assets/transmissions-concretepluralism.png)

---

A paragraph after a rule, then a second footnote.[^long]

[^1]: A short footnote.
[^long]: A longer footnote with a [link](https://example.org) in it.
