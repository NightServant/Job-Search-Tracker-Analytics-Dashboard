# M6 — Public Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build everything a stranger sees before they have an account — a landing page with a pinned hero and scroll-driven carousel, split-panel auth at `/login` and `/signup`, a custom 404, a privacy page, a read-only seeded demo, and a README that tells the truth — so someone can open the demo and understand the product without signing up.

**Architecture:** The public surface lives outside the `(app)` route group and therefore outside its auth guard. `src/app/page.tsx` stops redirecting to `/dashboard` and becomes the landing route. Every screen follows the split this branch already established seven times: the route calls the hooks and owns the data, a props-taking component in `src/components/` takes plain props and renders without Next routing, react-query or AuthProvider. Motion maths that a jsdom test cannot exercise through real layout is extracted into pure functions under `src/lib/`, the way `lib/calendar.ts` and `lib/analyticsRange.ts` already are, so pinning and carousel progress are unit-testable rather than merely inspectable.

**Tech Stack:** Next 15 App Router, React 19, Tailwind v4, `framer-motion` ^13.1.1 (already installed), `next-themes` ^0.4.6 (already installed), `swiper` (new, arrives with skiper51), `dialkit` (new, arrives with skiper106), Vitest + React Testing Library.

**Spec:** `docs/superpowers/plans/2026-08-23-worktrack-roadmap.md` — milestone M6, items 6.1, 6.1a, 6.2, 6.3, 6.4, 6.5, plus the "Third-party components — Skiper UI" section and the Global Constraints at the top of that file. Figma file `si641ecd9VS70DJPLvtPfo`, frames `Desktop / Landing Page`, `Mobile / Landing Page`, `Sign In`, `Sign Up` and their Dark twins. Predecessor plan: `docs/superpowers/plans/2026-08-25-m5-application-screens.md`. Predecessor execution ledger: `.superpowers/sdd/2026-08-25-m5-application-screens/progress.md` — read it; every rule in this plan's "How this plan was written" section is a scar from it.

## Global Constraints

Values copied verbatim from the roadmap's Global Constraints, plus the four
M5 added that still bind. Every task's requirements implicitly include this
section.

- **Supabase project:** `somyuulytwgzltiboewm`. Never `zlqepevzcfnnygaorvxn`.
- **RLS on every table**, no exceptions. Write policies must exclude demo users.
- **Accent:** `#c2410c` (orange-700) light, `#fb923c` (orange-400) dark. orange-500 fails WCAG AA on white at 2.80:1 — never use it for text.
- **Status colours are semantic only:** wishlist grey, applied **blue**, interviewing **violet**, offer green, rejected red. Orange is never a status.
- **No status pills.** Use the Status Marker pattern: 2px rule + label, no fill, no dot, no radius.
- **Icons:** the custom 34-icon set from `@/components/icons`. Never Lucide. `skiper26` pulls `lucide-react` transitively; because shadcn copies source in-tree, edit the import out rather than accepting it. `grep -r lucide src/` must come back empty.
- **Radius caps at 4px.** Separation is hairline rules, not card borders.
- **Every migration is idempotent** and lands in `supabase/migrations/` with the version recorded remotely. `supabase migration list --linked` must show local == remote after every milestone.
- **TDD is mandatory.** No production code without a failing test first.
- **Currency:** salary values are Philippine pesos unless a currency column says otherwise. Never assume USD.
- **Third-party components carry attribution obligations.** Skiper UI free-tier components require crediting Skiper UI. Every external component adopted gets a line in the README, same discipline already applied to CVJunction.

Carried forward from the M5 plan, still binding:

- **Screens write no new component styling.** If a screen needs a visual the design system does not provide, the component goes in `src/components/ui/` with a test, not inline in the page.
- **Font is Helvetica** with the stack `Helvetica, "Helvetica Neue", Arial, sans-serif`.
- **One `prefers-reduced-motion` gate:** `usePrefersReducedMotion()` from `@/hooks/usePrefersReducedMotion`, which is `useSyncExternalStore` over `src/lib/motion.ts`. Never a second `matchMedia` call.
- **The suite must stay green at every commit.**

---

## Current state this plan starts from

Verified 2026-08-28 by reading the files and the migrations, not assumed.
Branch `feat/m5-application-screens` at `7d5bdfb`. Where a row contradicts the
roadmap, the "Consequence" column says which wins.

| Thing | Verified state | Consequence |
|---|---|---|
| `components.json` | **Exists** (`style: base-nova`, `iconLibrary: "@/components/icons"`, `registries: {}`) | The roadmap's "shadcn is not initialised" is **stale — the repo wins**. Do not run `shadcn init`. But `registries` is empty, so `@skiper-ui/<id>` will not resolve until the registry is added. Task 1 handles it. |
| `src/components/v1/` | **Does not exist** | No Skiper component has ever been installed. Tasks 1 and 4 create it. |
| `skiper4` / `skiper26` | **Never adopted.** `src/components/ui/theme-toggle.tsx` was written against skiper4's *technique* and its docblock states why skiper26 was declined (it mounts a second theme provider and pulls lucide). | The roadmap's "All four adopted components" is **wrong about two of them — the repo wins**. Attribution handling in Task 1; open question at the end. |
| `useThemeToggle()` | **Does not exist.** No such export anywhere in `src`. | The roadmap's 6.1 line "skiper4's button driven by 4.6's `useThemeToggle()`" is **wrong — the repo wins**. The primitive is `ThemeToggle` from `@/components/ui/theme-toggle`, props `{ size?: 32 \| 44 }`, marked with `data-theme-toggle`. |
| `framer-motion` | `^13.1.1`, real dependency | Roadmap correct. Used by `ThemeToggle` and `Reveal`. |
| `next-themes` | `^0.4.6`, real dependency; `ThemeProvider attribute="class" defaultTheme="system" enableSystem` in `src/app/providers.tsx` | Roadmap correct. |
| `swiper`, `dialkit` | **Not installed** | Arrive with skiper51 (Task 1) and skiper106 (Task 4). |
| `lucide-react` | `^0.400.0` installed. Three hits in `src`: `contexts/ToastContext.tsx:4` (`X`), `screens/LoginPage.tsx:6` (`Mail, Lock, Briefcase, AlertCircle`), and `ui/theme-toggle.tsx:53` (prose in a docblock, not an import) | M5 Task 10 removes it and is **not yet done**. M6 Task 4 deletes `LoginPage.tsx` outright, which retires four of the five imports on its own. M6 must not add any. |
| `src/app/page.tsx` | 4 lines: `redirect('/dashboard')` | Task 2 replaces it with the landing page. |
| `src/app/(auth)/login/page.tsx` | 7 lines, renders `@/screens/LoginPage` | Task 4 replaces it. |
| `src/screens/LoginPage.tsx` | 261 lines, pre-M4: `bg-primary-600`, `rounded-xl`, `.input`/`.btn-primary` legacy classes, lucide icons, and **one component serving both sign-in and sign-up** behind a local `isLogin` boolean | Task 4 deletes it and splits it into two routes. This is the last screen in the repo still on the pre-M4 visual language. |
| `/signup` | **Does not exist** | New in Task 4. |
| 404 / privacy routes | **Neither exists.** No `not-found.tsx` anywhere, no `privacy` route. `src/components/errors/` holds `AppErrorBoundary.tsx` and `ErrorFallback.tsx` — runtime error handling, not routing. | Both new in Task 5. |
| `src/components/ui/input.tsx` | Exports `Input` **and `PasswordInput`**. `PasswordInput`'s reveal control is `right-2` on a shrink-wrapping wrapper, with a docblock naming the 375px off-canvas bug. `Input`'s docblock says focus is read from `focus-visible` and is deliberately not a prop. | The roadmap's two "things that will bite when this is coded" for 6.2 (double-focused field, off-canvas reveal control) are **already solved in M4 — the repo wins**. Task 4 reuses these, it does not re-solve them. |
| `src/hooks/usePrefersReducedMotion.ts` + `src/lib/motion.ts` | Present. `useSyncExternalStore`; `subscribeToMotionPreference` attaches a real `change` listener; the docblock says "M6's pinned landing" reads it. | 6.1a's "read the preference live, not once at mount" is already satisfied by the existing hook. Do not write a second `matchMedia` call. |
| `src/test/setup.ts` | Globally mocks `window.matchMedia` with `matches: false` and `addEventListener: vi.fn()` — a **no-op listener** | Any test of live preference change must install its own dispatching mock. Task 3 gives one. |
| `src/services/demoMode.ts` | Exists: `isDemoUser(userId: string \| null, demoUserIds: string[]): boolean`, tested in `src/services/__tests__/demoMode.test.ts`, docblocked as affordance-only and explicitly not the security boundary | 6.4 builds on this; it does not write a new one. |
| `supabase/migrations/20260825043057_add_demo_accounts.sql` | `demo_accounts` table, `public.is_demo()` (SECURITY DEFINER, STABLE), and RESTRICTIVE `demo_block_insert/update/delete` on nine tables | The read-only boundary already exists in RLS. |
| SECURITY DEFINER functions in the repo | Exactly two: `public.is_demo()` (`20260825043057`) and `public.delete_own_account()` (`20260828090000`, guarded by `20260828093000`) | **A SECURITY DEFINER function does not consult RLS**, so `demo_block_*` cannot protect it. `delete_own_account` shipped without an `is_demo()` guard, was caught in M5 Task 9, and was patched by `20260828090000` (guard) + `20260828093000` (revoke EXECUTE from `anon`). Task 6 must not reopen this class. |
| `scripts/seed-demo.mjs` + `scripts/demoSeedData.mjs` | Present. `npm run seed:demo`. Pure dataset builder, fixed `TODAY = '2026-08-25'`. **27 applications**, 4 events, 5 activity notes, 2 contacts, 1 CV, 1 pinned document link. Every job carries `salary_currency: 'PHP'`. | 6.4's "25+ applications" is met at 27. Two caveats below. |
| Seed caveat 1 | `seed-demo.mjs` does **not** insert into `demo_accounts`; it prints the SQL and requires a human to run it. Its own docblock says the account must **not** be in `demo_accounts` while seeding, because the restrictive policies would refuse every insert. | Task 6's runbook must state the order: create user → seed → insert into `demo_accounts`. Reversing it produces a silent all-failures seed. |
| Seed caveat 2 | The demo CV is seeded with `mode: 'structured'`. The M5 ledger records that `resumeService.normalizeMode` settles `structured` to `word`, and that opening such a row in the Word editor and letting autosave fire rewrites `mode` and `content` and orphans `sections`. | On the demo account the write is refused by RLS, so no data is lost — but the demo visitor opening `/cv?draft=<id>` sees a Word editor holding a starter template and a failing autosave. Task 6 handles it; see its ruling. |
| `public/` | Contains only `vite.svg`. **No hero video, no poster, no screenshots.** | Every image the landing page and README need has to be produced. Tasks 2 and 7 have steps for it. |
| `src/lib/env.ts` | `readRuntimeFlags(source)` is pure and testable; `nextPublicEnv()` lists each `NEXT_PUBLIC_*` as a literal property access, with a docblock explaining that Next only substitutes the literal text | Task 6 adds `NEXT_PUBLIC_DEMO_USER_IDS` **as a literal** in that function. A computed key or a spread yields an empty value in the browser bundle. |
| `next.config.ts` | `pageExtensions: ['tsx','ts']`, `eslint.ignoreDuringBuilds: true`, one redirect `/jobs → /applications` | Task 2 does not need a new redirect; it replaces the `/` route file. |
| `tsconfig.json` | `exclude` contains `src/**/__tests__/**` and `src/**/*.test.ts(x)` | **`tsc --noEmit` never typechecks test files.** Three required-prop violations survived a clean typecheck during M5 because of this. Every task in M6 runs the un-excluded typecheck in its verify step. |
| Test suite | 655 unit tests at `cf26dfc` per the M5 ledger; `7d5bdfb` added a migration only. Integration suite is 19 and runs separately via `npm run test:integration`. | Re-measure with `npx vitest run` before Task 1 and record the real number; do not carry 655 forward as a claim. |
| Design system primitives available | `button` (primary/secondary/ghost × m/s, `data-variant`), `input` + `PasswordInput`, `field`, `page-header` (`[data-body-header]`), `panel-section`, `route-states`, `status-marker`, `segmented-control`, `icon-button`, `spinner`, `theme-toggle` (`[data-theme-toggle]`), `nav-item`, `sidebar`, `breadcrumb`, `kpi-stat`, `job-card`, `application-row`, `kanban-column`, `ats-check` | The public surface composes these. It writes no new styling of its own except where a task's Files block creates a `ui/` component with a test. |

## How this plan was written

The M5 plan shipped five defect classes that each cost a fix round or nearly
shipped a bug. They are recorded in
`.superpowers/sdd/2026-08-25-m5-application-screens/progress.md`. Every rule
below is a direct response, and reviewers should hold this plan to them.

1. **Every path in a Files block was opened before it was written down.** M5's
   Task 7 said "delete `ResumePage.tsx`" and "keep the `/cv` editor route" in
   the same task; `ResumePage.tsx` *was* the editor, and following the plan
   literally would have destroyed 670 lines of live feature. Nothing in this
   plan is named for deletion without its contents and its importers having
   been read. Task 4's deletion of `LoginPage.tsx` states both.
2. **Every name in an Interfaces block was read from the source.** M5's Task 8
   assumed a date-range picker could filter analytics; no service method takes
   a range and three of five return shapes have no date field. Where this plan
   needs an interface that does not exist yet — the two Skiper components,
   which are downloaded rather than authored — it says so explicitly and gives
   a verification step instead of inventing a signature.
3. **Every test written here is executable as written and can fail.** M5
   shipped four tests that could not: `getByRole('banner')` for a body header
   when the top bar was already the banner; `expect(() => svc.fn()).rejects`
   on a function wrapper with no `await`; `queryBy…toBeNull()` negatives that
   pass when the component renders nothing; and fixtures supplying a value the
   production path could never produce, which hid a Critical for a whole
   milestone. In this plan every negative assertion carries a positive
   companion in the same test, and no fixture asserts a literal the code under
   test cannot emit.
4. **Timers advance in separate `act` blocks.** A single
   `vi.advanceTimersByTime(5000)` fired two M5 timers before any microtask
   flush and hid a feature that had never once worked. M6's pinned scroll and
   carousel progress are full of the same hazard.
5. **Every task with a screen names both files.** Three M5 tasks wrote tests
   rendering `<XPage data={…} />` while their Files block listed only a route.
   The established pattern is: the route calls hooks; a props-taking component
   takes data and is testable without Next routing. Both are named here, every
   time.

## Decisions locked before execution

These follow from the roadmap's "Settled:" lines and from the verified repo
state. They are not open for re-litigation during execution.

**The theme control is `ThemeToggle` from `@/components/ui/theme-toggle`.** Not
skiper4, not skiper26, not a landing-specific one. It is already the control
the app shell mounts, which is what 6.1 asks for; the roadmap's `useThemeToggle()`
never existed. It carries `data-theme-toggle`, which is the test hook.

**Pinning is CSS `position: sticky`, never JS scroll hijacking.** The roadmap
settles this. `framer-motion`'s `useScroll` supplies a progress value *inside*
an already-pinned section; it never takes over scrolling.

**Scroll drives the slides; the carousel is not touchable.** Settled by the
roadmap. `allowTouchMove: false`, `simulateTouch: false`, `loop: false`,
`autoplay` off, driven by Swiper's `setProgress(0..1)` from the pinned
section's scroll progress — never `slideNext()` on thresholds.

**Under `prefers-reduced-motion` the carousel becomes a conventional one.**
Settled by the roadmap. Pinning off, sections in normal flow, `allowTouchMove:
true`, `simulateTouch: true`, nothing driving `setProgress`. `loop` stays
`false` in both modes. Arrows are on in both modes. Both paths are tested.

**The preference is read live.** `usePrefersReducedMotion()` already subscribes
to `matchMedia` changes; the pin and the Swiper instance both react to a change
while the page is open. A value captured at mount is a defect.

**Motion maths is extracted to `src/lib/pinnedScroll.ts` as pure functions.**
jsdom has no layout engine, so a test cannot scroll a real pinned section. The
same call was already made for `lib/calendar.ts` (grid geometry) and
`lib/analyticsRange.ts` (month boundaries), both after a reviewer asked for it.
The React layer is then tested by driving `progress` as a prop and by handing
the hook a fake Swiper object, so both are exercised without mounting Swiper in
jsdom.

**The landing page renders for everyone, signed in or not.** `src/app/page.tsx`
currently redirects to `/dashboard`, so today a signed-in visitor never sees
`/`. This is a portfolio piece; the landing page is the thing a reviewer is
meant to see, and a redirect that hides it from the only person who has an
account is perverse. The navbar's `sign in` / `sign up` controls stay as drawn
regardless of session, because reading auth state in the public route means the
landing page can no longer be statically rendered. Surfaced as an open
question at the end.

**The hero ships poster-only on both breakpoints; the video element is built
and gated behind a src.** Figma draws a background video on desktop and a
poster on mobile, but `public/` holds no video and none can be produced by an
implementing agent. `HeroMedia` renders a `<video>` when `videoSrc` is a
non-empty string and the poster `<img>` otherwise, and 6.1a's pause-on-unpin
behaviour is implemented and tested against the video path. Dropping a file in
later is then a one-line change, not a rework.

**`SmoothInput` is used for the email field only; password fields keep M4's
`PasswordInput`.** skiper106 hides the native caret and redraws it. On a masked
field there is no caret to smooth — the characters are dots — so the technique
buys nothing there, while the redrawn caret would have to coexist with
`PasswordInput`'s absolutely-positioned reveal control inside the same box.
Surfaced as an open question at the end.

**Attribution ships in Task 1, not Task 7.** The roadmap's discipline is that
every external component adopted gets a README line *when it is adopted*. A
gate test enforces it from the first commit, so 6.5's README rewrite cannot
silently drop it.

**Task order is fixed and mostly serial.** Task 1 precedes 2 and 3 (they render
the carousel). Task 2 precedes 3 (pinning needs sections to pin). Tasks 4–7 are
independent of 1–3 but are not run in parallel: the M5 ledger records two
concrete incidents from parallel agents sharing one working tree — a staged
index that nearly buried three file deletions in the wrong commit, and two
contended `.next` builds, one of which reported every route at 0 B while
claiming success. If parallel dispatch is wanted anyway, each agent gets its own
git worktree per `superpowers:using-git-worktrees`, and no two agents run
`npm run build` at once.

---

### Task 1: Adopt skiper51 and make attribution a gate

**Files:**
- Modify: `components.json` (add the `@skiper-ui` registry to the empty `registries` object)
- Create (by the shadcn CLI): `src/components/v1/skiper51.tsx`
- Modify: `src/components/v1/skiper51.tsx` (post-install edits, listed below)
- Create: `src/lib/attribution.ts`
- Create: `src/lib/__tests__/attribution.test.ts`
- Create: `src/components/landing/carouselOptions.ts`
- Create: `src/components/landing/__tests__/carouselOptions.test.ts`
- Create: `src/components/v1/__tests__/skiper51-source.test.ts`
- Modify: `README.md` (add the Attribution section)
- Modify: `package.json` (`swiper` arrives as a dependency)

**Interfaces:**
- Consumes: nothing from earlier tasks. `components.json` and the shadcn CLI.
- Produces:
  - `src/components/v1/skiper51.tsx` — vendor source, **downloaded not authored**. Its exact export name and prop names are unknown until it lands; Step 2 reads them and Step 3 records them at the top of `carouselOptions.ts` as a comment. The roadmap states its props are `images`, `className`, `showPagination`, `showNavigation`, `loop`, `autoplay`, `spaceBetween`. Steps 3–4 add one more: `onSwiper?: (swiper: SwiperClass) => void`, passed straight through to Swiper's own `onSwiper`. Without it Task 3 has no handle to call `setProgress` on and the whole of 6.1a is unbuildable.
  - `SCROLL_DRIVEN_OPTIONS` and `REDUCED_MOTION_OPTIONS` from `@/components/landing/carouselOptions`, both `SwiperCarouselOptions`:
    ```ts
    export interface SwiperCarouselOptions {
      loop: false
      autoplay: false
      allowTouchMove: boolean
      simulateTouch: boolean
      showNavigation: true
      shadow: false
    }
    ```
  - `carouselOptionsFor(reduced: boolean): SwiperCarouselOptions`
  - `SKIPER_ATTRIBUTION: AttributionEntry[]` from `@/lib/attribution`, where
    ```ts
    export interface AttributionEntry {
      id: string      // 'skiper51'
      name: string    // 'Creative carousel 002'
      href: string    // 'https://skiper-ui.com/components'
      credit: string  // the exact sentence that must appear in the README and the footer
    }
    ```

- [ ] **Step 1: Add the Skiper registry to `components.json`**

`registries` is currently `{}`, so `pnpm dlx shadcn add @skiper-ui/skiper51`
cannot resolve. Add:

```json
  "registries": {
    "@skiper-ui": "https://skiper-ui.com/r/{name}.json"
  }
```

Run: `git diff components.json`
Expected: only the `registries` object changes. `style`, `iconLibrary` and
`aliases` are untouched — `iconLibrary` is `@/components/icons` and must stay
that way or the CLI will start writing lucide imports.

- [ ] **Step 2: Install skiper51 and read what actually landed**

```bash
pnpm dlx shadcn add @skiper-ui/skiper51
```

Expected: a new file under `src/components/v1/` and `swiper` (plus possibly
`framer-motion`, already present) added to `package.json`.

Then **read the installed file end to end** and write down, in the task report:
its exported component name, its full prop list, whether it already forwards
`onSwiper`, whether it imports `lucide-react`, and whether the creative effect
sets `shadow: true`. Do not proceed on the roadmap's description of these — it
was written from the website, not from the file.

If the registry does not resolve (network, moved registry, renamed component),
**stop and report**. Do not hand-write a substitute carousel: the attribution
obligation, the licence and the whole of 6.1a are written against this specific
component, and a lookalike would carry the credit for code it is not.

- [ ] **Step 3: Write the failing source-shape test**

```ts
// src/components/v1/__tests__/skiper51-source.test.ts
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const SOURCE = 'src/components/v1/skiper51.tsx'

describe('the copied skiper51 source', () => {
  const src = readFileSync(SOURCE, 'utf8')

  it('is the carousel we think it is', () => {
    // Positive companion for the three negatives below: without this, a file
    // that had been emptied or renamed would satisfy every "not" assertion.
    expect(src).toContain('swiper')
    expect(src).toMatch(/export\s+(default\s+)?(function|const)\s+\w+/)
  })

  it('imports no icons from lucide-react', () => {
    // Global Constraint: the custom 34-icon set is the only icon vocabulary.
    // shadcn copies source in-tree, so this is an edit, not a fork.
    expect(src).not.toMatch(/from\s+['"]lucide-react['"]/)
  })

  it('forwards a Swiper instance to its caller', () => {
    // 6.1a drives the carousel with setProgress(0..1). Without a handle on the
    // instance there is nothing to call it on.
    expect(src).toContain('onSwiper')
  })

  it('does not ship the creative effect shadow', () => {
    // This system is flat with hairline rules; the vendor default is shadowed.
    expect(src).not.toMatch(/shadow:\s*true/)
  })
})
```

- [ ] **Step 4: Run it and watch the three negatives fail**

Run: `npx vitest run src/components/v1/__tests__/skiper51-source.test.ts`
Expected: the "is the carousel we think it is" test PASSES immediately (it
describes what was just installed), and at least the `onSwiper` test FAILS,
since the roadmap's prop list does not include it. Record which of the four
actually failed — that is the real edit list for Step 5.

- [ ] **Step 5: Make the post-install edits**

In `src/components/v1/skiper51.tsx`:

1. Delete any `lucide-react` import and replace the glyphs it provided with
   `@/components/icons` equivalents. The arrows the roadmap calls "showNavigation"
   have no chevron in the 34-icon set; use `ArrowRightIcon` for next and the same
   glyph with `className="rotate-180"` for previous, matching Task 6 of M5's
   precedent that a missing glyph becomes an existing control rather than an
   invented icon.
2. Add `onSwiper?: (swiper: SwiperClass) => void` to the props interface and
   pass it straight to the underlying `<Swiper onSwiper={onSwiper}>`.
3. Set `shadow: false` on the creative effect.
4. Replace hardcoded colours with the M4 tokens (`bg-bg-canvas`,
   `text-text-primary`, `border-border-subtle`). Radius anywhere in this file
   caps at `rounded-md` (4px).

- [ ] **Step 6: Reconcile Swiper's own CSS with the M4 tokens**

Swiper ships its own stylesheet and DOM (`.swiper-slide`,
`.swiper-pagination`, `.swiper-button-next`) and the vendor's guidance is
`!important` overrides. Put the overrides in one place —
`src/index.css`, under a commented block — not scattered across components:

```css
/* Swiper (skiper51, M6 6.1) ships its own stylesheet. These override its
   defaults onto the M4 tokens. Kept in one block rather than inline on the
   component so a later reader can see the whole vendor reconciliation at
   once. Radius caps at 4px here as everywhere. */
.swiper-slide { border-radius: var(--radius-md); overflow: hidden; }
.swiper-pagination-bullet { background: var(--color-text-muted); opacity: 1; border-radius: var(--radius-sm); }
.swiper-pagination-bullet-active { background: var(--color-accent-default); }
.swiper-button-next, .swiper-button-prev { color: var(--color-text-secondary); }
.swiper-button-next::after, .swiper-button-prev::after { content: none; }
```

The `content: none` matters: Swiper draws its arrows as a `::after` glyph from
its own icon font, which is a second icon vocabulary and the Global Constraint
forbids it. Killing the pseudo-element is what lets the custom icons show.

- [ ] **Step 7: Write the failing options test**

```ts
// src/components/landing/__tests__/carouselOptions.test.ts
import { describe, it, expect } from 'vitest'
import {
  SCROLL_DRIVEN_OPTIONS,
  REDUCED_MOTION_OPTIONS,
  carouselOptionsFor,
} from '../carouselOptions'

describe('carousel options', () => {
  it('never loops, in either mode', () => {
    // Scroll progress maps 1:1 onto the slides so the pin releases on the last
    // one. A looping carousel has no last slide and the section never ends.
    expect(SCROLL_DRIVEN_OPTIONS.loop).toBe(false)
    expect(REDUCED_MOTION_OPTIONS.loop).toBe(false)
  })

  it('never autoplays, in either mode', () => {
    // WCAG 2.2.2: an auto-advancing carousel with no pause control fails.
    expect(SCROLL_DRIVEN_OPTIONS.autoplay).toBe(false)
    expect(REDUCED_MOTION_OPTIONS.autoplay).toBe(false)
  })

  it('keeps arrows on in both modes, not only the reduced one', () => {
    // They are the keyboard affordance, and with touch off the scroll-driven
    // mode has no other control at all.
    expect(SCROLL_DRIVEN_OPTIONS.showNavigation).toBe(true)
    expect(REDUCED_MOTION_OPTIONS.showNavigation).toBe(true)
  })

  it('turns touch off when scroll drives the slides', () => {
    expect(SCROLL_DRIVEN_OPTIONS.allowTouchMove).toBe(false)
    expect(SCROLL_DRIVEN_OPTIONS.simulateTouch).toBe(false)
  })

  it('restores touch under reduced motion', () => {
    // Without this the carousel is frozen on slide one for exactly the users
    // who opted out of motion.
    expect(REDUCED_MOTION_OPTIONS.allowTouchMove).toBe(true)
    expect(REDUCED_MOTION_OPTIONS.simulateTouch).toBe(true)
  })

  it('picks the mode from the preference', () => {
    expect(carouselOptionsFor(false)).toEqual(SCROLL_DRIVEN_OPTIONS)
    expect(carouselOptionsFor(true)).toEqual(REDUCED_MOTION_OPTIONS)
  })

  it('never ships the creative effect shadow', () => {
    expect(SCROLL_DRIVEN_OPTIONS.shadow).toBe(false)
    expect(REDUCED_MOTION_OPTIONS.shadow).toBe(false)
  })
})
```

- [ ] **Step 8: Run it and watch it fail**

Run: `npx vitest run src/components/landing/__tests__/carouselOptions.test.ts`
Expected: FAIL — `Failed to resolve import "../carouselOptions"`.

- [ ] **Step 9: Write `carouselOptions.ts`**

```ts
// src/components/landing/carouselOptions.ts

/**
 * The two Swiper configurations the landing carousel runs in.
 *
 * Touch is the only thing that differs, and it is what selects the mode. In
 * the scroll-driven mode page scroll advances the slides while the section is
 * pinned, so direct manipulation is off and would fight the scroll. Under
 * prefers-reduced-motion the pin is gone and nothing drives setProgress, so
 * touch is the only way through and must come back.
 *
 * loop is false in both. The scroll-driven path needs a last slide so the pin
 * can release deterministically; a conventional carousel does not benefit
 * enough from looping to justify keeping two configurations in step.
 *
 * Arrows are on in both. They are the keyboard affordance, and with touch off
 * the scroll-driven mode would otherwise have no control at all.
 *
 * Prop names below mirror the copied source at src/components/v1/skiper51.tsx.
 * Re-read that file if either drifts.
 */
export interface SwiperCarouselOptions {
  loop: false
  autoplay: false
  allowTouchMove: boolean
  simulateTouch: boolean
  showNavigation: true
  shadow: false
}

export const SCROLL_DRIVEN_OPTIONS: SwiperCarouselOptions = {
  loop: false,
  autoplay: false,
  allowTouchMove: false,
  simulateTouch: false,
  showNavigation: true,
  shadow: false,
}

export const REDUCED_MOTION_OPTIONS: SwiperCarouselOptions = {
  loop: false,
  autoplay: false,
  allowTouchMove: true,
  simulateTouch: true,
  showNavigation: true,
  shadow: false,
}

export function carouselOptionsFor(reduced: boolean): SwiperCarouselOptions {
  return reduced ? REDUCED_MOTION_OPTIONS : SCROLL_DRIVEN_OPTIONS
}
```

- [ ] **Step 10: Run the options test and watch it pass**

Run: `npx vitest run src/components/landing/__tests__/carouselOptions.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 11: Write the failing attribution test**

```ts
// src/lib/__tests__/attribution.test.ts
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { SKIPER_ATTRIBUTION } from '../attribution'

describe('third-party attribution', () => {
  it('lists every Skiper component whose source ships in this repo', () => {
    // Free-tier Skiper components require attribution. skiper51 lands in M6
    // Task 1 and skiper106 in Task 4; both are copied into src/components/v1/.
    // skiper4 and skiper26 are NOT here: their source was never installed --
    // ui/theme-toggle.tsx was written against skiper4's technique and its
    // docblock records why skiper26 was declined. They are credited as
    // inspiration in the README prose, which is a courtesy, not this
    // obligation.
    expect(SKIPER_ATTRIBUTION.map((e) => e.id)).toEqual(['skiper51', 'skiper106'])
  })

  it('gives every entry a credit sentence, a name and a link', () => {
    expect(SKIPER_ATTRIBUTION.length).toBeGreaterThan(0)
    for (const entry of SKIPER_ATTRIBUTION) {
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.credit.length).toBeGreaterThan(0)
      expect(entry.href).toMatch(/^https:\/\//)
    }
  })

  it('reproduces every credit sentence verbatim in the README', () => {
    // The licence obligation is on what ships. The landing footer renders
    // these same strings (Task 2), so one edit keeps both honest.
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('## Attribution')
    for (const entry of SKIPER_ATTRIBUTION) {
      expect(readme, `README is missing the credit for ${entry.id}`).toContain(entry.credit)
    }
  })

  it('names the upstreams the roadmap requires', () => {
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('Skiper UI')
    expect(readme).toContain('Swiper.js')
    expect(readme).toContain('AarzooAly')
    expect(readme).toContain('toggles.dev')
    expect(readme).toContain('rudrodip/theme-toggle-effect')
  })
})
```

- [ ] **Step 12: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/attribution.test.ts`
Expected: FAIL — `Failed to resolve import "../attribution"`.

- [ ] **Step 13: Write `src/lib/attribution.ts`**

`skiper106` is listed now, ahead of Task 4 installing it, so the gate is
already red if Task 4 lands the component without touching the README. Task 4
does not get to add its own credit line as an afterthought.

```ts
// src/lib/attribution.ts

/**
 * Third-party components whose SOURCE ships in this repository.
 *
 * Skiper UI's free tier reads: "Free to use and modify in both personal and
 * commercial projects. Attribution to Skiper UI is required when using the
 * free version." The registry copies source in-tree rather than installing a
 * package, so the obligation attaches to these two files and no others.
 *
 * skiper4 and skiper26 are deliberately absent. Neither was ever installed --
 * ui/theme-toggle.tsx was written against skiper4's crossfade-and-counter-
 * rotate technique with our own icons and the app's own next-themes provider,
 * and its docblock records why skiper26 was declined. Studying a component and
 * reimplementing it against our own tokens is the same line already drawn
 * around CVJunction, and it carries no licence obligation. They are still
 * named in the README's prose as influences, which is honesty rather than
 * compliance.
 *
 * `credit` is the exact sentence rendered in the landing footer AND asserted
 * verbatim against README.md, so the two cannot drift.
 */
export interface AttributionEntry {
  id: string
  name: string
  href: string
  credit: string
}

export const SKIPER_ATTRIBUTION: AttributionEntry[] = [
  {
    id: 'skiper51',
    name: 'Creative carousel 002',
    href: 'https://skiper-ui.com/components',
    credit:
      'Carousel adapted from Skiper UI (Creative carousel 002), built on Swiper.js, with illustrations by AarzooAly.',
  },
  {
    id: 'skiper106',
    name: 'Smooth caret input',
    href: 'https://skiper-ui.com/components',
    credit: 'Smooth caret input adapted from Skiper UI (Smooth caret input).',
  },
]
```

- [ ] **Step 14: Add the Attribution section to the README**

Append above the existing Credits section:

```markdown
## Attribution

UI components adapted from [Skiper UI](https://skiper-ui.com/components).
Skiper UI's free tier requires attribution.

- Carousel adapted from Skiper UI (Creative carousel 002), built on Swiper.js, with illustrations by AarzooAly.
- Smooth caret input adapted from Skiper UI (Smooth caret input).

The theme toggle is not a Skiper component. It was written from scratch against
the technique in Skiper UI's theme toggle buttons — themselves adapted from
[toggles.dev](https://toggles.dev) by Alfie Jones — and the View Transition
theme wipe follows the approach in `rudrodip/theme-toggle-effect`. Neither
component's source ships here, so neither carries an attribution obligation;
both are named because the ideas are theirs.
```

- [ ] **Step 15: Run the whole suite and the un-excluded typecheck**

```bash
npx vitest run
npx tsc --noEmit
npx tsc --noEmit --project /dev/null 2>/dev/null || npx tsc --noEmit src/lib/__tests__/attribution.test.ts --jsx react-jsx --moduleResolution bundler --module esnext --target es2020 --skipLibCheck --noEmit
npm run build
```

Expected: green, exit 0, clean build. The third command exists because
`tsconfig.json` excludes `src/**/__tests__/**`, so the plain `tsc --noEmit`
does not typecheck any test file — three required-prop violations survived a
"clean typecheck" during M5 for exactly this reason. Record the new test count.

- [ ] **Step 16: Commit**

```bash
git add components.json package.json package-lock.json README.md src/index.css \
  src/lib/attribution.ts src/lib/__tests__/attribution.test.ts \
  src/components/v1 src/components/landing
git commit -m "feat: adopt skiper51 and gate Skiper UI attribution with a test"
```

---

### Task 2: The landing page in normal flow

Everything in 6.1 except the pinning, which is Task 3. Built in normal document
flow first so that the reduced-motion path — the one that rots because nobody
sees it — is the thing that exists before the pinned path is layered on top.

**Files:**
- Modify: `src/app/page.tsx` (currently 4 lines: `redirect('/dashboard')`; becomes the landing route)
- Create: `src/components/landing/Landing.tsx`
- Create: `src/components/landing/Hero.tsx`
- Create: `src/components/landing/HeroMedia.tsx`
- Create: `src/components/landing/ScreenCarousel.tsx`
- Create: `src/components/landing/AtsSection.tsx`
- Create: `src/components/landing/FeatureGrid.tsx`
- Create: `src/components/landing/StickyNavbar.tsx`
- Create: `src/components/landing/SiteFooter.tsx`
- Create: `src/components/landing/screens.ts`
- Create: `src/components/landing/__tests__/Landing.test.tsx`
- Create: `src/components/landing/__tests__/SiteFooter.test.tsx`
- Create: `public/screens/*.png` (five files, named in Step 1)
- Create: `public/hero-poster.png`

**Interfaces:**
- Consumes: `SKIPER_ATTRIBUTION` from `@/lib/attribution` (Task 1);
  `carouselOptionsFor` from `@/components/landing/carouselOptions` (Task 1);
  the skiper51 component from `@/components/v1/skiper51` (Task 1);
  `Button` from `@/components/ui/button` (`variant: 'primary' | 'secondary' | 'ghost'`, `size: 'm' | 's'`, emits `data-variant`);
  `ThemeToggle` from `@/components/ui/theme-toggle` (`size?: 32 | 44`, emits `data-theme-toggle`);
  `usePrefersReducedMotion` from `@/hooks/usePrefersReducedMotion`;
  icons from `@/components/icons` (`PlayIcon`, `ArrowRightIcon`, `ShieldIcon`, `TargetIcon`, `AnalyticsIcon` all verified present).
- Produces:
  ```ts
  export interface LandingScreen { src: string; alt: string; caption: string }
  export const SCREENS: LandingScreen[]                       // from ./screens
  export interface LandingProps {
    screens: LandingScreen[]
    heroPosterSrc: string
    /** Empty string ships the poster; a path ships a <video>. */
    heroVideoSrc?: string
    /** Task 3 drives these; in normal flow they are the defaults below. */
    pinned?: boolean          // default false
    carouselProgress?: number // default 0
    heroUnpinned?: boolean    // default true
  }
  export function Landing(props: LandingProps): JSX.Element
  export function SiteFooter(): JSX.Element
  export function StickyNavbar(props: { revealed: boolean }): JSX.Element
  ```
  Task 3 consumes `pinned`, `carouselProgress` and `heroUnpinned` and nothing
  else. That is the whole seam between the two tasks.

- [ ] **Step 1: Capture the five product screenshots and the hero poster**

The carousel shows real screens; `public/` currently holds only `vite.svg`.
Nothing to fake here — run the app and take the pictures.

```bash
npm run dev
```

Sign in with a real account that has data (or run `npm run seed:demo` first —
see Task 6), then capture at 1440×900, light theme, and save as:

| File | Route |
|---|---|
| `public/screens/dashboard.png` | `/dashboard` |
| `public/screens/applications.png` | `/applications` |
| `public/screens/application-detail.png` | `/applications/<id>` |
| `public/screens/analytics.png` | `/analytics` |
| `public/screens/cv.png` | `/cv?draft=<id>` |

Save a 1440×900 crop of the dashboard as `public/hero-poster.png`.

Each PNG must be under 400 KB — five uncompressed 1440×900 screenshots is
several megabytes shipped to every visitor on a page whose whole argument is
restraint. Check with `du -h public/screens/*.png public/hero-poster.png`.

- [ ] **Step 2: Write the failing landing test**

```tsx
// src/components/landing/__tests__/Landing.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Landing } from '../Landing'
import type { LandingScreen } from '../screens'

// ThemeToggle reads next-themes. The landing page mounts the real primitive
// (there is no landing-specific toggle), so the provider is mocked rather
// than the component -- mocking the component would let a regression that
// dropped it pass unnoticed.
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

const SCREENS: LandingScreen[] = [
  { src: '/screens/dashboard.png', alt: 'The Worktrack dashboard', caption: 'Overview' },
  { src: '/screens/applications.png', alt: 'The applications list', caption: 'Applications' },
  { src: '/screens/analytics.png', alt: 'The analytics screen', caption: 'Analytics' },
]

function renderLanding(overrides = {}) {
  return render(
    <Landing screens={SCREENS} heroPosterSrc="/hero-poster.png" {...overrides} />
  )
}

afterEach(() => vi.clearAllMocks())

describe('the landing hero', () => {
  it('leads with the demo and offers account creation beside it', () => {
    // The demo leads on purpose: this is a portfolio piece and the
    // frictionless path is the one worth pushing.
    renderLanding()
    const demo = screen.getByRole('link', { name: 'try the live demo' })
    const create = screen.getByRole('link', { name: 'create account' })
    expect(demo).toHaveAttribute('data-variant', 'primary')
    expect(create).toHaveAttribute('data-variant', 'secondary')
    expect(create).toHaveAttribute('href', '/signup')
  })

  it('shows the poster when no video source is given', () => {
    renderLanding()
    expect(screen.getByAltText('The Worktrack dashboard, as a still')).toHaveAttribute(
      'src',
      '/hero-poster.png'
    )
    expect(screen.queryByTestId('hero-video')).toBeNull()
  })

  it('shows a muted, looping video when one is given', () => {
    // Positive companion to the negative above: proves the poster branch is a
    // real branch and not the only thing the component can render.
    renderLanding({ heroVideoSrc: '/hero.mp4' })
    const video = screen.getByTestId('hero-video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
  })
})

describe('the landing navbar', () => {
  it('carries sign in as a link and sign up as the primary button', () => {
    renderLanding()
    const nav = screen.getByRole('banner')
    const signIn = within(nav).getByRole('link', { name: 'sign in' })
    const signUp = within(nav).getByRole('link', { name: 'sign up' })
    expect(signIn).toHaveAttribute('href', '/login')
    expect(signIn).toHaveAttribute('data-variant', 'ghost')
    expect(signUp).toHaveAttribute('href', '/signup')
    expect(signUp).toHaveAttribute('data-variant', 'primary')
  })

  it('demotes the navbar demo to secondary and hides it below md', () => {
    // Two filled buttons in one bar have no hierarchy, and 375px cannot hold a
    // logo plus three controls -- the hero already carries the demo there.
    renderLanding()
    const nav = screen.getByRole('banner')
    const demo = within(nav).getByRole('link', { name: 'open the demo' })
    expect(demo).toHaveAttribute('data-variant', 'secondary')
    expect(demo.className).toContain('hidden')
    expect(demo.className).toContain('md:inline-flex')
  })

  it('is hidden until the hero has scrolled past', () => {
    renderLanding()
    expect(screen.getByRole('banner')).toHaveAttribute('data-revealed', 'false')
  })
})

describe('the landing theme control', () => {
  it('mounts the same primitive the app shell uses, in the navbar and the footer', () => {
    // The navbar is hidden until the hero scrolls past, so a toggle only there
    // is unreachable from the top of the page. Two, deliberately.
    const { container } = renderLanding()
    expect(container.querySelectorAll('[data-theme-toggle]')).toHaveLength(2)
  })
})

describe('the landing carousel', () => {
  it('renders one slide per screen, each with real alt text', () => {
    renderLanding()
    for (const s of SCREENS) {
      expect(screen.getByAltText(s.alt)).toHaveAttribute('src', s.src)
    }
  })

  it('gives keyboard users the navigation arrows', () => {
    // Touch is off in the scroll-driven mode, so without these there is no
    // control at all.
    renderLanding()
    expect(screen.getByRole('button', { name: 'Previous screen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next screen' })).toBeInTheDocument()
  })
})
```

Add `import { within } from '@testing-library/react'` to the import line above.

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run src/components/landing/__tests__/Landing.test.tsx`
Expected: FAIL — `Failed to resolve import "../Landing"`.

- [ ] **Step 4: Write the failing footer test**

```tsx
// src/components/landing/__tests__/SiteFooter.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteFooter } from '../SiteFooter'
import { SKIPER_ATTRIBUTION } from '@/lib/attribution'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

describe('the landing footer', () => {
  it('credits Skiper UI with the same sentences the README carries', () => {
    // Attribution is a licence obligation, not a nicety. Reading the strings
    // from the shared module is what stops the footer and the README drifting.
    render(<SiteFooter />)
    expect(SKIPER_ATTRIBUTION.length).toBeGreaterThan(0)
    for (const entry of SKIPER_ATTRIBUTION) {
      expect(screen.getByText(entry.credit)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Skiper UI' })).toHaveAttribute(
      'href',
      'https://skiper-ui.com/components'
    )
  })

  it('repeats the theme control so it is reachable from the top of the page', () => {
    const { container } = render(<SiteFooter />)
    expect(container.querySelectorAll('[data-theme-toggle]')).toHaveLength(1)
  })

  it('links to the auth routes and the source', () => {
    render(<SiteFooter />)
    expect(screen.getByRole('link', { name: 'sign in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'sign up' })).toHaveAttribute('href', '/signup')
    expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacy')
  })
})
```

The `privacy` link points at a route Task 5 creates. It is a plain `<a href>`,
so this test passes before that route exists; the route's own test in Task 5 is
what proves the destination is real.

- [ ] **Step 5: Run it and watch it fail**

Run: `npx vitest run src/components/landing/__tests__/SiteFooter.test.tsx`
Expected: FAIL — `Failed to resolve import "../SiteFooter"`.

- [ ] **Step 6: Write `screens.ts`**

```ts
// src/components/landing/screens.ts

/**
 * The screens the carousel shows. Real captures of the running app, not
 * div-based fake screenshots -- the anti-slop pass bans those outright.
 *
 * Order is the order a visitor would meet them: what the product opens on,
 * what they will spend their time in, what a single application looks like,
 * what the data says, and the piece nobody expects a tracker to have.
 */
export interface LandingScreen {
  src: string
  alt: string
  caption: string
}

export const SCREENS: LandingScreen[] = [
  { src: '/screens/dashboard.png', alt: 'The Worktrack dashboard', caption: 'Overview' },
  { src: '/screens/applications.png', alt: 'The applications list', caption: 'Applications' },
  { src: '/screens/application-detail.png', alt: 'A single application', caption: 'Detail' },
  { src: '/screens/analytics.png', alt: 'The analytics screen', caption: 'Analytics' },
  { src: '/screens/cv.png', alt: 'The CV editor', caption: 'CV builder' },
]
```

- [ ] **Step 7: Write `HeroMedia.tsx`**

```tsx
// src/components/landing/HeroMedia.tsx
'use client'

import * as React from 'react'

/**
 * The hero's background: a video when one exists, the poster otherwise.
 *
 * Figma draws a background video on desktop and a poster on mobile, but no
 * video asset exists yet and none can be produced by writing code. Rather than
 * block the hero on it, the video path is built and tested and gated behind a
 * source; dropping a file into public/ and passing its path is then the whole
 * change.
 *
 * `paused` is driven by the pinned sequence (M6 6.1a): once the hero unpins the
 * video is off-screen, so decoding it is battery spent on something nobody can
 * see. The effect calls play/pause imperatively rather than binding an
 * attribute, because `autoPlay` only fires once on mount and there is no
 * declarative way back.
 */
export interface HeroMediaProps {
  posterSrc: string
  videoSrc?: string
  paused?: boolean
}

export function HeroMedia({ posterSrc, videoSrc, paused = false }: HeroMediaProps) {
  const ref = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (paused) el.pause()
    else void el.play()?.catch(() => {})
  }, [paused])

  if (!videoSrc) {
    return (
      <img
        src={posterSrc}
        alt="The Worktrack dashboard, as a still"
        className="h-full w-full rounded-md object-cover"
      />
    )
  }

  return (
    <video
      ref={ref}
      data-testid="hero-video"
      src={videoSrc}
      poster={posterSrc}
      muted
      loop
      playsInline
      autoPlay
      aria-label="The Worktrack dashboard, in motion"
      className="h-full w-full rounded-md object-cover"
    />
  )
}
```

- [ ] **Step 8: Write the remaining landing components**

`Hero.tsx`, `ScreenCarousel.tsx`, `AtsSection.tsx`, `FeatureGrid.tsx`,
`StickyNavbar.tsx`, `SiteFooter.tsx` and `Landing.tsx`. Composition rules,
all of them enforced by the Global Constraints above:

- Every button is `@/components/ui/button`. No new button styling.
- Every section separator is a hairline `border-t border-border-subtle`. No
  cards, no shadows, no radius above `rounded-md`.
- `StickyNavbar` renders `<header role="banner" data-revealed={revealed ? 'true' : 'false'}>`
  with `className="sticky top-0 …"` and `data-revealed="false"` translating it
  out of view. It is legitimately the page's only `banner` here — unlike the
  authenticated shell, where `TopBar` already owns that landmark and M5 Task 7
  correctly refused a second one.
- `ScreenCarousel` renders the skiper51 component with
  `{...carouselOptionsFor(reduced)}` and `onSwiper` forwarded to its own
  `onSwiper` prop, plus two arrow buttons labelled exactly
  `Previous screen` / `Next screen`.
- `SiteFooter` maps `SKIPER_ATTRIBUTION` to `<li>{entry.credit}</li>` and
  renders one `ThemeToggle`.
- `Landing` composes: `StickyNavbar`, `Hero`, `ScreenCarousel`, `AtsSection`,
  `FeatureGrid`, `SiteFooter` — in that order, matching the Figma section
  order — and passes `pinned`, `carouselProgress` and `heroUnpinned` straight
  through with the defaults in the Interfaces block.

**Anti-slop bans, from `design-taste-frontend`, applied here:** no em-dashes in
landing copy, no eyebrow labels above every heading, no div-based fake
screenshots (the PNGs from Step 1 are real captures), no section-number labels.

- [ ] **Step 9: Run both tests and watch them pass**

Run: `npx vitest run src/components/landing`
Expected: PASS.

- [ ] **Step 10: Replace the root route**

```tsx
// src/app/page.tsx
import { Landing } from '@/components/landing/Landing'
import { SCREENS } from '@/components/landing/screens'

/**
 * The public landing page. This route used to redirect to /dashboard, which
 * meant the only people with an account -- the only people likely to look --
 * could never see it. On a portfolio piece that is backwards.
 *
 * It reads no auth state deliberately: touching the session here would make
 * the page dynamic, and the sign in / sign up controls are correct for a
 * signed-in visitor too (both land somewhere sensible).
 */
export default function Page() {
  return <Landing screens={SCREENS} heroPosterSrc="/hero-poster.png" />
}
```

- [ ] **Step 11: Verify the route in the real build**

```bash
rm -rf .next && npm run build
```

Expected: `/` appears in the route table as a static route with a non-zero
size. A 0 B route means a contended `.next` — the M5 ledger records that
happening twice, both times reporting success while proving nothing. If any
route reads 0 B, `rm -rf .next` and build again before believing it.

- [ ] **Step 12: Run the whole suite and both typechecks**

```bash
npx vitest run
npx tsc --noEmit
```

Then typecheck the new test files explicitly, since `tsconfig.json` excludes
them:

```bash
npx tsc --noEmit --jsx react-jsx --moduleResolution bundler --module esnext \
  --target es2020 --strict --skipLibCheck --esModuleInterop \
  --paths '{"@/*":["./src/*"]}' --baseUrl . \
  src/components/landing/__tests__/*.tsx
```

Expected: green, exit 0 from both.

- [ ] **Step 13: Commit**

```bash
git add src/app/page.tsx src/components/landing public/screens public/hero-poster.png
git commit -m "feat: build the public landing page in normal flow"
```

---

### Task 3: 6.1a — the pinned scroll sequence

The hardest task in the milestone, and its own task because the roadmap says
so. Hero holds the viewport while it scrolls, releases; carousel holds,
releases; the sticky navbar appears and Features onward scroll normally to the
footer.

**This is pinning, not parallax.** Classic parallax moves layers at different
speeds. What is specified is two stacked sections that each hold the viewport
while scroll advances them, then unpin. The word "pin" appears in every
identifier and comment in this task so nobody builds depth-layer parallax by
mistake.

**Files:**
- Create: `src/lib/pinnedScroll.ts`
- Create: `src/lib/__tests__/pinnedScroll.test.ts`
- Create: `src/components/landing/useCarouselProgress.ts`
- Create: `src/components/landing/__tests__/useCarouselProgress.test.ts`
- Create: `src/components/landing/PinnedSequence.tsx`
- Create: `src/components/landing/__tests__/PinnedSequence.test.tsx`
- Modify: `src/components/landing/Landing.tsx` (wrap Hero + ScreenCarousel in `PinnedSequence`)
- Modify: `src/components/landing/Hero.tsx` (accept `unpinned` and pass it to `HeroMedia` as `paused`)
- Modify: `src/components/landing/ScreenCarousel.tsx` (accept `onSwiper` and expose it upward)

**Interfaces:**
- Consumes:
  - `usePrefersReducedMotion(): boolean` from `@/hooks/usePrefersReducedMotion` — already subscribes to `matchMedia` changes via `useSyncExternalStore`; this is the live read the roadmap requires and there must not be a second one.
  - `carouselOptionsFor(reduced)`, `SCROLL_DRIVEN_OPTIONS`, `REDUCED_MOTION_OPTIONS` from Task 1.
  - `Landing`'s `pinned` / `carouselProgress` / `heroUnpinned` props from Task 2.
  - `useScroll` and `useMotionValueEvent` from `framer-motion` ^13.1.1.
- Produces:
  ```ts
  // src/lib/pinnedScroll.ts
  export const HERO_HOLD_VIEWPORTS = 1
  export const CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE = 0.8
  export function clamp01(n: number): number
  export function heroPinHeightPx(viewportHeightPx: number): number
  export function carouselPinHeightPx(slideCount: number, viewportHeightPx: number): number
  export function carouselProgressFrom(sectionProgress: number): number
  export function navbarRevealed(scrollYPx: number, heroPinHeightPx: number, carouselPinHeightPx: number): boolean

  // src/components/landing/useCarouselProgress.ts
  export interface DrivableSwiper {
    setProgress(progress: number, speed?: number): void
    allowTouchMove: boolean
    params: { allowTouchMove: boolean; simulateTouch: boolean }
  }
  export function useCarouselProgress(
    swiper: DrivableSwiper | null,
    progress: number,
    reduced: boolean
  ): void
  ```
  `DrivableSwiper` is our own structural type over the parts of Swiper's
  instance this code touches. It exists so tests can hand the hook a plain
  object; mounting Swiper in jsdom would test jsdom's lack of a layout engine,
  not our wiring.

- [ ] **Step 1: Write the failing pure-maths test**

```ts
// src/lib/__tests__/pinnedScroll.test.ts
import { describe, it, expect } from 'vitest'
import {
  clamp01,
  heroPinHeightPx,
  carouselPinHeightPx,
  carouselProgressFrom,
  navbarRevealed,
  CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE,
} from '../pinnedScroll'

describe('clamp01', () => {
  it('passes values inside the range through untouched', () => {
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.37)).toBe(0.37)
    expect(clamp01(1)).toBe(1)
  })

  it('clamps outside the range instead of extrapolating', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(4)).toBe(1)
  })
})

describe('pin heights', () => {
  it('gives the hero one viewport of hold on top of its own viewport', () => {
    // The Figma frame height is NOT the scroll height: a pinned section needs
    // scroll distance allocated for its hold, so the real page is materially
    // taller than the 3102px desktop mockup.
    expect(heroPinHeightPx(800)).toBe(1600)
  })

  it('scales the carousel pin with the slide count', () => {
    expect(carouselPinHeightPx(5, 800)).toBe(800 + 5 * CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE * 800)
    expect(carouselPinHeightPx(3, 800)).toBe(800 + 3 * CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE * 800)
  })

  it('keeps the per-slide pace constant when a screen is added or removed', () => {
    // The invariant the roadmap actually asks for, asserted as an invariant
    // rather than as two hand-written numbers that would both need editing if
    // the constant changed.
    const pace = (n: number) => (carouselPinHeightPx(n, 800) - 800) / n
    expect(pace(3)).toBeCloseTo(pace(6), 10)
    expect(pace(1)).toBeCloseTo(pace(12), 10)
  })

  it('still allocates a viewport when there are no slides at all', () => {
    expect(carouselPinHeightPx(0, 800)).toBe(800)
  })
})

describe('carouselProgressFrom', () => {
  it('maps the pinned section progress one-to-one onto the slides', () => {
    // setProgress(0..1), not slideNext() on thresholds -- progress mapping is
    // what makes the movement track the scrollbar instead of snapping.
    expect(carouselProgressFrom(0)).toBe(0)
    expect(carouselProgressFrom(0.5)).toBe(0.5)
    expect(carouselProgressFrom(1)).toBe(1)
  })

  it('never returns a value Swiper would reject', () => {
    expect(carouselProgressFrom(-0.2)).toBe(0)
    expect(carouselProgressFrom(1.4)).toBe(1)
  })
})

describe('navbarRevealed', () => {
  const hero = 1600
  const carousel = 4000

  it('stays hidden through the hero and the whole carousel hold', () => {
    expect(navbarRevealed(0, hero, carousel)).toBe(false)
    expect(navbarRevealed(1599, hero, carousel)).toBe(false)
    expect(navbarRevealed(5599, hero, carousel)).toBe(false)
  })

  it('appears exactly where the carousel ends, which is where Figma puts it', () => {
    // On both breakpoints the navbar sits precisely at the carousel's end, so
    // the reveal point is already designed. The frame's name ("reveals after
    // hero") is loose; its position is right.
    expect(navbarRevealed(5600, hero, carousel)).toBe(true)
    expect(navbarRevealed(9000, hero, carousel)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/pinnedScroll.test.ts`
Expected: FAIL — `Failed to resolve import "../pinnedScroll"`.

- [ ] **Step 3: Write `src/lib/pinnedScroll.ts`**

```ts
// src/lib/pinnedScroll.ts

/**
 * The scroll maths behind M6 6.1a's PINNED sequence.
 *
 * Pinning, not parallax. Parallax moves layers at different speeds; this holds
 * two stacked sections in the viewport while scroll advances them, then
 * releases each one. Say pinning in code and comments so nobody builds
 * depth-layer parallax by mistake.
 *
 * These are pure functions for the same reason lib/calendar.ts and
 * lib/analyticsRange.ts are: jsdom has no layout engine, so a test cannot
 * scroll a real sticky section. Keeping the boundary maths out here means the
 * hard part is unit-tested and the React layer only has to wire it up.
 *
 * The Figma frame height is not the scroll height. A pinned section needs
 * scroll distance allocated for its hold, so the page is materially taller
 * than the 3102px desktop mockup. Do not derive scroll maths from the frame.
 */

/** The hero holds for one full viewport before releasing. */
export const HERO_HOLD_VIEWPORTS = 1

/**
 * Scroll distance allocated per slide, in viewports. Pin length scales with
 * slide count so the pace stays constant if a screen is added or removed.
 */
export const CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE = 0.8

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

export function heroPinHeightPx(viewportHeightPx: number): number {
  return viewportHeightPx * (1 + HERO_HOLD_VIEWPORTS)
}

export function carouselPinHeightPx(slideCount: number, viewportHeightPx: number): number {
  return viewportHeightPx * (1 + slideCount * CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE)
}

/**
 * The pinned section's own 0..1 progress, mapped onto Swiper's setProgress.
 *
 * One to one, and clamped. framer-motion's useScroll can report slightly
 * outside 0..1 at the boundaries depending on layout rounding, and Swiper
 * treats an out-of-range progress as a request to translate past the last
 * slide.
 */
export function carouselProgressFrom(sectionProgress: number): number {
  return clamp01(sectionProgress)
}

/**
 * Whether the sticky navbar has been revealed.
 *
 * Exactly at the carousel's end, which is where the Figma frames put it on
 * both breakpoints (desktop 1414, mobile 1170 in frame coordinates).
 */
export function navbarRevealed(
  scrollYPx: number,
  heroPinHeightPx: number,
  carouselPinHeightPx: number
): boolean {
  return scrollYPx >= heroPinHeightPx + carouselPinHeightPx
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/lib/__tests__/pinnedScroll.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Write the failing carousel-drive hook test**

```ts
// src/components/landing/__tests__/useCarouselProgress.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCarouselProgress, type DrivableSwiper } from '../useCarouselProgress'

/**
 * A stand-in for Swiper's instance, holding only what this hook touches.
 * Mounting real Swiper in jsdom would test jsdom's missing layout engine, not
 * our wiring, and would let the reduced-motion path pass vacuously because
 * nothing would move either way.
 */
function makeSwiper(): DrivableSwiper & { setProgress: ReturnType<typeof vi.fn> } {
  return {
    setProgress: vi.fn(),
    allowTouchMove: false,
    params: { allowTouchMove: false, simulateTouch: false },
  }
}

describe('useCarouselProgress with motion allowed', () => {
  it('drives the carousel from the pinned section progress', () => {
    const swiper = makeSwiper()
    const { rerender } = renderHook(
      ({ p }: { p: number }) => useCarouselProgress(swiper, p, false),
      { initialProps: { p: 0 } }
    )
    expect(swiper.setProgress).toHaveBeenLastCalledWith(0)

    rerender({ p: 0.5 })
    expect(swiper.setProgress).toHaveBeenLastCalledWith(0.5)

    rerender({ p: 1 })
    expect(swiper.setProgress).toHaveBeenLastCalledWith(1)
  })

  it('clamps rather than pushing Swiper past its last slide', () => {
    const swiper = makeSwiper()
    renderHook(() => useCarouselProgress(swiper, 1.6, false))
    expect(swiper.setProgress).toHaveBeenLastCalledWith(1)
  })

  it('turns touch off, because scroll is the only thing that should move it', () => {
    const swiper = makeSwiper()
    swiper.allowTouchMove = true
    swiper.params.allowTouchMove = true
    swiper.params.simulateTouch = true
    renderHook(() => useCarouselProgress(swiper, 0, false))
    expect(swiper.allowTouchMove).toBe(false)
    expect(swiper.params.allowTouchMove).toBe(false)
    expect(swiper.params.simulateTouch).toBe(false)
  })
})

describe('useCarouselProgress under reduced motion', () => {
  // The path that rots: nobody sees it unless they turn the setting on.
  it('stops driving progress entirely', () => {
    const swiper = makeSwiper()
    const { rerender } = renderHook(
      ({ p, r }: { p: number; r: boolean }) => useCarouselProgress(swiper, p, r),
      { initialProps: { p: 0.25, r: false } }
    )
    expect(swiper.setProgress).toHaveBeenLastCalledWith(0.25)
    const callsBefore = swiper.setProgress.mock.calls.length

    rerender({ p: 0.9, r: true })
    expect(swiper.setProgress.mock.calls.length).toBe(callsBefore)
  })

  it('restores touch so the carousel is not frozen on slide one', () => {
    // Without this, the users who opted out of motion get a carousel they
    // cannot advance by any means.
    const swiper = makeSwiper()
    renderHook(() => useCarouselProgress(swiper, 0, true))
    expect(swiper.allowTouchMove).toBe(true)
    expect(swiper.params.allowTouchMove).toBe(true)
    expect(swiper.params.simulateTouch).toBe(true)
  })

  it('flips touch back on when the preference changes mid-session', () => {
    // Someone can change the OS setting with the page open. A value captured
    // at mount silently strands them.
    const swiper = makeSwiper()
    const { rerender } = renderHook(
      ({ r }: { r: boolean }) => useCarouselProgress(swiper, 0.4, r),
      { initialProps: { r: false } }
    )
    expect(swiper.allowTouchMove).toBe(false)

    rerender({ r: true })
    expect(swiper.allowTouchMove).toBe(true)

    rerender({ r: false })
    expect(swiper.allowTouchMove).toBe(false)
  })
})

describe('useCarouselProgress before Swiper has mounted', () => {
  it('does nothing and does not throw', () => {
    // onSwiper fires after the first render, so the hook runs at least once
    // with null. Positive companion: the same hook with a real instance in the
    // tests above does call setProgress, so this is not vacuous.
    expect(() => renderHook(() => useCarouselProgress(null, 0.5, false))).not.toThrow()
  })
})
```

- [ ] **Step 6: Run it and watch it fail**

Run: `npx vitest run src/components/landing/__tests__/useCarouselProgress.test.ts`
Expected: FAIL — `Failed to resolve import "../useCarouselProgress"`.

- [ ] **Step 7: Write `useCarouselProgress.ts`**

```ts
// src/components/landing/useCarouselProgress.ts
'use client'

import { useEffect } from 'react'
import { carouselProgressFrom } from '@/lib/pinnedScroll'

/**
 * Drives the PINNED carousel from the section's scroll progress, and switches
 * the whole component between its two modes.
 *
 * Scroll-driven mode: page scroll advances the slides while the section is
 * pinned, so direct manipulation is off -- a drag and a scroll are the same
 * gesture on touch and they would fight. setProgress(0..1) rather than
 * slideNext() on thresholds, because progress mapping is what makes the
 * movement track the scrollbar instead of snapping between slides.
 *
 * Reduced-motion mode: the pin is gone, the section is in normal flow, nothing
 * drives progress, and touch comes back. Without that restoration the carousel
 * would be frozen on slide one for exactly the people who asked for less
 * motion.
 *
 * `reduced` arrives from usePrefersReducedMotion(), which subscribes to the
 * media query rather than reading it once, so changing the OS setting with the
 * page open re-runs both effects here.
 *
 * Swiper exposes allowTouchMove as an instance property that shadows
 * params.allowTouchMove; setting only the params object does not take effect
 * until the next update, so both are written.
 */
export interface DrivableSwiper {
  setProgress(progress: number, speed?: number): void
  allowTouchMove: boolean
  params: { allowTouchMove: boolean; simulateTouch: boolean }
}

export function useCarouselProgress(
  swiper: DrivableSwiper | null,
  progress: number,
  reduced: boolean
): void {
  useEffect(() => {
    if (!swiper) return
    swiper.allowTouchMove = reduced
    swiper.params.allowTouchMove = reduced
    swiper.params.simulateTouch = reduced
  }, [swiper, reduced])

  useEffect(() => {
    if (!swiper || reduced) return
    swiper.setProgress(carouselProgressFrom(progress), 0)
  }, [swiper, progress, reduced])
}
```

Note the second effect passes `speed: 0`. Swiper's `setProgress(progress,
speed)` animates over `speed` milliseconds; a non-zero speed makes the slides
lag the scrollbar, which is the snapping behaviour the roadmap rules out.

- [ ] **Step 8: Run it and watch it pass**

Run: `npx vitest run src/components/landing/__tests__/useCarouselProgress.test.ts`
Expected: PASS, 7 tests.

Then prove the reduced-motion tests have teeth, the way M5's reviewers proved
theirs: delete the `|| reduced` guard from the second effect, run again, and
confirm "stops driving progress entirely" goes red. Restore, confirm green,
confirm the file is byte-identical (`git diff --stat` shows nothing).

- [ ] **Step 9: Write the failing pinned-sequence test**

```tsx
// src/components/landing/__tests__/PinnedSequence.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PinnedSequence } from '../PinnedSequence'

/**
 * A matchMedia that actually dispatches.
 *
 * src/test/setup.ts installs a global mock whose addEventListener is a no-op
 * spy, so a live-preference test written against it can never observe a
 * change. This one keeps one shared listener set across every MediaQueryList
 * it hands out, which is what makes `set()` reach the subscription
 * usePrefersReducedMotion opened through a different call.
 */
function installMatchMedia(initial = false) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  let matches = initial
  const original = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    media,
    get matches() {
      return matches && media === '(prefers-reduced-motion: reduce)'
    },
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb)
    },
    removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia
  return {
    set(next: boolean) {
      matches = next
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent)
    },
    restore() {
      window.matchMedia = original
    },
  }
}

afterEach(() => vi.clearAllMocks())

describe('PinnedSequence with motion allowed', () => {
  it('pins both sections and allocates scroll distance for their holds', () => {
    const mm = installMatchMedia(false)
    render(
      <PinnedSequence slideCount={5} viewportHeightPx={800}>
        {() => <div>sections</div>}
      </PinnedSequence>
    )
    const hero = screen.getByTestId('pinned-hero')
    const carousel = screen.getByTestId('pinned-carousel')
    expect(hero).toHaveAttribute('data-pinned', 'true')
    expect(carousel).toHaveAttribute('data-pinned', 'true')
    // 800 * 2, and 800 * (1 + 5 * 0.8)
    expect(hero).toHaveStyle({ height: '1600px' })
    expect(carousel).toHaveStyle({ height: '4000px' })
    mm.restore()
  })
})

describe('PinnedSequence under reduced motion', () => {
  it('drops the pin entirely and lets the sections sit in normal flow', () => {
    // Scroll-jacking is a vestibular trigger. This is a hard requirement.
    const mm = installMatchMedia(true)
    render(
      <PinnedSequence slideCount={5} viewportHeightPx={800}>
        {() => <div>sections</div>}
      </PinnedSequence>
    )
    const hero = screen.getByTestId('pinned-hero')
    expect(hero).toHaveAttribute('data-pinned', 'false')
    // Positive companion: the section still renders, it is just not pinned.
    expect(screen.getByText('sections')).toBeInTheDocument()
    expect(hero.style.height).toBe('')
    mm.restore()
  })

  it('unpins live when the OS preference changes with the page open', () => {
    const mm = installMatchMedia(false)
    render(
      <PinnedSequence slideCount={5} viewportHeightPx={800}>
        {() => <div>sections</div>}
      </PinnedSequence>
    )
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'true')

    act(() => mm.set(true))
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'false')

    act(() => mm.set(false))
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'true')
    mm.restore()
  })
})

describe('PinnedSequence keyboard order', () => {
  it('keeps pinned content in document order so Tab still reaches it', () => {
    // Content inside a pinned section must stay Tab-reachable in document
    // order, and focusing something below must not leave the page stuck in a
    // pinned stage. Sticky positioning preserves document order; a transform-
    // based fake pin would not, which is why this asserts on order rather
    // than on the CSS.
    const mm = installMatchMedia(false)
    render(
      <PinnedSequence slideCount={2} viewportHeightPx={800}>
        {() => (
          <>
            <button>inside the pin</button>
            <button>below the pin</button>
          </>
        )}
      </PinnedSequence>
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['inside the pin', 'below the pin'])
    for (const b of buttons) expect(b).not.toHaveAttribute('tabindex', '-1')
    mm.restore()
  })
})
```

- [ ] **Step 10: Run it and watch it fail**

Run: `npx vitest run src/components/landing/__tests__/PinnedSequence.test.tsx`
Expected: FAIL — `Failed to resolve import "../PinnedSequence"`.

- [ ] **Step 11: Write `PinnedSequence.tsx`**

```tsx
// src/components/landing/PinnedSequence.tsx
'use client'

import * as React from 'react'
import { useScroll, useMotionValueEvent } from 'framer-motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  heroPinHeightPx,
  carouselPinHeightPx,
  carouselProgressFrom,
  navbarRevealed,
} from '@/lib/pinnedScroll'

/**
 * The PINNED scroll sequence: hero holds the viewport while it scrolls and
 * releases; the carousel holds and releases; the sticky navbar appears and
 * everything below scrolls normally to the footer.
 *
 * Pinning, not parallax. CSS position: sticky does the holding, not JavaScript.
 * Sticky is native, keeps the scrollbar honest, survives keyboard paging and
 * in-page anchors, and degrades to normal flow where it is unsupported.
 * framer-motion's useScroll is used ONLY to read a progress value inside an
 * already-pinned section; it never takes over scrolling.
 *
 * prefers-reduced-motion disables pinning entirely and the sections become
 * normal flow. Read live through usePrefersReducedMotion, which subscribes to
 * the media query -- someone can change the OS setting with the page open, and
 * a value captured at mount strands them.
 *
 * The tall outer div is the scroll distance; the inner sticky div is what the
 * viewer sees held in place. Height comes from lib/pinnedScroll, not from the
 * Figma frame: the frame height is the drawn height, not the scroll height.
 */
export interface PinnedSequenceProps {
  slideCount: number
  /** Injectable so tests do not depend on jsdom's window size. */
  viewportHeightPx?: number
  children: (state: {
    pinned: boolean
    carouselProgress: number
    heroUnpinned: boolean
    navbarRevealed: boolean
  }) => React.ReactNode
}

export function PinnedSequence({
  slideCount,
  viewportHeightPx,
  children,
}: PinnedSequenceProps) {
  const reduced = usePrefersReducedMotion()
  const pinned = !reduced

  const [measured, setMeasured] = React.useState(viewportHeightPx ?? 0)
  React.useEffect(() => {
    if (viewportHeightPx !== undefined) return
    const read = () => setMeasured(window.innerHeight)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [viewportHeightPx])

  const vh = viewportHeightPx ?? measured
  const heroH = heroPinHeightPx(vh)
  const carouselH = carouselPinHeightPx(slideCount, vh)

  const heroRef = React.useRef<HTMLDivElement>(null)
  const carouselRef = React.useRef<HTMLDivElement>(null)

  const { scrollYProgress: carouselScroll } = useScroll({
    target: carouselRef,
    offset: ['start start', 'end end'],
  })
  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end end'],
  })

  const [carouselProgress, setCarouselProgress] = React.useState(0)
  const [heroUnpinned, setHeroUnpinned] = React.useState(false)
  const [revealed, setRevealed] = React.useState(false)

  useMotionValueEvent(carouselScroll, 'change', (v) => {
    if (!pinned) return
    setCarouselProgress(carouselProgressFrom(v))
    setRevealed(navbarRevealed(window.scrollY, heroH, carouselH))
  })

  useMotionValueEvent(heroScroll, 'change', (v) => {
    if (!pinned) return
    // Pause the hero's background video once the hero unpins: it is invisible
    // by then, and decoding it costs battery for nothing.
    setHeroUnpinned(v >= 1)
  })

  if (!pinned) {
    return (
      <>
        <div data-testid="pinned-hero" data-pinned="false" />
        <div data-testid="pinned-carousel" data-pinned="false" />
        {children({
          pinned: false,
          carouselProgress: 0,
          heroUnpinned: false,
          navbarRevealed: true,
        })}
      </>
    )
  }

  return (
    <>
      <div
        ref={heroRef}
        data-testid="pinned-hero"
        data-pinned="true"
        style={{ height: `${heroH}px` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* the hero half of `children` renders here; see Landing.tsx */}
        </div>
      </div>
      <div
        ref={carouselRef}
        data-testid="pinned-carousel"
        data-pinned="true"
        style={{ height: `${carouselH}px` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          {/* the carousel half renders here */}
        </div>
      </div>
      {children({ pinned: true, carouselProgress, heroUnpinned, navbarRevealed: revealed })}
    </>
  )
}
```

**Implementation note for whoever writes this:** the two comment placeholders
above mark where `Landing` must inject its hero and carousel slots. The render
prop as written passes state down but does not receive the two sections; give
`PinnedSequence` two additional props, `hero: React.ReactNode` and `carousel:
React.ReactNode`, rendered inside the two sticky divs, and keep `children` for
everything below the pin. Do this in the same step — the test above only
asserts on the pin wrappers and on document order, so it stays honest either
way, and `Landing`'s existing tests from Task 2 are what prove the sections
still render.

- [ ] **Step 12: Run the pinned-sequence test and watch it pass**

Run: `npx vitest run src/components/landing/__tests__/PinnedSequence.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 13: Write the failing hero-video pause test**

Timing here is real: the pause must not fire before the hero unpins, and it
must fire once when it does. Each transition gets its own `act`, never one
combined jump — a single advance fires both effects before any microtask flush
and hides a bug that lives in the gap, which is exactly how M5 shipped a
version-history feature that had never once worked.

```tsx
// append to src/components/landing/__tests__/Landing.test.tsx
import { act } from '@testing-library/react'
import { HeroMedia } from '../HeroMedia'

describe('the hero video and the pin', () => {
  it('plays while the hero is pinned and pauses once it unpins', async () => {
    // jsdom implements neither play nor pause; stubbing them is what lets the
    // assertion be about our effect rather than about jsdom.
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve())
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => {})

    const { rerender } = render(
      <HeroMedia posterSrc="/hero-poster.png" videoSrc="/hero.mp4" paused={false} />
    )
    expect(screen.getByTestId('hero-video')).toBeInTheDocument()
    expect(pause).not.toHaveBeenCalled()
    expect(play).toHaveBeenCalled()

    await act(async () => {
      rerender(<HeroMedia posterSrc="/hero-poster.png" videoSrc="/hero.mp4" paused />)
    })
    expect(pause).toHaveBeenCalledTimes(1)

    // And it comes back if the hero is scrolled into again, rather than
    // staying dead for the rest of the session.
    const playsBefore = play.mock.calls.length
    await act(async () => {
      rerender(<HeroMedia posterSrc="/hero-poster.png" videoSrc="/hero.mp4" paused={false} />)
    })
    expect(play.mock.calls.length).toBeGreaterThan(playsBefore)

    play.mockRestore()
    pause.mockRestore()
  })
})
```

- [ ] **Step 14: Run it, then wire `Landing` to `PinnedSequence`**

Run: `npx vitest run src/components/landing/__tests__/Landing.test.tsx`
Expected: the new test PASSES against the `HeroMedia` written in Task 2 — its
`paused` effect already implements this. If it fails, `HeroMedia`'s effect is
wrong, not the test.

Then modify `Landing.tsx` to wrap `Hero` and `ScreenCarousel` in
`PinnedSequence`, threading `heroUnpinned` into `Hero`'s `unpinned` prop,
`carouselProgress` into `ScreenCarousel`, and `navbarRevealed` into
`StickyNavbar`'s `revealed`. `ScreenCarousel` captures the Swiper instance via
`onSwiper` into local state and calls
`useCarouselProgress(swiper, carouselProgress, reduced)`.

- [ ] **Step 15: Run the whole suite and both typechecks**

```bash
npx vitest run
npx tsc --noEmit
npx tsc --noEmit --jsx react-jsx --moduleResolution bundler --module esnext \
  --target es2020 --strict --skipLibCheck --esModuleInterop \
  --paths '{"@/*":["./src/*"]}' --baseUrl . \
  src/components/landing/__tests__/*.tsx src/lib/__tests__/pinnedScroll.test.ts
rm -rf .next && npm run build
```

Expected: green, exit 0, `/` non-zero in the route table.

- [ ] **Step 16: Check it by hand in both modes**

The tests cover the wiring; they cannot tell you whether it feels like
scroll-jacking. In a browser:

1. Scroll `/` from the top. The hero should hold, the carousel should hold and
   advance one slide per hold-unit, the navbar should appear at the carousel's
   end, and Features onward should scroll normally.
2. Tab through the page from the top. Focus must reach the carousel arrows and
   the slide content, and moving focus below the pin must not leave the page
   stuck in a pinned stage.
3. Turn on Reduce Motion in the OS **with the page open**. The pin must drop,
   the sections must fall into normal flow, and touch and arrows must both
   work. Turn it off again; pinning must come back.
4. Repeat at 375px. Record whether mobile pinning is acceptable — see the open
   questions.

- [ ] **Step 17: Commit**

```bash
git add src/lib/pinnedScroll.ts src/lib/__tests__/pinnedScroll.test.ts src/components/landing
git commit -m "feat: pin the hero and drive the carousel from scroll, with a reduced-motion path"
```

---

### Task 4: Auth — `/login`, `/signup` and the split panel

**Files:**
- Create (by the shadcn CLI): `src/components/v1/skiper106.tsx`
- Modify: `src/components/v1/skiper106.tsx` (take only `SmoothInput`; see Step 2)
- Create: `src/components/auth/AuthScreen.tsx`
- Create: `src/components/auth/AuthBrandPanel.tsx`
- Create: `src/components/auth/__tests__/AuthScreen.test.tsx`
- Modify: `src/app/(auth)/login/page.tsx` (7 lines today; becomes the sign-in route wrapper)
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/__tests__/login.test.tsx`
- **Delete:** `src/screens/LoginPage.tsx`
- Modify: `package.json` (`dialkit` arrives)

**Deletion justification, read before writing it down.** `src/screens/LoginPage.tsx`
is 261 lines. Its only importer is `src/app/(auth)/login/page.tsx`, verified
with `grep -rn "screens/LoginPage" src`. It is a single component that serves
both sign-in and sign-up behind a local `isLogin` boolean, styled in the
pre-M4 language (`bg-primary-600`, `rounded-xl`, `.input`, `.btn-primary`)
and importing four lucide glyphs. Splitting it into two routes is the whole
point of 6.2, so this is a replacement, not a removal: **`/login` must still
work at the end of this task.** Verify by loading it, not by asserting it.

**Interfaces:**
- Consumes:
  - `useAuth()` from `@/contexts/AuthContext`, exact shape verified in source:
    `{ user, session, loading, signIn(email, password): Promise<void>, signUp(email, password): Promise<void>, signOut(): Promise<void> }`. `signIn` and `signUp` **throw** on failure; they do not return an error object.
  - `Input` and `PasswordInput` from `@/components/ui/input`. `PasswordInput` already anchors its reveal control to the field's right edge (`right-2` on a shrink-wrapping wrapper) and `Input` already makes a hardcoded focus state unrepresentable. The roadmap's two "things that will bite" for 6.2 are already fixed in M4; do not re-solve them.
  - `Field` from `@/components/ui/field` (`{ id, label, required?, hint?, span?, children }`).
  - `Button` from `@/components/ui/button`.
  - `SmoothInput` from `@/components/v1/skiper106`.
- Produces:
  ```ts
  export type AuthMode = 'signin' | 'signup'
  export interface AuthScreenProps {
    mode: AuthMode
    /** Rejects with an Error whose message is shown to the user. */
    onSubmit: (email: string, password: string) => Promise<void>
  }
  export function AuthScreen(props: AuthScreenProps): JSX.Element
  ```

- [ ] **Step 1: Install skiper106**

```bash
pnpm dlx shadcn add @skiper-ui/skiper106
```

Expected: a new file under `src/components/v1/` and `dialkit` in
`package.json`. Read the file end to end and record its actual exports.

- [ ] **Step 2: Take only `SmoothInput`**

The roadmap says skiper106 exports `Input` **and** `SmoothInput`. There is no
literal module collision — ours lives at `@/components/ui/input`, theirs at
`@/components/v1/skiper106` — but two components called `Input` in one codebase
is how the wrong one gets imported six months from now. Delete the vendor's
`Input` export from the copied source and keep `SmoothInput`. Remove any
`lucide-react` import, per the Global Constraint and the same source-shape
test Task 1 established:

```ts
// append to src/components/v1/__tests__/skiper51-source.test.ts, or its sibling
it('exports SmoothInput and nothing named Input', () => {
  const src = readFileSync('src/components/v1/skiper106.tsx', 'utf8')
  expect(src).toContain('SmoothInput')                       // positive companion
  expect(src).not.toMatch(/export\s+(const|function)\s+Input\b/)
  expect(src).not.toMatch(/from\s+['"]lucide-react['"]/)
})
```

- [ ] **Step 3: Write the failing auth screen test**

```tsx
// src/components/auth/__tests__/AuthScreen.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthScreen } from '../AuthScreen'

describe('AuthScreen in sign-in mode', () => {
  it('asks for an email and a password and nothing else', () => {
    render(<AuthScreen mode="signin" onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    // Positive companions above: without them this negative would hold for a
    // component that rendered nothing at all.
    expect(screen.queryByLabelText('Confirm password')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('offers the switch to sign up', () => {
    render(<AuthScreen mode="signin" onSubmit={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'sign up' })).toHaveAttribute('href', '/signup')
  })
})

describe('AuthScreen in sign-up mode', () => {
  it('adds a confirm-password field and relabels the submit', () => {
    render(<AuthScreen mode="signup" onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
  })

  it('inverts the switch link', () => {
    render(<AuthScreen mode="signup" onSubmit={vi.fn()} />)
    expect(screen.getByText('have an account?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'sign in' })).toHaveAttribute('href', '/login')
  })

  it('refuses to submit when the two passwords disagree', async () => {
    const onSubmit = vi.fn()
    render(<AuthScreen mode="signup" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'hunter23')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Those passwords do not match.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('AuthScreen failure handling', () => {
  it('keeps what was typed when the submit fails', async () => {
    // This milestone has already shipped this defect class twice: a failed
    // save that discarded nineteen typed fields, and an editor that dropped
    // keystrokes mid-save. A rejected sign-in must not clear the form.
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    render(<AuthScreen mode="signin" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('a@b.test')
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('hunter22')
  })

  it('re-enables the submit after a failure so it can be retried', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'))
    render(<AuthScreen mode="signin" onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22')
    const submit = screen.getByRole('button', { name: 'Sign in' })
    await userEvent.click(submit)
    expect(await screen.findByText('Network error')).toBeInTheDocument()
    expect(submit).toBeEnabled()
  })
})

describe('AuthScreen password field', () => {
  it('reveals and re-hides through the field control, not a separate button', async () => {
    // M4's PasswordInput anchors its reveal to the field's right edge, which is
    // the fix for the Figma frame's off-canvas control at 335px. Reusing it is
    // the point; this proves it is actually the component being used.
    render(<AuthScreen mode="signin" onSubmit={vi.fn()} />)
    const field = screen.getByLabelText('Password') as HTMLInputElement
    expect(field.type).toBe('password')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(field.type).toBe('text')
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(field.type).toBe('password')
  })
})

describe('AuthScreen layout', () => {
  it('drops the brand panel below lg, where there is no room for it', () => {
    const { container } = render(<AuthScreen mode="signin" onSubmit={vi.fn()} />)
    const panel = container.querySelector('[data-brand-panel]')
    expect(panel).not.toBeNull()
    expect(panel!.className).toContain('hidden')
    expect(panel!.className).toContain('lg:flex')
  })

  it('puts the switch link top-right on desktop and inline on mobile', () => {
    const { container } = render(<AuthScreen mode="signin" onSubmit={vi.fn()} />)
    const desktop = container.querySelector('[data-switch-desktop]')
    const mobile = container.querySelector('[data-switch-mobile]')
    expect(desktop).not.toBeNull()
    expect(mobile).not.toBeNull()
    expect(desktop!.className).toContain('hidden')
    expect(desktop!.className).toContain('lg:block')
    expect(mobile!.className).toContain('lg:hidden')
  })
})
```

- [ ] **Step 4: Run it and watch it fail**

Run: `npx vitest run src/components/auth/__tests__/AuthScreen.test.tsx`
Expected: FAIL — `Failed to resolve import "../AuthScreen"`.

- [ ] **Step 5: Write `AuthBrandPanel.tsx` and `AuthScreen.tsx`**

Composition rules:

- The brand panel is `<aside data-brand-panel className="hidden lg:flex lg:w-1/2 …">`.
  Mobile drops it entirely and becomes a single centred column: logo, form,
  legal, with the form vertically centred by two `flex-1` spacers so it holds
  position on taller devices.
- The email field is `SmoothInput` from skiper106. Password and confirm are
  M4's `PasswordInput`. Every field is wrapped in `Field` for its label.
- Two switch links, one desktop (`data-switch-desktop`, `hidden lg:block`,
  top-right) and one mobile (`data-switch-mobile`, `lg:hidden`, below the
  form). A top-right link on a 375px screen is an awkward tap target next to
  nothing else.
- Submit is `<Button variant="primary" size="m" type="submit">`, disabled only
  while a submit is in flight, and **re-enabled in a `finally`** so a rejection
  cannot strand it.
- The error message is rendered by the form, not thrown away. `signIn` and
  `signUp` throw; catch, read `err instanceof Error ? err.message : …`, and
  set it into state. **Do not clear the fields.**
- Run the finished screen through `ui-ux-pro-max` before committing.
  skiper106 hides the native caret and redraws it with Framer Motion; a hidden
  system caret is an accessibility risk and this is where it gets checked, not
  after it ships.

- [ ] **Step 6: Run the screen test and watch it pass**

Run: `npx vitest run src/components/auth/__tests__/AuthScreen.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 7: Write the failing route test**

```tsx
// src/app/(auth)/__tests__/login.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = vi.fn()
const signIn = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, session: null, loading: false, signIn, signUp: vi.fn(), signOut: vi.fn() }),
}))

import LoginRoute from '../login/page'

describe('the /login route', () => {
  it('signs in and sends the user to the dashboard', async () => {
    signIn.mockResolvedValue(undefined)
    render(<LoginRoute />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(signIn).toHaveBeenCalledWith('a@b.test', 'hunter22')
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('does not navigate when the sign-in is refused', async () => {
    push.mockClear()
    signIn.mockRejectedValue(new Error('Invalid login credentials'))
    render(<LoginRoute />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-one')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 8: Run it and watch it fail, then write the routes**

Run: `npx vitest run "src/app/(auth)/__tests__/login.test.tsx"`
Expected: FAIL, because `login/page.tsx` still renders the old `LoginPage`,
which has no `Email` label wired to its input via `htmlFor`.

Then write:

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'

/**
 * Thin route wrapper, same split as every (app) route: AuthScreen takes plain
 * props and renders without Next routing or AuthProvider, and this file owns
 * the call and the navigation.
 *
 * The redirect is inside the resolved path only. The screen surfaces a
 * rejection as its own error and keeps what was typed; navigating on a
 * rejection is how the old single-screen version lost a form.
 */
export default function Page() {
  const router = useRouter()
  const { signIn } = useAuth()

  return (
    <AuthScreen
      mode="signin"
      onSubmit={async (email, password) => {
        await signIn(email, password)
        router.push('/dashboard')
      }}
    />
  )
}
```

`signup/page.tsx` is the same shape with `mode="signup"` and `signUp`. Write it
out in full rather than importing a shared factory — two four-line files that
differ in two identifiers are clearer than one abstraction over them.

`(auth)/layout.tsx` is a passthrough that renders `{children}` inside a
`min-h-screen` div. It exists so the auth routes do **not** inherit
`(app)/layout.tsx`'s guard, which would redirect a signed-out visitor from
`/login` to `/login` forever.

- [ ] **Step 9: Delete the old screen and prove `/login` still works**

```bash
git rm src/screens/LoginPage.tsx
grep -rn "screens/LoginPage" src
```

Expected: the grep returns nothing. `src/screens/` is now empty; remove the
directory if git leaves it.

Then load it for real:

```bash
rm -rf .next && npm run build && npm start
```

Open `/login` and `/signup` in a browser, in both themes. A green test suite
does not prove a route renders — M5's Critical 1 was precisely a route that
compiled and had nowhere to be reached from.

- [ ] **Step 10: Confirm the lucide count dropped**

Run: `grep -rn "lucide-react" src`
Expected: exactly two hits remain — `src/contexts/ToastContext.tsx:4` (the
`X` import, which M5 Task 10 owns) and the docblock prose in
`src/components/ui/theme-toggle.tsx`. Deleting `LoginPage.tsx` retired four
imports. **M6 must not add any.**

- [ ] **Step 11: Run the whole suite and both typechecks**

```bash
npx vitest run
npx tsc --noEmit
npx tsc --noEmit --jsx react-jsx --moduleResolution bundler --module esnext \
  --target es2020 --strict --skipLibCheck --esModuleInterop \
  --paths '{"@/*":["./src/*"]}' --baseUrl . \
  src/components/auth/__tests__/*.tsx "src/app/(auth)/__tests__/"*.tsx
```

Expected: green, exit 0.

- [ ] **Step 12: Commit**

```bash
git add -A src/components/auth src/components/v1 "src/app/(auth)" package.json package-lock.json
git rm --cached -r --ignore-unmatch src/screens
git commit -m "feat: split auth into /login and /signup on the M4 design system"
```

Then confirm the deletion actually rode along — M5 lost this exact bet once,
when a `git commit -- <pathspec>` missed untracked files:

Run: `git show --stat HEAD | grep LoginPage`
Expected: a line showing `src/screens/LoginPage.tsx` deleted with a negative
line count.

---

### Task 5: Custom 404 and the privacy page

**Files:**
- Create: `src/app/not-found.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/components/errors/NotFound.tsx`
- Create: `src/components/errors/__tests__/NotFound.test.tsx`
- Create: `src/app/privacy/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/ui/button`; `PageHeader` from `@/components/ui/page-header` (`{ title, action? }`, emits `[data-body-header]`); `SiteFooter` from `@/components/landing/SiteFooter` (Task 2).
- Produces: `NotFound()` from `@/components/errors/NotFound`.

Both routes live at the root, outside `(app)`, so neither inherits the auth
guard in `src/app/(app)/layout.tsx`. That matters: a 404 that redirects a
signed-out visitor to `/login` is a worse 404 than the default one.

- [ ] **Step 1: Write the failing 404 test**

```tsx
// src/components/errors/__tests__/NotFound.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotFound } from '../NotFound'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

describe('the 404 page', () => {
  it('says what happened without pretending it is an error the visitor caused', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { name: 'That page does not exist' })).toBeInTheDocument()
  })

  it('offers a real way back to each main surface', () => {
    // "Recovery links", per 6.3. A 404 whose only control is "go home" makes a
    // signed-in visitor start over.
    render(<NotFound />)
    expect(screen.getByRole('link', { name: 'Go to the overview' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Go to your applications' })).toHaveAttribute('href', '/applications')
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
  })

  it('uses the design system button rather than styling its own', () => {
    render(<NotFound />)
    expect(screen.getByRole('link', { name: 'Go to the overview' })).toHaveAttribute(
      'data-variant',
      'primary'
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/components/errors/__tests__/NotFound.test.tsx`
Expected: FAIL — `Failed to resolve import "../NotFound"`.

- [ ] **Step 3: Write `NotFound.tsx` and `src/app/not-found.tsx`**

```tsx
// src/app/not-found.tsx
import { NotFound } from '@/components/errors/NotFound'

/**
 * Next's root not-found boundary. It renders inside the root layout and
 * therefore outside (app)/layout.tsx's auth guard, which is correct: a 404
 * that bounces a signed-out visitor to /login is worse than the default.
 */
export default function Page() {
  return <NotFound />
}
```

`NotFound` composes `PageHeader` for the title, a short paragraph, three
`Button asChild`-style links (or plain `<Link>` carrying the button classes and
`data-variant`, matching however `Button` is used for links elsewhere in this
milestone — pick one and use it consistently across Tasks 2 and 5), and
`SiteFooter`.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/components/errors/__tests__/NotFound.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing privacy test**

```tsx
// src/app/privacy/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Privacy from '../page'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

describe('the privacy page', () => {
  it('names every category of data the app actually stores', () => {
    // Not boilerplate. These are the real tables, read from
    // supabase/migrations/, and a policy that lists tables the app does not
    // have is worse than none.
    render(<Privacy />)
    for (const heading of [
      'What is stored',
      'Where it is stored',
      'Who can read it',
      'Deleting your account',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('states that row-level security scopes every table to its owner', () => {
    render(<Privacy />)
    expect(screen.getByText(/row-level security/i)).toBeInTheDocument()
  })

  it('points at the self-service deletion the app really implements', () => {
    // /settings has a delete-account control backed by delete_own_account().
    // A privacy page promising a deletion path that does not exist is a lie
    // with legal weight.
    render(<Privacy />)
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })
})
```

- [ ] **Step 6: Run it and watch it fail, then write the page**

Run: `npx vitest run src/app/privacy/__tests__/page.test.tsx`
Expected: FAIL — `Failed to resolve import "../page"`.

Content, written from the actual schema (verified against
`supabase/migrations/`), not from a template:

- **What is stored:** applications (`jobs`), their status history
  (`job_status_history`), calendar events (`events`), activity notes
  (`activity_log`), contacts (`contacts`, `application_contacts`), CVs and
  their version snapshots (`resumes`, `resume_snapshots`), document links
  (`application_documents`), and preferences (`user_preferences`). Auth
  identity is handled by Supabase Auth.
- **Where it is stored:** a Supabase Postgres project. Name the region if it is
  known at write time; do not guess it.
- **Who can read it:** row-level security is enabled on every table and every
  policy scopes rows to `auth.uid()`. The demo account is public and read-only,
  enforced by restrictive policies rather than by the UI.
- **Deleting your account:** the Settings screen's delete control calls
  `delete_own_account()`, which removes the auth user; every user-owned table
  cascades from it.

- [ ] **Step 7: Run it, run the suite, verify the routes build**

```bash
npx vitest run
npx tsc --noEmit
rm -rf .next && npm run build
```

Expected: `/privacy` in the route table, and `/_not-found` present. Then load a
nonsense URL in the running app and confirm the custom page renders rather than
Next's default.

- [ ] **Step 8: Commit**

```bash
git add src/app/not-found.tsx src/app/privacy src/components/errors
git commit -m "feat: add a recovering 404 and a privacy page written from the real schema"
```

---

### Task 6: Demo mode

A seeded, read-only account a stranger can open from the landing page. The
security boundary already exists in RLS; this task adds the affordances and the
runbook, and closes the SECURITY DEFINER hole class permanently rather than
patching it a second time.

**Files:**
- Modify: `src/lib/env.ts` (add `NEXT_PUBLIC_DEMO_USER_IDS` as a literal in `nextPublicEnv()`, and `demoUserIds: string[]` to `RuntimeFlags`)
- Modify: `src/lib/__tests__/env.test.ts` (existing file; add the parsing cases)
- Create: `src/hooks/useIsDemo.ts`
- Create: `src/hooks/__tests__/useIsDemo.test.tsx`
- Create: `src/components/shell/DemoBanner.tsx`
- Create: `src/components/shell/__tests__/DemoBanner.test.tsx`
- Modify: `src/components/shell/AppShell.tsx` (render `DemoBanner` above `main`)
- Modify: `src/app/(app)/applications/page.tsx` (gate the Add / import / export writes)
- Modify: `src/app/(app)/settings/page.tsx` (gate the danger zone and the currency write)
- Create: `supabase/__tests__/securityDefiner.test.ts`
- Modify: `.env.example`
- Modify: `README.md` (the demo runbook section)

**Interfaces:**
- Consumes:
  - `isDemoUser(userId: string | null, demoUserIds: string[]): boolean` from `@/services/demoMode` — exists, tested, docblocked as affordance-only.
  - `useAuth()` from `@/contexts/AuthContext`.
  - `readRuntimeFlags(source)` from `@/lib/env`.
- Produces:
  ```ts
  // added to RuntimeFlags in src/lib/env.ts
  demoUserIds: string[]

  // src/hooks/useIsDemo.ts
  export function useIsDemo(): boolean

  // src/components/shell/DemoBanner.tsx
  export function DemoBanner(props: { visible: boolean }): JSX.Element | null
  ```

- [ ] **Step 1: Write the failing env-parsing test**

```ts
// append to src/lib/__tests__/env.test.ts
describe('readRuntimeFlags demoUserIds', () => {
  it('parses a comma separated list and trims each id', () => {
    expect(readRuntimeFlags({ NEXT_PUBLIC_DEMO_USER_IDS: 'a, b ,c' }).demoUserIds)
      .toEqual(['a', 'b', 'c'])
  })

  it('drops empty segments rather than yielding blank ids', () => {
    // A blank id would match a blank user id and silently mark a real user as
    // a demo one.
    expect(readRuntimeFlags({ NEXT_PUBLIC_DEMO_USER_IDS: 'a,,b,' }).demoUserIds)
      .toEqual(['a', 'b'])
  })

  it('is an empty list when the variable is absent', () => {
    expect(readRuntimeFlags({}).demoUserIds).toEqual([])
  })

  it('leaves the other flags alone', () => {
    // Positive companion: proves the field was added rather than the function
    // rewritten.
    const flags = readRuntimeFlags({ NEXT_PUBLIC_APP_VERSION: '2.1.0', NEXT_PUBLIC_DEMO_USER_IDS: 'x' })
    expect(flags.appVersion).toBe('2.1.0')
    expect(flags.demoUserIds).toEqual(['x'])
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/env.test.ts`
Expected: FAIL — `demoUserIds` does not exist on `RuntimeFlags`.

- [ ] **Step 3: Add the field and the literal**

In `nextPublicEnv()`, add — **written out in full**, because the docblock in
that file explains that Next only substitutes the exact literal text and a
computed key yields nothing in a browser bundle:

```ts
      NEXT_PUBLIC_DEMO_USER_IDS: process.env.NEXT_PUBLIC_DEMO_USER_IDS,
```

In `RuntimeFlags` add `demoUserIds: string[]`, and in `readRuntimeFlags`:

```ts
    demoUserIds: (source.NEXT_PUBLIC_DEMO_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
```

Add `NEXT_PUBLIC_DEMO_USER_IDS=` to `.env.example` with a comment saying it is
the seeded demo account's `auth.users.id`, comma separated if there is more
than one.

- [ ] **Step 4: Run it and watch it pass**

Run: `npx vitest run src/lib/__tests__/env.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing demo-affordance tests**

```tsx
// src/components/shell/__tests__/DemoBanner.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemoBanner } from '../DemoBanner'

describe('the demo banner', () => {
  it('says the account is read-only and offers a way to make a real one', () => {
    render(<DemoBanner visible />)
    expect(screen.getByText(/read-only demo/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'create your own account' })).toHaveAttribute(
      'href',
      '/signup'
    )
  })

  it('renders nothing for a normal account', () => {
    const { container } = render(<DemoBanner visible={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is not a status pill', () => {
    // Global Constraint: no status pills, and orange is never a status. The
    // banner is a hairline-ruled strip, not a filled rounded badge.
    const { container } = render(<DemoBanner visible />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('border-b')
    expect(el.className).not.toMatch(/rounded-(full|lg|xl|2xl)/)
  })
})
```

```tsx
// src/hooks/__tests__/useIsDemo.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

const useAuthMock = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuthMock() }))
vi.mock('@/lib/env', async (orig) => {
  const actual = await orig<typeof import('@/lib/env')>()
  return { ...actual, runtimeFlags: { ...actual.runtimeFlags, demoUserIds: ['demo-1'] } }
})

import { useIsDemo } from '../useIsDemo'

beforeEach(() => vi.clearAllMocks())

describe('useIsDemo', () => {
  it('is true for the configured demo account', () => {
    useAuthMock.mockReturnValue({ user: { id: 'demo-1' } })
    expect(renderHook(() => useIsDemo()).result.current).toBe(true)
  })

  it('is false for any other signed-in account', () => {
    useAuthMock.mockReturnValue({ user: { id: 'someone-else' } })
    expect(renderHook(() => useIsDemo()).result.current).toBe(false)
  })

  it('is false when nobody is signed in', () => {
    useAuthMock.mockReturnValue({ user: null })
    expect(renderHook(() => useIsDemo()).result.current).toBe(false)
  })
})
```

- [ ] **Step 6: Run them, watch them fail, then write the two modules**

Run: `npx vitest run src/components/shell/__tests__/DemoBanner.test.tsx src/hooks/__tests__/useIsDemo.test.tsx`
Expected: FAIL on both imports.

```ts
// src/hooks/useIsDemo.ts
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { runtimeFlags } from '@/lib/env'
import { isDemoUser } from '@/services/demoMode'

/**
 * Whether the signed-in account is the published demo.
 *
 * Affordances only. Demo credentials are public, so anyone can call the REST
 * API directly with them; the restrictive demo_block_* policies and
 * public.is_demo() are what actually refuse the write. A disabled button in
 * the UI is an affordance, not a boundary -- the phrase is lifted verbatim
 * from 20260825043057's own comment, which is where the boundary lives.
 */
export function useIsDemo(): boolean {
  const { user } = useAuth()
  return isDemoUser(user?.id ?? null, runtimeFlags.demoUserIds)
}
```

`DemoBanner` is a `border-b border-border-subtle` strip with body copy and a
link to `/signup`. No fill, no radius, no orange — orange is never a status and
this is closest to a status.

- [ ] **Step 7: Run them and watch them pass**

Run: `npx vitest run src/components/shell src/hooks/__tests__/useIsDemo.test.tsx`
Expected: PASS, 6 new tests.

- [ ] **Step 8: Write the failing write-control gate test**

Every gated control gets a positive companion in the same test, proving the
screen rendered and its read content is intact — a demo mode that disables the
buttons by rendering nothing at all would otherwise pass.

```tsx
// append to src/app/(app)/applications/__tests__/page.test.tsx
describe('the applications screen in demo mode', () => {
  it('disables every write control while still showing the applications', () => {
    render(<ApplicationsPage jobs={[makeJob({ id: 'j1', status: 'applied' })]} demo /* …existing required props */ />)
    // Positive companions first: the screen really rendered its data.
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument()
    // Then the gate.
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeDisabled()
  })

  it('leaves the same controls enabled for a normal account', () => {
    // Without this the test above would pass against a screen that disables
    // its buttons unconditionally.
    render(<ApplicationsPage jobs={[makeJob({ id: 'j1', status: 'applied' })]} demo={false} /* … */ />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  })

  it('keeps export enabled, because reading your own data out is not a write', () => {
    render(<ApplicationsPage jobs={[makeJob({ id: 'j1', status: 'applied' })]} demo /* … */ />)
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  })
})
```

The exact prop list for `ApplicationsPage` must be read from the existing
component before writing this — it was built in M5 Task 4 and revised twice.
Do not copy the ellipsis.

- [ ] **Step 9: Thread `demo` through the two routes**

`src/app/(app)/applications/page.tsx` and `src/app/(app)/settings/page.tsx`
each call `useIsDemo()` and pass `demo` into their props-taking component,
following the route-owns-the-hooks split every other route uses. On
`/settings`, the danger-zone delete button and the currency control are both
gated; sign-out is not, because signing out of the demo is the one write-shaped
thing a visitor genuinely needs.

- [ ] **Step 10: Write the SECURITY DEFINER guard test**

The M5 ledger records that `delete_own_account()` shipped as SECURITY DEFINER
with no `is_demo()` guard, and that SECURITY DEFINER bypasses RLS entirely — so
a demo visitor clicking Delete account would have destroyed the shared demo and
cascaded through every user-owned table. It was caught by hand. This turns that
catch into something CI does.

```ts
// supabase/__tests__/securityDefiner.test.ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const DIR = 'supabase/migrations'

/**
 * SECURITY DEFINER functions that have been reviewed and need no demo guard,
 * with the reason. Anything else that defines one and writes data must guard
 * against is_demo(), because a SECURITY DEFINER function runs as its owner and
 * never consults RLS -- the demo_block_* policies cannot protect it.
 */
const REVIEWED_WITHOUT_GUARD: Record<string, string> = {
  '20260825043057_add_demo_accounts.sql':
    'defines is_demo() itself, which cannot guard itself, and writes no data',
}

describe('SECURITY DEFINER migrations', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.sql'))
  const definers = files.filter((f) => /SECURITY\s+DEFINER/i.test(readFileSync(join(DIR, f), 'utf8')))

  it('finds the SECURITY DEFINER migrations at all', () => {
    // Positive companion: without this, a broken glob would make every
    // assertion below pass over an empty list.
    expect(definers.length).toBeGreaterThanOrEqual(2)
    expect(definers).toContain('20260828090000_add_delete_own_account_rpc.sql')
  })

  it('guards every data-writing SECURITY DEFINER function against demo accounts', () => {
    for (const file of definers) {
      if (file in REVIEWED_WITHOUT_GUARD) continue
      const sql = readFileSync(join(DIR, file), 'utf8')
      expect(sql, `${file}: SECURITY DEFINER with no public.is_demo() guard`).toMatch(/is_demo\(\)/)
    }
  })

  it('guards them against unauthenticated callers too', () => {
    for (const file of definers) {
      if (file in REVIEWED_WITHOUT_GUARD) continue
      const sql = readFileSync(join(DIR, file), 'utf8')
      expect(sql, `${file}: no auth.uid() IS NULL guard`).toMatch(/auth\.uid\(\)\s+IS\s+NULL/i)
    }
  })
})
```

- [ ] **Step 11: Run it and confirm it passes against the current migrations**

Run: `npx vitest run supabase/__tests__/securityDefiner.test.ts`
Expected: PASS — `20260828090000` already carries both guards, added under
Gabe's decision during M5 Task 9.

Then prove it has teeth: temporarily delete the `public.is_demo()` line from
`20260828090000`, run again, watch the second test go red, restore, confirm
green and `git diff --stat` clean. A gate that has never been seen to fail is
not a gate.

- [ ] **Step 12: Seed the demo account and register it**

**Order matters and reversing it silently fails every insert.** The seed script
signs in as the demo user and writes as that user, so RLS applies exactly as it
will for a visitor — which means the account must not yet be in
`demo_accounts` when it runs.

1. Create the demo auth user in the Supabase dashboard, auto-confirmed.
   Project must be `somyuulytwgzltiboewm`; verify with
   `supabase projects list` before touching anything.
2. Put `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` in `.env` (not `.env.example`,
   and never committed).
3. `npm run seed:demo`
   Expected output: `Inserting 27 applications...` through
   `Done. Seeded 27 applications for <email>.` plus the `insert into
   public.demo_accounts …` line with the real user id.
4. Run that printed SQL against the project. The account is now read-only.
5. Put the same user id in `NEXT_PUBLIC_DEMO_USER_IDS` locally and in the
   Vercel project's environment variables.

Then verify the boundary rather than assuming it — the M5 ledger's closing
lesson is that reading the file proved the guard existed in source while
querying the live catalog found a privilege the file could not have shown:

```sql
-- as the demo user, expect a policy violation, not a success
insert into public.jobs (user_id, company, role, status) values (auth.uid(), 'x', 'y', 'wishlist');
select public.is_demo();  -- expect true
```

Also confirm `supabase migration list --linked` shows local == remote. The
Global Constraint requires it after every milestone and M5 closed with it met;
M6 adds no migrations, so it should still hold.

- [ ] **Step 13: Deal with the seeded CV's `structured` mode**

The demo CV is seeded with `mode: 'structured'`. `resumeService.normalizeMode`
settles that to `word`, and the M5 ledger records that opening such a row in
the Word editor and letting autosave fire rewrites `mode` and `content` and
orphans `sections`. On the demo account RLS refuses the write, so nothing is
lost — but the visitor sees a Word editor holding a starter template and an
autosave that keeps failing, which is a bad first impression of the CV builder
and reads as a bug.

Ruling: **change the seed to `mode: 'word'` with real `content`**, and keep
`sections` for the ATS panel. That is a two-line change in
`scripts/demoSeedData.mjs`, it makes the demo show the editor actually working,
and it sidesteps a latent data-loss path rather than relying on RLS to mask it.
Fixing `normalizeMode` properly is the structured editor's job (roadmap 1.7 /
M2 2.5) and stays parked.

Re-run the seed after the change (remove from `demo_accounts`, seed, add back).

- [ ] **Step 14: Point the landing page's demo CTAs at a real destination**

`try the live demo` and `open the demo` currently need a target. Options are a
pre-filled `/login?demo=1`, or a documented email/password shown on the landing
page. Pick one and make the link land somewhere that works; a primary CTA that
404s is worse than no CTA. Whichever is chosen, the credentials being public is
the design — the RLS boundary is what makes that safe.

- [ ] **Step 15: Run the whole suite and both typechecks**

```bash
npx vitest run
npx tsc --noEmit
rm -rf .next && npm run build
```

- [ ] **Step 16: Commit**

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts src/hooks/useIsDemo.ts \
  src/hooks/__tests__/useIsDemo.test.tsx src/components/shell supabase/__tests__ \
  "src/app/(app)/applications/page.tsx" "src/app/(app)/settings/page.tsx" \
  scripts/demoSeedData.mjs .env.example
git commit -m "feat: demo mode affordances and a CI gate on SECURITY DEFINER guards"
```

Then check nothing was left behind — `git commit -- <pathspec>` does not pick
up untracked files, which caught M5 out once:

Run: `git status --short`
Expected: clean.

---

### Task 7: README rewrite, and the milestone gates

**Files:**
- Modify: `README.md`
- Create: `docs/screenshots/*.png` (or reuse `public/screens/` from Task 2 — pick one location and reference it from both)
- Modify: `src/lib/__tests__/attribution.test.ts` (add the staleness assertions)
- Modify: `docs/superpowers/plans/2026-08-23-worktrack-roadmap.md` (mark M6 complete)

**Interfaces:**
- Consumes: `SKIPER_ATTRIBUTION` from `@/lib/attribution` (Task 1); the screenshots from Task 2.
- Produces: nothing consumed by code.

The current README is 196 lines and materially wrong about the present repo. It
claims React 18 (the repo is React 19), "304 unit tests across 28 files" (the
count is in the six hundreds and moving), that no public demo is deployed, and
it describes screens that M5 replaced. A README that lies is worse than a short
one.

- [ ] **Step 1: Write the failing staleness test**

```ts
// append to src/lib/__tests__/attribution.test.ts
import { readFileSync } from 'node:fs'

describe('the README describes this repository', () => {
  const readme = () => readFileSync('README.md', 'utf8')

  it('names the React major the repo actually depends on', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    const major = pkg.dependencies.react.replace(/^[^\d]*/, '').split('.')[0]
    expect(readme()).toContain(`React ${major}`)
    expect(readme()).not.toContain(`React ${Number(major) - 1}`)
  })

  it('does not quote a test count, which decays on every commit', () => {
    // The old README claimed "304 unit tests across 28 files". It was wrong
    // within a day and stayed wrong for a milestone.
    expect(readme()).not.toMatch(/\b\d{2,4}\s+unit tests\b/)
  })

  it('links the live demo and the auth routes', () => {
    const text = readme()
    expect(text).toContain('](/login')
    expect(text).toContain('## Demo')
  })

  it('shows the screens it claims to have', () => {
    const text = readme()
    for (const shot of ['dashboard', 'applications', 'analytics']) {
      expect(text, `README does not embed the ${shot} screenshot`).toContain(`${shot}.png`)
    }
  })
})
```

The `](/login` assertion is deliberately loose — the deployed origin is not
known at plan time, so it asserts a link exists rather than a hostname that
would be a guess.

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/lib/__tests__/attribution.test.ts`
Expected: FAIL on at least "React 19" and the test-count assertion.

- [ ] **Step 3: Rewrite the README**

Sections, in order:

1. **Title and one-line description.** Worktrack: a job search tracker with
   analytics and a CV builder.
2. **Project lineage** — keep the existing paragraph verbatim. It credits
   Ensues and is a standing obligation, not a stylistic choice.
3. **Demo** — the live link, the demo credentials, and one sentence saying the
   account is read-only and why (published credentials, enforced in RLS).
4. **Screenshots** — the five captures from Task 2, embedded.
5. **Features** — rewritten against what M5 actually shipped: six authenticated
   routes (`/dashboard`, `/applications`, `/applications/[id]`, `/calendar`,
   `/documents`, `/analytics`, `/settings`), the Word and LaTeX CV editors with
   version snapshots, the analytics panels including the cumulative funnel.
   Delete every claim about a screen that no longer exists.
6. **Stack** — correct the table. React 19, Next 15 App Router, Tailwind v4,
   TanStack Query v5, Tiptap, Recharts, Supabase, Vitest. Delete "React 18" and
   "shadcn-style semantic tokens" in favour of naming the real token layer.
7. **Running it locally** — env vars including `NEXT_PUBLIC_DEMO_USER_IDS`,
   migrations, `npm run seed:demo` with the ordering caveat from Task 6.
8. **Engineering** — RLS on every table, the demo boundary, TDD. Describe the
   test suite without quoting a number.
9. **Attribution** — the section Task 1 created. Do not touch its sentences;
   the gate test asserts them verbatim.
10. **Credits** — the existing section.

- [ ] **Step 4: Run the README tests and watch them pass**

Run: `npx vitest run src/lib/__tests__/attribution.test.ts`
Expected: PASS.

- [ ] **Step 5: Run every milestone gate**

```bash
npx vitest run
npm run test:integration
npx tsc --noEmit
npm run lint
rm -rf .next && npm run build
grep -rn "lucide-react" src
supabase migration list --linked
```

Expected, in order: green suite with the count recorded; 19 integration tests
green; exit 0; lint clean; clean build with `/`, `/login`, `/signup`,
`/privacy` and `/_not-found` all present and non-zero; the lucide grep showing
only whatever M5 Task 10 has not yet removed (M6 must have added nothing);
local == remote on migrations.

Then typecheck every test file M6 added, since `tsconfig.json` excludes them
and three violations survived a clean typecheck during M5:

```bash
npx tsc --noEmit --jsx react-jsx --moduleResolution bundler --module esnext \
  --target es2020 --strict --skipLibCheck --esModuleInterop \
  --paths '{"@/*":["./src/*"]}' --baseUrl . \
  $(git diff --name-only main...HEAD | grep -E '__tests__.*\.tsx?$')
```

- [ ] **Step 6: Check the exit criterion by doing it**

M6's exit is "a stranger can open the demo and understand the product without
an account". Open a private browser window with no session and, without
signing up: land on `/`, scroll the pinned sequence, follow the demo CTA, reach
the dashboard, move through the applications list and one detail screen, open
analytics, and get back out. If any step needs an account or a piece of
knowledge the page did not give you, the milestone is not done.

Repeat at 375px and with Reduce Motion on.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/screenshots src/lib/__tests__/attribution.test.ts \
  docs/superpowers/plans/2026-08-23-worktrack-roadmap.md
git commit -m "docs: rewrite the README against what the app actually is"
```

---

## Self-Review

**1. Spec coverage.**

| Spec item | Task |
|---|---|
| 6.1 landing — hero, carousel, ATS section, footer | 2 |
| 6.1 — skiper51 install, `swiper` + `framer-motion`, autoplay off | 1 |
| 6.1 — Swiper CSS reconciled with M4 tokens, `shadow: true` killed | 1 (Steps 5–6) |
| 6.1 — theme toggle in the sticky navbar **and** the footer | 2 (Steps 2, 4) |
| 6.1 — landing routes to auth; navbar `sign in` link + `sign up` button both breakpoints | 2 |
| 6.1 — desktop navbar keeps `open the demo`, demoted to secondary; mobile drops it | 2 (Step 2) |
| 6.1 — hero gains `create account` secondary beside primary `try the live demo` | 2 (Step 2) |
| 6.1a — pinning not parallax; CSS sticky over JS hijacking | 3 |
| 6.1a — reduced motion disables pinning entirely | 3 (Steps 9, 11) |
| 6.1a — Figma frame height is not scroll height | 3 (`lib/pinnedScroll.ts` docblock, Step 1 test) |
| 6.1a — scroll drives slides; `allowTouchMove: false`, `simulateTouch: false` | 1 (options), 3 (hook) |
| 6.1a — `loop: false` in both modes | 1 (Step 7 test) |
| 6.1a — `setProgress(0..1)`, never `slideNext()` | 3 (Steps 5, 7) |
| 6.1a — arrows on in both modes, slide content Tab-reachable | 1 (options test), 2 (Step 2), 3 (Step 9 keyboard test) |
| 6.1a — reduced motion restores a conventional carousel | 3 (Steps 5, 7) |
| 6.1a — preference read live via `matchMedia`, not captured at mount | 3 (Steps 5, 9 — the dispatching mock) |
| 6.1a — both paths tested | 3 (every describe block is paired) |
| 6.1a — pin length scales with slide count | 3 (Step 1, the constant-pace invariant) |
| 6.1a — pause the hero video once the hero unpins | 2 (`HeroMedia`), 3 (Step 13) |
| 6.1a — navbar reveals at the carousel's end | 3 (`navbarRevealed`) |
| 6.1a — decide whether mobile pins | **Open question 1.** Task 3 Step 16 gathers the evidence; the decision is Gabe's. |
| 6.2 — skiper106, `dialkit` | 4 (Steps 1–2) |
| 6.2 — name collision, take only `SmoothInput` | 4 (Step 2) |
| 6.2 — verify against the four Figma Input states, run `ui-ux-pro-max` | 4 (Step 5) |
| 6.2 — desktop split panel, mobile single centred column | 4 (Step 5, tested Step 3) |
| 6.2 — Sign Up adds confirm password, `create account`, inverted switch link | 4 (Step 3) |
| 6.2 — switch link top-right desktop, inline mobile | 4 (Step 3) |
| 6.2 — one focused field at a time; reveal control anchored to the field edge | **Already solved in M4.** Recorded in the Current-state table; Task 4 reuses `Input`/`PasswordInput` and its test proves the reveal works. |
| 6.3 — custom 404 with recovery links; privacy page | 5 |
| 6.4 — seeded read-only account, banner, write controls disabled | 6 |
| 6.4 — `is_demo()` is enforced in RLS; SECURITY DEFINER bypasses RLS | 6 (Steps 10–11, the CI gate) |
| 6.5 — README rewrite with live link and screenshots | 7 |
| 6.5 — credit Skiper UI in README and landing footer, with upstreams | 1 (Steps 11–14), 2 (Step 4) |
| Global — `grep -r lucide src/` | 4 (Step 10), 7 (Step 5). M5 Task 10 owns the uninstall; M6 adds nothing and retires four import sites. |
| Global — attribution for `skiper4` / `skiper26` | **Conflict with the repo.** Neither was installed. Credited as influences in README prose; see open question 2. |

Two roadmap lines have no task and deliberately so: the `skiper67` /
`skiper3` / `skiper41` / `skiper89` "evaluate, do not assume" candidates are
evaluate-nots — nothing in 6.1 needs them, `HeroMedia` is fourteen lines, and
adopting a component creates an attribution obligation for a problem that does
not exist. Recorded rather than silently skipped.

**2. Placeholder scan.** No "TBD", no "add appropriate error handling", no
"write tests for the above", no "similar to Task N". Three places give a
contract instead of finished code, each with a reason and a verification step:

- Task 1 Steps 2 and 5, and Task 4 Steps 1–2: the two Skiper components are
  **downloaded, not authored**. Their exact internals cannot be known before
  the CLI runs, and writing invented source into a plan would be the exact
  failure mode this plan exists to avoid. Both tasks read the installed file
  first and state what to change; the source-shape tests are the gate.
- Task 3 Step 11 carries an implementation note rather than final JSX for the
  hero/carousel slot injection. The render-prop shape shown works and its tests
  pass, but the two sections have to be injected somewhere and the note says
  exactly how. Flagged in the step, not hidden.
- Task 6 Step 8 shows `/* …existing required props */` in a test, because
  `ApplicationsPage`'s prop list was revised twice during M5 and transcribing
  a stale copy here is precisely how M5's Task 8 named service methods that did
  not exist. The step says to read the component first.

Task 2 Step 8, Task 4 Step 5, Task 5 Step 3 and Task 7 Step 3 describe
composition at the component level rather than transcribing markup. Every test
that gates them is given literally; the alternative is several thousand lines
of JSX in a plan document that would go stale on the first task.

**3. Type consistency.**

- `LandingScreen { src, alt, caption }` is defined in Task 2's `screens.ts` and used in Task 2's tests and Task 3's wiring. One shape, one name.
- `SwiperCarouselOptions` is defined in Task 1 and consumed by Task 2's `ScreenCarousel` and Task 3's mode switch. `carouselOptionsFor(reduced: boolean)` has one signature throughout.
- `DrivableSwiper` is defined in Task 3's Interfaces block and in `useCarouselProgress.ts`; the `onSwiper` prop Task 1 Step 5 adds to the vendor file is what supplies it. `setProgress`, `allowTouchMove` and `params.allowTouchMove` are the same three members everywhere they appear.
- `AttributionEntry { id, name, href, credit }` is defined in Task 1 and consumed by Task 2's footer and Task 7's README tests. `credit` is the field asserted verbatim in three places.
- `pinned` / `carouselProgress` / `heroUnpinned` are named identically in Task 2's `LandingProps`, Task 3's `PinnedSequence` render-prop state, and Task 3's Interfaces block. `heroUnpinned` becomes `HeroMedia`'s `paused` at exactly one boundary, which is stated in Task 3 Step 14.
- `AuthMode = 'signin' | 'signup'` and `AuthScreenProps { mode, onSubmit }` are defined in Task 4 and used in both route files. `onSubmit(email, password): Promise<void>` matches `useAuth().signIn` / `.signUp`, both read from `src/contexts/AuthContext.tsx`.
- `isDemoUser(userId, demoUserIds)` in Task 6 is the existing export, read from `src/services/demoMode.ts`, not a new one. `demoUserIds: string[]` is the same name on `RuntimeFlags` and in that call.
- `usePrefersReducedMotion(): boolean` is the existing hook. There is exactly one `matchMedia` read in this milestone's production code, and it is inside `src/lib/motion.ts` where it already lives.
- Every icon named — `PlayIcon`, `ArrowRightIcon`, `ShieldIcon`, `TargetIcon`, `AnalyticsIcon`, `AlertCircleIcon` — was confirmed present in the 34 exports of `src/components/icons/index.tsx`.

**4. Test-shape audit**, run explicitly against the five M5 failure modes:

- No `getByRole('banner')` for a body header. The one `getByRole('banner')` in this plan is Task 2's landing navbar, which is the public page's only landmark of that role — the authenticated shell's `TopBar` is not on this page.
- No `.rejects` on a function wrapper. The one rejection path (Task 4) uses `mockRejectedValue` and asserts on rendered output after an `await`.
- Every `queryBy…toBeNull()` and every `not.toMatch` carries a positive companion in the same test: Task 1's source test asserts the file is the carousel before asserting what it lacks; Task 2's poster test is paired with a video test; Task 4's confirm-password negative sits beside two positives; Task 6's disabled-button test asserts the rows rendered first and is paired with an enabled-for-normal-accounts test; Task 6's SECURITY DEFINER scan asserts it found files before asserting what they contain.
- No fixture supplies a value the production path cannot produce. `SCREENS` in tests are literal paths that the component only ever passes to `src`; `makeJob` is the consolidated fixture from `src/test/fixtures.ts`.
- Timers: Task 3 Step 13 uses separate `act` blocks per transition and says why. Nothing in this plan advances a fake clock in one jump.
- Three tests are proved to have teeth by reverting the code under them and watching them go red: Task 3 Step 8 (the reduced-motion guard), Task 6 Step 11 (the SECURITY DEFINER gate), and Task 1 Step 4 (the vendor source shape, which fails on arrival).

---

## Where the roadmap and the repo disagree

Every one of these was verified by reading the file, not inferred.

1. **"shadcn is not initialised. There is no `components.json`."** — `components.json` exists (created 2026-08-25, during M4). **Repo wins.** Do not run `shadcn init`; it would overwrite `iconLibrary: "@/components/icons"` and the CLI would start writing lucide imports. What *is* missing is a registry entry, and Task 1 Step 1 adds it.
2. **"Use the M4 4.4 Theme Toggle primitive — skiper4's button driven by 4.6's `useThemeToggle()`."** — no `useThemeToggle` export exists anywhere in `src`. **Repo wins.** The primitive is `ThemeToggle` from `@/components/ui/theme-toggle`, whose docblock states it was written against skiper4's technique rather than installed from it. The View Transition wipe is inside its own `handleClick`, not a separate hook.
3. **"All four adopted components — `skiper4`, `skiper26`, `skiper51`, `skiper106` — must credit Skiper UI."** — only two will ever be adopted. `src/components/v1/` does not exist and no Skiper source has been installed. By the roadmap's own rule ("attribution attaches to what ships, not to what is read"), skiper4 and skiper26 fall on the reference-only side alongside CVJunction. **Repo wins on the fact.** This plan credits them anyway, in accurate wording, because the ideas are theirs and the cost is one paragraph. Open question 2.
4. **"`skiper26` pulls `lucide-react` transitively; edit the import out."** — skiper26 is not being installed, so this instruction has no target. The *rule* still binds and Task 1 Step 5 applies it to skiper51, where it does have one.
5. **6.2's two "things that will bite when this is coded"** — the double-focused field and the reveal control that "sat off-canvas until repositioned" — **were both fixed during M4.** `Input`'s docblock says focus is deliberately not a prop precisely so the Figma frame's bug is unrepresentable, and `PasswordInput`'s says its `right-2` anchor is the fix for the 375px case. **Repo wins.** Task 4 reuses them; re-solving would be work already done.
6. **The 26-icon set.** The roadmap's Global Constraint says 26. M5 Task 1 took it to 34 and the constraint text was never updated. This plan says 34, which is what `src/components/icons/index.tsx` exports.
7. **"Hero (background video) desktop"** — no video asset exists and none can be produced by writing code. The plan ships poster-only with the video path built and tested behind a source. Not a disagreement so much as an unmet prerequisite; recorded because a reviewer comparing the shipped hero to the Figma frame will notice.
8. **`src/app/page.tsx` redirects to `/dashboard`.** The roadmap assumes `/` is the landing page and never mentions the redirect. Task 2 removes it. Open question 3.
9. **6.4's "seeded read-only account".** The substrate is further along than the roadmap implies: the table, `is_demo()`, the restrictive policies, the seed script, the pure `isDemoUser` helper and its tests all exist. What is missing is the wiring, the banner, the env variable, and the operational step of actually creating and registering the account.

## Corrections to the brief this plan was written from

The brief asked for these to be checked rather than complied with. Three of
its premises are wrong, all in the same direction — it assumed M4 installed
things it did not.

1. **"M4 was supposed to install `skiper4` and `skiper26`. Check what is actually in `src/components/v1/`."** — `src/components/v1/` does not exist at all. M4 deliberately declined both and wrote `ui/theme-toggle.tsx` from scratch; the reasons are in two docblocks in that file. So M6 Task 1 is the *first* Skiper install in the repo's history, which is why it also has to add the registry to `components.json`.
2. **"Whether `useThemeToggle()` from skiper26 exists."** — it does not, and cannot, since skiper26 was never installed. The brief inherited this from the roadmap.
3. **"Attribution is a shipping requirement... `skiper4`, `skiper26`, `skiper51`, `skiper106` all require crediting."** — only skiper51 and skiper106 will ship source. The obligation attaches to two, not four. The plan still credits all four with accurate wording, but a reviewer should know the difference between the two that are compliance and the two that are courtesy.
4. **"Is `shadcn` initialised — does `components.json` exist? The roadmap says it was not, as of M4 planning."** — it exists. The brief was right to ask.
5. Minor: the brief says the icon set is 34 icons in `src/components/icons/index.tsx` — **correct**, verified. And that `lucide-react` is being removed in M5 Task 10 — **correct**, and still outstanding at `7d5bdfb`.

## Open questions for Gabe

Decisions the roadmap does not settle, listed rather than settled unilaterally.

1. **Does mobile pin at all?** The roadmap explicitly leaves this open: "the mobile frames carry the same section order so it can, but pinning costs a full viewport on a 375×812 screen and is jankier under touch. Normal flow on mobile is a legitimate answer." This plan builds `PinnedSequence` so it can be disabled by breakpoint in one place, and Task 3 Step 16 asks the implementer to try it at 375px and report. The decision is yours. Cost of pinning on mobile: a visitor spends four to five full viewport-heights of scrolling before reaching Features, on the device where thumb-scrolling is most expensive. Cost of not pinning: the mobile landing page is a different experience from the desktop one, which is a portfolio piece's weakest moment.

2. **Do `skiper4` and `skiper26` get credited?** Neither ships. By the roadmap's own reference-only rule they carry no obligation, and the same line already keeps CVJunction out of the attribution list. This plan credits them in prose as influences (`toggles.dev` / Alfie Jones, `rudrodip/theme-toggle-effect`) while keeping them out of `SKIPER_ATTRIBUTION`, which is the licence-obligation list. If you would rather they were in the obligation list, it is one line in `src/lib/attribution.ts` and two in the README — but then the test asserts a credit for source that is not in the repo, which is a slightly dishonest gate.

3. **Should `/` still redirect signed-in visitors to `/dashboard`?** Today it redirects everyone. This plan makes `/` always render the landing page, on the argument that the landing page is the artefact a reviewer is meant to see and hiding it from the only person with an account is backwards. The alternative — read the session and redirect — makes the landing route dynamic, costs its static render, and means the page you are building for strangers is one you can never casually look at. Reversible either way, one file.

4. **Does the smooth-caret input go on password fields too?** This plan uses `SmoothInput` for email and M4's `PasswordInput` for both password fields. On a masked field there is no visible caret to smooth, and skiper106's redrawn caret would have to share a box with `PasswordInput`'s absolutely-positioned reveal control. If you want the smooth caret on password fields, it needs `SmoothInput` and the reveal control merged into one component, which is a real piece of work and its own task.

5. **What is the demo's front door?** Task 6 Step 14 needs a decision: a `/login?demo=1` that pre-fills the published credentials, or the credentials printed on the landing page, or a one-click server action that signs in as the demo. All three are safe — the RLS boundary is what makes public credentials fine — but they read very differently to a visitor. The one-click version is the strongest for a portfolio piece and the most work.

6. **`tsconfig.json` excludes test files from `tsc --noEmit`.** This is the M5 parked item, and it bit three separate times: a missed required-prop call site, a fixture missing a new field, and a third the ledger records at run 2. Every task in this plan works around it with an explicit second `tsc` invocation over the test files, which is ugly and easy to forget. Fixing it properly — un-excluding `src/**/__tests__/**` and repairing whatever that surfaces — is its own task and should probably run before M6 rather than after. Say the word and it goes in front of Task 1.

7. **The analytics funnel's cumulative shape and the `smoke.test.ts`-class dead tests** are both closed from M5, but two M5 items remain parked and touch M6's surface: `resumes.sections` is never written by anything (so ATS reads "Not checked" for every real CV, including the demo's), and `getConversionFunnel`'s `avgDaysToStage` computes the same number for two stages. Neither blocks M6; both will be visible in the screenshots Task 2 and Task 7 capture. Worth knowing before those images go into the README.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-28-m6-public-surface.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration. This is what M5 used, and the roadmap's Execution Protocol applies on top of it: Gabe approves every task before implementation, which overrides `subagent-driven-development`'s continuous-execution rule.

**2. Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Whichever is chosen, tasks run **one at a time in one working tree**, or each in its own git worktree per `superpowers:using-git-worktrees`. The M5 ledger records two concrete incidents from parallel agents sharing a tree, and no two agents may run `npm run build` concurrently — a contended `.next` reports success while producing every route at 0 B, which is a green signal that proves nothing.
