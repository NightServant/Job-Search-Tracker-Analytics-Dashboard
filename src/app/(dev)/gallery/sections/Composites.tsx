'use client'

import { KpiStat } from '@/components/ui/kpi-stat'
import { ApplicationRow } from '@/components/ui/application-row'
import { JobCard } from '@/components/ui/job-card'
import { KanbanColumn } from '@/components/ui/kanban-column'
import { NavItem } from '@/components/ui/nav-item'
import { Sidebar } from '@/components/ui/sidebar'

function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-md border border-border-subtle p-4">
      <div className="space-y-1">
        <h3 className="text-heading-s text-text-primary">{title}</h3>
        {note && <p className="text-body-s text-text-muted">{note}</p>}
      </div>
      {children}
    </div>
  )
}

const ROWS = [
  { company: 'Canonical', role: 'Senior Frontend Engineer', status: 'interviewing' as const, salaryMin: 95000, salaryMax: 130000, currency: 'USD', date: '12 Aug' },
  { company: 'Grab', role: 'Product Engineer', status: 'applied' as const, salaryMin: 1800000, salaryMax: 2400000, currency: 'PHP', date: '09 Aug' },
  { company: 'Figma', role: 'Design Engineer', status: 'offer' as const, salaryMin: 160000, salaryMax: null, currency: 'USD', date: '04 Aug' },
  { company: 'Stripe', role: 'Fullstack Engineer', status: 'rejected' as const, salaryMin: null, salaryMax: null, currency: 'USD', date: '28 Jul' },
]

export function Composites() {
  return (
    <section className="space-y-4">
      <h2 className="text-heading-l">Composites</h2>
      <p className="text-body-s text-text-muted">
        Assembled from the primitives above. These add no styling of their own -- M5 builds screens
        from these and writes no new component CSS.
      </p>

      <Row title="KPI Stat" note="Tabular figures, so the strip does not reflow as numbers change.">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <KpiStat label="Applied" value={128} delta={{ value: '+12 this week', direction: 'up' }} />
          <KpiStat label="Interviewing" value={9} delta={{ value: '+2', direction: 'up' }} />
          <KpiStat label="Offers" value={2} delta={{ value: 'no change', direction: 'flat' }} />
          <KpiStat label="Response rate" value="18%" delta={{ value: '-3 pts', direction: 'down' }} />
        </div>
      </Row>

      <Row title="Application Row" note="Hairline rules between rows. Salary renders in the job own currency.">
        <div>
          {ROWS.map((r) => (
            <ApplicationRow key={r.company} {...r} />
          ))}
        </div>
      </Row>

      <Row title="Job Card and Kanban Column" note="A card only because it moves. No shadow, 4px radius.">
        <div className="flex gap-6 overflow-x-auto pb-2">
          <KanbanColumn title="Wishlist" count={2}>
            <JobCard company="Vercel" role="DX Engineer" status="wishlist" salaryMin={140000} salaryMax={175000} />
            <JobCard company="Linear" role="Frontend Engineer" status="wishlist" />
          </KanbanColumn>
          <KanbanColumn title="Applied" count={1}>
            <JobCard company="Grab" role="Product Engineer" status="applied" salaryMin={1800000} salaryMax={2400000} currency="PHP" />
          </KanbanColumn>
          <KanbanColumn title="Interviewing" count={1}>
            <JobCard company="Canonical" role="Senior Frontend Engineer" status="interviewing" salaryMin={95000} salaryMax={130000} />
          </KanbanColumn>
        </div>
      </Row>

      <Row title="Nav Item" note="Sidebar carries the number; the mobile bottom bar drops it for room.">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="w-56 space-y-1">
            <NavItem href="#" label="Overview" icon="Overview" index={1} />
            <NavItem href="#" label="Applications" icon="Applications" index={2} active />
            <NavItem href="#" label="Calendar" icon="Calendar" index={3} />
          </div>
          <div className="flex w-[375px] max-w-full items-stretch gap-1 border-t border-border-subtle pt-1">
            <NavItem href="#" label="Overview" icon="Overview" variant="bottom" />
            <NavItem href="#" label="Apps" icon="Applications" variant="bottom" active />
            <NavItem href="#" label="Calendar" icon="Calendar" variant="bottom" />
            <NavItem href="#" label="Docs" icon="Documents" variant="bottom" />
            <NavItem href="#" label="Stats" icon="Analytics" variant="bottom" />
          </div>
        </div>
      </Row>

      <Row title="Sidebar" note="Logo, nav, divider, settings, spacer, toggle, footer -- that order is from Figma.">
        <div className="h-[520px] w-60 overflow-hidden rounded-md border border-border-subtle">
          <Sidebar pathname="/jobs" className="border-r-0" />
        </div>
      </Row>
    </section>
  )
}
