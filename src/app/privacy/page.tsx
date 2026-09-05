import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLockup } from '@/components/ui/brand-mark'
import { HomeOrDashboardLink } from '@/components/auth/HomeOrDashboardLink'
import { SessionAttributeScript } from '@/components/auth/SessionAttributeScript'
import { SessionAttributeSync } from '@/components/auth/SessionAttributeSync'

export const metadata: Metadata = {
  // Just 'Privacy'. The root layout's title.template appends the product name,
  // so spelling it out here produced "Privacy — Worktrack · Worktrack".
  title: 'Privacy',
  description: 'What Worktrack stores, where it lives, who can read it, and how to delete it.',
}

/**
 * The privacy policy, written from the schema rather than from a template.
 *
 * EVERY TABLE NAMED HERE EXISTS, AND EVERY TABLE THAT EXISTS IS NAMED. That is
 * asserted in both directions by page.test.tsx, which reads
 * supabase/migrations/ and compares. A policy assembled from a generator lists
 * things the product does not have and omits things it does -- and unlike most
 * inaccurate copy, this kind has legal weight. Tying the test to the
 * migrations means adding a table without updating this page fails the suite,
 * which is the only mechanism that keeps a document like this honest a year
 * from now.
 *
 * NO REGION AND NO RETENTION PERIOD. The plan was explicit: name the region if
 * it is known at write time, do not guess it. It is not known here, and a
 * retention period nothing enforces is the other sentence every template
 * supplies. Saying less and meaning all of it is the whole point.
 *
 * THE ANALYTICS SECTION IS NOT BOILERPLATE, it is a correction. This page used
 * to say there was "no analytics vendor, no advertising network and no
 * third-party tracking" -- true when written, and made false the moment Vercel
 * Web Analytics was added. A privacy policy that describes the previous
 * version of the product is worse than a vague one, because it is confidently
 * wrong. It ships in the same commit as the analytics for that reason.
 *
 * It also states that no AI is used. That is currently true and worth saying
 * out loud, because "does this thing feed my CV to a model" is the first
 * question a reasonable person asks of a CV tool in 2026.
 *
 * TWO COLUMNS ON DESKTOP, ONE ON MOBILE. The first version was a single
 * centred `max-w-[68ch]` column, which is right for the TEXT and wrong for the
 * SCREEN: at 1280px it left roughly 300px of empty margin on either side and
 * read as a phone layout someone had opened on a laptop. Gabe called it on
 * 2026-09-03.
 *
 * The fix is not a wider measure. Long-form prose past about 70 characters is
 * genuinely harder to read -- the eye loses the line on the return sweep --
 * so widening the paragraphs would trade an ugly page for an unreadable one.
 * What the space is worth is ORIENTATION: a sticky index down the left that
 * says how long the document is and lets someone jump to the section they
 * actually came for, which for a privacy policy is almost always deletion.
 * The prose keeps its measure and the screen stops looking empty.
 *
 * The index is `<nav>` with a real heading, not a decorative list, and it is
 * hidden below lg -- where there is no margin to put it in, and where the
 * document is short enough to scroll.
 *
 * Otherwise it is a plain document. Hierarchy comes from headings alone; the
 * landing page's section rhythm would break legal text into slabs.
 *
 * Root-level, outside `(app)`, so a signed-out visitor can read it -- which is
 * the only state a person deciding whether to sign up is ever in.
 *
 * NO SITE FOOTER, on Gabe's call. The footer carries the marketing page's own
 * navigation -- privacy, sign in, source, the attribution block -- and one of
 * those links points back at this page. A document that ends by offering to
 * take you to itself is a small absurdity, and the rest of it is a second set
 * of destinations competing with the one control this page actually needs.
 * That control is now in the header, where somebody who stepped out of a
 * signup flow will look for it rather than having to reach the end of a legal
 * document to find it.
 */

const STORED: { table: string; what: string }[] = [
  { table: 'jobs', what: 'The applications you add: company, role, status, salary, notes and the job description.' },
  { table: 'job_status_history', what: 'Every status change on an application, so the pipeline can show how long each stage took.' },
  { table: 'events', what: 'Calendar entries you create — interviews, deadlines and reminders.' },
  { table: 'activity_log', what: 'Notes and activity you record against an application.' },
  { table: 'contacts', what: 'People you add: name, role, and whatever contact details you enter.' },
  { table: 'application_contacts', what: 'Which contacts are linked to which application.' },
  { table: 'resumes', what: 'CVs you write in the editor, including their content and their section structure.' },
  { table: 'resume_snapshots', what: 'Version snapshots of those CVs, so an earlier draft can be restored.' },
  { table: 'application_documents', what: 'Links between an application and the CV version sent with it.' },
  { table: 'user_preferences', what: 'Your settings, such as default currency.' },
  { table: 'analytics_cache', what: 'Computed results of your own analytics, stored so the charts do not recalculate on every visit.' },
  { table: 'demo_accounts', what: 'The identifiers of the public read-only demo accounts. It holds no data belonging to you.' },
]

/**
 * The index and the document are the same list. A hand-kept table of contents
 * is a second copy of the structure, and the copy is what goes stale.
 */
const SECTIONS = [
  { id: 'stored', title: 'What is stored' },
  { id: 'where', title: 'Where it is stored' },
  { id: 'analytics', title: 'Analytics and third parties' },
  { id: 'who', title: 'Who can read it' },
  { id: 'deleting', title: 'Deleting your account' },
] as const

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas">
      {/* First, so the header below is right on its first paint rather than
          corrected a beat later. */}
      <SessionAttributeScript />
      <SessionAttributeSync />
      {/*
        Same container as the body below, so the lockup and the H1 share a
        vertical line at every width.

        THE WAY BACK IS AN EXPLICIT BUTTON, not just the lockup. A clickable
        wordmark is a convention people who build websites know and people
        reading a privacy policy do not -- and this page is reached most often
        from a footer link mid-signup, so the reader is somebody who stepped
        out of a flow and needs an obvious way back into it. The lockup still
        links home for anyone who expects it to; the button is for everyone
        else.
      */}
      <header className="w-full border-b border-border-subtle px-5 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-6">
          <Link href="/" aria-label="Worktrack home">
            <BrandLockup />
          </Link>
          <HomeOrDashboardLink />
        </div>
      </header>

      <main className="w-full flex-1 px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          {/*
            Sticky, and `top-16` rather than `top-0` so it does not sit flush
            against the viewport edge while the document scrolls past it.
            `self-start` is what lets a grid item be sticky at all -- the
            default `stretch` makes it as tall as the row, and an element as
            tall as its container has nothing to stick within.
          */}
          <nav
            data-privacy-toc
            aria-labelledby="toc-heading"
            className="hidden self-start lg:sticky lg:top-16 lg:block"
          >
            <h2
              id="toc-heading"
              className="text-label-caps font-bold uppercase text-text-muted"
            >
              On this page
            </h2>
            <ol className="mt-4 flex flex-col gap-3 border-l border-border-subtle">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent pl-4 text-body-m font-normal text-text-secondary transition-colors hover:border-accent-default hover:text-text-primary"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="flex w-full max-w-[68ch] flex-col gap-12">
            <div className="flex flex-col gap-4">
              <h1 className="text-display-m font-bold text-text-primary">Privacy</h1>
              <p className="text-body-l font-normal text-text-secondary">
                What this application stores, where it lives, who can read it, and
                how to remove it. It is written from the database schema, not from a
                template — every table named below is one this application really
                has.
              </p>
            </div>

            <section id="stored" className="flex scroll-mt-16 flex-col gap-4">
              <h2 className="text-heading-l font-bold text-text-primary">What is stored</h2>
              <p className="text-body-m font-normal text-text-secondary">
                Everything here is something you typed or something computed from it.
                The application does not buy, import or infer data about you.
              </p>
              {/*
                The table breaks OUT of the article's reading measure on wide
                screens. It is reference material rather than prose -- scanned
                by column, not read line by line -- so the 68ch cap that
                protects the paragraphs only cramps it here.
              */}
              <dl className="flex flex-col border-t border-border-subtle lg:w-[calc(100%+8rem)]">
                {STORED.map((row) => (
                  <div
                    key={row.table}
                    className="grid grid-cols-1 gap-x-8 gap-y-1 border-b border-border-subtle py-4 md:grid-cols-[14rem_minmax(0,1fr)]"
                  >
                    <dt className="tabular text-body-s font-normal text-text-muted">
                      {row.table}
                    </dt>
                    <dd className="text-body-m font-normal text-text-secondary">{row.what}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-body-m font-normal text-text-secondary">
                Your email address and password are held by Supabase Auth, not in any
                of the tables above. Passwords are stored only as a bcrypt hash; this
                application never sees the password itself.
              </p>
            </section>

            <section id="where" className="flex scroll-mt-16 flex-col gap-4">
              <h2 className="text-heading-l font-bold text-text-primary">Where it is stored</h2>
              <p className="text-body-m font-normal text-text-secondary">
                In a Postgres database hosted by Supabase, together with the
                authentication service that holds your login. None of it is
                copied to any other service.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                This page does not state a hosting region, because stating one that
                later turns out to be wrong would be worse than saying nothing.
              </p>
            </section>

            <section id="analytics" className="flex scroll-mt-16 flex-col gap-4">
              <h2 className="text-heading-l font-bold text-text-primary">
                Analytics and third parties
              </h2>
              <p className="text-body-m font-normal text-text-secondary">
                This site counts page views using{' '}
                <Link
                  href="https://vercel.com/docs/analytics/privacy-policy"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent-default underline underline-offset-4"
                >
                  Vercel Web Analytics
                </Link>
                . It records which pages are visited, and where visits came from
                in the broadest sense — it sets{' '}
                <strong className="font-bold text-text-primary">no cookies</strong>,
                assigns no identifier, and does not follow you between sites or
                between visits. That is why there is no cookie banner: there is
                nothing to consent to.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                It is not linked to your account. Nothing you type, and no row
                belonging to you, is sent to it.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                There is no advertising network, no session recorder, no
                cross-site tracking pixel, and no data broker. Vercel and
                Supabase — the two companies that host this application — are
                the only third parties involved at all, and neither receives
                anything beyond what running it requires.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                No AI is used anywhere in this application. Nothing you write is
                sent to a language model, and no feature here is generated by
                one. If that changes, this page changes with it.
              </p>
            </section>

            <section id="who" className="flex scroll-mt-16 flex-col gap-4">
              <h2 className="text-heading-l font-bold text-text-primary">Who can read it</h2>
              <p className="text-body-m font-normal text-text-secondary">
                You, and no other user. Row-level security is enabled on every table
                listed above, and every policy scopes rows to the signed-in user id —
                so a request for someone else&apos;s row returns nothing rather than
                being filtered out afterwards by the interface. The rule is enforced
                by the database, which means it holds even if a bug in this
                application asks for the wrong thing.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                The demo pages are the one exception, and they contain no real data:
                every figure there is invented, and the demo accounts are read-only.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                The people who operate the Supabase project can read the database, as
                is true of any hosted application. This project is open source, so
                the policies making those claims can be read rather than taken on
                trust.
              </p>
            </section>

            <section id="deleting" className="flex scroll-mt-16 flex-col gap-4">
              <h2 className="text-heading-l font-bold text-text-primary">
                Deleting your account
              </h2>
              <p className="text-body-m font-normal text-text-secondary">
                There is a delete control in{' '}
                <Link
                  href="/settings"
                  className="text-accent-default underline underline-offset-4"
                >
                  Settings
                </Link>
                . It calls a database function named{' '}
                <span className="tabular">delete_own_account</span>, which removes
                your authentication record; every table above is keyed to it and
                cascades, so your rows go with it.
              </p>
              <p className="text-body-m font-normal text-text-secondary">
                It is immediate and it cannot be undone. There is no grace period and
                no archived copy kept on purpose — backups taken before the deletion
                expire on their own schedule.
              </p>
            </section>
          </article>
        </div>
      </main>
    </div>
  )
}
