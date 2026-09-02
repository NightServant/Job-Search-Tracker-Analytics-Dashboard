import { AppShell } from '@/components/shell/AppShell'
import { DemoBanner } from '@/components/shell/DemoBanner'
import { DEMO_NAV } from './nav'

/**
 * The demo shell: the real AppShell, with no auth guard and a demo-scoped nav.
 *
 * NOTHING HERE TOUCHES AUTH. /demo/* is a public URL space rendering the app's
 * screens over a fixture in the repository -- settled 2026-09-02, replacing an
 * earlier design that signed visitors into a shared account with published
 * credentials. That change dissolved more work than it created: no credentials
 * to publish, no RESTRICTIVE demo policies, no write-gating on five screens, no
 * reseed runbook, and no way for a stranger to vandalise the demo, because the
 * data is a file and there is no write path to it.
 *
 * It also means a signed-in visitor who opens the demo stays signed in. That
 * was the open question this milestone carried from 2026-08-28, and moving the
 * demo to a URL space answered it rather than solving it.
 *
 * `settingsHref={null}` because there is no demo settings screen: settings act
 * on an account, and there is no account here.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell nav={DEMO_NAV} settingsHref={null} banner={<DemoBanner />}>
      {children}
    </AppShell>
  )
}
