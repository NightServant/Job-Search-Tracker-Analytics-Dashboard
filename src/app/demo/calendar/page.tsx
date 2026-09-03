import type { Metadata } from 'next'
import { Calendar } from '@/components/calendar/Calendar'
import { DEMO } from '@/lib/demoFixture'

export const metadata: Metadata = {
  title: 'Demo · Calendar',
  description: 'Interviews and deadlines on a month grid, over invented data.',
}


/**
 * Built once at module scope rather than in a useMemo: the fixture never
 * changes, so there is nothing to memoise against.
 */
const companyByJobId = Object.fromEntries(DEMO.jobs.map((job) => [job.id, job.company]))

export default function Page() {
  return <Calendar events={DEMO.events} companyByJobId={companyByJobId} />
}
