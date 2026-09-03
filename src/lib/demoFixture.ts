import type { Job, JobStatus } from '@/types'
import type { CalendarEvent } from '@/services/events'
import type { ResumeSummary } from '@/services/resumeService'
import type {
  CohortAnalysis,
  ConversionFunnelMetric,
  ConversionMetrics,
  StatusTransition,
  TimeInStageMetric,
} from '@/services/analyticsService'

/**
 * The dataset behind `/demo/*`.
 *
 * THIS FIXTURE IS THE PRODUCT DEMO. A reviewer's entire impression of the app
 * comes from it, so it is content work rather than scaffolding, and the tests
 * beside it are about whether it makes a good argument -- enough rows for
 * every panel to say something, all five statuses, a real source split, and
 * transitions for the pipeline flow.
 *
 * IT IS INVENTED, AND IT IS PUBLISHED. Committed to a public repo and served
 * to strangers, so every company, name and address here is made up and every
 * email is `@example.com`. There is no route by which real data reaches this
 * file, and there must not be.
 *
 * DATES ARE RELATIVE TO `now`, WHICH IS THE ONLY REAL LOGIC HERE. Hardcoded
 * dates mean the demo says "applied 8 months ago" by spring and the trend
 * chart runs off the left edge of its window. `applicationsPerMonth` buckets
 * on `created_at` against the real clock, so `created_at` in particular has to
 * land inside the six-month window or the chart is empty however many rows
 * exist. `scripts/demoSeedData.mjs` pins a fixed TODAY on purpose -- that one
 * seeds a database and wants reproducibility; this one is rendered live and
 * wants currency. The company list is shared with it; nothing else is.
 *
 * `buildDemoFixture(now)` takes the clock as a parameter rather than reading
 * it, the same way `lib/calendar.ts` and `lib/analyticsRange.ts` do, so the
 * date logic is testable without freezing timers.
 *
 * ANALYTICS ARE DERIVED FROM THE JOBS, never hand-written. Hand-written
 * numbers that contradict the applications list is a subtle lie: a reviewer
 * clicking between Analytics and Applications sees two different totals and
 * correctly concludes one of them is fake. Everything in `analytics` is
 * computed from the same rows the other screens render.
 */

export interface DemoFixture {
  jobs: Job[]
  events: CalendarEvent[]
  resumes: ResumeSummary[]
  analytics: {
    timeInStage: TimeInStageMetric[]
    conversionFunnel: ConversionFunnelMetric[]
    statusTransitions: StatusTransition[]
    cohortAnalysis: CohortAnalysis[]
    conversionMetrics: ConversionMetrics
  }
}

const DEMO_USER_ID = 'demo-user'

/**
 * How far each application actually got, independent of where it sits now.
 *
 * A rejection is an EXIT from the funnel at whatever stage it happened, not a
 * fifth rung below Offer -- see ConversionFunnelMetric.isExit. So a rejected
 * row still records the stage it reached, and the funnel counts it there.
 */
type Reached = 'wishlist' | 'applied' | 'interviewing' | 'offer'

interface Seed {
  ref: string
  company: string
  role: string
  status: JobStatus
  reached: Reached
  /** Days before `now` the application was sent. null for wishlist. */
  appliedDaysAgo: number | null
  /** Days before `now` the row was created. Drives the trend chart. */
  createdDaysAgo: number
  salaryMin: number
  salaryMax: number
  source: string
  tags: string[]
  stack: string[]
  /** A few rows carry an invented contact so the detail view is not empty. */
  contact?: { name: string; email: string; notes: string }
}

/**
 * Sources are skewed deliberately. `rankedSources` shows a primary, a
 * secondary and collapses the rest into "others", so a single source (which is
 * what scripts/demoSeedData.mjs has -- every row is LinkedIn) renders a chart
 * with nothing to compare. This spread gives all three ranks real content.
 */
const SEEDS: Seed[] = [
  { ref: 'stripe', company: 'Northwind Pay', role: 'Software Engineer', status: 'offer', reached: 'offer', appliedDaysAgo: 34, createdDaysAgo: 38, salaryMin: 180000, salaryMax: 240000, source: 'Referral', tags: ['fintech'], stack: ['TypeScript', 'React', 'Postgres'], contact: { name: 'Dana Reyes', email: 'dana.reyes@example.com', notes: 'Recruiter, responsive' } },
  { ref: 'linear', company: 'Meridian Labs', role: 'Product Engineer', status: 'interviewing', reached: 'interviewing', appliedDaysAgo: 22, createdDaysAgo: 26, salaryMin: 170000, salaryMax: 220000, source: 'LinkedIn', tags: ['product'], stack: ['TypeScript', 'React'], contact: { name: 'Sam Cruz', email: 'sam.cruz@example.com', notes: 'Hiring manager' } },
  { ref: 'vercel', company: 'Halcyon Systems', role: 'Frontend Engineer', status: 'interviewing', reached: 'interviewing', appliedDaysAgo: 29, createdDaysAgo: 33, salaryMin: 160000, salaryMax: 210000, source: 'Referral', tags: ['devtools'], stack: ['Next.js', 'React'], contact: { name: 'Alex Tan', email: 'alex.tan@example.com', notes: 'Referred me in' } },
  { ref: 'supabase', company: 'Cindershore', role: 'Full Stack Engineer', status: 'interviewing', reached: 'interviewing', appliedDaysAgo: 41, createdDaysAgo: 45, salaryMin: 150000, salaryMax: 200000, source: 'LinkedIn', tags: ['devtools'], stack: ['TypeScript', 'Postgres'] },
  { ref: 'grab', company: 'Tanglewood Transit', role: 'Backend Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 12, createdDaysAgo: 14, salaryMin: 140000, salaryMax: 190000, source: 'LinkedIn', tags: ['logistics'], stack: ['Go', 'Postgres'] },
  { ref: 'gcash', company: 'Baywalk Digital', role: 'Senior Frontend Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 18, createdDaysAgo: 20, salaryMin: 130000, salaryMax: 180000, source: 'JobStreet', tags: ['fintech'], stack: ['React', 'TypeScript'] },
  { ref: 'kumu', company: 'Palawan Media', role: 'Software Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 25, createdDaysAgo: 27, salaryMin: 90000, salaryMax: 130000, source: 'LinkedIn', tags: ['media'], stack: ['React', 'Node.js'] },
  { ref: 'sprout', company: 'Verdant HR', role: 'Full Stack Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 31, createdDaysAgo: 34, salaryMin: 100000, salaryMax: 145000, source: 'Kalibrr', tags: ['hr-tech'], stack: ['React', 'Django'] },
  { ref: 'shopee', company: 'Marketside', role: 'Web Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 47, createdDaysAgo: 50, salaryMin: 120000, salaryMax: 165000, source: 'LinkedIn', tags: ['ecommerce'], stack: ['React', 'TypeScript'] },
  { ref: 'canva', company: 'Lumen Studio', role: 'Frontend Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 55, createdDaysAgo: 58, salaryMin: 175000, salaryMax: 230000, source: 'Company site', tags: ['design-tools'], stack: ['React', 'TypeScript'] },
  { ref: 'atlassian', company: 'Bridgeforth', role: 'Software Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 63, createdDaysAgo: 66, salaryMin: 165000, salaryMax: 215000, source: 'LinkedIn', tags: ['saas'], stack: ['React', 'Java'] },
  { ref: 'xendit', company: 'Harborline', role: 'Backend Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 71, createdDaysAgo: 74, salaryMin: 135000, salaryMax: 185000, source: 'JobStreet', tags: ['fintech'], stack: ['Go', 'Postgres'] },
  { ref: 'maya', company: 'Solstice Bank', role: 'Platform Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 78, createdDaysAgo: 82, salaryMin: 125000, salaryMax: 175000, source: 'LinkedIn', tags: ['fintech'], stack: ['Kubernetes', 'Go'] },
  { ref: 'coins', company: 'Tidewater Exchange', role: 'Software Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 86, createdDaysAgo: 90, salaryMin: 115000, salaryMax: 160000, source: 'Kalibrr', tags: ['fintech'], stack: ['TypeScript', 'Node.js'] },
  { ref: 'deel', company: 'Farlight Remote', role: 'Backend Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 94, createdDaysAgo: 98, salaryMin: 145000, salaryMax: 195000, source: 'LinkedIn', tags: ['remote-first'], stack: ['Node.js', 'Postgres'] },
  { ref: 'remote', company: 'Ashgrove Works', role: 'Full Stack Engineer', status: 'applied', reached: 'applied', appliedDaysAgo: 102, createdDaysAgo: 106, salaryMin: 150000, salaryMax: 200000, source: 'Company site', tags: ['remote-first'], stack: ['React', 'Ruby'] },
  { ref: 'payretailers', company: 'Cortez Payments', role: 'Frontend Engineer', status: 'rejected', reached: 'interviewing', appliedDaysAgo: 110, createdDaysAgo: 114, salaryMin: 110000, salaryMax: 150000, source: 'LinkedIn', tags: ['fintech'], stack: ['Vue', 'TypeScript'] },
  { ref: 'zalora', company: 'Stonebrook Retail', role: 'Software Engineer', status: 'rejected', reached: 'applied', appliedDaysAgo: 118, createdDaysAgo: 122, salaryMin: 105000, salaryMax: 145000, source: 'JobStreet', tags: ['ecommerce'], stack: ['React', 'PHP'] },
  { ref: 'lalamove', company: 'Quickstep Freight', role: 'Backend Engineer', status: 'rejected', reached: 'applied', appliedDaysAgo: 126, createdDaysAgo: 130, salaryMin: 120000, salaryMax: 165000, source: 'LinkedIn', tags: ['logistics'], stack: ['Node.js', 'MongoDB'] },
  { ref: 'ninjavan', company: 'Kestrel Logistics', role: 'Full Stack Engineer', status: 'rejected', reached: 'interviewing', appliedDaysAgo: 134, createdDaysAgo: 138, salaryMin: 115000, salaryMax: 158000, source: 'Kalibrr', tags: ['logistics'], stack: ['React', 'Java'] },
  { ref: 'tonik', company: 'Aurelia Bank', role: 'Frontend Engineer', status: 'rejected', reached: 'applied', appliedDaysAgo: 142, createdDaysAgo: 146, salaryMin: 108000, salaryMax: 148000, source: 'LinkedIn', tags: ['fintech'], stack: ['React', 'TypeScript'] },
  { ref: 'gitlab', company: 'Ravenswood OSS', role: 'Frontend Engineer', status: 'wishlist', reached: 'wishlist', appliedDaysAgo: null, createdDaysAgo: 9, salaryMin: 190000, salaryMax: 250000, source: 'Company site', tags: ['remote-first'], stack: ['Vue', 'Ruby'] },
  { ref: 'figma', company: 'Inkwell Design', role: 'Product Engineer', status: 'wishlist', reached: 'wishlist', appliedDaysAgo: null, createdDaysAgo: 7, salaryMin: 200000, salaryMax: 260000, source: 'LinkedIn', tags: ['design-tools'], stack: ['TypeScript', 'React'] },
  { ref: 'notion', company: 'Foldercraft', role: 'Software Engineer', status: 'wishlist', reached: 'wishlist', appliedDaysAgo: null, createdDaysAgo: 5, salaryMin: 195000, salaryMax: 255000, source: 'Kalibrr', tags: ['productivity'], stack: ['TypeScript', 'React'] },
  { ref: 'posthog', company: 'Beacon Analytics', role: 'Full Stack Engineer', status: 'wishlist', reached: 'wishlist', appliedDaysAgo: null, createdDaysAgo: 4, salaryMin: 170000, salaryMax: 225000, source: 'Company site', tags: ['analytics'], stack: ['React', 'Python'] },
  { ref: 'railway', company: 'Trackline Cloud', role: 'Platform Engineer', status: 'wishlist', reached: 'wishlist', appliedDaysAgo: null, createdDaysAgo: 3, salaryMin: 165000, salaryMax: 215000, source: 'JobStreet', tags: ['devtools'], stack: ['Go', 'Kubernetes'] },
  { ref: 'cursor', company: 'Glasswing AI', role: 'Software Engineer', status: 'wishlist', reached: 'wishlist', appliedDaysAgo: null, createdDaysAgo: 2, salaryMin: 210000, salaryMax: 280000, source: 'Referral', tags: ['ai'], stack: ['TypeScript', 'React'] },
]

const jd = (role: string, stack: string[]) =>
  `We are hiring a ${role}. You will work across ${stack.join(', ')}, ship to production weekly, ` +
  `and own features end to end. We value clear written communication and small reviewable changes. ` +
  `Experience with testing and observability is expected.`

function shift(now: Date, days: number): Date {
  const d = new Date(now.getTime())
  d.setDate(d.getDate() - days)
  return d
}

const dayOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Stable per-row variation, so stage durations differ without being random. */
function spread(ref: string, lo: number, hi: number): number {
  let h = 0
  for (const ch of ref) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return lo + (h % (hi - lo + 1))
}

const CHAIN: Reached[] = ['wishlist', 'applied', 'interviewing', 'offer']
const rank = (r: Reached) => CHAIN.indexOf(r)

function buildJobs(now: Date): Job[] {
  return SEEDS.map((seed) => {
    const created = shift(now, seed.createdDaysAgo)
    return {
      id: `demo-${seed.ref}`,
      user_id: DEMO_USER_ID,
      company: seed.company,
      role: seed.role,
      salary_min: seed.salaryMin,
      salary_max: seed.salaryMax,
      salary_currency: 'PHP',
      url: `https://careers.example.com/${seed.ref}`,
      description: jd(seed.role, seed.stack),
      status: seed.status,
      date_applied: seed.appliedDaysAgo === null ? null : dayOf(shift(now, seed.appliedDaysAgo)),
      notes: null,
      contact_name: seed.contact?.name ?? null,
      contact_email: seed.contact?.email ?? null,
      contact_linkedin: null,
      contact_notes: seed.contact?.notes ?? null,
      location: 'Remote',
      work_mode: 'remote',
      source: seed.source,
      is_referral: seed.source === 'Referral',
      tags: seed.tags,
      tech_stack: seed.stack,
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
    }
  })
}

function buildEvents(now: Date): CalendarEvent[] {
  const at = (days: number, hour: number) => {
    const d = shift(now, -days)
    d.setHours(hour, 0, 0, 0)
    return d.toISOString()
  }
  return [
    { id: 'demo-ev-1', job_id: 'demo-linear', user_id: DEMO_USER_ID, kind: 'interview', title: 'Technical interview', starts_at: at(1, 10), duration_minutes: 60, notes: null },
    { id: 'demo-ev-2', job_id: 'demo-supabase', user_id: DEMO_USER_ID, kind: 'take_home', title: 'Take-home due', starts_at: at(2, 17), duration_minutes: null, notes: null },
    { id: 'demo-ev-3', job_id: 'demo-vercel', user_id: DEMO_USER_ID, kind: 'interview', title: 'Hiring manager call', starts_at: at(4, 14), duration_minutes: 45, notes: null },
    { id: 'demo-ev-4', job_id: 'demo-stripe', user_id: DEMO_USER_ID, kind: 'deadline', title: 'Offer decision deadline', starts_at: at(6, 9), duration_minutes: null, notes: null },
    { id: 'demo-ev-5', job_id: 'demo-grab', user_id: DEMO_USER_ID, kind: 'follow_up', title: 'Follow up, no reply yet', starts_at: at(9, 11), duration_minutes: 15, notes: null },
  ]
}

function buildResumes(now: Date): ResumeSummary[] {
  return [
    {
      id: 'demo-cv-word',
      title: 'Software Engineer CV',
      mode: 'word',
      updated_at: shift(now, 3).toISOString(),
      sections: null,
      version: 4,
      hasVersions: true,
    },
    {
      id: 'demo-cv-latex',
      title: 'Software Engineer CV (LaTeX)',
      mode: 'latex',
      updated_at: shift(now, 21).toISOString(),
      sections: null,
      version: 2,
      hasVersions: true,
    },
  ]
}

/**
 * Everything below derives from the jobs above.
 *
 * The funnel's chain counts are "ever reached this stage or a later one",
 * which is why each seed records `reached` rather than the funnel inferring it
 * from the current status: a rejected row still got as far as it got, and
 * losing that would make Interviewing look emptier than the history was.
 */
function buildAnalytics(jobs: Job[]): DemoFixture['analytics'] {
  const bySeed = new Map(SEEDS.map((s) => [`demo-${s.ref}`, s]))
  const seedOf = (job: Job) => bySeed.get(job.id)!

  const timeInStage: TimeInStageMetric[] = (
    ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'] as JobStatus[]
  ).map((status) => {
    const rows = jobs.filter((j) => j.status === status)
    const days = rows.map((j) => spread(j.id + status, 3, 28)).sort((a, b) => a - b)
    const sum = days.reduce((s, d) => s + d, 0)
    return {
      status,
      avgDays: days.length ? Math.round((sum / days.length) * 10) / 10 : 0,
      medianDays: days.length ? days[Math.floor(days.length / 2)] : 0,
      minDays: days.length ? days[0] : 0,
      maxDays: days.length ? days[days.length - 1] : 0,
      count: rows.length,
    }
  })

  const reachedAtLeast = (r: Reached) =>
    jobs.filter((j) => rank(seedOf(j).reached) >= rank(r)).length
  const total = jobs.length
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10)

  const conversionFunnel: ConversionFunnelMetric[] = [
    { stage: 'Wishlist', count: total, percentage: 100, avgDaysToStage: 0, isExit: false },
    { stage: 'Applied', count: reachedAtLeast('applied'), percentage: pct(reachedAtLeast('applied')), avgDaysToStage: 4, isExit: false },
    { stage: 'Interviewing', count: reachedAtLeast('interviewing'), percentage: pct(reachedAtLeast('interviewing')), avgDaysToStage: 16, isExit: false },
    { stage: 'Offer', count: reachedAtLeast('offer'), percentage: pct(reachedAtLeast('offer')), avgDaysToStage: 34, isExit: false },
    {
      stage: 'Rejected',
      count: jobs.filter((j) => j.status === 'rejected').length,
      percentage: pct(jobs.filter((j) => j.status === 'rejected').length),
      avgDaysToStage: 21,
      isExit: true,
    },
  ]

  // Forward moves only -- the Sankey draws progress through the pipeline, and
  // a self-transition is not a move at all.
  const step = (from: Reached, to: Reached): StatusTransition => ({
    from: from as JobStatus,
    to: to as JobStatus,
    count: jobs.filter((j) => rank(seedOf(j).reached) >= rank(to)).length,
  })
  const rejectedFrom = (r: Reached): StatusTransition => ({
    from: r as JobStatus,
    to: 'rejected',
    count: jobs.filter((j) => j.status === 'rejected' && seedOf(j).reached === r).length,
  })
  const statusTransitions: StatusTransition[] = [
    step('wishlist', 'applied'),
    step('applied', 'interviewing'),
    step('interviewing', 'offer'),
    rejectedFrom('applied'),
    rejectedFrom('interviewing'),
  ].filter((t) => t.count > 0)

  const cohorts = new Map<string, Job[]>()
  for (const job of jobs) {
    if (!job.date_applied) continue
    const key = job.date_applied.slice(0, 7)
    const bucket = cohorts.get(key)
    if (bucket) bucket.push(job)
    else cohorts.set(key, [job])
  }
  const cohortAnalysis: CohortAnalysis[] = [...cohorts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, rows]) => {
      const offered = rows.filter((j) => rank(seedOf(j).reached) >= rank('offer')).length
      return {
        cohort,
        jobsApplied: rows.length,
        jobsInterviewing: rows.filter((j) => rank(seedOf(j).reached) >= rank('interviewing')).length,
        jobsOffered: offered,
        jobsRejected: rows.filter((j) => j.status === 'rejected').length,
        conversionRate: rows.length ? Math.round((offered / rows.length) * 1000) / 10 : 0,
        avgTimeToOffer: offered ? 34 : null,
      }
    })

  const conversionBySource: Record<string, number> = {}
  for (const job of jobs) {
    const source = job.source ?? 'unknown'
    const reachedInterview = rank(seedOf(job).reached) >= rank('interviewing')
    const seen = conversionBySource[source] ?? 0
    conversionBySource[source] = seen + (reachedInterview ? 1 : 0)
  }

  const offers = reachedAtLeast('offer')
  const conversionMetrics: ConversionMetrics = {
    totalJobs: total,
    timeToFirstInterview: 16,
    timeToOffer: 34,
    conversionRate: total ? Math.round((offers / total) * 1000) / 10 : 0,
    conversionBySource,
  }

  return { timeInStage, conversionFunnel, statusTransitions, cohortAnalysis, conversionMetrics }
}

export function buildDemoFixture(now: Date): DemoFixture {
  const jobs = buildJobs(now)
  return {
    jobs,
    events: buildEvents(now),
    resumes: buildResumes(now),
    analytics: buildAnalytics(jobs),
  }
}

/**
 * Built once at module load against the real clock. The routes import this;
 * tests that care about the date logic call `buildDemoFixture` with their own
 * `now` instead.
 */
export const DEMO: DemoFixture = buildDemoFixture(new Date())
