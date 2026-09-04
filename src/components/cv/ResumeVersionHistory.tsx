'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ChevronDownIcon, RotateCcwIcon, TrashIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { useToast } from '@/contexts/ToastContext'
import {
  getSnapshots,
  getSnapshot,
  deleteSnapshot,
  type ResumeSnapshotMeta,
} from '@/services/resumeSnapshotService'
import { formatSnapshotTime } from '@/services/date'

/**
 * The editor's own version control: restore or delete a snapshot of the CV
 * currently open.
 *
 * Moved out of `src/components/resume/` when `ResumePage` was split, and kept
 * rather than deleted -- both editors render it, so the plan's instruction to
 * delete it assumed the editors were going away too. `components/documents/
 * VersionHistory` is the list-screen surface and is not a replacement: it can
 * only tell you what versions exist. Restoring belongs here, where the thing
 * about to be overwritten is on screen.
 *
 * Behaviour is unchanged from the original; the chrome is M4 -- hairline
 * rules, 4px radius, no indigo `primary-*`, no shadow, and no lucide. `Clock`
 * went with the four glyphs the icon set eliminated, so the trigger is text.
 *
 * The panel is a real `Popover`, not the hand-rolled `absolute right-0
 * top-full` div it used to be. `right-0` pins a panel's RIGHT edge to the
 * trigger's right edge, so a 384px panel hung 384px to the LEFT of a trigger
 * that sits near the left of the page -- off the viewport and across the
 * sidebar, which is what Gabe screenshotted. Base UI's positioner anchors to
 * the trigger, flips when it would overflow, and portals out so no ancestor's
 * overflow or stacking context can clip it. It also replaces the hand-rolled
 * click-outside overlay, which was a `fixed inset-0` that swallowed the first
 * click anywhere on the page.
 */
interface ResumeVersionHistoryProps {
  resumeId: string
  userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRestore: (content: any) => Promise<void>
}

/**
 * A snapshot's name is the number the database gave it, never its position in
 * this list.
 *
 * Snapshots are capped at ten per CV and the oldest are pruned, so position
 * and version diverge permanently the first time a CV passes ten. Numbering by
 * position made this panel call a row "Version 10" while `/documents`, reading
 * the same column, called it v12.
 */
function versionLabel(snapshot: ResumeSnapshotMeta): string {
  return typeof snapshot.version === 'number' ? `v${snapshot.version}` : 'Unnumbered'
}

export function ResumeVersionHistory({ resumeId, userId, onRestore }: ResumeVersionHistoryProps) {
  const { success, error: showError } = useToast()
  const [snapshots, setSnapshots] = useState<ResumeSnapshotMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const loadSnapshots = async () => {
    setIsLoading(true)
    try {
      const data = await getSnapshots(resumeId, userId)
      setSnapshots(data)
    } catch (err) {
      showError('Failed to load versions', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadSnapshots()
    }
  }, [isOpen])

  const handleRestore = async (snapshotId: string) => {
    setIsRestoring(true)
    try {
      const snapshot = await getSnapshot(snapshotId, userId)
      await onRestore(snapshot.content)
      success('Version restored', 'CV has been restored to the selected version.')
      setIsOpen(false)
    } catch (err) {
      showError('Restore failed', err instanceof Error ? err.message : 'Could not restore version')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDelete = (snapshotId: string) => setPendingDeleteId(snapshotId)

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    const snapshotId = pendingDeleteId
    try {
      await deleteSnapshot(snapshotId, userId)
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId))
      success('Version deleted', 'The snapshot has been removed.')
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Could not delete version')
    } finally {
      setPendingDeleteId(null)
    }
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button variant="secondary" size="s">
              versions
              <ChevronDownIcon
                size={14}
                aria-hidden
                className={isOpen ? 'rotate-180' : undefined}
              />
            </Button>
          }
        />

        {/* align="start", so the panel opens along the trigger's LEFT edge and
            runs rightwards into the page rather than backwards over the
            sidebar. p-0, because the rows carry their own padding and the
            popover's default 10px would double it. */}
        <PopoverContent align="start" className="w-96 gap-0 p-0">
          <PopoverHeader className="border-b border-border-subtle p-4">
            <PopoverTitle className="text-heading-s text-text-primary">
              version history
            </PopoverTitle>
            <PopoverDescription className="text-body-s text-text-muted">
              restore a previous version of this CV. autosaves are kept for reference.
            </PopoverDescription>
          </PopoverHeader>

          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-20 w-full" />
            </div>
          ) : snapshots.length === 0 ? (
            <p className="p-4 text-body-s text-text-muted">
              no versions yet. editing this CV snapshots it automatically.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {snapshots.map((snapshot, index) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between gap-3 border-b border-border-subtle p-3 last:border-b-0"
                >
                  {/* The label and its controls on one line, not stacked: a
                      stacked row made every entry twice as tall as it needed
                      to be and pushed the tenth snapshot out of reach. */}
                  <div className="min-w-0">
                    <p className="truncate text-body-s text-text-primary">
                      {index === 0
                        ? `latest \u00b7 ${versionLabel(snapshot)}`
                        : versionLabel(snapshot)}
                    </p>
                    <p className="text-body-s text-text-muted">
                      {formatSnapshotTime(snapshot.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="secondary"
                      size="s"
                      onClick={() => void handleRestore(snapshot.id)}
                      // The latest version IS what is on screen, so restoring
                      // it is a no-op dressed up as an action.
                      disabled={isRestoring || index === 0}
                    >
                      <RotateCcwIcon size={14} aria-hidden className={iconMotion('back')} />
                      {isRestoring ? 'restoring...' : 'restore'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="s"
                      aria-label={`Remove ${versionLabel(snapshot)}`}
                      onClick={() => handleDelete(snapshot.id)}
                    >
                      <TrashIcon size={14} aria-hidden className={iconMotion('lid')} />
                      remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        title="delete this version?"
        body="This cannot be undone."
        confirmLabel="delete"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  )
}
