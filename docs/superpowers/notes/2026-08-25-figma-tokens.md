# Figma token capture — M4 Task 2

Raw export from `si641ecd9VS70DJPLvtPfo`, read 2026-08-25 via the Figma MCP
(`getLocalVariableCollectionsAsync` + `getLocalTextStylesAsync`), not transcribed.
Written down before transforming so a bad transform stays diagnosable.

84 variables: 33 primitives, 24 semantic, 27 scale. 16 text styles.

## 01 Primitives (single mode)

neutral 50 `#fafafa` · 100 `#f4f4f5` · 200 `#e4e4e7` · 300 `#d4d4d8` · 400 `#a1a1aa`
· 500 `#71717a` · 600 `#52525b` · 700 `#3f3f46` · 800 `#27272a` · 900 `#18181b`
· 950 `#09090b`

accent 50 `#fff7ed` · 100 `#ffedd5` · 200 `#fed7aa` · 300 `#fdba74` · 400 `#fb923c`
· 500 `#f97316` · 600 `#ea580c` · 700 `#c2410c` · 800 `#9a3412` · 900 `#7c2d12`

status solid/tint — wishlist `#71717a`/`#f4f4f5`, applied `#2563eb`/`#eff6ff`,
interviewing `#6d28d9`/`#f5f3ff`, offer `#059669`/`#ecfdf5`, rejected `#dc2626`/`#fef2f2`

base white `#ffffff` · black `#000000`

## 02 Semantic (Light / Dark) — aliases only

Every entry aliases a primitive; none holds a literal. That indirection is why
dark mode is a mode switch rather than a second set of values.

| token | Light | Dark |
|---|---|---|
| bg/canvas | base/white | neutral/950 |
| bg/surface | neutral/50 | neutral/900 |
| bg/inset | neutral/100 | neutral/800 |
| text/primary | neutral/900 | neutral/50 |
| text/secondary | neutral/700 | neutral/300 |
| text/muted | neutral/600 | neutral/400 |
| text/inverse | base/white | neutral/950 |
| border/subtle | neutral/200 | neutral/800 |
| border/default | neutral/300 | neutral/700 |
| border/strong | neutral/900 | neutral/200 |
| accent/default | accent/700 | accent/400 |
| accent/hover | accent/800 | accent/300 |
| accent/subtle | accent/50 | neutral/900 |
| accent/on-accent | base/white | neutral/950 |
| status/*/fill | status/*/tint | neutral/800 |
| status/*/mark | status/*/solid | status/*/solid (same both modes) |

Note the status marks do **not** change between modes — the hue carries the
meaning, so shifting it per theme would make the same status read as two things.

## 03 Scale (single mode)

space 0/4/8/12/16/20/24/32/40/48/64/80/96 · radius none 0, sm 2, **md 4**, lg 8,
pill 999 · border hairline 1, rule 2 · grid 12 columns, 24 gutter, 48 margin ·
motion instant 100, fast 160, base 240, slow 400

`radius/pill` (999) and `radius/lg` (8) exist in the file but violate the 4px cap
in the roadmap's constraints. They are captured here for fidelity and deliberately
**not** emitted as utilities — see the transform note in `src/index.css`.

## Text styles (16)

| style | font | size | line-height | tracking | case |
|---|---|---|---|---|---|
| Display/XL | Helvetica Bold | 56 | 100% | -3% | — |
| Display/L | Helvetica Bold | 40 | 105% | -2.5% | — |
| Display/M | Helvetica Bold | 28 | 110% | -2% | — |
| Heading/L | Helvetica Bold | 20 | 130% | -1% | — |
| Heading/M | Helvetica Bold | 16 | 140% | -0.5% | — |
| Heading/S | Helvetica Bold | 14 | 140% | 0 | — |
| Body/L | Helvetica Regular | 16 | 160% | 0 | — |
| Body/M | Helvetica Regular | 14 | 155% | 0 | — |
| Body/S | Helvetica Regular | 13 | 150% | 0 | — |
| Label/M | Helvetica Regular | 13 | 140% | 0 | — |
| Label/Caps | Helvetica Bold | 11 | 130% | +6% | UPPER |
| Caption | **Inter Medium** | 12 | 140% | 0 | — |
| Data/XL | Helvetica Regular | 40 | 100% | -2% | — |
| Data/L | Helvetica Regular | 24 | 110% | -1% | — |
| Data/M | Helvetica Regular | 14 | 140% | 0 | — |
| Data/S | Helvetica Regular | 12 | 140% | 0 | — |

Two inherited defects, both resolved in code rather than carried across:

**Caption is Inter Medium** while the other fifteen are Helvetica. Resolved to
Helvetica — one family, no exception that has to be remembered.

**Data/\* are not a mono face.** They were meant to be IBM Plex Mono for tabular
figures and are plain Helvetica, which has proportional digits, so table columns
drift as values change. Resolved with `font-variant-numeric: tabular-nums` rather
than a second font.
