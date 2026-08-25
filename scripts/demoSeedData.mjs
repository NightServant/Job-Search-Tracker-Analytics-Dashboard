// Demo dataset for the public read-only account.
//
// Pure and deterministic: no clock, no randomness, no network. The seed script
// does the I/O, this only decides what the demo should contain, which is why it
// can be unit tested. Re-running must produce an identical demo, otherwise
// screenshots and the landing page drift from what a visitor actually sees.

/** Fixed reference date so the demo reads the same on every run. */
const TODAY = '2026-08-25'

function daysBefore(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

const jd = (role, stack) =>
  `We are hiring a ${role}. You will work across ${stack.join(', ')}, ship to production weekly, ` +
  `and own features end to end. We value clear written communication and small reviewable changes. ` +
  `Experience with testing and observability is expected.`

const APPLICATIONS = [
  ['stripe', 'Stripe', 'Software Engineer', 'offer', 3, 180000, 240000, ['fintech'], ['TypeScript', 'React', 'Postgres']],
  ['linear', 'Linear', 'Product Engineer', 'interviewing', 8, 170000, 220000, ['product'], ['TypeScript', 'React']],
  ['vercel', 'Vercel', 'Frontend Engineer', 'interviewing', 12, 160000, 210000, ['devtools'], ['Next.js', 'React']],
  ['supabase', 'Supabase', 'Full Stack Engineer', 'interviewing', 15, 150000, 200000, ['devtools'], ['TypeScript', 'Postgres']],
  ['grab', 'Grab', 'Backend Engineer', 'applied', 6, 140000, 190000, ['seasia'], ['Go', 'Postgres']],
  ['gcash', 'GCash', 'Senior Frontend Engineer', 'applied', 9, 130000, 180000, ['fintech', 'ph'], ['React', 'TypeScript']],
  ['kumu', 'Kumu', 'Software Engineer', 'applied', 11, 90000, 130000, ['ph'], ['React', 'Node.js']],
  ['sprout', 'Sprout Solutions', 'Full Stack Engineer', 'applied', 14, 100000, 145000, ['ph', 'hr-tech'], ['React', 'Django']],
  ['shopee', 'Shopee', 'Web Engineer', 'applied', 17, 120000, 165000, ['seasia', 'ecommerce'], ['React', 'TypeScript']],
  ['canva', 'Canva', 'Frontend Engineer', 'applied', 19, 175000, 230000, ['design-tools'], ['React', 'TypeScript']],
  ['atlassian', 'Atlassian', 'Software Engineer', 'applied', 22, 165000, 215000, ['saas'], ['React', 'Java']],
  ['xendit', 'Xendit', 'Backend Engineer', 'applied', 24, 135000, 185000, ['fintech', 'seasia'], ['Go', 'Postgres']],
  ['maya', 'Maya', 'Platform Engineer', 'applied', 27, 125000, 175000, ['fintech', 'ph'], ['Kubernetes', 'Go']],
  ['coins', 'Coins.ph', 'Software Engineer', 'applied', 29, 115000, 160000, ['fintech', 'ph'], ['TypeScript', 'Node.js']],
  ['payretailers', 'PayRetailers', 'Frontend Engineer', 'rejected', 33, 110000, 150000, ['fintech'], ['Vue', 'TypeScript']],
  ['zalora', 'Zalora', 'Software Engineer', 'rejected', 36, 105000, 145000, ['ecommerce'], ['React', 'PHP']],
  ['lalamove', 'Lalamove', 'Backend Engineer', 'rejected', 40, 120000, 165000, ['logistics'], ['Node.js', 'MongoDB']],
  ['ninjavan', 'Ninja Van', 'Full Stack Engineer', 'rejected', 44, 115000, 158000, ['logistics'], ['React', 'Java']],
  ['tonik', 'Tonik Bank', 'Frontend Engineer', 'rejected', 48, 108000, 148000, ['fintech', 'ph'], ['React', 'TypeScript']],
  ['gitlab', 'GitLab', 'Frontend Engineer', 'wishlist', null, 190000, 250000, ['remote-first'], ['Vue', 'Ruby']],
  ['figma', 'Figma', 'Product Engineer', 'wishlist', null, 200000, 260000, ['design-tools'], ['TypeScript', 'React']],
  ['notion', 'Notion', 'Software Engineer', 'wishlist', null, 195000, 255000, ['productivity'], ['TypeScript', 'React']],
  ['posthog', 'PostHog', 'Full Stack Engineer', 'wishlist', null, 170000, 225000, ['analytics'], ['React', 'Python']],
  ['railway', 'Railway', 'Platform Engineer', 'wishlist', null, 165000, 215000, ['devtools'], ['Go', 'Kubernetes']],
  ['cursor', 'Cursor', 'Software Engineer', 'wishlist', null, 210000, 280000, ['ai'], ['TypeScript', 'React']],
  ['deel', 'Deel', 'Backend Engineer', 'applied', 31, 145000, 195000, ['remote-first'], ['Node.js', 'Postgres']],
  ['remote', 'Remote', 'Full Stack Engineer', 'applied', 38, 150000, 200000, ['remote-first'], ['React', 'Ruby']],
]

export function buildDemoDataset() {
  const jobs = APPLICATIONS.map(
    ([ref, company, role, status, daysAgo, min, max, tags, stack]) => ({
      ref,
      company,
      role,
      status,
      // wishlist was never sent, so it has no application date
      date_applied: daysAgo === null ? null : daysBefore(TODAY, daysAgo),
      salary_min: min,
      salary_max: max,
      salary_currency: 'PHP',
      description: jd(role, stack),
      tags,
      tech_stack: stack,
      is_referral: ref === 'stripe',
      location: 'Remote',
      work_mode: 'remote',
      source: 'LinkedIn',
    })
  )

  const events = [
    { jobRef: 'linear', kind: 'interview', title: 'Technical interview', startsInDays: 1, duration_minutes: 60 },
    { jobRef: 'vercel', kind: 'interview', title: 'Hiring manager call', startsInDays: 3, duration_minutes: 45 },
    { jobRef: 'supabase', kind: 'take_home', title: 'Take-home due', startsInDays: 2, duration_minutes: null },
    { jobRef: 'stripe', kind: 'deadline', title: 'Offer decision deadline', startsInDays: 5, duration_minutes: null },
  ]

  const activity = [
    { jobRef: 'stripe', note: 'Offer received, negotiating start date', daysAgo: 1 },
    { jobRef: 'stripe', note: 'Final round completed', daysAgo: 4 },
    { jobRef: 'linear', note: 'Recruiter call, 20 minute screen', daysAgo: 5 },
    { jobRef: 'vercel', note: 'Applied through referral', daysAgo: 12 },
    { jobRef: 'grab', note: 'Followed up, no response yet', daysAgo: 2 },
  ]

  const contacts = [
    { ref: 'dana', name: 'Dana Reyes', email: 'dana.reyes@example.com', linkedin: null, notes: 'Recruiter, responsive', jobRefs: ['stripe', 'linear'] },
    { ref: 'sam', name: 'Sam Cruz', email: 'sam.cruz@example.com', linkedin: null, notes: 'Referred me to Vercel', jobRefs: ['vercel'] },
  ]

  const cv = {
    title: 'Software Engineer CV',
    mode: 'structured',
    sections: {
      basics: {
        name: 'Demo Candidate',
        label: 'Software Engineer',
        email: 'demo@worktrack.app',
        phone: '+63 900 000 0000',
        location: 'Manila, Philippines',
        summary:
          'Software engineer focused on TypeScript, React and Postgres. Ships small reviewable changes and writes the tests first.',
      },
      work: [
        {
          company: 'Freelance', position: 'Software Engineer', location: 'Remote',
          startDate: '2024-01', endDate: null,
          highlights: [
            'Built a job application tracker with analytics and CV tooling',
            'Designed a Postgres schema with row level security on every table',
          ],
        },
      ],
      education: [
        {
          institution: 'Tarlac State University', studyType: 'BS', area: 'Information Technology',
          location: 'Tarlac', startDate: '2020-08', endDate: '2024-06', highlights: [],
        },
      ],
      skills: ['TypeScript', 'React', 'Postgres', 'Supabase', 'Testing'],
      projects: ['Worktrack — job search tracker'],
      awards: [],
    },
  }

  return { today: TODAY, jobs, events, activity, contacts, cv }
}
