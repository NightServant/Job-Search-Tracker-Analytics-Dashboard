import type { Job } from '@/types'

/**
 * The one `Job` fixture factory, consolidated from four call sites that had
 * quietly drifted into two different signatures: three files required `id`
 * and `status` on every call (`Partial<Job> & Pick<Job, 'id' | 'status'>>`),
 * and the application-detail route test made both optional, defaulting to
 * `'job-1'` / `'applied'`.
 *
 * The required-id-and-status shape won because it is the safer one for the
 * three call sites that render *multiple* jobs side by side (a kanban board,
 * a dashboard's recent list) -- an accidental shared default id there would
 * silently collapse two rows into one. The one file that used to lean on
 * `makeJob()` with no arguments at all (the detail route, which only ever
 * renders one job at a time) now passes `{ id: 'job-1', status: 'applied' }`
 * explicitly at each call site instead of receiving it implicitly.
 *
 * `role: 'Staff Engineer'` is the shared default rather than the other three
 * files' `'Engineer'`, because the detail-route test asserts on that exact
 * heading text at nine of its ten call sites and none of the other three
 * files assert on a job's default role at all -- keeping it is free there and
 * required here.
 *
 * `created_at`/`updated_at` default to the real current time rather than a
 * fixed string. Three of the four original fixtures hardcoded
 * `'2026-08-01T00:00:00.000Z'`, which review already flagged elsewhere on
 * this branch as the inline-literal-fixture pattern that let a Critical slip
 * through: a fixed past date recedes further from "now" every day the suite
 * runs, and the dashboard fixture already needed the real clock so its
 * 14-day staleness threshold means the same thing on every run. None of the
 * four files assert on the literal timestamp text, so the dynamic default
 * costs the other three nothing and fixes a decay the fixed string was
 * quietly building in.
 */
export function makeJob(overrides: Partial<Job> & Pick<Job, 'id' | 'status'>): Job {
  const now = new Date().toISOString()
  return {
    user_id: 'user-1',
    company: 'Acme',
    role: 'Staff Engineer',
    salary_min: 90000,
    salary_max: 120000,
    salary_currency: 'PHP',
    url: null,
    description: null,
    date_applied: '2026-07-20',
    notes: null,
    contact_name: null,
    contact_email: null,
    contact_linkedin: null,
    contact_notes: null,
    location: null,
    work_mode: null,
    source: null,
    is_referral: false,
    tags: [],
    tech_stack: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}
