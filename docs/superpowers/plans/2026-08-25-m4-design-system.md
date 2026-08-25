# M4 — Design System in Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Figma design system into working code — tokens, type, icons, primitives, composites and motion — with every component rendered and reviewable, and no application screens yet.

**Architecture:** Tailwind moves to v4's CSS-first `@theme`, so the Figma variables become CSS custom properties in one stylesheet rather than a JavaScript config. Components are built bottom-up: tokens, then type, then icons, then primitives that consume all three, then composites that consume primitives. A gallery route renders every component in both themes so the work is reviewable without any screen existing.

**Tech Stack:** Tailwind v4, shadcn/ui, CVA, framer-motion, next-themes (already installed in M3), Next 15, React 19, Vitest.

**Spec:** `docs/superpowers/plans/2026-08-23-worktrack-roadmap.md` — milestone M4, items 4.1-4.6. Figma file `si641ecd9VS70DJPLvtPfo`.

## Global Constraints

- **Accent is `#c2410c` (orange-700) light, `#fb923c` (orange-400) dark.** orange-500 fails WCAG AA on white at 2.80:1 and is never used for text.
- **Status colours are semantic only:** wishlist grey, applied **blue**, interviewing **violet**, offer green, rejected red. Orange is never a status.
- **No status pills.** The Status Marker is a 2px rule plus a label — no fill, no dot, no radius. ATS Check follows the same pattern.
- **Radius caps at 4px.** Separation is hairline rules, not card borders or shadows.
- **Icons are the custom 26-icon set from Figma. Never Lucide.** `grep -rn "lucide-react" src` must return nothing when 4.3 is done. It currently returns 12 files.
- **Font is Helvetica** with the stack `Helvetica, "Helvetica Neue", Arial, sans-serif`. Not Helvetica Neue.
- **Desktop chrome buttons are 32x32; mobile chrome is 44x44 in a 64px top bar.** That difference is deliberate, not an inconsistency.
- **One `prefers-reduced-motion` gate** shared by 4.6's mount-gating, the theme wipe, and M6's pinned landing sequence. Not three separate checks.
- **The suite must stay green at every commit.** Baseline is 304 unit tests plus 19 integration tests.
- **Do not commit `.env`.** `vercel link` and `vercel env pull` both append `.env*` to `.gitignore`, which hides `.env.example`; check `git check-ignore .env.example` returns nothing after running either.

## Current state this plan starts from

Verified 2026-08-25, not assumed:

| Thing | State | Consequence |
|---|---|---|
| `tailwindcss` | 3.4.4, JS config, `@tailwind` directives | Task 1 upgrades to v4 |
| `components.json` | absent | `shadcn init` must run before any `shadcn add` |
| `framer-motion` | not installed | arrives in Task 4 with skiper4 |
| `lucide-react` | installed, 12 import sites | removed in Task 3 |
| `next-themes` | 0.4.6, installed | M3 did this; 4.6 builds on it |
| `src/index.css` | imports Inter from Google Fonts | replaced by the Helvetica stack in Task 2 |

## Decisions locked before execution

**Tailwind v4 lands first, alone.** It changes how every utility resolves, so bundling it with token work makes a broken shade impossible to attribute. Task 1 upgrades and proves the app renders identically; tokens come after.

**The gallery route is not throwaway.** `/gallery` is how every later task is reviewed, so it is built in Task 1 and extended by each subsequent task rather than bolted on at the end. It stays out of the production build via an env guard, since it is a development surface, not a page.

**Icons are generated, not hand-copied.** 26 icons times two themes is too many to transcribe by hand without error. Task 3 pulls the SVG source from Figma once and generates components from it.

---

### Task 1: Tailwind v4 and the review gallery

**Files:**
- Modify: `src/index.css`, `package.json`
- Delete: `tailwind.config.js`
- Create: `src/app/(dev)/gallery/page.tsx`, `src/lib/isDevSurface.ts`, `src/lib/__tests__/isDevSurface.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: Tailwind v4 resolving through `@theme` in `src/index.css`, and a `/gallery` route every later task appends to.

- [ ] **Step 1: Write the failing test for the dev-surface guard**

```ts
// src/lib/__tests__/isDevSurface.test.ts
import { describe, it, expect } from 'vitest'
import { isDevSurfaceEnabled } from '../isDevSurface'

describe('isDevSurfaceEnabled', () => {
  it('is on in development', () => {
    expect(isDevSurfaceEnabled({ NODE_ENV: 'development' })).toBe(true)
  })

  it('is off in production by default', () => {
    expect(isDevSurfaceEnabled({ NODE_ENV: 'production' })).toBe(false)
  })

  it('can be opted into in production for design review', () => {
    expect(isDevSurfaceEnabled({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_GALLERY: 'true' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/isDevSurface.test.ts`
Expected: FAIL — `Failed to resolve import "../isDevSurface"`.

- [ ] **Step 3: Implement the guard**

```ts
// src/lib/isDevSurface.ts
/**
 * Whether development-only routes should render.
 *
 * The gallery is a working surface, not a page, so it stays out of production
 * by default. The opt-in exists because design review of a deployed build is
 * exactly when you most want it, and rebuilding to see a button is worse.
 */
export function isDevSurfaceEnabled(source: Record<string, string | undefined>): boolean {
  if (source.NEXT_PUBLIC_ENABLE_GALLERY === 'true') return true
  return source.NODE_ENV !== 'production'
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/lib/__tests__/isDevSurface.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Upgrade Tailwind**

```bash
npm install tailwindcss@4 @tailwindcss/postcss
npm uninstall autoprefixer postcss-import
```

v4 needs no `autoprefixer` or `postcss-import`; it does both itself. Leaving them
in causes double-processing and confusing output.

- [ ] **Step 6: Replace the stylesheet header**

In `src/index.css`, replace the three `@tailwind` directives and the Google Fonts
import with a single v4 import and an empty theme block:

```css
@import "tailwindcss";

/* Dark mode is class-driven because next-themes sets .dark on <html>. v4 does
   not assume this, so it must be declared. */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Tokens land here in Task 2. Empty for now so the upgrade is provable on
     its own -- if a colour looks wrong after this commit, it is v4, not a token. */
}
```

- [ ] **Step 7: Delete the JS config and point PostCSS at v4**

```bash
git rm tailwind.config.js
```

`postcss.config.js` becomes:

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

- [ ] **Step 8: Build the gallery shell**

```tsx
// src/app/(dev)/gallery/page.tsx
import { notFound } from 'next/navigation'
import { isDevSurfaceEnabled } from '@/lib/isDevSurface'

export default function GalleryPage() {
  if (!isDevSurfaceEnabled(process.env as Record<string, string | undefined>)) notFound()

  return (
    <main className="p-8 space-y-12">
      <h1 className="text-2xl font-bold">Design system</h1>
      <p className="text-sm opacity-70">
        Every component, both themes. Extended by each M4 task.
      </p>
      {/* Sections appended by Tasks 2-6 */}
    </main>
  )
}
```

- [ ] **Step 9: Verify the upgrade changed nothing visible**

Run: `npm run build` — Expected: succeeds.
Run: `npm test` — Expected: PASS, 307 tests (304 + 3).
Run: `npm run dev`, open `/login` — Expected: renders as it did before. Compare
against the deployed production login page side by side. **Any visual difference
here is a v4 regression and must be fixed before Task 2**, because after tokens
land it becomes impossible to tell the two causes apart.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: upgrade to Tailwind v4 and add the design review gallery"
```

---

### Task 2: Tokens and type scale

**Files:**
- Modify: `src/index.css`, `src/app/(dev)/gallery/page.tsx`
- Create: `src/app/(dev)/gallery/sections/Tokens.tsx`

**Interfaces:**
- Consumes: Task 1's `@theme` block.
- Produces: every Figma variable as a CSS custom property, and Tailwind utilities named after them. Tasks 3-6 use these names and nothing else.

**Source of truth:** the Figma file's three collections — `01 Primitives` (33, single mode), `02 Semantic` (24, Light/Dark), `03 Scale` (27). 84 total. Read them with the Figma MCP rather than transcribing from a screenshot.

- [ ] **Step 1: Pull the variables from Figma**

Use `get_variable_defs` against the Design System page. It requires a live
selection in Figma desktop, so ask Gabe to select the `Foundations · Colour`
frame first; the tool returns nothing useful otherwise.

Record the raw output in `docs/superpowers/notes/2026-XX-XX-figma-tokens.md`
before transforming it. If the transform is wrong later, the raw capture is what
makes that diagnosable.

- [ ] **Step 2: Write the primitives and the semantic layer**

Primitives are literal values. Semantic tokens alias them and are the only names
components use — that indirection is what makes the dark theme a mode switch
rather than a rewrite.

```css
@theme {
  /* 01 Primitives — literal values, referenced only by the semantic layer */
  --color-neutral-50: #fafafa;
  --color-neutral-950: #09090b;
  --color-accent-400: #fb923c;
  --color-accent-700: #c2410c;
  /* ...the remaining primitives from the Figma capture... */

  /* 02 Semantic — light mode. Components use only these. */
  --color-bg-canvas: var(--color-base-white);
  --color-text-primary: var(--color-neutral-900);
  --color-accent-default: var(--color-accent-700);
  --color-border-subtle: var(--color-neutral-200);
  /* ...the rest... */
}

/* Dark mode redefines only the semantic layer, never the primitives. */
.dark {
  --color-bg-canvas: var(--color-neutral-950);
  --color-text-primary: var(--color-neutral-50);
  --color-accent-default: var(--color-accent-400);
  --color-border-subtle: var(--color-neutral-800);
}
```

- [ ] **Step 3: Set the type scale and the font stack**

16 text styles from Figma. Helvetica, not Helvetica Neue:

```css
@theme {
  --font-sans: Helvetica, "Helvetica Neue", Arial, sans-serif;

  --text-display-xl: 56px;
  --text-display-l: 40px;
  --text-display-m: 28px;
  --text-heading-l: 20px;
  --text-heading-m: 16px;
  --text-heading-s: 14px;
  --text-body-l: 16px;
  --text-body-m: 14px;
  --text-body-s: 13px;
  --text-label-caps: 11px;
  /* Data/* mirror the body sizes and differ only by tabular figures. */
}
```

Two things the Figma file gets wrong and code must fix:

```css
/* Helvetica has proportional digits, so table columns do not line up without
   this. The Figma Data/* styles were meant to be a mono face and are not. */
.tabular { font-variant-numeric: tabular-nums; }
```

And `Caption` is still Inter Medium in Figma while everything else is Helvetica.
Pick one — matching the rest is the default — and note the choice rather than
silently inheriting the inconsistency.

- [ ] **Step 4: Add the token section to the gallery**

`Tokens.tsx` renders every colour as a labelled swatch showing its token name,
and every text style as a specimen line. Import it into the gallery page.

- [ ] **Step 5: Verify contrast, do not assume it**

For each text-on-background pair in the semantic layer, compute the contrast
ratio and assert it clears 4.5:1. orange-500 on white is 2.80:1 and is the
reason this check exists.

```ts
// src/lib/__tests__/contrast.test.ts — one case per semantic pair
it('accent on canvas clears AA in light mode', () => {
  expect(contrastRatio('#c2410c', '#ffffff')).toBeGreaterThanOrEqual(4.5)
})
```

- [ ] **Step 6: Verify and commit**

Run: `npm test` — Expected: PASS, count risen by the contrast cases.
Open `/gallery` in both themes — Expected: every swatch renders, no `undefined`
CSS variables in devtools.

```bash
git add -A
git commit -m "feat: port the Figma token collections and type scale to CSS"
```

---

### Task 3: The icon set

**Files:**
- Create: `src/components/icons/*.tsx` (26), `src/components/icons/index.ts`
- Create: `scripts/generate-icons.mjs`
- Create: `src/app/(dev)/gallery/sections/Icons.tsx`
- Modify: 12 files currently importing `lucide-react`

**Interfaces:**
- Consumes: Task 2's tokens, since icons take `currentColor`.
- Produces: 26 named icon components. Every later task and every M5 screen imports from here.

The 26: Overview, Applications, Calendar, Documents, Analytics, Settings, Plus,
Search, Menu, ArrowRight, Upload, Download, Close, Check, Clock, External, Lock,
Database, Mail, Shield, Swatch, Text, Layers, Play, Sun, Moon.

- [ ] **Step 1: Export the SVG source from Figma**

Use the Figma MCP to read the `Icon` component set (`103:2066`) and capture each
variant's vector paths. Write the raw export to
`docs/superpowers/notes/2026-XX-XX-icon-export.json`.

**Known defect to carry forward:** `Icon=Sun` and `Icon=Search` had their `Ring`
on `constraints: MIN` while the sibling path was `SCALE`, so they decentred when
scaled. That was fixed in Figma on 2026-08-25. Verify each exported icon is
centred at a size other than its authored 20x20 before trusting it.

- [ ] **Step 2: Write the generator**

```js
// scripts/generate-icons.mjs
// Generates one component per icon from the Figma export. Generated rather than
// hand-written: 26 icons is enough that a transcription error is certain, and a
// regenerable set can be re-pulled when the Figma file changes.
```

Each component takes `className` and `size`, uses `stroke="currentColor"` so
tokens drive the colour, and sets `aria-hidden="true"` since these are always
decorative next to a label.

- [ ] **Step 3: Write the failing test**

```ts
// src/components/icons/__tests__/icons.test.tsx
it('exports all 26 icons from the Figma set', () => {
  expect(Object.keys(icons)).toHaveLength(26)
})

it('renders with currentColor so tokens drive the colour', () => {
  const { container } = render(<icons.Sun />)
  expect(container.querySelector('[stroke]')?.getAttribute('stroke')).toBe('currentColor')
})

it('marks icons decorative, since every one sits beside a label', () => {
  const { container } = render(<icons.Sun />)
  expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
})
```

- [ ] **Step 4: Run the generator and the tests**

Run: `node scripts/generate-icons.mjs` then `npx vitest run src/components/icons`
Expected: PASS.

- [ ] **Step 5: Replace every Lucide import**

12 files import `lucide-react`. Replace each with the matching custom icon. Where
no custom icon matches a Lucide one in use, that is a gap in the 26-icon set —
record it rather than silently reintroducing Lucide or inventing a 27th icon.

- [ ] **Step 6: Prove Lucide is gone**

Run: `grep -rn "lucide-react" src` — Expected: no output.
Run: `npm uninstall lucide-react`
Run: `npm run build` — Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: generate the 26-icon set and remove Lucide"
```

---

### Task 4: Primitives

**Files:**
- Create: `components.json`, `src/components/ui/{button,input,status-marker,ats-check,breadcrumb,theme-toggle}.tsx`
- Create: `src/app/(dev)/gallery/sections/Primitives.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces: six primitives. Task 5's composites are assembled from these and add no new styling of their own.

- [ ] **Step 1: Initialise shadcn**

```bash
npx shadcn@latest init
```

There is no `components.json` yet, so this must run before any `shadcn add`.
Point it at `src/components/ui` and the existing `@/*` alias.

- [ ] **Step 2: Install what the primitives need**

```bash
npm install class-variance-authority clsx tailwind-merge framer-motion
```

`framer-motion` arrives here rather than in M6 because skiper4 needs it. That is
the settled answer to the roadmap's open question about a motion library.

- [ ] **Step 3: Write the Button with CVA variants**

Six variants from Figma: Primary, Secondary, Ghost times sizes M and S. Radius
4px, never more.

- [ ] **Step 4: Write the Status Marker**

The one component most likely to be built wrong:

```tsx
/**
 * A 2px rule plus a label. Not a pill.
 *
 * No fill, no dot, no radius -- the same vocabulary as the active nav item and
 * the follow-up nudge. Orange is never used here: it is the accent, and a status
 * that competes with the accent is the exact flaw this pattern replaced.
 */
```

Five statuses: wishlist grey, applied blue, interviewing violet, offer green,
rejected red.

- [ ] **Step 5: Write Input, ATS Check, Breadcrumb, Theme Toggle**

Input has four states from Figma: Default, Focus, Error, Disabled. **Only one may
render focused at a time** — the Figma Sign Up frame had two until it was fixed,
and the reveal-password control must anchor to the field's right edge rather than
a fixed offset, or it lands off-canvas at mobile widths.

ATS Check follows the Status Marker pattern with Pass, Review, Fail.

Theme Toggle uses skiper4's button driven by 4.6's hook. Install with
`pnpm dlx shadcn add @skiper-ui/skiper4`, keep one of its five variants and
delete the rest, and **swap its icons for the custom set** — skiper4 ships its
own icon vocabulary, which the icon constraint forbids.

- [ ] **Step 6: Replace the current theme toggle**

`src/components/Layout.tsx` renders a hand-rolled toggle wired to `next-themes`.
Replace it with the primitive. Desktop keeps 32x32.

- [ ] **Step 7: Test each primitive's contract, not its markup**

```tsx
it('renders a status marker as a rule and a label, never a pill', () => {
  const { container } = render(<StatusMarker status="applied" />)
  const rule = container.querySelector('[data-status-rule]')
  expect(rule).toBeTruthy()
  expect(getComputedStyle(rule!).borderRadius).toBe('0px')
})
```

- [ ] **Step 8: Add to the gallery, verify, commit**

Every primitive, every variant, both themes.

```bash
git add -A
git commit -m "feat: build the six design system primitives"
```

---

### Task 5: Composites

**Files:**
- Create: `src/components/ui/{kpi-stat,application-row,job-card,kanban-column,nav-item,sidebar}.tsx`
- Create: `src/app/(dev)/gallery/sections/Composites.tsx`

**Interfaces:**
- Consumes: Task 4's primitives.
- Produces: six composites. M5 assembles screens from these and writes no new component styling.

- [ ] **Step 1: KPI Stat**

Label, value, delta. The value uses the tabular figures class from Task 2 — a
KPI strip where digits shift width as numbers change reads as broken.

- [ ] **Step 2: Application Row**

Company, role, salary via `formatSalaryRange` from M2, a Status Marker, and a
date. Separated by hairline rules, not card borders.

- [ ] **Step 3: Job Card, Kanban Column, Nav Item, Sidebar**

Nav Item carries a number (01-06) and an icon; the mobile bottom nav drops the
number because five-up at 375px has no room for both. Sidebar composes Logo, Nav
Items, a divider, the settings item, a spacer that grows, the Theme Toggle, and
the footer note — in that order, matching Figma.

- [ ] **Step 4: Test the contracts**

Each composite gets a test for the thing most likely to regress: KPI Stat for
tabular figures, Application Row for the marker not being a pill, Sidebar for
the toggle being present and last before the footer.

- [ ] **Step 5: Add to the gallery, verify, commit**

```bash
git add -A
git commit -m "feat: build the six design system composites"
```

---

### Task 6: Motion

**Files:**
- Create: `src/lib/motion.ts`, `src/lib/__tests__/motion.test.ts`, `src/components/motion/Reveal.tsx`
- Modify: `src/components/ui/theme-toggle.tsx`

**Interfaces:**
- Consumes: Tasks 4 and 5.
- Produces: `usePrefersReducedMotion()`, `<Reveal>`, and the View Transitions theme wipe. M6's 6.1a pinned sequence reads the same gate.

- [ ] **Step 1: Write the failing test for the reduced-motion gate**

```ts
it('reports reduced motion when the media query matches', () => {
  expect(prefersReducedMotion({ matches: true } as MediaQueryList)).toBe(true)
})

it('defaults to full motion when the query is unavailable', () => {
  expect(prefersReducedMotion(null)).toBe(false)
})
```

- [ ] **Step 2: Implement the gate**

```ts
/**
 * The single source of truth for motion preference.
 *
 * Mount-gating, the theme wipe and M6's pinned landing all read this. Three
 * separate checks is how a page ends up half-animating for someone who asked it
 * not to. Subscribed live, not read once: the OS setting can change with the
 * page open.
 */
```

- [ ] **Step 3: Build `<Reveal>` with IntersectionObserver mount-gating**

Animates children in on first intersection. Under reduced motion it renders them
immediately with no transition — not a faster transition, none.

- [ ] **Step 4: Wire the View Transitions theme wipe**

skiper26's `useThemeToggle` is the reference implementation. **Read it and write
our own against `next-themes`** rather than installing it: the package pulls
`lucide-react`, which the icon constraint forbids, and it duplicates the
`next-themes` provider M3 already mounted.

Two hard requirements: the wipe no-ops under reduced motion, and the theme still
changes where View Transitions are unsupported. Safari and Firefox both lagged
here, so treat the animation as decoration and the state change as the feature.

- [ ] **Step 5: Test both paths**

The reduced-motion path is the one that rots, because nobody sees it unless they
turn the setting on. Test it explicitly.

- [ ] **Step 6: Verify and commit**

Run: `npm test`, `npm run build` — Expected: green.
Open `/gallery` with reduced motion on and off — Expected: identical content,
different animation.

```bash
git add -A
git commit -m "feat: add the shared motion layer and the theme wipe"
```

---

## Self-Review

**Spec coverage:** 4.1 → Task 2. 4.2 → Task 2 Step 3. 4.3 → Task 3. 4.4 → Task 4.
4.5 → Task 5. 4.6 → Task 6. Task 1 has no roadmap item; it exists because Tailwind
v4 is a prerequisite the roadmap names in 4.1 without giving it room, and because
every later task needs a review surface that does not exist yet.

**Placeholders:** the token values in Task 2 Step 2 are shown as a shape with the
real accent and neutral values filled in, because the remaining 80 come from a
Figma read that has not happened yet. Step 1 captures them before Step 2 uses
them, and the raw capture is written to disk first so a bad transform stays
diagnosable. This is the one place the plan cannot be fully literal without
fabricating values.

**Type consistency:** `isDevSurfaceEnabled(source)` is defined in Task 1 and used
in Task 1. Semantic token names introduced in Task 2 (`--color-bg-canvas`,
`--color-text-primary`, `--color-accent-default`, `--color-border-subtle`) are the
names Tasks 3-6 refer to. `usePrefersReducedMotion` is defined in Task 6 and is
the only motion gate any task references.

**Ordering constraints:** Task 1 precedes everything, since v4 changes how every
utility resolves and mixing it with token work makes a regression unattributable.
Task 2 precedes Task 3, since icons take `currentColor` from tokens. Task 4
precedes Task 5, which composes primitives. Task 6 is last because it modifies
the Theme Toggle that Task 4 creates.

**Counts:** baseline 304 unit plus 19 integration. Task 1 adds 3. Later tasks add
per-component contract tests; state the number each task adds rather than letting
it drift.

**Carried-forward risks:** `Caption` is Inter Medium in Figma while everything
else is Helvetica — Task 2 Step 3 forces a decision rather than inheriting it.
Figma's `Data/*` styles lost their mono face, so tabular figures must come from
CSS. And the Figma MCP cannot load Helvetica, so any text edit back into Figma
needs the Inter font-hop; this plan only reads from Figma, which avoids it.
