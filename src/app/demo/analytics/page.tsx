import type { Metadata } from 'next'
import { DemoAnalytics } from './DemoAnalytics'

export const metadata: Metadata = {
  title: 'Demo · Analytics',
  description: 'Conversion, time-in-stage and salary insights, over invented data.',
}


/**
 * A server component with the metadata, over a client one with the picker.
 *
 * The range has to be state now -- picking a window recomputes the fixture's
 * five aggregates from the rows inside it -- and state needs a client
 * component, while `metadata` needs a server one. Two files, one screen.
 */
export default function Page() {
  return <DemoAnalytics />
}
