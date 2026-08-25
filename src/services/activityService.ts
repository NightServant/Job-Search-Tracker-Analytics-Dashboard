import type { SupabaseClient } from '@supabase/supabase-js'
import { requireUserId, toError } from './supabaseHelpers'
import type { ActivityEntry } from './activityLog'

export interface ActivityInput {
  job_id: string
  note: string
  occurred_at?: string
}

/**
 * Free-form notes against an application.
 *
 * Distinct from job_status_history, which is an append-only trigger-written
 * audit of status changes. This one is user-authored and editable.
 */
export const activityService = {
  async create(client: SupabaseClient, input: ActivityInput): Promise<ActivityEntry> {
    const userId = await requireUserId(client)
    const { data, error } = await client
      .from('activity_log')
      .insert({ ...input, user_id: userId })
      .select()
      .single()
    if (error) throw toError(error)
    return data as ActivityEntry
  },

  async remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('activity_log').delete().eq('id', id)
    if (error) throw toError(error)
  },

  /**
   * Newest first, ordered in the database rather than in JS.
   *
   * idx_activity_log_job_time is (job_id, occurred_at DESC), so this ordering
   * is served by the index instead of sorting a fetched page.
   */
  async listForJob(client: SupabaseClient, jobId: string): Promise<ActivityEntry[]> {
    const { data, error } = await client
      .from('activity_log')
      .select('*')
      .eq('job_id', jobId)
      .order('occurred_at', { ascending: false })
    if (error) throw toError(error)
    return (data ?? []) as ActivityEntry[]
  },
}
