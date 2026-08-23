# M1 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add every table, column, and policy the redesigned UI will need, as idempotent migrations, with no UI changes.

**Architecture:** Migrations only. Each task writes SQL to `supabase/migrations/`, applies it to project `somyuulytwgzltiboewm`, and adds a pure-function test for any derived logic. Schema-only tasks are verified by asserting against the regenerated types.

**Tech Stack:** Supabase (Postgres 17), Supabase CLI, TypeScript, Vitest.

## Global Constraints

- Supabase project ref is `somyuulytwgzltiboewm`. Never `zlqepevzcfnnygaorvxn`.
- Every new table has RLS enabled and owner-only policies keyed on `auth.uid() = user_id`.
- Every write policy (INSERT/UPDATE/DELETE) additionally excludes demo users via `AND NOT public.is_demo()` once Task 8 lands.
- Every migration is idempotent: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`.
- Every function is created with `SET search_path = public`.
- Migration filenames are `<14-digit timestamp>_<snake_case_name>.sql` and must match the version recorded remotely.
- After every task, `supabase migration list --linked` shows `local == remote` for all rows.
- Currency values are Philippine pesos (`PHP`) by default.
- Existing suite must stay green: `npm test` → 218 passing.

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

### Task 1: Job description column

**Files:**
- Create: `supabase/migrations/<ts>_add_job_description.sql`
- Modify: `src/types/index.ts`
- Test: `src/services/__tests__/jobDescription.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `jobs.description text NULL`. Task 4 of M2 (`matchKeywords`) reads it.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/jobDescription.test.ts
import { describe, it, expect } from 'vitest'
import { hasStoredDescription } from '../jobDescription'
import type { Job } from '@/types'

describe('hasStoredDescription', () => {
  it('returns false when description is null', () => {
    expect(hasStoredDescription({ description: null } as Job)).toBe(false)
  })

  it('returns false when description is only whitespace', () => {
    expect(hasStoredDescription({ description: '   \n ' } as Job)).toBe(false)
  })

  it('returns true when description has content', () => {
    expect(hasStoredDescription({ description: 'Build APIs' } as Job)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/jobDescription.test.ts`
Expected: FAIL — `Failed to resolve import "../jobDescription"`

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_job_description.sql
-- Full posting text. url alone is fragile: postings are taken down before
-- interviews, and keyword matching needs the body.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.jobs.description IS 'Full job posting text, used for ATS keyword matching and AI tailoring';
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied, no errors.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/jobDescription.ts
import type { Job } from '@/types'

export function hasStoredDescription(job: Pick<Job, 'description'>): boolean {
  return typeof job.description === 'string' && job.description.trim().length > 0
}
```

- [ ] **Step 6: Add the field to the Job type**

In `src/types/index.ts`, add to the `Job` interface:

```typescript
  description: string | null
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/jobDescription.test.ts`
Expected: PASS, 3 tests.

Run: `npm test`
Expected: PASS, 221 tests (218 existing + 3 new).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations src/services/jobDescription.ts src/services/__tests__/jobDescription.test.ts src/types/index.ts
git commit -m "feat: store job description text on applications"
```

---

### Task 2: Salary currency

**Files:**
- Create: `supabase/migrations/<ts>_add_salary_currency.sql`
- Create: `src/services/salary.ts`
- Modify: `src/types/index.ts`
- Test: `src/services/__tests__/salary.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `jobs.salary_currency text NOT NULL DEFAULT 'PHP'`, and `formatSalaryRange(min, max, currency): string`. M2's analytics reads the currency to avoid mixing units.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/salary.test.ts
import { describe, it, expect } from 'vitest'
import { formatSalaryRange } from '../salary'

describe('formatSalaryRange', () => {
  it('formats a PHP range with the peso sign', () => {
    expect(formatSalaryRange(90000, 120000, 'PHP')).toBe('₱90,000–₱120,000')
  })

  it('formats a USD range with the dollar sign', () => {
    expect(formatSalaryRange(90000, 120000, 'USD')).toBe('$90,000–$120,000')
  })

  it('returns a single value when min equals max', () => {
    expect(formatSalaryRange(90000, 90000, 'PHP')).toBe('₱90,000')
  })

  it('returns an em-free placeholder when both bounds are null', () => {
    expect(formatSalaryRange(null, null, 'PHP')).toBe('not specified')
  })

  it('formats an open-ended range when only min is present', () => {
    expect(formatSalaryRange(90000, null, 'PHP')).toBe('₱90,000+')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/salary.test.ts`
Expected: FAIL — `Failed to resolve import "../salary"`

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_salary_currency.sql
-- salary_min/max were bare integers. Mixing PHP and USD in one column
-- silently corrupts every salary metric on the analytics page.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS salary_currency TEXT NOT NULL DEFAULT 'PHP';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_salary_currency_check') THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_salary_currency_check
      CHECK (salary_currency IN ('PHP','USD','EUR','GBP','SGD','AUD'));
  END IF;
END $$;

COMMENT ON COLUMN public.jobs.salary_currency IS 'ISO code for salary_min and salary_max; defaults to PHP';
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/salary.ts
const SYMBOLS: Record<string, string> = {
  PHP: '₱', USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AUD: 'A$',
}

function money(value: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? ''
  return `${symbol}${value.toLocaleString('en-US')}`
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string
): string {
  if (min === null && max === null) return 'not specified'
  if (min !== null && max === null) return `${money(min, currency)}+`
  if (min === null && max !== null) return `up to ${money(max, currency)}`
  if (min === max) return money(min as number, currency)
  return `${money(min as number, currency)}–${money(max as number, currency)}`
}
```

- [ ] **Step 6: Add the field to the Job type**

In `src/types/index.ts`, add to the `Job` interface:

```typescript
  salary_currency: string
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/salary.test.ts`
Expected: PASS, 5 tests.

Run: `npm test`
Expected: PASS, 226 tests.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations src/services/salary.ts src/services/__tests__/salary.test.ts src/types/index.ts
git commit -m "feat: add salary currency to applications"
```

---

### Task 3: Link CVs to applications

**Files:**
- Create: `supabase/migrations/<ts>_add_application_documents.sql`
- Modify: `src/types/index.ts`
- Test: `src/services/__tests__/applicationDocuments.test.ts`
- Create: `src/services/applicationDocuments.ts`

**Interfaces:**
- Consumes: `resumes`, `resume_snapshots`, `jobs` (all exist).
- Produces: table `application_documents(id, job_id, resume_id, snapshot_id, user_id, sent_at)` and `describeLink(link): string`. M2's `documentLinkService` writes rows here; M5's application detail page reads them.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/applicationDocuments.test.ts
import { describe, it, expect } from 'vitest'
import { describeLink } from '../applicationDocuments'

describe('describeLink', () => {
  it('names the snapshot version when one is pinned', () => {
    expect(describeLink({ title: 'software engineer cv', version: 3, sent_at: '2026-08-21' }))
      .toBe('software engineer cv · version 3 · sent 21 AUG 2026')
  })

  it('says unpinned when no snapshot is attached', () => {
    expect(describeLink({ title: 'software engineer cv', version: null, sent_at: '2026-08-21' }))
      .toBe('software engineer cv · latest · sent 21 AUG 2026')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/applicationDocuments.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_application_documents.sql
-- resumes and jobs had no relationship, so "which CV did I send to Stripe?"
-- was unanswerable. snapshot_id pins the exact immutable version sent.
CREATE TABLE IF NOT EXISTS public.application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.resume_snapshots(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT application_documents_unique UNIQUE (job_id, resume_id)
);

COMMENT ON TABLE public.application_documents IS 'Which CV, and which snapshot of it, was sent to each application';

CREATE INDEX IF NOT EXISTS idx_application_documents_job
  ON public.application_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_application_documents_user
  ON public.application_documents(user_id);

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own application documents" ON public.application_documents;
CREATE POLICY "Users can view own application documents"
  ON public.application_documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own application documents" ON public.application_documents;
CREATE POLICY "Users can insert own application documents"
  ON public.application_documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own application documents" ON public.application_documents;
CREATE POLICY "Users can update own application documents"
  ON public.application_documents FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own application documents" ON public.application_documents;
CREATE POLICY "Users can delete own application documents"
  ON public.application_documents FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_documents TO authenticated;
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/applicationDocuments.ts
export interface DocumentLinkSummary {
  title: string
  version: number | null
  sent_at: string
}

function formatSentDate(iso: string): string {
  const d = new Date(iso)
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  return `${String(d.getUTCDate()).padStart(2, '0')} ${month} ${d.getUTCFullYear()}`
}

export function describeLink(link: DocumentLinkSummary): string {
  const version = link.version === null ? 'latest' : `version ${link.version}`
  return `${link.title} · ${version} · sent ${formatSentDate(link.sent_at)}`
}
```

- [ ] **Step 6: Add the type**

In `src/types/index.ts`:

```typescript
export interface ApplicationDocument {
  id: string
  job_id: string
  resume_id: string
  snapshot_id: string | null
  user_id: string
  sent_at: string
  created_at: string
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/applicationDocuments.test.ts`
Expected: PASS, 2 tests.

Run: `npm test`
Expected: PASS, 228 tests.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations src/services/applicationDocuments.ts src/services/__tests__/applicationDocuments.test.ts src/types/index.ts
git commit -m "feat: link CV snapshots to applications"
```

---

### Task 4: Events table

**Files:**
- Create: `supabase/migrations/<ts>_add_events.sql`
- Create: `src/services/events.ts`
- Modify: `src/types/index.ts`
- Test: `src/services/__tests__/events.test.ts`

**Interfaces:**
- Consumes: `jobs`.
- Produces: table `events(id, job_id, user_id, kind, title, starts_at, duration_minutes, notes)` and `groupEventsByDay(events): Map<string, CalendarEvent[]>`. M5's `/calendar` and the dashboard's upcoming-events rail read it.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/events.test.ts
import { describe, it, expect } from 'vitest'
import { groupEventsByDay, type CalendarEvent } from '../events'

const ev = (id: string, starts_at: string): CalendarEvent => ({
  id, job_id: 'j1', user_id: 'u1', kind: 'interview',
  title: 'Technical interview', starts_at, duration_minutes: 60, notes: null,
})

describe('groupEventsByDay', () => {
  it('groups two events on the same day under one key', () => {
    const grouped = groupEventsByDay([
      ev('a', '2026-08-26T10:00:00Z'),
      ev('b', '2026-08-26T14:00:00Z'),
    ])
    expect(grouped.get('2026-08-26')).toHaveLength(2)
  })

  it('separates events on different days', () => {
    const grouped = groupEventsByDay([
      ev('a', '2026-08-26T10:00:00Z'),
      ev('b', '2026-08-28T10:00:00Z'),
    ])
    expect(grouped.size).toBe(2)
  })

  it('orders events within a day by start time', () => {
    const grouped = groupEventsByDay([
      ev('late', '2026-08-26T14:00:00Z'),
      ev('early', '2026-08-26T09:00:00Z'),
    ])
    expect(grouped.get('2026-08-26')?.map(e => e.id)).toEqual(['early', 'late'])
  })

  it('returns an empty map for no events', () => {
    expect(groupEventsByDay([]).size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/events.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_events.sql
-- date_applied was the only date in the system. Interviews, offer deadlines
-- and take-home due dates had nowhere to live.
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('interview','deadline','take_home','follow_up','other')),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.events IS 'Scheduled items: interviews, deadlines, take-homes';

CREATE INDEX IF NOT EXISTS idx_events_user_starts ON public.events(user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_job ON public.events(job_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own events" ON public.events;
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own events" ON public.events;
CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/events.ts
export type EventKind = 'interview' | 'deadline' | 'take_home' | 'follow_up' | 'other'

export interface CalendarEvent {
  id: string
  job_id: string | null
  user_id: string
  kind: EventKind
  title: string
  starts_at: string
  duration_minutes: number | null
  notes: string | null
}

export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>()
  const sorted = [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )
  for (const event of sorted) {
    const day = event.starts_at.slice(0, 10)
    const bucket = grouped.get(day)
    if (bucket) bucket.push(event)
    else grouped.set(day, [event])
  }
  return grouped
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/events.test.ts`
Expected: PASS, 4 tests.

Run: `npm test`
Expected: PASS, 232 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/services/events.ts src/services/__tests__/events.test.ts
git commit -m "feat: add events table for interviews and deadlines"
```

---

### Task 5: Activity log

**Files:**
- Create: `supabase/migrations/<ts>_add_activity_log.sql`
- Create: `src/services/activityLog.ts`
- Test: `src/services/__tests__/activityLog.test.ts`

**Interfaces:**
- Consumes: `jobs`.
- Produces: table `activity_log(id, job_id, user_id, note, occurred_at)` and `sortActivityDescending(entries)`. M5's application detail timeline reads it. Distinct from `job_status_history`, which records status transitions only.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/activityLog.test.ts
import { describe, it, expect } from 'vitest'
import { sortActivityDescending, type ActivityEntry } from '../activityLog'

const entry = (id: string, occurred_at: string): ActivityEntry => ({
  id, job_id: 'j1', user_id: 'u1', note: 'recruiter call', occurred_at,
})

describe('sortActivityDescending', () => {
  it('puts the most recent entry first', () => {
    const sorted = sortActivityDescending([
      entry('old', '2026-08-21T00:00:00Z'),
      entry('new', '2026-08-26T00:00:00Z'),
    ])
    expect(sorted[0].id).toBe('new')
  })

  it('does not mutate the input array', () => {
    const input = [entry('a', '2026-08-21T00:00:00Z'), entry('b', '2026-08-26T00:00:00Z')]
    sortActivityDescending(input)
    expect(input[0].id).toBe('a')
  })

  it('returns an empty array unchanged', () => {
    expect(sortActivityDescending([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/activityLog.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_activity_log.sql
-- job_status_history covers status transitions only. Nothing recorded
-- "recruiter called", "sent thank-you", "asked about timeline".
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.activity_log IS 'Free-form timestamped notes per application';

CREATE INDEX IF NOT EXISTS idx_activity_log_job_time
  ON public.activity_log(job_id, occurred_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
CREATE POLICY "Users can view own activity"
  ON public.activity_log FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
CREATE POLICY "Users can insert own activity"
  ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own activity" ON public.activity_log;
CREATE POLICY "Users can update own activity"
  ON public.activity_log FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own activity" ON public.activity_log;
CREATE POLICY "Users can delete own activity"
  ON public.activity_log FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/activityLog.ts
export interface ActivityEntry {
  id: string
  job_id: string
  user_id: string
  note: string
  occurred_at: string
}

export function sortActivityDescending(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/activityLog.test.ts`
Expected: PASS, 3 tests.

Run: `npm test`
Expected: PASS, 235 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/services/activityLog.ts src/services/__tests__/activityLog.test.ts
git commit -m "feat: add activity log for application notes"
```

---

### Task 6: Contacts

**Files:**
- Create: `supabase/migrations/<ts>_add_contacts.sql`
- Create: `src/services/contacts.ts`
- Test: `src/services/__tests__/contacts.test.ts`

**Interfaces:**
- Consumes: `jobs`.
- Produces: tables `contacts` and `application_contacts`, plus `dedupeContactsByEmail(contacts)`. M5's application detail page shows linked contacts. There is no `/contacts` route — that was dropped deliberately.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/contacts.test.ts
import { describe, it, expect } from 'vitest'
import { dedupeContactsByEmail, type Contact } from '../contacts'

const c = (id: string, email: string | null): Contact => ({
  id, user_id: 'u1', name: 'Recruiter', email, linkedin: null, notes: null,
})

describe('dedupeContactsByEmail', () => {
  it('collapses two contacts sharing an email', () => {
    expect(dedupeContactsByEmail([c('a', 'r@stripe.com'), c('b', 'r@stripe.com')])).toHaveLength(1)
  })

  it('treats email comparison as case-insensitive', () => {
    expect(dedupeContactsByEmail([c('a', 'R@Stripe.com'), c('b', 'r@stripe.com')])).toHaveLength(1)
  })

  it('keeps contacts with no email as distinct', () => {
    expect(dedupeContactsByEmail([c('a', null), c('b', null)])).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/contacts.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_contacts.sql
-- Contact fields lived on jobs, so one recruiter spanning four applications
-- was stored four times with no link between them.
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  linkedin TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.application_contacts (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_application_contacts_contact
  ON public.application_contacts(contact_id);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;
CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own application contacts" ON public.application_contacts;
CREATE POLICY "Users can view own application contacts"
  ON public.application_contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own application contacts" ON public.application_contacts;
CREATE POLICY "Users can insert own application contacts"
  ON public.application_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own application contacts" ON public.application_contacts;
CREATE POLICY "Users can delete own application contacts"
  ON public.application_contacts FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.application_contacts TO authenticated;
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/contacts.ts
export interface Contact {
  id: string
  user_id: string
  name: string
  email: string | null
  linkedin: string | null
  notes: string | null
}

export function dedupeContactsByEmail(contacts: Contact[]): Contact[] {
  const seen = new Set<string>()
  const result: Contact[] = []
  for (const contact of contacts) {
    if (contact.email === null) {
      result.push(contact)
      continue
    }
    const key = contact.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(contact)
  }
  return result
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/contacts.test.ts`
Expected: PASS, 3 tests.

Run: `npm test`
Expected: PASS, 238 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/services/contacts.ts src/services/__tests__/contacts.test.ts
git commit -m "feat: add contacts and application links"
```

---

### Task 7: Structured CV sections

**Files:**
- Create: `supabase/migrations/<ts>_add_cv_sections.sql`
- Create: `src/services/cvSchema.ts`
- Test: `src/services/__tests__/cvSchema.test.ts`

**Interfaces:**
- Consumes: `resumes`.
- Produces: `resumes.sections jsonb` on the JSON Resume schema, plus `isValidCvDocument(value)` and `emptyCvDocument()`. M2's ATS lint and CV render both read `sections`. This is the change that unlocks per-section editing, templates, and AI tailoring.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/cvSchema.test.ts
import { describe, it, expect } from 'vitest'
import { emptyCvDocument, isValidCvDocument } from '../cvSchema'

describe('emptyCvDocument', () => {
  it('creates a document with the required top-level keys', () => {
    const doc = emptyCvDocument()
    expect(Object.keys(doc).sort()).toEqual(
      ['awards', 'basics', 'education', 'projects', 'skills', 'work'].sort()
    )
  })

  it('starts every collection empty', () => {
    const doc = emptyCvDocument()
    expect(doc.work).toEqual([])
    expect(doc.education).toEqual([])
  })
})

describe('isValidCvDocument', () => {
  it('accepts an empty document', () => {
    expect(isValidCvDocument(emptyCvDocument())).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidCvDocument(null)).toBe(false)
  })

  it('rejects a document missing basics', () => {
    const doc = emptyCvDocument() as Record<string, unknown>
    delete doc.basics
    expect(isValidCvDocument(doc)).toBe(false)
  })

  it('rejects a document whose work is not an array', () => {
    const doc = { ...emptyCvDocument(), work: 'nope' }
    expect(isValidCvDocument(doc)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/cvSchema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_cv_sections.sql
-- resumes.content is an opaque Tiptap blob or LaTeX string: content and
-- presentation are fused, so templates cannot be swapped and AI tailoring
-- has nothing addressable. sections stores the JSON Resume schema instead.
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS sections JSONB;

COMMENT ON COLUMN public.resumes.sections IS 'Structured CV on the JSON Resume schema; content is null for legacy latex/word drafts';

-- mode gains a third value: structured is the new default authoring mode.
ALTER TABLE public.resumes DROP CONSTRAINT IF EXISTS resumes_mode_check;
ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_mode_check CHECK (mode IN ('word','latex','structured'));

CREATE INDEX IF NOT EXISTS idx_resumes_sections
  ON public.resumes USING GIN (sections);
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Write minimal implementation**

```typescript
// src/services/cvSchema.ts
// Shape follows the JSON Resume standard so themes and tooling interoperate.
export interface CvBasics {
  name: string
  label: string
  email: string
  phone: string
  location: string
  summary: string
}

export interface CvWork {
  company: string
  position: string
  location: string
  startDate: string
  endDate: string | null
  highlights: string[]
}

export interface CvEducation {
  institution: string
  studyType: string
  area: string
  location: string
  startDate: string
  endDate: string | null
  highlights: string[]
}

export interface CvDocument {
  basics: CvBasics
  work: CvWork[]
  education: CvEducation[]
  skills: string[]
  projects: string[]
  awards: string[]
}

export function emptyCvDocument(): CvDocument {
  return {
    basics: { name: '', label: '', email: '', phone: '', location: '', summary: '' },
    work: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
  }
}

export function isValidCvDocument(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const doc = value as Record<string, unknown>
  if (typeof doc.basics !== 'object' || doc.basics === null) return false
  for (const key of ['work', 'education', 'skills', 'projects', 'awards']) {
    if (!Array.isArray(doc[key])) return false
  }
  return true
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/cvSchema.test.ts`
Expected: PASS, 6 tests.

Run: `npm test`
Expected: PASS, 244 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations src/services/cvSchema.ts src/services/__tests__/cvSchema.test.ts
git commit -m "feat: add structured CV sections on the JSON Resume schema"
```

---

### Task 8: Demo account and write guards

**Files:**
- Create: `supabase/migrations/<ts>_add_demo_accounts.sql`
- Create: `src/services/demoMode.ts`
- Test: `src/services/__tests__/demoMode.test.ts`

**Interfaces:**
- Consumes: every table created in Tasks 3-7, plus `jobs`, `resumes`, `resume_snapshots`.
- Produces: `demo_accounts` table, `public.is_demo()`, write-policy guards on every table, and `isDemoUser(userId, demoIds)`. M6's demo mode disables write controls in the UI; RLS is what actually enforces it.

**Note:** demo credentials are published on the landing page. Anyone can call the REST API directly with them, so a disabled button is not a security boundary — the policy is.

- [ ] **Step 1: Write the failing test**

```typescript
// src/services/__tests__/demoMode.test.ts
import { describe, it, expect } from 'vitest'
import { isDemoUser } from '../demoMode'

describe('isDemoUser', () => {
  it('returns true when the id is in the demo list', () => {
    expect(isDemoUser('u1', ['u1', 'u2'])).toBe(true)
  })

  it('returns false when the id is absent', () => {
    expect(isDemoUser('u3', ['u1', 'u2'])).toBe(false)
  })

  it('returns false for a null user id', () => {
    expect(isDemoUser(null, ['u1'])).toBe(false)
  })

  it('returns false when the demo list is empty', () => {
    expect(isDemoUser('u1', [])).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/__tests__/demoMode.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/<ts>_add_demo_accounts.sql
-- Demo credentials are public, so read-only must be enforced in RLS.
-- A disabled button in the UI is an affordance, not a boundary.
CREATE TABLE IF NOT EXISTS public.demo_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read demo accounts" ON public.demo_accounts;
CREATE POLICY "Anyone can read demo accounts"
  ON public.demo_accounts FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.is_demo()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM demo_accounts WHERE user_id = auth.uid()) $$;

-- Re-create every write policy with the demo guard appended.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'jobs','resumes','resume_snapshots','application_documents',
    'events','activity_log','contacts','application_contacts'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "demo_block_insert" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "demo_block_insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo())', t);

    EXECUTE format('DROP POLICY IF EXISTS "demo_block_update" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "demo_block_update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo())', t);

    EXECUTE format('DROP POLICY IF EXISTS "demo_block_delete" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "demo_block_delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo())', t);
  END LOOP;
END $$;
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: one migration applied.

- [ ] **Step 5: Verify the guard blocks writes**

Run this in the Supabase SQL editor, substituting a real demo user id:

```sql
-- expect: 0 rows inserted, policy violation
INSERT INTO public.demo_accounts (user_id) VALUES ('<demo-user-uuid>');
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<demo-user-uuid>"}';
INSERT INTO public.jobs (user_id, company, role) VALUES ('<demo-user-uuid>','Test','Test');
```
Expected: `new row violates row-level security policy`.

- [ ] **Step 6: Write minimal implementation**

```typescript
// src/services/demoMode.ts
export function isDemoUser(userId: string | null, demoUserIds: string[]): boolean {
  if (userId === null) return false
  return demoUserIds.includes(userId)
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/services/__tests__/demoMode.test.ts`
Expected: PASS, 4 tests.

Run: `npm test`
Expected: PASS, 248 tests.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations src/services/demoMode.ts src/services/__tests__/demoMode.test.ts
git commit -m "feat: enforce read-only demo accounts in RLS"
```

---

### Task 9: Verify and document the schema

**Files:**
- Modify: `README.md`
- Test: none (verification task)

**Interfaces:**
- Consumes: everything from Tasks 1-8.
- Produces: a schema table in the README that M2 onward can rely on.

- [ ] **Step 1: Verify migration parity**

Run: `supabase migration list --linked`
Expected: every row shows the same value in `local` and `remote`. If any row is missing remotely, run `supabase db push` before continuing.

- [ ] **Step 2: Verify RLS on every table**

Run in the Supabase SQL editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Expected: `rowsecurity = true` for every row. `analytics_cache` included.

- [ ] **Step 3: Run the security advisor**

Use the Supabase dashboard's Advisors tab, or the MCP `get_advisors` tool with `type: "security"`.
Expected: no ERROR-level lints. WARN-level `function_search_path_mutable` must be zero — every function in this plan sets `search_path`.

- [ ] **Step 4: Update the README schema table**

Replace the database table in `README.md` with:

```markdown
| Table | Purpose |
|---|---|
| `jobs` | Applications, with description, currency, contact and tag fields |
| `job_status_history` | Append-only status transitions, written by trigger |
| `activity_log` | Free-form timestamped notes per application |
| `events` | Interviews, deadlines, take-homes |
| `resumes` | CV drafts; structured sections, Tiptap JSON, or LaTeX |
| `resume_snapshots` | Immutable version history |
| `application_documents` | Which CV snapshot was sent to which application |
| `contacts` / `application_contacts` | Recruiters and referrals, linked many-to-many |
| `analytics_cache` | Precomputed per-user metrics, service-role only |
| `demo_accounts` | Read-only demo users, enforced by RLS |
```

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 248 tests.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: document the M1 schema"
```

---

## Self-Review

**Spec coverage:** F1 → Task 1. F9 → Task 2. F2 → Task 3. F4 → Task 4. F5 → Task 5. F6 → Task 6. C7/G1 → Task 7. F11 → Task 8. Schema documentation → Task 9. All M1 sub-tasks from the roadmap are covered.

**Placeholders:** none. Every step contains the SQL or TypeScript to write.

**Type consistency:** `CalendarEvent` (Task 4), `ActivityEntry` (Task 5), `Contact` (Task 6), `CvDocument` (Task 7), and `ApplicationDocument` (Task 3) are each defined once and referenced by the same name in their own tests. `is_demo()` is defined in Task 8 and referenced only there; earlier tasks' policies are re-created by Task 8's loop, which is why the demo guard is not duplicated into Tasks 3-7.

**Known ordering constraint:** Task 8 rewrites write policies for tables created in Tasks 3-7, so it must run last among the migration tasks. Task 9 verifies the result.
