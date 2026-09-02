import type { Metadata } from 'next'
import Link from 'next/link'
import { BrandLockup } from '@/components/ui/brand-mark'
import { SiteFooter } from '@/components/landing/SiteFooter'

export const metadata: Metadata = {
  title: 'Privacy — Worktrack',
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
 * NO REGION, NO RETENTION PERIOD, NO THIRD PARTY. The plan was explicit: name
 * the region if it is known at write time, do not guess it. It is not known
 * here. The same rule kills the two other sentences every template supplies --
 * a retention period nothing enforces, and an analytics vendor this app does
 * not use. Saying less and meaning all of it is the whole point.
 *
 * It is a plain document rather than a designed page. Long-form legal text
 * wants one column at a readable measure and hierarchy from headings alone;
 * the landing page's section rhythm would break it into slabs.
 *
 * Root-level, outside `(app)`, so a signed-out visitor can read it -- which is
 * the only state a person deciding whether to sign up is ever in.
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

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas">
      {/* Same measure as the article, so the lockup and the H1 share a line. */}
      <header className="w-full px-5 py-6 md:px-8">
        <div className="mx-auto w-full max-w-[68ch]">
          <Link href="/" aria-label="Worktrack home">
            <BrandLockup />
          </Link>
        </div>
      </header>

      <main className="w-full flex-1 px-5 py-16 md:px-8 md:py-24">
        <article className="mx-auto flex w-full max-w-[68ch] flex-col gap-12">
          <div className="flex flex-col gap-4">
            <h1 className="text-display-m font-bold text-text-primary">Privacy</h1>
            <p className="text-body-l font-normal text-text-secondary">
              What this application stores, where it lives, who can read it, and how
              to remove it. It is written from the database schema, not from a
              template — every table named below is one this application really has.
            </p>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="text-heading-l font-bold text-text-primary">What is stored</h2>
            <p className="text-body-m font-normal text-text-secondary">
              Everything here is something you typed or something computed from it.
              The application does not buy, import or infer data about you.
            </p>
            <dl className="flex flex-col border-t border-border-subtle">
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

          <section className="flex flex-col gap-4">
            <h2 className="text-heading-l font-bold text-text-primary">Where it is stored</h2>
            <p className="text-body-m font-normal text-text-secondary">
              In a Postgres database hosted by Supabase, together with the
              authentication service that holds your login. Nothing is copied to any
              other service: there is no analytics vendor, no advertising network and
              no third-party tracking on this application.
            </p>
            <p className="text-body-m font-normal text-text-secondary">
              This page does not state a hosting region, because stating one that
              later turns out to be wrong would be worse than saying nothing.
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-heading-l font-bold text-text-primary">Who can read it</h2>
            <p className="text-body-m font-normal text-text-secondary">
              You, and no other user. Row-level security is enabled on every table
              listed above, and every policy scopes rows to the signed-in user id —
              so a request for someone else&apos;s row returns nothing rather than
              being filtered out afterwards by the interface. The rule is enforced by
              the database, which means it holds even if a bug in this application
              asks for the wrong thing.
            </p>
            <p className="text-body-m font-normal text-text-secondary">
              The demo pages are the one exception, and they contain no real data:
              every figure there is invented, and the demo accounts are read-only.
            </p>
            <p className="text-body-m font-normal text-text-secondary">
              The people who operate the Supabase project can read the database, as
              is true of any hosted application. This project is open source, so the
              policies making those claims can be read rather than taken on trust.
            </p>
          </section>

          <section className="flex flex-col gap-4">
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
              <span className="tabular">delete_own_account</span>, which removes your
              authentication record; every table above is keyed to it and cascades, so
              your rows go with it.
            </p>
            <p className="text-body-m font-normal text-text-secondary">
              It is immediate and it cannot be undone. There is no grace period and no
              archived copy kept on purpose — backups taken before the deletion expire
              on their own schedule.
            </p>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
