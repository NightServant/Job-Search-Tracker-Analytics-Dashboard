'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CssSpinner } from '@/components/ui/css-spinner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ChevronDownIcon, RotateCcwIcon, TrashIcon } from '@/components/icons'
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
    <div className="relative inline-block">
      <Button
        variant="secondary"
        size="s"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Versions
        <ChevronDownIcon size={14} aria-hidden className={isOpen ? 'rotate-180' : undefined} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-md border border-border-default bg-bg-canvas">
            <div className="border-b border-border-subtle p-4">
              <h3 className="text-heading-s text-text-primary">Version history</h3>
              <p className="mt-1 text-body-s text-text-muted">
                Restore a previous version of this CV. Autosaves are kept for reference.
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-4">
                <CssSpinner size={20} className="text-text-muted" />
              </div>
            ) : snapshots.length === 0 ? (
              <p className="p-4 text-body-s text-text-muted">
                No versions yet. Editing this CV snapshots it automatically.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {snapshots.map((snapshot, index) => (
                  <div key={snapshot.id} className="border-b border-border-subtle p-3">
                    <div className="mb-2">
                      <p className="text-body-s text-text-primary">
                        {index === 0 ? `Latest \u00b7 ${versionLabel(snapshot)}` : versionLabel(snapshot)}
                      </p>
                      <p className="text-body-s text-text-muted">
                        {formatSnapshotTime(snapshot.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="s"
                        onClick={() => void handleRestore(snapshot.id)}
                        disabled={isRestoring || index === 0}
                      >
                        <RotateCcwIcon size={14} aria-hidden />
                        {isRestoring ? 'Restoring...' : 'Restore'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="s"
                        aria-label="Remove this version"
                        onClick={() => handleDelete(snapshot.id)}
                      >
                        <TrashIcon size={14} aria-hidden />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        title="Delete this version?"
        body="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  )
}
