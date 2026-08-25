# M5 — Application Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every authenticated screen against the M4 design system, so the app surface matches its Figma frames in both themes and no screen contains styling of its own.

**Architecture:** The four oversized screen files are not refactored — they are replaced. Each route becomes a thin server-or-client page that composes M4 composites and route-local sections, with data access staying in the M2 services that already exist. Mobile is built into each screen as it is written rather than bolted on in a later pass, because a responsive break discovered after the fact usually means the desktop markup was wrong.

**Tech Stack:** Next 15 App Router, React 19, Tailwind v4, framer-motion, `@dnd-kit` (already installed, kanban), Recharts (already installed, analytics), Vitest.

**Spec:** `docs/superpowers/plans/2026-08-23-worktrack-roadmap.md` — milestone M5, items 5.1–5.7. Figma file `si641ecd9VS70DJPLvtPfo`. Icon gap decision: `docs/superpowers/notes/2026-08-25-icon-gap.md`.

## Global Constraints

- **`grep -rn "lucide-react" src` must return nothing when M5 is done.** This gate moved here from M4 4.3. It currently returns 13 files.
- **Accent is `#c2410c` (orange-700) light, `#fb923c` (orange-400) dark.** orange-500 fails WCAG AA on white at 2.80:1 and is never used for text.
- **Status colours are semantic only:** wishlist grey, applied blue, interviewing violet, offer green, rejected red. Orange is never a status.
- **No status pills.** Status is a 2px rule plus a label. ATS Check and the active nav item use the same vocabulary.
- **Radius caps at 4px.** Separation is hairline rules, not card borders or shadows.
- **Screens write no new component styling.** If a screen needs a visual that M4 does not provide, the component goes in `src/components/ui/` with a test, not inline in the page.
- **Font is Helvetica** with the stack `Helvetica, "Helvetica Neue", Arial, sans-serif`.
- **Desktop chrome buttons are 32x32; mobile chrome is 44x44 in a 64px top bar.** Deliberate, not an inconsistency.
- **One `prefers-reduced-motion` gate:** `usePrefersReducedMotion()` from `@/hooks/usePrefersReducedMotion`. Never a second check.
- **No kanban below 768px.** Mobile is a list with status tabs.
- **The suite must stay green at every commit.** Baseline is 384 unit tests plus 19 integration tests.
- **Supabase project is `somyuulytwgzltiboewm`.** Never `zlqepevzcfnnygaorvxn`.
- **Do not commit `.env`.** `vercel link` and `vercel env pull` both append `.env*` to `.gitignore`, which hides `.env.example`; check `git check-ignore .env.example` returns nothing after running either.

## Current state this plan starts from

Verified 2026-08-25 by reading the files, not assumed:

| Thing | State | Consequence |
|---|---|---|
| `src/screens/DashboardPage.tsx` | 829 lines | replaced in Task 3 |
| `src/screens/JobsPage.tsx` | 789 lines | replaced in Task 4 |
| `src/components/jobs/JobForm.tsx` | 824 lines | replaced in Task 4 |
| `src/screens/ResumePage.tsx` | 670 lines | replaced in Task 7 |
| Routes that exist | `/dashboard`, `/jobs`, `/cv`, `/login`, `/gallery` | `/applications`, `/applications/[id]`, `/calendar`, `/documents`, `/analytics`, `/settings` are all new |
| `src/components/Layout.tsx` | 241 lines, three nav items, lucide icons | replaced in Task 2 |
| `lucide-react` | installed, 13 import sites | removed in Task 10 |
| Icon set | 26 icons, generated from `scripts/icon-source.json` | goes to 34 in Task 1 |
| M2 services | all present and tested | screens call these; no new data layer |
| `user_preferences` table + service | migration `20260825041855`, `src/services/userPreferences.ts` | Task 9's currency row is unblocked |

## Decisions locked before execution

**The icon gap is closed first, by the hybrid route.** Gabe chose this on 2026-08-25. Eight icons that carry meaning get drawn into Figma (26 → 34); four are eliminated rather than drawn — `Loader2` becomes a CSS spinner with no glyph, and `Save`, `LogOut` and `Sparkles` become text buttons. Doing this first means no screen is written twice.

**Screens are replaced, not refactored.** 5.1 says "break up" the four large files, and the tempting reading is a mechanical extraction. That would carry the old markup — indigo `primary-*` tokens, rounded-xl cards, drop shadows — into the new system and leave a second visual language in place. Each task deletes its screen and writes the route fresh against M4.

**Mobile ships inside each screen's task.** The roadmap lists 5.7 as its own item, but a screen whose responsive behaviour is deferred gets built desktop-first and then bent. Each task's tests cover both widths.

**`/jobs` becomes `/applications`.** The roadmap names `/applications` in 5.4 and 5.5. The old path gets a permanent redirect in Task 2 rather than being dropped, because it is a live deployed URL.

**Lucide removal is its own task, last.** It is a one-line uninstall plus a build; splitting it out means the gate is a reviewable event rather than something buried in the diff of whichever screen happened to hold the final import.

---

### Task 1: Close the icon gap

**Files:**
- Modify: `scripts/icon-source.json`, `src/components/icons/index.tsx` (generated)
- Create: `src/components/ui/spinner.tsx`, `src/components/ui/__tests__/spinner.test.tsx`
- Modify: `src/components/icons/__tests__/icons.test.tsx`
- Modify: `docs/superpowers/notes/2026-08-25-icon-gap.md`

**Interfaces:**
- Consumes: the existing generator `scripts/generate-icons.mjs` and Figma set `103:2066`.
- Produces: 34 icons exported from `@/components/icons` — the existing 26 plus `AlertCircleIcon`, `BriefcaseIcon`, `ChevronDownIcon`, `GripVerticalIcon`, `TrashIcon`, `UserIcon`, `TargetIcon`, `RotateCcwIcon`, with matching unsuffixed keys on the `icons` map (`AlertCircle`, `Briefcase`, `ChevronDown`, `GripVertical`, `Trash`, `User`, `Target`, `RotateCcw`). Plus `<Spinner size?: number />` from `@/components/ui/spinner`.

- [ ] **Step 1: Draw the eight icons into the Figma set**

REQUIRED SUB-SKILL: load `figma:figma-use` before any `use_figma` call.

Draw into set `103:2066` in file `si641ecd9VS70DJPLvtPfo`, matching the existing
26: 20x20 frame, 1.5px stroke, `strokeAlign` INSIDE, no fill, round caps and
joins.

| Name | Geometry |
|---|---|
| `Icon=AlertCircle` | circle cx10 cy10 r7.25; vertical line x10 y6→y10.5; dot x10 y13.5 |
| `Icon=Briefcase` | rect x3 y6.5 w14 h10 r1; handle path x7.5 y6.5 v-1.5 h5 v1.5 |
| `Icon=ChevronDown` | polyline 5.5,8 → 10,12.5 → 14.5,8 |
| `Icon=GripVertical` | six dots r0.9 at x8/x12, y5.5/y10/y14.5 |
| `Icon=Trash` | lid line x3.5→x16.5 y5.5; body path x5.5 y5.5 v10 h9 v-10; handle x8 y5.5 v-2 h4 v2 |
| `Icon=User` | circle cx10 cy7 r3.25; shoulders path x4 y16.5 a6 6 0 0 1 12 0 |
| `Icon=Target` | circles cx10 cy10 r7.25 and r3.25; dot r0.9 |
| `Icon=RotateCcw` | arc path x3.5 y10 a6.5 6.5 0 1 0 2.2-4.9; arrow polyline 3.5,3 → 3.5,7 → 7.5,7 |

Note the constraint bug that bit Sun, Search and Clock: set every child's
`constraints` to `{horizontal: 'SCALE', vertical: 'SCALE'}`. `MIN/MIN` is what
made those three drift off-centre when the frame was scaled.

- [ ] **Step 2: Have Gabe review the eight drawings**

Screenshot the set and stop for approval before generating. Per the roadmap's
Execution Protocol, design changes are approved before they are consumed.

Run: `get_screenshot` on node `103:2066`
Expected: 34 icons, visually consistent stroke weight with the original 26.

- [ ] **Step 3: Re-export the geometry and regenerate**

Export all 34 to `scripts/icon-source.json` using the same read the original
export used, then:

Run: `node scripts/generate-icons.mjs`
Expected: `src/components/icons/index.tsx` now exports 34 components.

- [ ] **Step 4: Extend the icon test to the new count and concentricity**

```tsx
it('exports every icon in the Figma set', () => {
  expect(Object.keys(icons)).toHaveLength(34)
})

it('keeps concentric rings concentric', () => {
  // Sun, Search and Clock drifted off-centre in Figma under MIN constraints.
  // Target is the new icon with the same two-ring construction.
  for (const name of ['Sun', 'Clock', 'Target'] as const) {
    const { container, unmount } = render(React.createElement(icons[name]))
    for (const circle of container.querySelectorAll('circle')) {
      expect(circle.getAttribute('cx')).toBe('10')
      expect(circle.getAttribute('cy')).toBe('10')
    }
    unmount()
  }
})
```

- [ ] **Step 5: Run the icon tests**

Run: `npx vitest run src/components/icons`
Expected: PASS.

- [ ] **Step 6: Write the failing test for the Spinner**

`Loader2` is eliminated rather than drawn — a pending state is motion, and a
glyph that only exists to be rotated is a glyph that does not need to exist.

```tsx
import { render } from '@testing-library/react'
import { Spinner } from '../spinner'

it('renders a spinner with no glyph', () => {
  const { container } = render(<Spinner />)
  expect(container.querySelector('svg')).toBeNull()
  expect(container.firstElementChild!.className).toContain('animate-spin')
})

it('announces itself to a screen reader', () => {
  const { container } = render(<Spinner />)
  expect(container.firstElementChild!.getAttribute('role')).toBe('status')
  expect(container.textContent).toContain('Loading')
})
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `npx vitest run src/components/ui/__tests__/spinner.test.tsx`
Expected: FAIL, "Failed to resolve import ../spinner".

- [ ] **Step 8: Implement the Spinner**

```tsx
import { cn } from '@/lib/utils'

/**
 * A pending state with no glyph.
 *
 * Lucide's Loader2 existed only to be rotated, so it was a drawing that carried
 * no information a bordered circle does not. The visible label is screen-reader
 * only: sighted users read the motion, and a spinner captioned "Loading" beside
 * a button that already says "Saving" is a duplicate.
 */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent align-middle',
        className
      )}
    >
      <span className="sr-only">Loading</span>
    </span>
  )
}
```

- [ ] **Step 9: Run the spinner tests**

Run: `npx vitest run src/components/ui/__tests__/spinner.test.tsx`
Expected: PASS.

- [ ] **Step 10: Record the resolution in the gap note**

Replace the "Decision needed before M5" section with what was actually done:
eight drawn (set 26 → 34), four eliminated (`Loader2` → `Spinner`, and `Save`,
`LogOut`, `Sparkles` → text buttons in Tasks 4, 2 and 3 respectively). Keep the
mapped/missing tables as the historical record.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: close the icon gap and add the glyph-free spinner"
```

---

### Task 2: The app shell

**Files:**
- Create: `src/components/shell/AppShell.tsx`, `src/components/shell/TopBar.tsx`, `src/components/shell/BottomNav.tsx`
- Create: `src/components/shell/__tests__/shell.test.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/components/Layout.tsx`, `src/components/__tests__/Layout.test.tsx`
- Create: `src/app/(app)/applications/page.tsx` (placeholder, filled in Task 4)
- Modify: `next.config.ts` (redirect `/jobs` → `/applications`)

**Interfaces:**
- Consumes: `Sidebar`, `NavItem`, `NAV` from `@/components/ui/sidebar` and `@/components/ui/nav-item`; `ThemeToggle` from `@/components/ui/theme-toggle`.
- Produces: `<AppShell>{children}</AppShell>`, which every authenticated route renders inside. Route-level pages render only their own body.

- [ ] **Step 1: Write the failing shell tests**

```tsx
import { render, screen } from '@testing-library/react'
import { AppShell } from '../AppShell'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))

it('gives the mobile top bar 44px controls in a 64px bar', () => {
  const { container } = render(<AppShell><p>body</p></AppShell>)
  const bar = container.querySelector('[data-top-bar]')!
  expect(bar.className).toContain('h-16')            // 64px
  for (const b of bar.querySelectorAll('button, a')) {
    expect(b.className).toMatch(/h-11/)               // 44px
  }
})

it('carries theme toggle then settings, in that order', () => {
  const { container } = render(<AppShell><p>body</p></AppShell>)
  const bar = container.querySelector('[data-top-bar]')!
  const controls = [...bar.querySelectorAll('[data-theme-toggle], [data-settings-link]')]
  expect(controls[0].hasAttribute('data-theme-toggle')).toBe(true)
  expect(controls[1].hasAttribute('data-settings-link')).toBe(true)
})

it('renders exactly five bottom-nav destinations, numbered 01-05 on desktop only', () => {
  const { container } = render(<AppShell><p>body</p></AppShell>)
  const nav = container.querySelector('[data-bottom-nav]')!
  const items = nav.querySelectorAll('[data-nav-item]')
  expect(items).toHaveLength(5)
  // The mobile bar drops the number; five-up at 375px has no room for both.
  expect(nav.querySelector('[data-nav-index]')).toBeNull()
})

it('has no active bottom-nav item on settings, which is chrome not a destination', () => {
  vi.mocked(usePathname).mockReturnValue('/settings')
  const { container } = render(<AppShell><p>body</p></AppShell>)
  const active = container.querySelectorAll('[data-bottom-nav] [data-active]')
  expect(active).toHaveLength(0)
  expect(container.querySelector('[data-settings-link][data-active]')).toBeTruthy()
})

it('highlights apps for a child route of applications', () => {
  vi.mocked(usePathname).mockReturnValue('/applications/abc-123')
  const { container } = render(<AppShell><p>body</p></AppShell>)
  const active = container.querySelectorAll('[data-bottom-nav] [data-active]')
  expect(active).toHaveLength(1)
  expect(active[0].getAttribute('href')).toBe('/applications')
})
```

- [ ] **Step 2: Run to confirm they fail**

Run: `npx vitest run src/components/shell`
Expected: FAIL, "Failed to resolve import ../AppShell".

- [ ] **Step 3: Write the active-route helper and its test**

Put it in `src/lib/activeNav.ts` so the sidebar and the bottom nav agree by
construction rather than by two similar conditionals.

```ts
/**
 * Which nav destination a path belongs to.
 *
 * A detail route is a child of its section, so /applications/abc highlights
 * /applications. /settings deliberately returns null: it left the nav when the
 * Top Bar gained its own settings button, so nothing in the bar is its parent.
 */
export function activeNavHref(pathname: string, hrefs: string[]): string | null {
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return null
  const matches = hrefs.filter((h) => pathname === h || pathname.startsWith(`${h}/`))
  // Longest wins, so /applications/x picks /applications over a hypothetical /.
  return matches.sort((a, b) => b.length - a.length)[0] ?? null
}
```

```ts
it('treats a detail route as a child of its section', () => {
  expect(activeNavHref('/applications/abc', ['/dashboard', '/applications'])).toBe('/applications')
})

it('highlights nothing on settings', () => {
  expect(activeNavHref('/settings', ['/dashboard', '/applications'])).toBeNull()
})

it('does not match a prefix that is not a path segment', () => {
  expect(activeNavHref('/applications-archive', ['/applications'])).toBeNull()
})
```

- [ ] **Step 4: Implement TopBar, BottomNav and AppShell**

```tsx
// TopBar.tsx -- mobile only. Logo, spacer, Theme Toggle, Settings.
// The bar is 64px because two 44px targets plus breathing room does not fit in
// the 55px it used to be. Body scroll absorbs the difference; the bottom nav
// does not move.
export function TopBar({ settingsActive }: { settingsActive: boolean }) {
  return (
    <header
      data-top-bar
      className="flex h-16 items-center gap-2 border-b border-border-subtle bg-bg-canvas px-3 md:hidden"
    >
      <span className="text-heading-m text-text-primary">Worktrack</span>
      <div className="flex-1" />
      <ThemeToggle size={44} />
      <Link
        href="/settings"
        data-settings-link
        data-active={settingsActive ? '' : undefined}
        aria-label="Settings"
        aria-current={settingsActive ? 'page' : undefined}
        className={cn(
          'grid h-11 w-11 place-items-center rounded-md',
          settingsActive ? 'text-accent-default' : 'text-text-secondary hover:text-text-primary'
        )}
      >
        <SettingsIcon size={18} />
      </Link>
    </header>
  )
}
```

```tsx
// AppShell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const active = activeNavHref(pathname, NAV.map((n) => n.href))
  const settingsActive = pathname.startsWith('/settings')

  return (
    <div className="flex min-h-screen bg-bg-canvas">
      <Sidebar pathname={pathname} className="hidden md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar settingsActive={settingsActive} />
        {/* pb-20 clears the fixed bottom nav; without it the last row of every
            list sits under it and looks like the page is cut off. */}
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        <BottomNav activeHref={active} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the shell tests**

Run: `npx vitest run src/components/shell src/lib/__tests__/activeNav.test.ts`
Expected: PASS.

- [ ] **Step 6: Swap the shell in and delete the old Layout**

`src/app/(app)/layout.tsx` renders `<AppShell>` instead of `<Layout>`. Delete
`src/components/Layout.tsx` and its test — the sign-out behaviour those three
tests covered moves to the Sidebar, so add it there:

```tsx
it('signs out and does not leave the button clickable while it works', async () => {
  render(<Sidebar pathname="/dashboard" />)
  const button = screen.getByRole('button', { name: 'Sign out' })
  fireEvent.click(button)
  expect(button).toHaveProperty('disabled', true)
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
})
```

Sign out is a text button, not an icon — `LogOut` is one of the four glyphs
Task 1 eliminated.

- [ ] **Step 7: Redirect `/jobs` to `/applications`**

```ts
// next.config.ts
async redirects() {
  return [{ source: '/jobs', destination: '/applications', permanent: true }]
}
```

Create `src/app/(app)/applications/page.tsx` returning a heading only; Task 4
fills it. Without it the redirect lands on a 404 and the suite cannot go green.

- [ ] **Step 8: Verify and commit**

Run: `npx vitest run && npm run build`
Expected: green, and `/applications` appears in the route table.

```bash
git add -A
git commit -m "feat: replace the app shell with the design system chrome"
```

---

### Task 3: Dashboard

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx` (replaces the existing one), `src/components/dashboard/FollowUpNudge.tsx`, `src/components/dashboard/KpiStrip.tsx`, `src/components/dashboard/DashboardBlocks.tsx`
- Create: `src/components/dashboard/__tests__/dashboard.test.tsx`
- Delete: `src/screens/DashboardPage.tsx`

**Interfaces:**
- Consumes: `KpiStat` from `@/components/ui/kpi-stat`, `ApplicationRow`, `getStaleApplications(candidates, days, now?)` from `@/services/followUp`, `jobService.getJobs()`.
- Produces: nothing later tasks import. This is a leaf route.

- [ ] **Step 1: Write the failing dashboard tests**

```tsx
it('puts the follow-up nudge above the KPI strip', () => {
  // The nudge is the only thing on this page that asks for an action today.
  // Below the fold it is a notification nobody reads.
  const { container } = render(<Dashboard jobs={STALE_FIXTURE} />)
  const nudge = container.querySelector('[data-follow-up]')!
  const kpis = container.querySelector('[data-kpi-strip]')!
  expect(nudge.compareDocumentPosition(kpis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

it('hides the nudge entirely when nothing is stale', () => {
  // An empty "nothing to chase" card trains the eye to skip the slot.
  const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
  expect(container.querySelector('[data-follow-up]')).toBeNull()
})

it('renders six blocks, each linking out to its own route', () => {
  const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
  const blocks = container.querySelectorAll('[data-dashboard-block]')
  expect(blocks).toHaveLength(6)
  for (const b of blocks) expect(b.querySelector('a[href]')).toBeTruthy()
})

it('shows KPI values with tabular figures', () => {
  const { container } = render(<Dashboard jobs={FRESH_FIXTURE} />)
  for (const v of container.querySelectorAll('[data-kpi-value]')) {
    expect(v.className).toContain('tabular')
  }
})
```

- [ ] **Step 2: Run to confirm they fail**

Run: `npx vitest run src/components/dashboard`
Expected: FAIL.

- [ ] **Step 3: Build the follow-up nudge**

```tsx
/**
 * The one thing on the dashboard that asks for an action today.
 *
 * Renders nothing when nothing is stale. An "all caught up" card looks like
 * content, so the eye learns to skip that slot and then skips it on the day it
 * matters. Absence is the stronger signal.
 *
 * The rule is neutral, not a status colour: "needs chasing" is a property of
 * your attention, not of the application's status, and the five status hues
 * are spoken for.
 */
export function FollowUpNudge({ stale }: { stale: StaleCandidate[] }) {
  if (stale.length === 0) return null
  return (
    <section data-follow-up className="border-l-2 border-border-strong pl-4">
      <h2 className="text-label-caps uppercase text-text-muted">Needs a follow-up</h2>
      ...
    </section>
  )
}
```

- [ ] **Step 4: Build the KPI strip and the six blocks**

Six blocks, each a heading, a summary and a link out: recent applications,
upcoming events, documents, ATS snapshot, pipeline, sources. The dashboard
aggregates and links; it does not become a second copy of each screen.

- [ ] **Step 5: Wire the page and delete the old screen**

Delete `src/screens/DashboardPage.tsx`. Its lucide imports (`Briefcase`,
`Target`, `Sparkles`) go with it — `Briefcase` and `Target` are now in the
custom set, and `Sparkles` was decoration on a heading.

- [ ] **Step 6: Run and commit**

Run: `npx vitest run && npm run build`
Expected: green.

```bash
git add -A
git commit -m "feat: rebuild the dashboard as an aggregator"
```

---

### Task 4: Applications list and form

**Files:**
- Create: `src/app/(app)/applications/page.tsx` (fills Task 2's placeholder), `src/components/applications/ApplicationsToolbar.tsx`, `src/components/applications/StatusTabs.tsx`, `src/components/applications/ApplicationsList.tsx`, `src/components/applications/KanbanView.tsx`, `src/components/applications/ApplicationForm.tsx`
- Create: `src/components/applications/__tests__/applications.test.tsx`
- Delete: `src/screens/JobsPage.tsx`, `src/components/jobs/JobForm.tsx`, `src/components/jobs/JobCard.tsx`, `src/components/jobs/KanbanBoard.tsx` and their tests

**Interfaces:**
- Consumes: `JobCard`, `KanbanColumn`, `ApplicationRow`, `StatusMarker`, `Button`, `Input`, `Spinner`; `jobService`; `SUPPORTED_CURRENCIES` and `resolveDefaultCurrency(prefs)` from `@/services/userPreferences`.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing tests**

```tsx
it('shows a kanban at desktop width and never below 768px', () => {
  // Five columns at 375px is 75px each -- narrower than the card's own padding.
  const { container } = render(<ApplicationsPage jobs={JOBS} />)
  expect(container.querySelector('[data-kanban]')!.className).toContain('hidden md:grid')
  expect(container.querySelector('[data-list]')!.className).toContain('md:hidden')
})

it('filters the mobile list by the selected status tab', () => {
  render(<ApplicationsPage jobs={JOBS} />)
  fireEvent.click(screen.getByRole('tab', { name: /interviewing/i }))
  const rows = screen.getAllByTestId('application-row')
  expect(rows).toHaveLength(JOBS.filter((j) => j.status === 'interviewing').length)
})

it('marks the selected tab for a screen reader, not just visually', () => {
  render(<ApplicationsPage jobs={JOBS} />)
  const tab = screen.getByRole('tab', { name: /interviewing/i })
  fireEvent.click(tab)
  expect(tab.getAttribute('aria-selected')).toBe('true')
})

it('starts a new application in the stored default currency', () => {
  // A PHP user typing a peso figure into a form defaulted to USD produces a
  // number that is wrong by a factor of 55 and looks plausible.
  render(<ApplicationForm defaultCurrency="PHP" />)
  expect((screen.getByLabelText('Currency') as HTMLSelectElement).value).toBe('PHP')
})

it('disables submit and shows a spinner while saving', () => {
  render(<ApplicationForm defaultCurrency="PHP" saving />)
  const submit = screen.getByRole('button', { name: /saving/i })
  expect(submit).toHaveProperty('disabled', true)
  expect(submit.querySelector('[role="status"]')).toBeTruthy()
})
```

- [ ] **Step 2: Run to confirm they fail**

Run: `npx vitest run src/components/applications`
Expected: FAIL.

- [ ] **Step 3: Build the toolbar, tabs, list and kanban**

Toolbar carries `Add`, `Import CSV`, `Export CSV`. Per the roadmap's own note,
`Add` moves into the body header beside the page title rather than the Top Bar,
matching Documents' `+ new cv` — that was flagged as the remaining
inconsistency and this is where it gets fixed.

Kanban keeps `@dnd-kit`. The drag handle uses `GripVerticalIcon` from Task 1.

- [ ] **Step 4: Build the form**

Replaces `JobForm` (824 lines). Same fields, same `JobFormData` shape, same
`jobValidation` — this is a re-skin plus a decomposition, not a behaviour
change. `Save` is a text button, not an icon.

- [ ] **Step 5: Run and commit**

Run: `npx vitest run && npm run build`
Expected: green.

```bash
git add -A
git commit -m "feat: rebuild the applications list, kanban and form"
```

---

### Task 5: Application detail

**Files:**
- Create: `src/app/(app)/applications/[id]/page.tsx`, `src/components/applications/detail/{JobDescription,ActivityTimeline,LinkedCv,AtsPanel,NextEvent}.tsx`
- Create: `src/components/applications/detail/__tests__/detail.test.tsx`

**Interfaces:**
- Consumes: `jobService.getJob(id)`, `activityService`, `documentLinkService`, `eventService.listForJob(client, jobId)`, `matchKeywords(cvText, jobDescription)` from `@/services/atsMatch`, `AtsCheck`, `Breadcrumb`.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders the ATS result as a rule and a label, never a pill', () => {
  const { container } = render(<AtsPanel match={{ score: 72, matched: ['react'], missing: ['go'] }} />)
  const rule = container.querySelector('[data-status-rule]')!
  expect(rule.className).toContain('rounded-none')
})

it('names the missing keywords rather than only scoring', () => {
  // A bare 72% tells you nothing you can act on.
  render(<AtsPanel match={{ score: 72, matched: ['react'], missing: ['go', 'kubernetes'] }} />)
  expect(screen.getByText(/kubernetes/)).toBeTruthy()
})

it('shows the breadcrumb with the current page as text, not a link', () => {
  render(<DetailPage job={JOB} />)
  expect(screen.queryByRole('link', { name: JOB.role })).toBeNull()
})

it('says so plainly when there is no next event', () => {
  render(<NextEvent event={null} />)
  expect(screen.getByText(/nothing scheduled/i)).toBeTruthy()
})
```

- [ ] **Step 2: Run to confirm they fail, then build the five panels**

Run: `npx vitest run src/components/applications/detail`
Expected: FAIL, then PASS after implementation.

- [ ] **Step 3: Run and commit**

```bash
git add -A
git commit -m "feat: build the application detail route"
```

---

### Task 6: Calendar

**Files:**
- Create: `src/app/(app)/calendar/page.tsx`, `src/components/calendar/MonthGrid.tsx`, `src/components/calendar/WeekStrip.tsx`, `src/components/calendar/Agenda.tsx`
- Create: `src/lib/calendar.ts`, `src/lib/__tests__/calendar.test.ts`
- Create: `src/components/calendar/__tests__/calendar.test.tsx`

**Interfaces:**
- Consumes: `eventService.listUpcoming(client, fromIso)`.
- Produces: `buildMonthGrid(year, month)` returning `Date[][]` of six weeks, and `weekOf(date)` returning `Date[]` of seven — both pure, both in `src/lib/calendar.ts`.

- [ ] **Step 1: Write the failing date-maths tests**

Date maths is where calendars break, and it breaks at boundaries nobody clicks
during review.

```ts
it('always returns six weeks, so the grid never changes height month to month', () => {
  expect(buildMonthGrid(2026, 1)).toHaveLength(6)   // February, 28 days
  expect(buildMonthGrid(2026, 7)).toHaveLength(6)   // August, starts Saturday
})

it('pads with the neighbouring months rather than blanks', () => {
  const grid = buildMonthGrid(2026, 7)  // 1 Aug 2026 is a Saturday
  expect(grid[0][0].getMonth()).toBe(6) // July fills the leading cells
})

it('handles a leap February', () => {
  const days = buildMonthGrid(2024, 1).flat().filter((d) => d.getMonth() === 1)
  expect(days).toHaveLength(29)
})
```

- [ ] **Step 2: Run to confirm they fail, then implement `buildMonthGrid` and `weekOf`**

Run: `npx vitest run src/lib/__tests__/calendar.test.ts`
Expected: FAIL, then PASS.

- [ ] **Step 3: Write the failing responsive tests**

```tsx
it('is a month grid on desktop and a week strip plus agenda on mobile', () => {
  // 47px cells can show a dot but never an event, so mobile is a different
  // layout rather than a squeezed one.
  const { container } = render(<CalendarPage events={EVENTS} />)
  expect(container.querySelector('[data-month-grid]')!.className).toContain('hidden md:grid')
  expect(container.querySelector('[data-week-strip]')!.className).toContain('md:hidden')
})

it('marks today with a rule, not a filled chip', () => {
  const { container } = render(<CalendarPage events={EVENTS} />)
  const today = container.querySelector('[data-today]')!
  expect(today.className).toContain('rounded-none')
})

it('uses a neutral rule for events, never the status palette', () => {
  // An event kind is not an application status, and the five status hues mean
  // one specific thing everywhere else in the app.
  const { container } = render(<Agenda events={EVENTS} />)
  for (const row of container.querySelectorAll('[data-event-rule]')) {
    expect(row.className).not.toMatch(/status-(wishlist|applied|interviewing|offer|rejected)/)
  }
})
```

- [ ] **Step 4: Implement, run and commit**

Run: `npx vitest run src/components/calendar src/lib/__tests__/calendar.test.ts && npm run build`
Expected: green.

```bash
git add -A
git commit -m "feat: build the calendar with a mobile week strip and agenda"
```

---

### Task 7: Documents

**Files:**
- Create: `src/app/(app)/documents/page.tsx`, `src/components/documents/DocumentRow.tsx`, `src/components/documents/VersionHistory.tsx`
- Create: `src/components/documents/__tests__/documents.test.tsx`
- Delete: `src/screens/ResumePage.tsx`, `src/components/resume/ResumeVersionHistory.tsx`, `src/components/resume/TemplatePresetSelector.tsx`
- Modify: `src/app/(app)/cv/page.tsx` (keep the editor route, restyle its chrome)

**Interfaces:**
- Consumes: `resumeSnapshotService`, `resumeTemplateService`, `applicationDocuments`, `AtsCheck`.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing tests**

```tsx
it('lays out four columns on desktop and stacks on mobile', () => {
  // Desktop is Info, ATS Check, version, date across 1104px. At 335px the
  // marker, version and date drop onto their own line beneath the title.
  const { container } = render(<DocumentRow doc={DOC} />)
  expect(container.firstElementChild!.className).toMatch(/grid-cols-1 .*md:grid-cols-\[/)
})

it('separates rows with a hairline rule, not a card border', () => {
  const { container } = render(<DocumentRow doc={DOC} />)
  const row = container.firstElementChild as HTMLElement
  expect(row.className).toContain('border-b')
  expect(row.className).not.toMatch(/(^|\s)border(\s|$)/)
})

it('carries + new cv in the body header, matching Applications Add', () => {
  render(<DocumentsPage docs={[DOC]} />)
  const header = screen.getByRole('banner')
  expect(within(header).getByRole('link', { name: /new cv/i })).toBeTruthy()
})
```

- [ ] **Step 2: Run to confirm they fail, then implement**

Run: `npx vitest run src/components/documents`
Expected: FAIL, then PASS.

The `/cv` editor route stays — it is a distinct surface and the roadmap does not
fold it into `/documents`. Its lucide imports (`Save`, `RotateCcw`, `Download`)
resolve to a text button, `RotateCcwIcon` and `DownloadIcon`.

- [ ] **Step 3: Run and commit**

```bash
git add -A
git commit -m "feat: rebuild documents and restyle the cv editor chrome"
```

---

### Task 8: Analytics

**Files:**
- Create: `src/app/(app)/analytics/page.tsx`, `src/components/analytics/RangePicker.tsx`, `src/components/analytics/{FunnelChart,TimeInStage,SourceTrends,CohortTable}.tsx`
- Create: `src/components/analytics/__tests__/analytics.test.tsx`
- Delete: `src/components/dashboard/AnalyticsSections.tsx`, `src/components/dashboard/DashboardChartsTop.tsx`, `src/components/dashboard/DashboardChartsBottom.tsx`

**Interfaces:**
- Consumes: `analyticsService.getTimeInStageMetrics(userId)`, `.getConversionFunnel(userId)`, `.getSourceConversionTrends(userId)`, `.getCohortAnalysis(userId)`, `.getConversionMetrics(userId)`; Recharts.
- Produces: nothing later tasks import.

- [ ] **Step 1: Write the failing tests**

```tsx
it('puts the range picker in the body header beside the title, not the top bar', () => {
  // Content controls belong to the content. The Top Bar is chrome and is
  // identical on five of the seven app screens.
  const { container } = render(<AnalyticsPage data={DATA} />)
  const header = container.querySelector('[data-body-header]')!
  expect(header.querySelector('[data-range-picker]')).toBeTruthy()
  expect(container.querySelector('[data-top-bar] [data-range-picker]')).toBeNull()
})

it('colours funnel stages with the status palette, in pipeline order', () => {
  const { container } = render(<FunnelChart data={FUNNEL} />)
  const fills = [...container.querySelectorAll('[data-stage]')].map((s) => s.getAttribute('data-stage'))
  expect(fills).toEqual(['wishlist', 'applied', 'interviewing', 'offer', 'rejected'])
})

it('says there is nothing to chart rather than drawing an empty axis', () => {
  render(<AnalyticsPage data={EMPTY} />)
  expect(screen.getByText(/not enough data yet/i)).toBeTruthy()
})
```

- [ ] **Step 2: Run to confirm they fail, then implement**

Recharts needs explicit colours; read them from the CSS custom properties at
render rather than hardcoding hexes, or dark mode silently keeps the light
palette.

- [ ] **Step 3: Run and commit**

```bash
git add -A
git commit -m "feat: build the analytics route with the range picker in the body header"
```

---

### Task 9: Settings

**Files:**
- Create: `src/app/(app)/settings/page.tsx`, `src/components/settings/{AccountGroup,PreferencesGroup,DangerZone}.tsx`
- Create: `src/components/settings/__tests__/settings.test.tsx`
- Create: `src/services/userPreferencesService.ts`, `src/services/__tests__/userPreferencesService.test.ts`

**Interfaces:**
- Consumes: `SUPPORTED_CURRENCIES`, `resolveDefaultCurrency(prefs)`, `isSupportedCurrency(code)` from `@/services/userPreferences`.
- Produces: `userPreferencesService.get(client)` → `Promise<UserPreferences | null>` and `.setDefaultCurrency(client, code)` → `Promise<UserPreferences>`, following the M2 convention of taking the client as a parameter.

- [ ] **Step 1: Write the failing service tests**

The pure helpers exist; the read/write against the table does not.

```ts
it('creates the row on first write rather than requiring a signup hook', async () => {
  // The row is lazy: most users never change the default, so seeding one per
  // signup would be a table full of PHP.
  const client = fakeClient({ upsert: { user_id: 'u1', default_currency: 'USD' } })
  const prefs = await userPreferencesService.setDefaultCurrency(client, 'USD')
  expect(prefs.default_currency).toBe('USD')
})

it('refuses a currency outside the CHECK constraint before hitting the database', () => {
  expect(() => userPreferencesService.setDefaultCurrency(client, 'XYZ')).rejects.toThrow()
})
```

- [ ] **Step 2: Write the failing screen tests**

```tsx
it('has exactly three groups: account, preferences, danger zone', () => {
  render(<SettingsPage prefs={null} />)
  const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(headings).toEqual(['Account', 'Preferences', 'Danger zone'])
})

it('has no appearance group -- the theme lives in the app shell', () => {
  // A second control over the same next-themes state is a second source of
  // truth for one value.
  render(<SettingsPage prefs={null} />)
  expect(screen.queryByText(/appearance/i)).toBeNull()
  expect(screen.queryByRole('button', { name: /theme/i })).toBeNull()
})

it('has no export control -- applications owns CSV', () => {
  render(<SettingsPage prefs={null} />)
  expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
})

it('offers the six currencies from the CHECK constraint, PHP selected by default', () => {
  render(<SettingsPage prefs={null} />)
  const segments = screen.getAllByRole('radio')
  expect(segments.map((s) => s.getAttribute('value')))
    .toEqual(['PHP', 'USD', 'EUR', 'GBP', 'SGD', 'AUD'])
  expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('true')
})

it('keeps the danger zone last', () => {
  const { container } = render(<SettingsPage prefs={null} />)
  const groups = container.querySelectorAll('[data-settings-group]')
  expect(groups[groups.length - 1].getAttribute('data-settings-group')).toBe('danger')
})
```

- [ ] **Step 3: Run to confirm they fail, then implement**

The currency control is a six-segment radio group, not a `<select>`: six fixed
options is a case where seeing all of them beats hiding five.

- [ ] **Step 4: Run and commit**

```bash
git add -A
git commit -m "feat: build settings with account, preferences and danger zone"
```

---

### Task 10: Remove Lucide

**Files:**
- Modify: `package.json`
- Modify: `src/contexts/ToastContext.tsx` (the last non-screen import site)

**Interfaces:**
- Consumes: the full 34-icon set from Task 1 and `Spinner`.
- Produces: a build with one icon vocabulary.

- [ ] **Step 1: Find what is left**

Run: `grep -rn "lucide-react" src`
Expected: only `src/contexts/ToastContext.tsx`, since Tasks 2–9 deleted every
other import site. If anything else appears, it belongs to a screen that was
missed — fix it there, not here.

- [ ] **Step 2: Replace the toast icons**

`CheckCircle` → `CheckIcon`, `AlertCircle` → `AlertCircleIcon`, `X` → `CloseIcon`.

- [ ] **Step 3: Write the gate as a test**

A grep in a plan is a thing someone forgets. A test is a thing CI enforces.

```ts
import { execSync } from 'node:child_process'

it('has no lucide-react imports anywhere in src', () => {
  // The custom set is the single icon vocabulary. This gate moved here from
  // M4 4.3, where it could not be met because twelve icons did not exist yet.
  const hits = execSync('grep -rln "lucide-react" src || true', { encoding: 'utf8' }).trim()
  expect(hits).toBe('')
})

it('does not list lucide-react as a dependency', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(pkg.dependencies).not.toHaveProperty('lucide-react')
})
```

- [ ] **Step 4: Uninstall and verify**

Run: `npm uninstall lucide-react && npx vitest run && npm run build`
Expected: green. A build failure here means an import was missed.

- [ ] **Step 5: Update the roadmap and the gap note**

Mark the M4 constraint discharged in
`docs/superpowers/plans/2026-08-23-worktrack-roadmap.md` and close out
`docs/superpowers/notes/2026-08-25-icon-gap.md`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove lucide-react and enforce the single icon set"
```

---

## Self-Review

**Spec coverage:** 5.1 → Tasks 3, 4, 7 (all four oversized files deleted: `DashboardPage` 829, `JobsPage` 789 + `JobForm` 824, `ResumePage` 670). 5.2 → Task 2. 5.3 → Task 3. 5.4 → Task 4. 5.5 → Task 5. 5.6 → Tasks 6, 7, 8, 9. 5.7 → built into every screen task rather than deferred; the chrome half is Task 2. The `grep -r lucide` gate inherited from M4 → Task 10.

**Placeholders:** Task 1's icon geometry is given as a coordinate table rather than finished SVG, because the drawings do not exist yet and inventing path data would be fabricating a design. Step 2 gates them on Gabe's review before anything consumes them. Tasks 3–9 give test code literally and describe implementation at the component level; the alternative is transcribing roughly 3,000 lines of screen markup into a plan document, which would go stale the moment the first task ran.

**Type consistency:** `activeNavHref(pathname, hrefs)` is defined in Task 2 Step 3 and used in Task 2 Step 4. `buildMonthGrid(year, month)` and `weekOf(date)` are defined and used in Task 6. `userPreferencesService.get`/`.setDefaultCurrency` are defined in Task 9 and used only there. `Spinner` is defined in Task 1 and used in Task 4. The eight new icon names in Task 1's Produces block are the names Tasks 2–10 refer to. `StaleCandidate` and `getStaleApplications` are M2's, read from the source, not invented.

**Ordering constraints:** Task 1 precedes everything, because a screen written against a missing icon gets written twice. Task 2 precedes every screen, since they render inside the shell. Task 4 precedes Task 5, which links back to the list. Task 10 is last by construction — it cannot pass until every screen has stopped importing lucide.

**Counts:** baseline 384 unit plus 19 integration. Task 1 adds 4, Task 2 adds 8, Tasks 3–9 add 4–6 each, Task 10 adds 2. State the number each task adds at commit time rather than letting it drift.

**Carried-forward risks:** Recharts does not read CSS custom properties on its own, so Task 8 has to pass resolved colours or dark mode keeps the light palette — the same class of bug as M4's interpolated status classes. The `/jobs` redirect is a live URL change on a deployed app, so Task 2's build must be checked in the route table, not just locally. And Task 7 deletes `ResumePage` but not `src/screens/__tests__/ResumePage.test.ts`, which tests the export endpoint rather than the screen — decide there whether it moves beside the service it actually covers or goes with the screen, rather than leaving an orphan. Its hardcoded Supabase ref was already fixed in `e186db3`; it now points at `test.supabase.invalid`.
