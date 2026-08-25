# Worktrack Rebuild — Roadmap

> **For agentic workers:** This is the roadmap, not an executable plan. Each
> milestone gets its own plan file under `docs/superpowers/plans/`. Execute
> those with superpowers:subagent-driven-development.

**Goal:** Rebuild the Job Search Tracker into a portfolio-grade product on
Next.js, implementing the design system already built in Figma.

**Order:** Backend to frontend. Data layer and services are framework-agnostic,
so they land before the Next.js migration; UI is then built once, on the target
framework, against a schema that already exists.

**Source of truth for design:** Figma file `si641ecd9VS70DJPLvtPfo`
(`01 · Design System`, `02 · Screens`). 84 variables, 16 text styles,
14 components, 32 screens across light and dark.

---

## Global Constraints

- **Supabase project:** `somyuulytwgzltiboewm`. Never `zlqepevzcfnnygaorvxn`.
- **RLS on every table**, no exceptions. Write policies must exclude demo users.
- **Accent:** `#c2410c` (orange-700) light, `#fb923c` (orange-400) dark.
  orange-500 fails WCAG AA on white at 2.80:1 — never use it for text.
- **Status colours are semantic only:** wishlist grey, applied **blue**,
  interviewing **violet**, offer green, rejected red. Orange is never a status.
- **No status pills.** Use the Status Marker pattern: 2px rule + label, no fill,
  no dot, no radius.
- **Icons:** the custom 26-icon set from Figma. Never Lucide. `skiper26` pulls
  `lucide-react` transitively; because shadcn copies source in-tree, edit the
  import out rather than accepting it. `grep -r lucide src/` must come back
  empty once 4.3 lands.
- **Radius caps at 4px.** Separation is hairline rules, not card borders.
- **Every migration is idempotent** and lands in `supabase/migrations/` with the
  version recorded remotely. `supabase migration list --linked` must show
  local == remote after every milestone.
- **TDD is mandatory.** No production code without a failing test first.
- **Currency:** salary values are Philippine pesos unless a currency column says
  otherwise. Never assume USD.
- **Third-party components carry attribution obligations.** Skiper UI free-tier
  components require crediting Skiper UI. Every external component adopted gets
  a line in the README, same discipline already applied to CVJunction.

## Execution Protocol — APPROVAL REQUIRED

**Gabe approves every task before implementation.** This overrides
superpowers:subagent-driven-development's continuous-execution rule, which says
not to pause between tasks. It does not apply here.

Per task, in order:

1. Present the task: files touched, interfaces produced, the SQL or code to be
   written, and the test that will gate it.
2. **Wait for explicit approval.** Do not dispatch, do not write code.
3. On approval, execute the task's steps in order — test first, watch it fail,
   implement, watch it pass, commit.
4. Report with evidence: the actual command output, not a claim about it. Per
   superpowers:verification-before-completion, a completion claim without fresh
   output is a lie.
5. Wait for approval before starting the next task.

A task that fails review re-enters at step 1 with the findings attached.

## Required Skills

Load these before executing. They are not optional context — each governs part
of this plan.

| Skill | Governs |
|---|---|
| `superpowers:test-driven-development` | Every task. No production code without a failing test first. |
| `superpowers:verification-before-completion` | Every completion claim. Run the command, read the output, then speak. |
| `superpowers:subagent-driven-development` | Task dispatch and review, minus its continuous-execution rule. |
| `superpowers:requesting-code-review` | The review gate after each task. |
| `superpowers:using-git-worktrees` | Isolation. Never implement on `main` without consent. |
| `frontend-design:frontend-design` | M4 onward. Anti-templated visual judgment. |
| `vercel:nextjs` | M3. App Router, RSC boundaries, async params, runtime choice. |
| `vercel:shadcn` | M4. Component library adoption. |
| `vercel:deployments-cicd` | M3. Vercel deploy pipeline. |
| `vercel:env-vars` | M3. `VITE_*` → `NEXT_PUBLIC_*` migration. |
| `ui-ux-pro-max` | M4-M6. Accessibility, touch targets, responsive layout, animation timing, forms, navigation rule sets. |
| `tailwind-design-system` | M4. Tailwind v4 CSS-first `@theme` tokens, CVA variants, `@custom-variant dark`. |
| `design-taste-frontend` | M6. Anti-slop pass on the public surface. Hard bans: em-dashes, eyebrow spam, div-based fake screenshots, section-number labels. |
| `design-motion-principles` | M5-M6. Motion audit. Turns the Figma motion rules into real transitions with `prefers-reduced-motion` honoured. |
| `figma:figma-design-to-code` | M4-M6. Reads the Worktrack Figma file into code via `get_design_context`. Requires Figma MCP auth. |
| `vercel:react-best-practices` | M3-M6. Waterfalls, bundle size, RSC serialization, re-render discipline. |

`taste-skill:design-taste-frontend` is not a valid skill name. That plugin exposes
`taste-skill:taste-skill`, which is the same skill as the standalone
`design-taste-frontend` listed above. Load one, not both.

---

## Milestones

### M1 — Data layer *(backend, no UI)*
Schema for every feature the UI will need. Ships as migrations only.

- 1.1 Job description column (`jobs.description`) — prerequisite for all AI/ATS work
- 1.2 Salary currency (`jobs.salary_currency`) — correctness bug, corrupts analytics
- 1.3 `application_documents` join — pins the exact CV snapshot sent to each application
- 1.4 `events` table — interviews, deadlines, take-homes
- 1.5 `activity_log` table — timestamped notes per application
- 1.6 `contacts` + `application_contacts` join
- 1.7 Structured CV: `cv_sections` on the JSON Resume schema
- 1.8 `demo_accounts` + `is_demo()` + write-policy guards on every table
- 1.9 Regenerate `src/types/database.ts` from the live schema
- 1.10 `user_preferences` — **new, and a blocker for the Settings screen.** The
  Figma Settings page now has a `default currency` control, but nothing in the
  schema stores a user-level preference. `jobs.salary_currency` is per-row with
  a hardcoded `DEFAULT 'PHP'`; there is no `profiles` or `user_preferences`
  table anywhere in `supabase/migrations/`. Needs `user_id` PK, a
  `default_currency` column reusing Task 2's CHECK list, RLS, and the demo
  guard from Task 8. The insert default for `jobs.salary_currency` should then
  read from it rather than being hardcoded.

**Exit:** all migrations applied, `local == remote`, 218 existing tests still green.

### M2 — Service layer *(backend)*
Typed data access and derived logic. Still no UI.

- 2.1 `eventService`, `activityService`, `contactService` — CRUD with RLS-aware queries
- 2.2 `documentLinkService` — pin/unpin a CV snapshot to an application
- 2.3 Follow-up derivation — `getStaleApplications(days)`, pure function over existing rows
- 2.4 ATS keyword match — `matchKeywords(cvText, jobDescription)` returning score + missing terms
- 2.5 ATS lint — `lintForAts(cvSections)` returning pass/review/fail + reasons
- 2.6 Edge function `cv-render` — JSON Resume in, PDF out
- 2.7 Seed script for the demo account — 25+ realistic applications across all five statuses

**Exit:** every service has tests against real Supabase rows, not mocks.

### M3 — Next.js migration *(framework)*
Move the shell before building new UI, so nothing is built twice.

- 3.1 Scaffold Next.js App Router alongside Vite; both build
- 3.2 Port `AuthContext`, `ThemeContext`, `ToastContext` to client components
  - **`ThemeContext` is replaced, not ported.** skiper26's `useThemeToggle()`
    requires `next-themes`, which owns the same job today's context does —
    localStorage, system preference, and the `light`/`dark` class on `<html>`.
    Two sources of truth for theme is a bug waiting to happen. Wrap the app in
    `NextThemesProvider` with `attribute="class" defaultTheme="system"
    enableSystem`, then delete `src/contexts/ThemeContext.tsx` and repoint
    `useTheme` consumers.
  - `suppressHydrationWarning` on `<html>` is required; next-themes writes the
    class before React hydrates.
- 3.3 `VITE_*` → `NEXT_PUBLIC_*`; update `src/lib/supabase.ts`
- 3.4 Port routes: `/dashboard`, `/applications`, `/cv` as-is, no redesign
- 3.5 Port the 218 tests to the Next.js paths; all green
- 3.6 Deploy to Vercel; delete Vite config and the `gh-pages` scripts

**Exit:** feature parity with today's app, running on Vercel, tests green.

### M4 — Design system in code *(frontend)*
Translate the Figma system into code. No screens yet.

- 4.1 Tokens: the three Figma collections → CSS custom properties with light/dark
- 4.2 Type scale → Tailwind config; Helvetica with the fallback stack
  `Helvetica, "Helvetica Neue", Arial, sans-serif`. Helvetica Neue is not used:
  the Figma MCP cannot load it, so the system standardises on plain Helvetica.
  `Caption` is still Inter Medium in Figma — reconcile it to Helvetica or keep
  Inter deliberately, but do not ship it undecided. Data/* styles need
  `font-variant-numeric: tabular-nums`; Helvetica has proportional digits, so
  table columns will not align without it.
- 4.3 Icon set: 26 SVGs as React components from the Figma vectors
- 4.4 Primitives: Button, Input, Status Marker, ATS Check, Breadcrumb, Theme Toggle
  - Theme Toggle: **skiper4 supplies the button.**
    `pnpm dlx shadcn add @skiper-ui/skiper4` — pulls `framer-motion` + `clsx`.
    It exports five animated SVGs, `ThemeToggleButton1`-`5`; pick one and delete
    the rest rather than carrying four unused variants.
  - skiper4 changes **no state** — its own docs say so. It is the button only.
    The switching comes from 4.6.
  - Reconcile against the Figma Theme Toggle component (`Mode=Light/Dark`),
    which currently defines this mark. If skiper4's animation wins, the Figma
    component is superseded and should be updated to match, not left to drift.
  - Today's toggle at `src/components/Layout.tsx:155` is replaced here. It
    renders Lucide icons; its `ThemeContext` wiring is already retired by 3.2.
  - **Placement, as drawn in Figma:** desktop puts it at the foot of the
    Sidebar above the footer note; mobile puts it in the Top Bar, left of the
    screen's own action. It is absent from Auth, Privacy and 404, which have no
    nav. The Figma `Theme Toggle` component carries `Mode=Light` (Sun) and
    `Mode=Dark` (Moon), tracking the *current* theme, so the variant must follow
    the active theme rather than staying fixed.
- 4.5 Composites: KPI Stat, Application Row, Job Card, Kanban Column, Nav Item, Sidebar
- 4.6 Motion: `IntersectionObserver` mount-gating, `prefers-reduced-motion`, View Transitions theme wipe
  - **skiper26 supplies the theme transition, on every page.**
    `pnpm dlx shadcn add @skiper-ui/skiper26` — pulls `framer-motion`,
    `next-themes`, and `lucide-react`. Its `useThemeToggle()` drives the change
    through the View Transition API. Drive skiper4's button with it:
    `const { isDark, toggleTheme } = useThemeToggle({ variant, start })`.
  - **Variant:** `circle` or `rectangle`, `blur: off`. Not `gif` — it fetches a
    remote GIF from a third party on every toggle, which is a network
    dependency, a privacy leak, and the opposite of a restrained Swiss system.
    Not `polygon`. Pick one `start` direction and use it everywhere; a wipe that
    changes direction per page reads as a bug.
  - **`lucide-react` conflict.** skiper26 depends on Lucide, which a Global
    Constraint forbids. It installs as copied source, not a package, so edit the
    import out of `@/components/v1/skiper26` and substitute the custom icon.
    Verify with `grep -r lucide src/` that 4.3 leaves no Lucide in the tree.
  - The wipe must no-op under `prefers-reduced-motion`, and the theme must still
    change where View Transitions are unsupported — Safari and Firefox both
    lagged here. Progressive enhancement: the transition is decoration, the
    state change is not.
  - Applying this across all pages makes theme switching a shared surface, so it
    belongs to the app shell, not to any one route. Landing, auth, and the
    protected routes all mount the same toggle.

**Exit:** every component rendered in a Storybook-style route, light and dark, matching Figma.

### M5 — Application screens *(frontend)*
Rebuild the app surface against the design system.

- 5.1 Break up `DashboardPage` (827), `JobForm` (824), `JobsPage` (787), `ResumePage` (668)
- 5.2 Sidebar nav: six items, numbered, with icons
- 5.3 Dashboard as aggregator — KPI strip, follow-up nudge first, six blocks, links out
- 5.4 `/applications` — kanban desktop, list + status tabs on mobile
- 5.5 `/applications/[id]` — JD, activity, linked CV, ATS match, next event
- 5.6 `/calendar`, `/documents`, `/analytics`, `/settings`
  - `/settings` is **two groups: account and danger zone.** Appearance and data
    were both removed from the Figma frames on 2026-08-25.
  - No Appearance group: the theme control lives in the app shell (4.4 + 4.6),
    so a second one here would be a duplicate source of truth over the same
    `next-themes` state.
  - No data group: CSV export belongs to `/applications`, whose toolbar already
    carries `Import CSV` and `Export CSV`. Settings duplicated the export and
    nothing else, so the group had no reason to exist. Do not reintroduce an
    export control here — 5.4 owns it.
  - **A `preferences` group was added 2026-08-25** holding one row, `default
    currency`: a six-segment control over PHP, USD, EUR, GBP, SGD, AUD, matching
    the `jobs_salary_currency_check` constraint in M1 Task 2. PHP is active.
    **This needs storage that does not exist — see 1.10.**

- 5.7 Mobile: bottom nav, stacked tables, no kanban below 768px
  - The Theme Toggle in the mobile Top Bar is **32x32, below the 44x44 minimum
    touch target**. Keep the 32px visual box but give it a 44px hit area in
    code; do not enlarge the drawn button. `ui-ux-pro-max` covers this.

**Exit:** all six routes match their Figma frames in both themes.

### M6 — Public surface *(frontend)*
What a reviewer sees first.

- 6.1 Landing page — hero with poster/video, carousel of real screens, ATS section, footer
  - Carousel is **skiper51** (`Creative carousel 002`, free), named in the Figma
    frames `Section / Carousel (skiper51)`. Export is `Carousel_005`; the file is
    `skiper51`; the title says `002`. Three identifiers, none matching.
  - `pnpm dlx shadcn add @skiper-ui/skiper51` — pulls `swiper` + `framer-motion`.
  - **`autoplay` must default off.** An auto-advancing carousel with no pause
    control fails WCAG 2.2.2. If autoplay is wanted, ship a visible pause.
  - Swiper ships its own CSS and DOM (`.swiper-slide`, `.swiper-pagination`) and
    the vendor's own guidance is `!important` overrides. Budget a task for
    reconciling it with the M4 tokens, and kill the creative effect's default
    `shadow: true` — this system is flat with hairline rules.
  - **Add a Theme Toggle to the homepage.** The landing page is drawn in both
    themes (`Desktop / Landing Page` and its Dark twin, same for mobile) but no
    frame contains a toggle, so a visitor has no way to switch. Place it in
    `Sticky Navbar (reveals after hero)`; since that navbar is hidden until the
    hero scrolls past, repeat it in `Footer Links` so the control is reachable
    from the top of the page.
  - Use the M4 4.4 Theme Toggle primitive — skiper4's button driven by 4.6's
    `useThemeToggle()`. It is the same control the app shell mounts, not a
    landing-specific one.
- 6.2 Auth layout — split panel, `/login` and `/signup`, smooth-caret inputs
  - Smooth-caret input is **skiper106** (`Smooth caret input`, free).
    `pnpm dlx shadcn add @skiper-ui/skiper106` — pulls `dialkit` + `framer-motion`.
  - **Name collision:** skiper106 exports `Input` *and* `SmoothInput`. M4 4.4
    builds its own `Input` from the Figma Input Field component. Take only
    `SmoothInput`, alias it, and keep the M4 primitive as the single `Input`.
  - skiper106 hides the native caret and redraws it with Framer Motion. Verify
    against the four Figma Input states and run it through `ui-ux-pro-max`
    before committing — a hidden system caret is an accessibility risk.
  - **Figma has no Sign Up frame.** Only `Desktop / Auth — Sign In` exists, in
    both themes. Design `/signup` or drop it from this task.
- 6.3 Custom 404 with recovery links; privacy policy page
- 6.4 Demo mode — seeded read-only account, banner, write controls disabled
- 6.5 README rewrite with live link and screenshots
  - **Must credit Skiper UI.** Both components are free-tier, and the licence
    reads: "Free to use and modify in both personal and commercial projects.
    Attribution to Skiper UI is required when using the free version." Credit in
    the README and the landing footer. Carousel illustrations are by AarzooAly;
    the carousel itself is Swiper.js.

**Exit:** a stranger can open the demo and understand the product without an account.

### M7 — Intelligence *(optional)*
- 7.1 AI CV tailoring against the stored job description
- 7.2 Grammar check via LanguageTool in the editor
- 7.3 Cover letter builder reusing the CV stack
- 7.4 MCP server exposing the tracker to Claude

---

---

## Third-party components — Skiper UI

Registry: https://skiper-ui.com/components — 106 components, 37 free, installed
through the shadcn CLI (`pnpm dlx shadcn add @skiper-ui/<id>`). Free tier
**requires attribution**; Pro does not. Verified 2026-08-25.

Attribution attaches to what ships, not to what is read. All four adopted
components — `skiper4`, `skiper26`, `skiper51`, `skiper106` — must credit
Skiper UI. Components marked **reference only** are studied and reimplemented
against our own tokens, and carry no obligation: the same line already drawn
around CVJunction.

Upstreams get credited too: `skiper4` is adapted from toggles.dev by Alfie
Jones, `skiper26` from `rudrodip/theme-toggle-effect`, and `skiper51` uses
Swiper.js with illustrations by AarzooAly.

**These install as source, not as packages.** The Skiper registry is a shadcn
registry: the CLI copies files into `@/components/v1/<id>`, so vendor imports
are editable in-tree. That is how the `lucide-react` conflict below gets
resolved rather than tolerated.

**`framer-motion` is now a committed dependency and it arrives at M4**, not M6 —
skiper4 and skiper26 both need it. That settles the earlier open question: it is
the motion library, sitting alongside 4.6's IntersectionObserver gating and the
View Transition wipe rather than competing with them. Confirm every adopted
component honours `prefers-reduced-motion` before it ships.

**Prerequisite: shadcn is not initialised.** There is no `components.json` in
the repo. Run `shadcn init` before the first `shadcn add`, after M3 has
established the Next.js app and Tailwind v4. Nothing here installs onto the
current Vite + Tailwind v3.4 setup.

**Adopted** — `skiper51` and `skiper106` are named in the Figma frames;
`skiper4` and `skiper26` are not, and were chosen after the file was built.

| ID | Name | Tier | Lands in | Deps |
|---|---|---|---|---|
| `skiper51` | Creative carousel 002 | Free | 6.1 landing carousel | swiper, framer-motion |
| `skiper106` | Smooth caret input | Free | 6.2 auth inputs | dialkit, framer-motion |
| `skiper4` | Theme toggle buttons | Free | 4.4 Theme Toggle button | framer-motion, clsx |
| `skiper26` | Theme toggle btn | Free | 4.6 theme transition, **all pages** | framer-motion, next-themes, **lucide-react** |

**Free candidates — evaluate, do not assume**

| ID | Name | Would serve |
|---|---|---|
| `skiper67` | Video player 001 | 6.1 hero. Figma has `Hero (background video)` desktop and `Hero (poster only)` mobile — this is the shape |
| `skiper3` | Apple play button | 6.1 hero play control, pairs with `skiper67` |
| `skiper37` | Animated number | 5.3 KPI strip count-up. Must respect reduced-motion |
| `skiper87` | Scroll with fade effect | 4.6 mount-gating — this is the IntersectionObserver pattern the plan describes |
| `skiper41` | Progressive Blur | 6.1 `Sticky Navbar (reveals after hero)`, already a Figma frame |
| `skiper89` | Scroll progress 001 | 6.1 landing |
| `skiper101` | Custom tooltip | 5.6 analytics |
| `skiper62` | Loop animation hook | 4.6 utility |
| `skiper65` / `skiper102` | Breakpoint indicator, Debug panel | 5.7 mobile work — dev only, never shipped |

**Premium — costs money, listed so the choice is deliberate**

| ID | Name | Would serve |
|---|---|---|
| `skiper5` | Things drag and scroll | 5.4 kanban drag — the most relevant paid component on the site |
| `skiper96` | Expandable tabs navigation | 5.4 mobile status tabs |
| `skiper74` | Timeline calendar | 5.6 `/calendar` |
| `skiper69` | Skiper Number flow | 5.3 KPI, stronger than `skiper37` |
| `skiper92` | Vercel Command Search | command palette, not currently scoped |

**Rejected — these fight the design system**

Squircles (`skiper63`) break the 4px radius cap. Gooey and gradient effects
(`skiper64`, `skiper86`, `skiper90`) are not Swiss. Spectacle heroes
(`skiper12`, `skiper14`, `skiper36`, `skiper39`) fight the restraint the whole
system is built on. Cursor gimmicks (`skiper18`, `skiper59`, `skiper61`) are
desktop-only and pointer-dependent. Preloaders (`skiper7`-`skiper11`,
`skiper15`) are unnecessary under RSC streaming. The web3 set is irrelevant.

## Dependency graph

```
M1 ──> M2 ──> M3 ──> M4 ──> M5 ──> M6 ──> M7
 │              │
 └── 1.1 gates 2.4, 2.5, 7.1
 └── 1.7 gates 2.5, 2.6, 5.5
 └── 1.8 gates 6.4
```

## Explicitly out of scope

- LinkedIn / Jobstreet connectors — no public API, active blocking, ToS conflict
- Email parsing of application confirmations
- A second dashboard
- CVJunction code — no LICENSE; patterns only
