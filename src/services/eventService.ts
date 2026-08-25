import type { SupabaseClient } from '@supabase/supabase-js'
import { requireUserId, toError } from './supabaseHelpers'
import type { CalendarEvent, EventKind } from './events'

export interface EventInput {
  job_id?: string | null
  kind: EventKind
  title: string
  starts_at: string
  duration_minutes?: number | null
  notes?: string | null
}

/**
 * CRUD for scheduled items.
 *
 * The client is passed in rather than imported so the same service works for
 * the app's shared client and for an integration test signed in as a specific
 * user. Reads never filter on user_id: RLS already scopes them, and adding a
 * redundant filter would hide a broken policy instead of surfacing it.
 */
export const eventService = {
  async create(client: SupabaseClient, input: EventInput): Promise<CalendarEvent> {
    const userId = await requireUserId(client)
    const { data, error } = await client
      .from('events')
      .insert({ ...input, user_id: userId })
      .select()
      .single()
    if (error) throw toError(error)
    return data as CalendarEvent
  },

  async update(
    client: SupabaseClient,
    id: string,
    patch: Partial<EventInput>
  ): Promise<CalendarEvent> {
    const { data, error } = await client
      .from('events')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw toError(error)
    return data as CalendarEvent
  },

  async remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('events').delete().eq('id', id)
    if (error) throw toError(error)
  },

  async listForJob(client: SupabaseClient, jobId: string): Promise<CalendarEvent[]> {
    const { data, error } = await client
      .from('events')
      .select('*')
      .eq('job_id', jobId)
      .order('starts_at', { ascending: true })
    if (error) throw toError(error)
    return (data ?? []) as CalendarEvent[]
  },

  /** Everything at or after `fromIso`, soonest first — the calendar and dashboard rail. */
  async listUpcoming(client: SupabaseClient, fromIso: string): Promise<CalendarEvent[]> {
    const { data, error } = await client
      .from('events')
      .select('*')
      .gte('starts_at', fromIso)
      .order('starts_at', { ascending: true })
    if (error) throw toError(error)
    return (data ?? []) as CalendarEvent[]
  },
}
