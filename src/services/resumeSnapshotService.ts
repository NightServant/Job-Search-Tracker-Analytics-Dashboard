import { supabase } from '@/lib/supabase'
import type { JSONContent } from '@tiptap/core'

export type ResumeSnapshot = {
  id: string
  resume_id: string
  user_id: string
  content: JSONContent | { type: 'latex'; source: string }
  created_at: string
}

export type ResumeSnapshotMeta = {
  id: string
  resume_id: string
  created_at: string
  label?: string
  /**
   * `resume_snapshots.version` -- monotonic per resume and stable across
   * deletes of other snapshots. Nullable because the column was added after
   * the table (migration `20260825040236`) and backfilled; rows written before
   * that and never backfilled have none.
   */
  version?: number | null
}

const MAX_SNAPSHOTS_PER_RESUME = 10

/**
 * Creates a new snapshot of the resume content
 * Automatically deletes old snapshots if exceeding MAX_SNAPSHOTS_PER_RESUME
 */
export async function createSnapshot(
  resumeId: string,
  userId: string,
  content: JSONContent | { type: 'latex'; source: string }
): Promise<ResumeSnapshot> {
  // Create the snapshot
  const { data, error } = await supabase
    .from('resume_snapshots')
    .insert({
      resume_id: resumeId,
      user_id: userId,
      content,
    })
    .select()
    .single<ResumeSnapshot>()

  if (error) throw new Error(`Failed to create snapshot: ${error.message}`)

  // Clean up old snapshots if necessary
  await deleteOldSnapshots(resumeId, userId)

  return data
}

/**
 * Get all snapshots for a resume, ordered by created_at descending
 */
export async function getSnapshots(resumeId: string, userId: string): Promise<ResumeSnapshotMeta[]> {
  const { data, error } = await supabase
    .from('resume_snapshots')
    .select('id, resume_id, version, created_at')
    .eq('resume_id', resumeId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_SNAPSHOTS_PER_RESUME)

  if (error) throw new Error(`Failed to get snapshots: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id,
    resume_id: row.resume_id,
    created_at: row.created_at,
    version: (row as { version?: number | null }).version ?? null,
  }))
}

/**
 * Get a specific snapshot by ID
 */
export async function getSnapshot(snapshotId: string, userId: string): Promise<ResumeSnapshot> {
  const { data, error } = await supabase
    .from('resume_snapshots')
    .select('id, resume_id, user_id, content, created_at')
    .eq('id', snapshotId)
    .eq('user_id', userId)
    .single<ResumeSnapshot>()

  if (error) throw new Error(`Failed to get snapshot: ${error.message}`)

  return data
}

/**
 * Delete old snapshots beyond MAX_SNAPSHOTS_PER_RESUME for a resume
 */
export async function deleteOldSnapshots(resumeId: string, userId: string): Promise<void> {
  // Get all snapshots for this resume, ordered by created_at descending
  const { data, error: selectError } = await supabase
    .from('resume_snapshots')
    .select('id')
    .eq('resume_id', resumeId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (selectError) throw new Error(`Failed to query snapshots: ${selectError.message}`)

  // If we have more than max snapshots, delete the oldest ones
  if ((data ?? []).length > MAX_SNAPSHOTS_PER_RESUME) {
    const idsToDelete = data!.slice(MAX_SNAPSHOTS_PER_RESUME).map((row) => row.id)

    const { error: deleteError } = await supabase.from('resume_snapshots').delete().in('id', idsToDelete)

    if (deleteError) throw new Error(`Failed to delete old snapshots: ${deleteError.message}`)
  }
}

/**
 * Delete a specific snapshot
 */
export async function deleteSnapshot(snapshotId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('resume_snapshots').delete().eq('id', snapshotId).eq('user_id', userId)

  if (error) throw new Error(`Failed to delete snapshot: ${error.message}`)
}

// `formatSnapshotTime` moved to `src/services/date.ts`. It is a pure string
// formatter, and this module constructs the shared Supabase client at import
// time -- keeping it here meant any component that only wanted to render a
// timestamp could not be imported without real credentials.
