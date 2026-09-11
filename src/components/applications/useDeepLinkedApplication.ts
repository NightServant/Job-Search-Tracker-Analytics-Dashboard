'use client'

import * as React from 'react'
import type { Job } from '@/types'

/**
 * Reconciling the URL's opinion about what should be open with the list.
 *
 * THREE EFFECTS THAT EXIST FOR ONE REASON: a deep link can arrive before the
 * data it names, and the list can change underneath something already open.
 * They were three separate `useEffect`s in a 701-line component, each with its
 * own `useRef` guard and its own `eslint-disable` for exhaustive-deps, which is
 * the shape of logic nobody can safely edit in place.
 *
 * EVERY ONE OF THEM IS A "RUNS ONCE" EFFECT WITH A REF GUARD, and the guards
 * are not optional. `jobs` is in the dependency list because a link arriving
 * before the list has loaded must still open once it has -- but that means the
 * effect re-runs on every refetch, so without the ref it would reopen the
 * dialog every time the list refreshed, including immediately after somebody
 * closed it. That bug is what the refs prevent, and it is why the deps cannot
 * simply be narrowed to satisfy the linter.
 *
 * THE THIRD IS THE OPPOSITE DIRECTION: the open record stopped existing.
 * Delete is reachable from inside the dialog, so once the row leaves `jobs`
 * what remains on screen is a record of something that no longer exists, with
 * an edit button that would write it back. Keyed on the LIST rather than
 * wired into the delete callback, so it also covers a row deleted in another
 * tab and arriving through a refetch.
 */

export interface DeepLinkOptions {
  jobs: Job[]
  /** `?application=<id>`, from the desktop redirect off `/applications/<id>`. */
  initialOpenId: string | null
  /** `?add=<url>`, from the calendar's job feed. */
  initialAddUrl: string | null
  /** The id currently open, so the disappearance check has something to test. */
  openId: string | null
  onOpen: (job: Job) => void
  onOpenAdd: () => void
  /** Called when the open record leaves the list. */
  onVanished: () => void
}

export function useDeepLinkedApplication({
  jobs,
  initialOpenId,
  initialAddUrl,
  openId,
  onOpen,
  onOpenAdd,
  onVanished,
}: DeepLinkOptions): void {
  // Kept in refs so the callbacks can change identity between renders without
  // re-running an effect whose whole contract is "once per id".
  const handlers = React.useRef({ onOpen, onOpenAdd, onVanished })
  handlers.current = { onOpen, onOpenAdd, onVanished }

  // THE OPEN RECORD STOPPED EXISTING. When this fires the caller sets the
  // open id to null, so the next run returns at the first line and there is
  // no loop.
  React.useEffect(() => {
    if (!openId) return
    if (!jobs.some((candidate) => candidate.id === openId)) handlers.current.onVanished()
  }, [jobs, openId])

  // `?application=<id>`, once per id. See the docblock for why `jobs` is in
  // the deps and why the ref is what makes that safe.
  const openedInitial = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!initialOpenId || openedInitial.current === initialOpenId) return
    const job = jobs.find((candidate) => candidate.id === initialOpenId)
    if (!job) return
    openedInitial.current = initialOpenId
    handlers.current.onOpen(job)
  }, [initialOpenId, jobs])

  // `?add=<url>`, once per URL, for the same reason.
  const openedAdd = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!initialAddUrl || openedAdd.current === initialAddUrl) return
    openedAdd.current = initialAddUrl
    handlers.current.onOpenAdd()
  }, [initialAddUrl])
}
