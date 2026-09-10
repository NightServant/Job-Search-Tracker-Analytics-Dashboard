import type { ActivityEntry } from '@/services/activityLog'
import type { DocumentLinkSummary } from '@/services/applicationDocuments'
import type { CalendarEvent } from '@/services/events'
import type { KeywordMatch } from '@/services/atsMatch'
import type { JobStatusHistoryEntry } from '@/types'

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
  /**
   * Every status this application has moved through.
   *
   * The pipeline bar needs it and nothing else does: a rejected application
   * shows `wishlist -> applied -> interviewing -> rejected` only if it
   * actually sat at interviewing, and current status alone cannot answer
   * that. Empty is a real answer -- a CSV import has no history -- and the
   * bar claims the shorter run when it gets one.
   */
  history: JobStatusHistoryEntry[]
  links: DocumentLinkSummary[]
  nextEvent: CalendarEvent | null
  /**
   * The interview booked against this application, if one is.
   *
   * SEPARATE FROM `nextEvent`, which is whatever is soonest of ANY kind -- a
   * deadline, a take-home, a follow-up. The record's interview field edits
   * one specific row and has to seed itself from that row, not from whichever
   * event happens to be next; and a past interview still has to appear in the
   * box, which `nextEvent` (upcoming only) would never show.
   */
  interview: CalendarEvent | null
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
  history: [],
  links: [],
  nextEvent: null,
  interview: null,
  match: null,
}
