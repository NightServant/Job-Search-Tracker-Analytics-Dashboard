import { useState, useEffect } from 'react'
import { Clock, Trash2, RotateCcw, ChevronDown } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  getSnapshots,
  getSnapshot,
  deleteSnapshot,
  formatSnapshotTime,
  type ResumeSnapshotMeta,
} from '@/services/resumeSnapshotService'

interface ResumeVersionHistoryProps {
  resumeId: string
  userId: string
  onRestore: (content: any) => Promise<void>
}

export function ResumeVersionHistory({ resumeId, userId, onRestore }: ResumeVersionHistoryProps) {
  const { success, error: showError } = useToast()
  const [snapshots, setSnapshots] = useState<ResumeSnapshotMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

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

  const handleDelete = async (snapshotId: string) => {
    if (!window.confirm('Delete this version? This cannot be undone.')) return

    try {
      await deleteSnapshot(snapshotId, userId)
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId))
      success('Version deleted', 'The snapshot has been removed.')
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Could not delete version')
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary inline-flex items-center gap-1.5"
        title="View version history"
      >
        <Clock className="w-4 h-4" />
        Versions
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-96 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Version History</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Restore previous versions of your resume. Auto-saves are kept for reference.
              </p>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Loading versions...
              </div>
            ) : snapshots.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No version snapshots yet. Start editing to create versions.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {snapshots.map((snapshot, index) => (
                  <div
                    key={snapshot.id}
                    className="border-b border-zinc-100 dark:border-zinc-900 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {index === 0 ? 'Latest' : `Version ${snapshots.length - index}`}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {formatSnapshotTime(snapshot.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRestore(snapshot.id)}
                        disabled={isRestoring || index === 0}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {isRestoring ? 'Restoring...' : 'Restore'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(snapshot.id)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
