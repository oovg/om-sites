// PDF edition rules, included by pandoc before the document. {{ed-*}} is replaced with packages/ui/tokens.css values.
#set page(fill: rgb("{{ed-paper}}"), margin: (x: 18mm, y: 20mm), numbering: "1")
#set text(fill: rgb("{{ed-ink}}"), hyphenate: true)
#set par(justify: true, leading: 0.68em)
#show heading: set text(font: "{{ed-font-heading}}", weight: 600, fill: rgb("{{ed-ink}}"))
#show heading.where(level: 1): it => { pagebreak(weak: true); v(1.2em); text(size: 1.6em, it); v(0.6em) }
#show quote: set text(fill: rgb("{{ed-muted}}"))
#show link: set text(fill: rgb("{{ed-ink}}"))
#show link: underline.with(stroke: 0.4pt + rgb("{{ed-rule}}"), offset: 2pt)
#show raw: set text(size: 0.88em)
#show line: set line(stroke: 0.5pt + rgb("{{ed-rule}}"))
