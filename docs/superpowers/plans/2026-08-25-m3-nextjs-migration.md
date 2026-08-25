# M3 — Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the running app from Vite + react-router onto Next.js App Router on Vercel, at feature parity, with no redesign.

**Architecture:** The Next.js app is built alongside the Vite app in the same repo and both build until the final task. Routes are ported one at a time so each is independently verifiable, and the Vite app stays as the working reference until the last route lands. Presentational components move unchanged; only routing, providers and env access are rewritten. `ThemeContext` is replaced by `next-themes` rather than ported, because M4's theme work depends on it.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 3.4 (v4 is M4's job, not this one), Vitest 2.1, Supabase JS 2, Vercel.

**Spec:** `docs/superpowers/plans/2026-08-23-worktrack-roadmap.md` — milestone M3, items 3.1-3.6.

## Global Constraints

- **Supabase project:** `somyuulytwgzltiboewm`. Never `zlqepevzcfnnygaorvxn`.
- **No redesign in M3.** Ported screens must look and behave as they do today. Visual work is M4-M6. A diff that changes appearance is out of scope and should be rejected in review.
- **Tailwind stays on 3.4.** The v4 CSS-first `@theme` migration is M4 4.1-4.2. Doing both at once makes a regression impossible to attribute.
- **The suite must stay green at every commit.** Baseline is 299 unit tests plus 4 integration tests. A task that reduces the count has deleted coverage and must say so explicitly.
- **`supabase db push` is blocked by the permission classifier in this environment.** Migrations go through the Supabase MCP `apply_migration`, and the local file is then named from the version the MCP recorded so `supabase migration list --linked` still shows `local == remote`. M3 adds no migrations, but the rule holds if one becomes necessary.
- **Integration tests hit the real project.** They sign in with the anon key so RLS applies. Never the service role.
- **Do not commit `.env`.** It holds live credentials and is gitignored; verify with `git check-ignore -v .env` before any commit that touches env handling.

## Decisions locked before execution

**React 19 comes with Next.js 15.** App Router on Next 15 expects React 19, so this migration carries a React major upgrade whether or not it is wanted. That is the single largest risk in M3, which is why Task 1 audits dependency compatibility *before* anything is scaffolded rather than discovering it during a route port. If the audit finds a blocker with no workaround, Next.js 14 with React 18 is the fallback and the plan is revised rather than forced.

**`ThemeContext` is deleted, not ported.** `next-themes` owns localStorage, system preference and the `light`/`dark` class on `<html>` — exactly what `src/contexts/ThemeContext.tsx` owns today. Keeping both would leave two sources of truth for one piece of state, and M4's `useThemeToggle` requires `next-themes` regardless.

**The route is `/jobs`, not `/applications`.** The roadmap's 3.4 says "`/applications`", but `src/App.tsx:90` routes `jobs`. This plan ports the existing path unchanged and leaves any rename to M5, where the URL is a design decision rather than a migration one.

---

## File Structure

**Created**
- `next.config.ts` — Next config; minimal, no custom webpack
- `app/layout.tsx` — root layout, `<html suppressHydrationWarning>`, providers
- `app/providers.tsx` — client component wrapping Auth/Toast/Query/next-themes
- `app/(auth)/login/page.tsx` — public route
- `app/(app)/layout.tsx` — protected shell, redirects unauthenticated users
- `app/(app)/dashboard/page.tsx`, `app/(app)/jobs/page.tsx`, `app/(app)/cv/page.tsx`
- `src/lib/env.ts` — single place that reads env, so the `VITE_` → `NEXT_PUBLIC_` swap happens once
- `vitest.config.ts` is modified, not replaced

**Modified**
- `src/lib/supabase.ts` — reads from `src/lib/env.ts` instead of `import.meta.env`
- `package.json` — scripts, dependencies
- `tailwind.config.js` — content globs gain `./app/**/*`

**Deleted in Task 7 only**
- `src/App.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts`, `src/contexts/ThemeContext.tsx`
- `scripts/create-gh-pages-404.cjs` and the `build:gh-pages` / `predeploy` / `deploy` scripts

**Untouched throughout:** `src/services/**`, `src/lib/jobCsv.ts`, `src/hooks/**`, `src/components/**` except for `'use client'` directives. Those carry M1 and M2's work and have no framework coupling.

---

### Task 1: Dependency compatibility audit

**Files:**
- Create: `docs/superpowers/notes/2026-08-25-react19-audit.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a go/no-go on React 19, which Task 2 depends on.

Nothing is installed in this task. It exists because discovering that a dependency
cannot run on React 19 *after* scaffolding means unpicking the scaffold.

- [ ] **Step 1: List every React-coupled dependency and its React 19 support**

Run: `npm ls react react-dom --depth=0` then check each of these against its changelog or npm page:

| Package | Current | What to confirm |
|---|---|---|
| `@tiptap/react` | ^3.22.5 | React 19 peer support |
| `@tanstack/react-query` | ^5.51.0 | v5 supports React 19 from 5.60 |
| `@sentry/react` | ^10.51.0 | React 19 support |
| `@testing-library/react` | ^16.0.1 | v16 is the React 19 line |
| `lucide-react` | ^0.400.0 | removed in M4 4.3; only needs to not break the build |
| `react-router-dom` | ^6.24.0 | removed in Task 7; must survive until then |

- [ ] **Step 2: Write the audit note**

Record for each: the version that supports React 19, whether an upgrade is needed,
and the fallback if none exists. State the verdict in the first line so a reader
does not have to infer it.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/notes/2026-08-25-react19-audit.md
git commit -m "docs: audit React 19 compatibility before the Next.js scaffold"
```

**Gate:** if any package has no React 19 support and no upgrade path, stop and revise
this plan for Next.js 14 + React 18 instead of proceeding to Task 2.

---

### Task 2: Scaffold Next.js alongside Vite

**Files:**
- Create: `next.config.ts`, `app/layout.tsx`, `app/page.tsx`
- Modify: `package.json`, `tailwind.config.js`, `.gitignore`, `tsconfig.json`

**Interfaces:**
- Consumes: Task 1's verdict.
- Produces: `npm run dev:next` and `npm run build:next`, both working, with the Vite app untouched.

- [ ] **Step 1: Install Next.js and matching React**

```bash
npm install next@15 react@19 react-dom@19
npm install -D @types/react@19 @types/react-dom@19
```

- [ ] **Step 2: Add the config**

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Vite app still lives in src/ and must not be swept into the Next build.
  pageExtensions: ['tsx', 'ts'],
}

export default nextConfig
```

- [ ] **Step 3: Add a root layout and a placeholder page**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = { title: 'Worktrack' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning is required: next-themes sets the class on <html>
  // before React hydrates, which would otherwise log a mismatch on every load.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// app/page.tsx
export default function Page() {
  return <main>Next.js scaffold is running.</main>
}
```

- [ ] **Step 4: Point Tailwind at the new directory**

In `tailwind.config.js`, add `'./app/**/*.{ts,tsx}'` to `content`. Leave the existing
`./src/**` glob in place — both apps build until Task 7.

- [ ] **Step 5: Add scripts that do not collide with the Vite ones**

```json
"dev:next": "next dev",
"build:next": "next build",
"start:next": "next start"
```

- [ ] **Step 6: Ignore the Next build output**

Add `.next/` and `next-env.d.ts` to `.gitignore`.

- [ ] **Step 7: Verify both apps still build**

Run: `npm run build` — Expected: the Vite build succeeds, as before.
Run: `npm run build:next` — Expected: the Next build succeeds.
Run: `npm test` — Expected: PASS, 299 tests. The scaffold touches no tested code.

- [ ] **Step 8: Commit**

```bash
git add next.config.ts app package.json tailwind.config.js .gitignore tsconfig.json package-lock.json
git commit -m "feat: scaffold Next.js App Router alongside the Vite app"
```

---

### Task 3: Centralise environment access

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/__tests__/env.test.ts`
- Modify: `src/lib/supabase.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean }` and `SUPABASE_CONFIG_ERROR: string | null`, used by `src/lib/supabase.ts` and later by any Next server code.

`src/lib/supabase.ts` reads `import.meta.env` directly, which does not exist in a
Next.js server context. Routing every read through one module means the
`VITE_` → `NEXT_PUBLIC_` change happens in one place instead of being hunted down.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/env.test.ts
import { describe, it, expect } from 'vitest'
import { readSupabaseConfig } from '../env'

describe('readSupabaseConfig', () => {
  it('prefers NEXT_PUBLIC_ values when both are present', () => {
    const cfg = readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://next.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'next-key',
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-key',
    })
    expect(cfg.url).toBe('https://next.supabase.co')
  })

  it('falls back to VITE_ values so the Vite app keeps working mid-migration', () => {
    const cfg = readSupabaseConfig({
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'vite-key',
    })
    expect(cfg.url).toBe('https://vite.supabase.co')
    expect(cfg.isConfigured).toBe(true)
  })

  it('reports unconfigured when values are missing', () => {
    expect(readSupabaseConfig({}).isConfigured).toBe(false)
  })

  it('treats a placeholder URL as unconfigured', () => {
    const cfg = readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k',
    })
    expect(cfg.isConfigured).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/env.test.ts`
Expected: FAIL — `Failed to resolve import "../env"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/env.ts
export interface SupabaseConfig {
  url: string
  anonKey: string
  isConfigured: boolean
}

const PLACEHOLDER_URL = ['your-project.supabase.co', 'placeholder.supabase.co', 'project-id.supabase.co']
const PLACEHOLDER_KEY = ['placeholder', 'anon-key-value', 'your-anon-key']

/**
 * Reads Supabase config from a plain object rather than a global.
 *
 * Taking the source as an argument is what makes this testable: import.meta.env
 * and process.env are both ambient and neither can be varied per test.
 *
 * NEXT_PUBLIC_ wins over VITE_ so a half-migrated repo prefers the new names
 * while the Vite app keeps running on the old ones.
 */
export function readSupabaseConfig(source: Record<string, string | undefined>): SupabaseConfig {
  const url = source.NEXT_PUBLIC_SUPABASE_URL ?? source.VITE_SUPABASE_URL ?? ''
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? source.VITE_SUPABASE_ANON_KEY ?? ''
  const isConfigured =
    !!url && !!anonKey &&
    !PLACEHOLDER_URL.some((p) => url.includes(p)) &&
    !PLACEHOLDER_KEY.some((p) => anonKey.toLowerCase().includes(p))
  return { url, anonKey, isConfigured }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/env.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Rewire the Supabase client**

In `src/lib/supabase.ts`, replace the direct `import.meta.env` reads with a call to
`readSupabaseConfig`. Keep the exported names `supabase`, `hasValidSupabaseConfig`
and `supabaseConfigError` exactly as they are — other modules import them and this
task is not a rename.

The source object differs per runtime, so build it defensively:

```ts
const source = {
  ...(typeof process !== 'undefined' ? process.env : {}),
  ...(typeof import.meta !== 'undefined' ? (import.meta as any).env ?? {} : {}),
} as Record<string, string | undefined>
```

- [ ] **Step 6: Add the new names to the environment files**

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.example`
with the same explanatory comment as the VITE_ pair. Add real values to `.env`
alongside the existing ones — do not delete the VITE_ ones until Task 7.

- [ ] **Step 7: Verify nothing regressed**

Run: `npm test` — Expected: PASS, 303 tests (299 + 4 new).
Run: `npm run build` — Expected: succeeds.
Run: `npm run test:integration` — Expected: PASS, 4 tests. This proves the rewired
client still authenticates against the real project.

- [ ] **Step 8: Commit**

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts src/lib/supabase.ts .env.example
git commit -m "refactor: read Supabase config through one module for both runtimes"
```

---

### Task 4: Port the providers

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/ToastContext.tsx`
- Delete: `src/contexts/ThemeContext.tsx` and `src/contexts/__tests__/` theme tests, if any

**Interfaces:**
- Consumes: `readSupabaseConfig` from Task 3.
- Produces: `<Providers>` wrapping Auth, Toast, React Query and `next-themes`, mounted by the root layout. Every later route assumes it.

- [ ] **Step 1: Install next-themes**

```bash
npm install next-themes
```

- [ ] **Step 2: Mark the existing contexts as client components**

Add `'use client'` as the first line of `src/contexts/AuthContext.tsx` and
`src/contexts/ToastContext.tsx`. They use hooks and browser APIs and cannot be
server components. Change nothing else in them.

- [ ] **Step 3: Write the providers component**

```tsx
// app/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'

export function Providers({ children }: { children: React.ReactNode }) {
  // Created in state, not at module scope: a module-level client is shared
  // across requests on the server and leaks one user's cache into another's.
  const [queryClient] = useState(() => new QueryClient())

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Mount it in the layout**

Wrap `{children}` in `app/layout.tsx` with `<Providers>`.

- [ ] **Step 5: Delete ThemeContext and repoint its consumers**

Delete `src/contexts/ThemeContext.tsx`. Every `useTheme` import from it becomes
`import { useTheme } from 'next-themes'`. The API differs: `next-themes` exposes
`{ theme, setTheme, resolvedTheme }` and has no `toggleTheme`. Replace toggle call
sites with `setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')`.

Find them with: `grep -rn "ThemeContext\|toggleTheme" src/`

- [ ] **Step 6: Verify**

Run: `npm test` — Expected: PASS. The count drops by however many tests covered
`ThemeContext`; state the new number in the commit message rather than letting it
drift silently.
Run: `npm run build:next` — Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add app src/contexts package.json package-lock.json
git commit -m "feat: port providers to the App Router and adopt next-themes"
```

---

### Task 5: Port the login route and the protected shell

**Files:**
- Create: `app/(auth)/login/page.tsx`, `app/(app)/layout.tsx`
- Modify: `src/pages/LoginPage.tsx`, `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `<Providers>` from Task 4.
- Produces: a working `/login` and a protected `(app)` group that redirects unauthenticated users, which Task 6's routes sit inside.

`src/App.tsx` currently does this with `<ProtectedRoute>` and `<PublicRoute>`
wrappers. App Router expresses the same thing with route groups, so the guard moves
from a component into a layout.

- [ ] **Step 1: Mark the page components as client**

Add `'use client'` to `src/pages/LoginPage.tsx` and `src/components/Layout.tsx`.

- [ ] **Step 2: Add the login route**

```tsx
// app/(auth)/login/page.tsx
'use client'
import LoginPage from '@/pages/LoginPage'
export default function Page() {
  return <LoginPage />
}
```

- [ ] **Step 3: Add the protected layout**

```tsx
// app/(app)/layout.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  // Render nothing rather than the shell while auth resolves: showing the app
  // and then redirecting flashes protected chrome at a signed-out visitor.
  if (loading || !user) return null

  return <Layout>{children}</Layout>
}
```

If `useAuth` exposes different names than `user` / `loading`, use the real ones —
check `src/contexts/AuthContext.tsx` rather than assuming.

- [ ] **Step 4: Verify by running the app**

Run: `npm run dev:next`, then visit `/login` signed out — Expected: the login page renders.
Visit `/dashboard` signed out — Expected: redirected to `/login`.

- [ ] **Step 5: Verify the suite**

Run: `npm test` — Expected: PASS, no change in count.

- [ ] **Step 6: Commit**

```bash
git add app src/pages/LoginPage.tsx src/components/Layout.tsx
git commit -m "feat: port login and the protected shell to App Router"
```

---

### Task 6: Port the three app routes

**Files:**
- Create: `app/(app)/dashboard/page.tsx`, `app/(app)/jobs/page.tsx`, `app/(app)/cv/page.tsx`
- Modify: `src/pages/DashboardPage.tsx`, `src/pages/JobsPage.tsx`, `src/pages/ResumePage.tsx`

**Interfaces:**
- Consumes: the `(app)` layout from Task 5.
- Produces: `/dashboard`, `/jobs`, `/cv` at parity with the Vite app.

Port one route per step and verify it before moving on. Porting all three then
debugging is how a single bad import becomes three broken pages.

- [ ] **Step 1: Port /dashboard**

Add `'use client'` to `src/pages/DashboardPage.tsx`, then:

```tsx
// app/(app)/dashboard/page.tsx
'use client'
import DashboardPage from '@/pages/DashboardPage'
export default function Page() {
  return <DashboardPage />
}
```

Run `npm run dev:next` and confirm `/dashboard` renders with real data.

- [ ] **Step 2: Port /jobs**

Same shape, using `src/pages/JobsPage.tsx`. Confirm `/jobs` renders, including the
kanban and list toggle.

- [ ] **Step 3: Port /cv**

Same shape, using `src/pages/ResumePage.tsx`. Confirm the editor mounts — Tiptap is
the most likely thing to object to a server boundary, which is why it is last.

- [ ] **Step 4: Replace react-router navigation inside ported components**

Find them: `grep -rn "react-router-dom" src/components src/pages src/hooks`

`useNavigate()` becomes `useRouter()` from `next/navigation` with `router.push()`.
`<Link to=...>` becomes `<Link href=...>` from `next/link`. `useLocation()` becomes
`usePathname()`. Do not delete `react-router-dom` yet; the Vite app still needs it.

- [ ] **Step 5: Verify**

Run: `npm test` — Expected: PASS.
Run: `npm run build:next` — Expected: succeeds.
Run: `npm run build` — Expected: the Vite build still succeeds.

- [ ] **Step 6: Commit**

```bash
git add app src/pages src/components src/hooks
git commit -m "feat: port dashboard, jobs and cv routes to App Router"
```

---

### Task 7: Deploy to Vercel and remove Vite

**Files:**
- Delete: `src/App.tsx`, `src/main.tsx`, `index.html`, `vite.config.ts`, `scripts/create-gh-pages-404.cjs`
- Modify: `package.json`, `vitest.config.ts`, `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a deployed app and a single build path.

Deletion is last on purpose. Until this task the Vite app is the working reference
to diff against when a ported route misbehaves.

- [ ] **Step 1: Deploy the Next app before deleting anything**

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel
project, then deploy. Confirm login, `/dashboard`, `/jobs` and `/cv` all work
against the real project on the deployed URL.

**Gate:** if the deployment does not work, stop. Do not delete the Vite app to fix
a deploy problem.

- [ ] **Step 2: Delete the Vite entrypoints**

```bash
git rm src/App.tsx src/main.tsx index.html vite.config.ts scripts/create-gh-pages-404.cjs
```

- [ ] **Step 3: Rewrite the scripts**

`build` becomes `next build`, `dev` becomes `next dev`, `start` becomes `next start`.
Delete `build:gh-pages`, `predeploy`, `deploy` and `preview`. Delete the `dev:next` /
`build:next` aliases from Task 2 — there is only one app now.

- [ ] **Step 4: Remove dependencies that are now unused**

```bash
npm uninstall react-router-dom gh-pages @vitejs/plugin-react vite
```

Keep `vitest` and `@vitejs/plugin-react` **if** `vitest.config.ts` still needs the
React plugin to transform TSX in tests — check before removing, and re-add if the
suite fails.

- [ ] **Step 5: Drop the VITE_ variables**

Remove `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`, `.env.example`
and Vercel. `readSupabaseConfig` still reads them as a fallback; leave that fallback
in place, it costs nothing and documents the migration.

Integration tests read `VITE_SUPABASE_URL` directly in
`src/test/integration/client.ts` — update those two reads to the `NEXT_PUBLIC_`
names in the same commit, or the integration suite breaks silently by skipping.

- [ ] **Step 6: Verify everything**

Run: `npm test` — Expected: PASS.
Run: `npm run test:integration` — Expected: PASS, 4 tests. **Not skipped.** A skip
here means the env rename broke the harness.
Run: `npm run build` — Expected: the Next build succeeds.

- [ ] **Step 7: Update the README**

Replace the Vite and gh-pages instructions with the Next.js and Vercel ones, and
update the live link.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove Vite and ship on Next.js"
```

---

## Self-Review

**Spec coverage:** 3.1 → Task 2. 3.2 → Task 4. 3.3 → Task 3 and Task 7 Step 5.
3.4 → Tasks 5 and 6. 3.5 → verified at every task, explicitly in Task 7 Step 6.
3.6 → Task 7. Task 1 has no roadmap item; it exists because the React 19 upgrade is
implied by Next 15 and the roadmap does not acknowledge it.

**Placeholders:** none. Every code step carries the code. Two steps deliberately say
"check the real names rather than assuming" — Task 5 Step 3 on `useAuth`'s shape and
Task 7 Step 4 on the React plugin — because asserting a value this plan has not
verified would be worse than telling the executor to look.

**Type consistency:** `readSupabaseConfig(source)` is defined in Task 3 and used in
Tasks 3 and 7 under that name. `<Providers>` is defined in Task 4 and mounted in
Task 4. `useTheme` from `next-themes` returns `{ theme, setTheme, resolvedTheme }`
and Task 4 Step 5 states this, since the old context's `toggleTheme` does not exist
there.

**Known ordering constraints:** Task 1 gates Task 2. Task 3 must precede Task 4,
which reads config through it. Task 7 must be last — it deletes the reference
implementation, and its Step 1 gates deletion on a working deployment.

**Counts:** baseline 299 unit + 4 integration. Task 3 adds 4. Task 4 removes however
many covered `ThemeContext`; that number must be stated, not absorbed.

---

## Downstream milestones

M4-M7 each get their own plan file, written when the milestone starts rather than
now. They depend on outputs that do not exist yet — M4 needs the Figma reads and the
Tailwind v4 upgrade, M5 needs M4's components, M6 needs M5's screens for its
carousel. A detailed plan written today would be fiction by the time it is executed.

What is already settled and must survive into those plans:

**M4 — design system.** Tailwind v4 CSS-first `@theme`. 84 variables across three
Figma collections. Helvetica with `Helvetica, "Helvetica Neue", Arial, sans-serif`.
26 custom icons, never Lucide — `grep -r lucide src/` must come back empty when 4.3
lands. skiper4 supplies the theme toggle button, skiper26 the View Transitions wipe;
both install as shadcn source and are edited in-tree, including removing skiper26's
Lucide dependency. One `prefers-reduced-motion` gate shared across 4.6 and 6.1a.
shadcn is not initialised — `shadcn init` must run before the first `shadcn add`.

**M5 — screens.** Breaks up DashboardPage (827), JobForm (824), JobsPage (787),
ResumePage (668). `/settings` is two groups, account and danger zone. Mobile chrome
is 44x44 in a 64px top bar; desktop keeps 32px. The bottom nav is five destinations,
01-05, and `/settings` highlights none of them.

**M6 — public surface.** 6.1a is the pinned scroll sequence: hero pins, releases,
carousel pins, releases, navbar appears, normal flow onward. Pinning, not parallax.
skiper51 is scroll-driven with `allowTouchMove: false` and `loop: false`; under
`prefers-reduced-motion` it becomes a conventional touchable carousel. Attribution to
Skiper UI is required for all four adopted components.

**M7 — intelligence.** Optional. `matchKeywords` and `lintForAts` already exist from
M2 and are what 7.1 builds on.
