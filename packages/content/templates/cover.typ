// Typographic cover for editions without their own: title, author, "The Open Machine".
// Values come from --input (fonts and colours from packages/ui/tokens.css).
#let i = sys.inputs
#set page(width: 4in, height: 6in, margin: 26pt, fill: rgb(i.bg))
#set text(fill: rgb(i.fg), font: i.body)
#text(font: i.heading, size: 7pt, weight: 500, tracking: 0.28em, fill: rgb(i.muted))[#upper(i.kicker)]
#v(1fr)
#text(font: i.heading, size: 30pt, weight: 600, tracking: -0.025em)[#par(leading: 0.3em, justify: false)[#i.title]]
#if i.subtitle != "" [
  #v(10pt)
  #text(size: 13pt, style: "italic", fill: rgb(i.muted))[#i.subtitle]
]
#v(18pt)
#line(length: 100%, stroke: 0.6pt + rgb(i.rule))
#v(10pt)
#text(size: 12pt)[#i.author]
