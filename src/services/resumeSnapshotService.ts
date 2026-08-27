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
   * `resume_snapshots.version` -- monotonic per resume, assigned by
   * `createSnapshot` (see the note there) and stable across deletes of other
   * snapshots.
   *
   * Nullable, and it stays nullable for two separate reasons. The column was
   * added after the table in migration `20260825040236` and backfilled once,
   * so any row written between that migration and the assignment landing has
   * none. And the column has no `DEFAULT`, no trigger and no sequence behind
   * it, so a row inserted by anything other than `createSnapshot` -- a script,
   * a manual fix, a future writer -- will have none either. Both surfaces that
   * render it handle a null rather than assuming a number.
   */
  version?: number | null
}

const MAX_SNAPSHOTS_PER_RESUME = 10

/** Postgres `unique_violation`. The one error here that is worth retrying. */
const UNIQUE_VIOLATION = '23505'

/**
 * The number the next snapshot of this CV should carry.
 *
 * `max(version) + 1`, never `count + 1`. Snapshots are capped at ten per CV
 * and the oldest are deleted, so counting rows would hand v11 back out as v10
 * the moment v1 was pruned -- and `UNIQUE (resume_id, version)` would then
 * reject it.
 *
 * `nullsFirst: false` is load-bearing, not decoration. `ORDER BY version DESC`
 * defaults to `NULLS FIRST` in Postgres, so without it this reads `null` off
 * any row written before the column was backfilled, restarts the numbering at
 * 1, and collides with a v1 that already exists.
 */
async function nextVersion(resumeId: string, userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('resume_snapshots')
    .select('version')
    .eq('resume_id', resumeId)
    .eq('user_id', userId)
    .order('version', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to read the latest snapshot version: ${error.message}`)

  const latest = (data as { version?: number | null } | null)?.version
  return typeof latest === 'number' ? latest + 1 : 1
}

/**
 * Creates a new snapshot of the resume content, numbered, and prunes the
 * oldest once a CV has more than MAX_SNAPSHOTS_PER_RESUME.
 *
 * The version is assigned here because nothing else can assign it. The column
 * is nullable with no `DEFAULT`, no trigger and no sequence -- migration
 * `20260825040236` added it and backfilled the rows that existed that day --
 * so an insert that does not name a number leaves one that is null forever.
 * That is not hypothetical: it is what this function used to do, and it is why
 * `/documents` read "No versions" and the editor's history panel read
 * "Unnumbered" for every CV the app had ever created. `UNIQUE (resume_id,
 * version)` did not catch it, because Postgres treats NULLs as distinct.
 *
 * Read-then-insert is not atomic, so two writers can read the same maximum and
 * race for the same number. That is exactly what the unique constraint is for:
 * the loser gets `23505`, re-reads and takes the next one. One retry, not a
 * loop -- a second collision means something is wrong that spinning will not
 * fix. Any other error is returned as-is rather than retried, because an RLS
 * denial will fail identically the second time and retrying it only doubles
 * the writes against a policy that already said no.
 *
 * A trigger owning the number would be strictly more correct. It would also be
 * a new migration mid-milestone, and M5's exit criteria require local and
 * remote schemas to match, so it is deliberately left to whoever revisits the
 * schema.
 */
export async function createSnapshot(
  resumeId: string,
  userId: string,
  content: JSONContent | { type: 'latex'; source: string }
): Promise<ResumeSnapshot> {
  let lastMessage = 'unique constraint kept rejecting the assigned version'

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const version = await nextVersion(resumeId, userId)
    const { data, error } = await supabase
      .from('resume_snapshots')
      .insert({
        resume_id: resumeId,
        user_id: userId,
        content,
        version,
      })
      .select()
      .single<ResumeSnapshot>()

    if (!error) {
      // Clean up old snapshots if necessary
      await deleteOldSnapshots(resumeId, userId)
      return data
    }

    if ((error as { code?: string }).code !== UNIQUE_VIOLATION) {
      throw new Error(`Failed to create snapshot: ${error.message}`)
    }
    lastMessage = error.message
  }

  throw new Error(`Failed to create snapshot: ${lastMessage}`)
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
