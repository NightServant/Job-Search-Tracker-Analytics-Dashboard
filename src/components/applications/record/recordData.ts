import type { ActivityEntry } from '@/services/activityLog'
import type { DocumentLinkSummary } from '@/services/applicationDocuments'
import type { CalendarEvent } from '@/services/events'
import type { KeywordMatch } from '@/services/atsMatch'

/**
 * Everything the application record shows that does not live on the `jobs`
 * row itself -- four secondary reads plus the ATS match derived from two of
 * them.
 *
 * It is ONE type rather than eight loose props because there are now two
 * surfaces rendering the same record (the desktop dialog and the mobile
 * page), and eight props threaded through both is eight chances for them to
 * drift apart. A surface either has this object or it does not.
 *
 * Each `*Error` flag marks its own panel's read as failed rather than empty:
 * four independent reads, four independent ways to fail, so a single
 * record-level error boolean would blur which panel to blame and would
 * wrongly flag the others as broken too. `atsError` covers the CV text read
 * specifically -- `match` alone cannot distinguish "no CV to compare
 * against" from "the CV read failed".
 */
export interface ApplicationRecordData {
  activity: ActivityEntry[]
  links: DocumentLinkSummary[]
  nextEvent: CalendarEvent | null
  match: KeywordMatch | null
  activityError?: boolean
  linksError?: boolean
  nextEventError?: boolean
  atsError?: boolean
  /**
   * The secondary reads are still in flight. The record renders its header
   * and the fields off the `jobs` row immediately either way -- those come
   * from the list that was already loaded -- and only the four panels below
   * wait. Blocking the whole dialog on them would make opening a row feel
   * slower than it is, for data the reader has not scrolled to yet.
   */
  loading?: boolean
}

/**
 * What a surface passes when it has no secondary reads at all: the demo,
 * which is a fixture with no activity or document-link tables behind it, and
 * a brand-new application, which has no id to read anything against yet.
 *
 * Empty, never "failed" -- these panels genuinely have nothing, and the
 * error copy would name a fetch that was never attempted.
 */
export const EMPTY_RECORD_DATA: ApplicationRecordData = {
  activity: [],
  links: [],
  nextEvent: null,
  match: null,
}
