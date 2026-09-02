/**
 * Every string on the landing page, in one file.
 *
 * Two reasons, and the second is the one that matters. Copy changes far more
 * often than layout, so a rewrite should not be a diff across nine components.
 * And it makes the honesty constraint REVIEWABLE: every claim this page makes
 * about the product sits here, so "does the landing page say anything untrue"
 * is a question someone answers by reading one file rather than auditing nine
 * components' JSX.
 *
 * Lowercase chrome, sentence case for prose -- the rule M5.5 applied to the
 * app. The hero headline is the one display-size string the product allows.
 *
 * SOCIAL PROOF IS LOCKED. This project has one author and no users. There are
 * no testimonials, no user counts and no logo walls here, and adding any would
 * be the first thing a technical interviewer checks. Every proof tile below is
 * something a visitor verifies in under a minute.
 *
 * On the test-suite tile specifically: the plan required choosing between
 * quoting the suite size from a generated file and making the claim
 * qualitative. THIS FILE CHOOSES QUALITATIVE -- "every screen is covered by
 * tests", no figure. A number needs build-time generation to stay true, and a
 * "931 tests" line that says 931 forever is the same lie as a fabricated
 * testimonial, only slower. The claim as written stays true with no
 * maintenance. Landing.test.tsx asserts no digit-bearing claim appears in the
 * proof tiles, so reintroducing a figure is a red test.
 *
 * Hero copy is transcribed from Figma node 39:369, read 2026-09-02.
 */

import type { IconName } from '@/components/icons'

export const REPO_URL = 'https://github.com/NightServant/Job-Search-Tracker-Analytics-Dashboard'
export const COMMITS_URL = `${REPO_URL}/commits/main`

export const HERO = {
  eyebrow: 'job search tracker',
  headline: 'every application, every version of your cv, in one place.',
  body:
    'Track applications through five stages. See which CV you sent to which company, ' +
    'and which version. Get told when a company has gone quiet so you actually follow up.',
  /**
   * ONE call to action, and it leaves the site.
   *
   * Gabe, 2026-09-02: the hero's demo and create-account buttons were removed,
   * leaving only "read the source". Named `sourceCta` rather than
   * `tertiaryCta`, which was only ever a sensible name while a first and
   * second existed.
   *
   * The demo and the signup are still reachable -- `sign in` / `sign up` sit in
   * the navbar directly above, and the closing CTA carries both routes with
   * the sentence explaining what the demo is. The hero no longer competes with
   * either.
   *
   * The old `note` ("no signup · the demo opens with sample data, read only")
   * went with them: it annotated the demo button specifically, and copy that
   * explains a control which is no longer on screen reads as a leftover. The
   * same claim is made properly by CLOSING_CTA.demoNote, beside the button it
   * describes.
   */
  sourceCta: { label: 'read the source', href: REPO_URL },
} as const

export const NAV_LINKS = [
  // #solution, not #how-it-works: Section derives its id from its `name`, so
  // the anchor, the rail's target and the scroll tracking are all one string.
  { label: 'how it works', href: '#solution', external: false },
  { label: 'faq', href: '#faq', external: false },
  { label: 'open source', href: REPO_URL, external: true },
] as const

/**
 * The rail's sections, in page order.
 *
 * The ids are the same `data-landing-section` values the sections already
 * carry and the same anchors the nav jumps to -- one vocabulary, so a rename
 * cannot leave the rail pointing at a section that no longer exists.
 *
 * Labels are one word wherever one word will do. They are revealed on hover in
 * a 200px margin, not read as a list.
 */
export const RAIL_SECTIONS = [
  { id: 'hero', label: 'top' },
  { id: 'social-proof', label: 'proof' },
  { id: 'problem', label: 'the problem' },
  { id: 'solution', label: 'how it works' },
  { id: 'faq', label: 'faq' },
  { id: 'cta', label: 'get started' },
] as const

/**
 * Icons are named, not imported, so this file stays free of JSX and every
 * string and glyph the page shows sits together. `IconName` is the same key
 * the app's nav already looks up through the `icons` record, so a name that
 * does not exist is a type error rather than a blank square.
 */
export interface ProofTile {
  title: string
  body: string
  href: string
  linkLabel: string
  external: boolean
  icon: IconName
}

export const SOCIAL_PROOF: { heading: string; tiles: ProofTile[] } = {
  heading: 'no marketing claims, just things you can check',
  tiles: [
    {
      title: 'open source',
      icon: 'Documents',
      body: 'The whole application is readable, including the parts that are unfinished.',
      href: REPO_URL,
      linkLabel: 'read the repository',
      external: true,
    },
    {
      title: 'built in the open',
      icon: 'RotateCcw',
      body: 'Real commit history and real milestones, with the reasoning written down.',
      href: COMMITS_URL,
      linkLabel: 'read the commit log',
      external: true,
    },
    {
      title: 'tested',
      icon: 'Check',
      body: 'Every screen is covered by tests, and the suite runs on every commit.',
      href: `${REPO_URL}#testing`,
      linkLabel: 'how the suite is run',
      external: true,
    },
    {
      title: 'a real stack',
      icon: 'Lock',
      body: 'Next.js and TypeScript over Postgres, with row-level security on every table.',
      href: `${REPO_URL}#stack`,
      linkLabel: 'see the stack',
      external: true,
    },
  ],
}

export interface Pain {
  title: string
  body: string
  answer: string
  icon: IconName
}

export const PROBLEM: { heading: string; pains: Pain[] } = {
  heading: 'the job search falls apart in three predictable places',
  pains: [
    {
      title: 'the spreadsheet stops',
      icon: 'Clock',
      body: 'It is current for two weeks. By week three nobody updates it, and it quietly stops being true.',
      answer: 'A pipeline with five stages, and a status history that records every move.',
    },
    {
      title: 'you cannot tell what is working',
      icon: 'Analytics',
      body: 'Without knowing which channel produces interviews, effort goes wherever it feels productive.',
      answer: 'Analytics over your own applications: sources, conversion, and time in each stage.',
    },
    {
      title: 'the cv drifts',
      icon: 'Documents',
      body: 'A version is rewritten per application, and a month later there is no record of which one was sent.',
      answer: 'A CV editor with version snapshots, linked to the application it was sent with.',
    },
  ],
}

export interface ValueClaim {
  title: string
  body: string
  icon: IconName
}

export const SOLUTION: { heading: string; lede: string; claims: ValueClaim[] } = {
  heading: 'how it works',
  lede: 'Three surfaces, each answering one of the problems above.',
  claims: [
    {
      title: 'the pipeline',
      icon: 'Applications',
      body:
        'Every application moves through wishlist, applied, interviewing, offer and rejected. ' +
        'The board and the table are the same data, and every transition is kept.',
    },
    {
      title: 'the analytics',
      icon: 'Analytics',
      body:
        'Where applications come from, how many convert, and how long each stage takes. ' +
        'Computed from your own rows, so it is only ever as good as what you put in.',
    },
    {
      title: 'the cv editor',
      icon: 'Documents',
      body:
        'Word-style and LaTeX editors with version snapshots, plus an ATS check that reads ' +
        'the document rather than guessing at it.',
    },
  ],
}

export interface FaqEntry {
  question: string
  answer: string
}

/**
 * Exactly five. Gabe specified five, and the discipline is that a sixth
 * question means one of the five was not worth asking.
 *
 * Every answer here was checked against the code before it was written down.
 * The CSV claim is `buildJobsCsvText` in src/lib/jobCsv.ts, wired into
 * ApplicationsPage. The deletion claim is `delete_own_account`, called from
 * the Settings screen. An answer that needs a hedge gets the hedge -- a FAQ
 * that oversells is the fastest way to lose the reader it just convinced.
 */
export const FAQ: { heading: string; entries: FaqEntry[] } = {
  heading: 'questions worth asking first',
  entries: [
    {
      question: 'Is it free?',
      answer:
        'Yes, and there is no paid tier to upgrade to. It is a portfolio project rather than a ' +
        'business, which is worth knowing: nobody is being paid to keep it running.',
    },
    {
      question: 'Do I need an account to look around?',
      answer:
        'No. The demo is a set of ordinary pages with invented data in them, and it needs no ' +
        'sign-in at all. Nothing you do there is saved, because there is nothing to save it to.',
    },
    {
      question: 'What happens to my data?',
      answer:
        'It goes in a Postgres database with row-level security on every table, so each row is ' +
        'readable only by the account that created it. The privacy page names every table by name.',
    },
    {
      question: 'Can I export what I put in?',
      answer:
        'Yes. Applications export to CSV from the applications screen, and the same format imports ' +
        'back. Deleting your account removes the rows along with it.',
    },
    {
      question: 'Is it open source?',
      answer:
        'Yes, the whole thing, including the plans and the parts that are not finished. The commit ' +
        'history is the honest version of how it was built.',
    },
  ],
}

export const CLOSING_CTA = {
  heading: 'open the demo, or start your own',
  body: 'The demo needs nothing from you. An account takes an email and a password.',
  primary: { label: 'open the demo', href: '/demo/dashboard' },
  secondary: { label: 'create an account', href: '/signup' },
  demoNote:
    'The demo is invented data on public pages. It is read-only, nothing you type there is kept, ' +
    'and it is the same application the account version runs.',
} as const

export const FOOTER = {
  tagline: 'A job search tracker with analytics and a CV builder.',
  links: [
    { label: 'privacy', href: '/privacy', external: false },
    { label: 'sign in', href: '/login', external: false },
    { label: 'source', href: REPO_URL, external: true },
  ],
  lineage:
    'Originally built by Ensues (Janssen Quiambao); continued by @NightServant.',
} as const
