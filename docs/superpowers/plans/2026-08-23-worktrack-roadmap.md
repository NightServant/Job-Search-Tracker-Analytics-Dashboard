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
- **Icons:** the custom 26-icon set from Figma. Never Lucide.
- **Radius caps at 4px.** Separation is hairline rules, not card borders.
- **Every migration is idempotent** and lands in `supabase/migrations/` with the
  version recorded remotely. `supabase migration list --linked` must show
  local == remote after every milestone.
- **TDD is mandatory.** No production code without a failing test first.
- **Currency:** salary values are Philippine pesos unless a currency column says
  otherwise. Never assume USD.

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
- 3.3 `VITE_*` → `NEXT_PUBLIC_*`; update `src/lib/supabase.ts`
- 3.4 Port routes: `/dashboard`, `/applications`, `/cv` as-is, no redesign
- 3.5 Port the 218 tests to the Next.js paths; all green
- 3.6 Deploy to Vercel; delete Vite config and the `gh-pages` scripts

**Exit:** feature parity with today's app, running on Vercel, tests green.

### M4 — Design system in code *(frontend)*
Translate the Figma system into code. No screens yet.

- 4.1 Tokens: the three Figma collections → CSS custom properties with light/dark
- 4.2 Type scale → Tailwind config; Helvetica Neue with a real fallback stack
- 4.3 Icon set: 26 SVGs as React components from the Figma vectors
- 4.4 Primitives: Button, Input, Status Marker, ATS Check, Breadcrumb, Theme Toggle
- 4.5 Composites: KPI Stat, Application Row, Job Card, Kanban Column, Nav Item, Sidebar
- 4.6 Motion: `IntersectionObserver` mount-gating, `prefers-reduced-motion`, View Transitions theme wipe

**Exit:** every component rendered in a Storybook-style route, light and dark, matching Figma.

### M5 — Application screens *(frontend)*
Rebuild the app surface against the design system.

- 5.1 Break up `DashboardPage` (827), `JobForm` (824), `JobsPage` (787), `ResumePage` (668)
- 5.2 Sidebar nav: six items, numbered, with icons
- 5.3 Dashboard as aggregator — KPI strip, follow-up nudge first, six blocks, links out
- 5.4 `/applications` — kanban desktop, list + status tabs on mobile
- 5.5 `/applications/[id]` — JD, activity, linked CV, ATS match, next event
- 5.6 `/calendar`, `/documents`, `/analytics`, `/settings`
- 5.7 Mobile: bottom nav, stacked tables, no kanban below 768px

**Exit:** all six routes match their Figma frames in both themes.

### M6 — Public surface *(frontend)*
What a reviewer sees first.

- 6.1 Landing page — hero with poster/video, carousel of real screens, ATS section, footer
- 6.2 Auth layout — split panel, `/login` and `/signup`, smooth-caret inputs
- 6.3 Custom 404 with recovery links; privacy policy page
- 6.4 Demo mode — seeded read-only account, banner, write controls disabled
- 6.5 README rewrite with live link and screenshots

**Exit:** a stranger can open the demo and understand the product without an account.

### M7 — Intelligence *(optional)*
- 7.1 AI CV tailoring against the stored job description
- 7.2 Grammar check via LanguageTool in the editor
- 7.3 Cover letter builder reusing the CV stack
- 7.4 MCP server exposing the tracker to Claude

---

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
