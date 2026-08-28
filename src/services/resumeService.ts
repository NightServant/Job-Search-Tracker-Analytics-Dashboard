import type { SupabaseClient } from '@supabase/supabase-js'
import type { JSONContent } from '@tiptap/core'
import { requireUserId, toError } from './supabaseHelpers'

export type ResumeMode = 'word' | 'latex'

/** The LaTeX editor stores raw source; the Word editor stores a Tiptap tree. */
export type LatexContent = { type: 'latex'; source: string }
export type ResumeContent = JSONContent | LatexContent

export interface ResumeDraft {
  id: string
  title: string
  mode: ResumeMode
  content: ResumeContent | null
  updated_at: string
}

export interface ResumeSummary {
  id: string
  title: string
  mode: ResumeMode
  updated_at: string
  /**
   * `resumes.sections` -- the JSON Resume document, `null` for the legacy word
   * and latex drafts that predate it. Carried unparsed so the caller decides
   * what to do with a shape that may be anything (the column is nullable
   * JSONB and nothing constrains what is in it); `lintSections` guards it.
   */
  sections: unknown | null
  /**
   * Highest `resume_snapshots.version` for this CV, or null when no snapshot
   * carries a number.
   *
   * Null does not mean "no history" -- see `hasVersions`. A CV whose only
   * snapshot predates the version backfill has one and no number for it.
   */
  version: number | null
  /**
   * Whether the CV has any snapshots at all.
   *
   * Separate from `version` because the two answer different questions and
   * collapsing them made the Documents row say "No versions" over an expanded
   * panel that was listing one. The row now speaks the panel's vocabulary:
   * a number, "Unnumbered", or "No versions".
   */
  hasVersions: boolean
}

export interface ResumeCreateInput {
  mode: ResumeMode
  title: string
  content: ResumeContent
}

export interface ResumePatch {
  title?: string
  mode?: ResumeMode
  content?: ResumeContent
}

interface ResumeRow {
  id: string
  title: string | null
  mode: string | null
  content: ResumeContent | null
  updated_at: string
}

type SummaryRow = Omit<ResumeRow, 'content'> & {
  sections: unknown | null
  resume_snapshots: { version: number | null }[] | null
}

/**
 * `mode` is a TEXT column whose CHECK allows a third value, `structured`,
 * added with `resumes.sections` in migration `20260825041735`. No editor for
 * that mode exists yet, so it settles on `word` here exactly as the deleted
 * `ResumePage` did -- changing that would invent product behaviour, not
 * preserve it.
 *
 * Known hazard, recorded rather than silently carried: opening a `structured`
 * row in the Word editor and letting autosave fire rewrites its `mode` to
 * `word` and its `content` to the starter template, orphaning `sections`.
 * Nothing in the app writes `structured` today, so no row can currently hit
 * it; whoever builds the structured editor must fix this before one can.
 */
function normalizeMode(mode: string | null | undefined): ResumeMode {
  return mode === 'latex' ? 'latex' : 'word'
}

function toDraft(row: ResumeRow): ResumeDraft {
  return {
    id: row.id,
    title: row.title || 'Untitled CV',
    mode: normalizeMode(row.mode),
    content: row.content,
    updated_at: row.updated_at,
  }
}

/**
 * Reads and writes for the `resumes` table.
 *
 * The client is a parameter rather than a module import, matching
 * `eventService` and `documentLinkService`, so the same code serves the app's
 * shared client and an integration test signed in as a specific user. Reads
 * never filter on `user_id`: owner-only RLS already scopes them, and a
 * redundant filter would hide a broken policy instead of surfacing it.
 *
 * This exists because `/documents` and `/cv` need the same reads and the same
 * writes. The five call sites this replaces were inline `supabase.from(
 * 'resumes')` chains in the single screen that used to be both surfaces;
 * splitting that screen without lifting them would have meant two copies free
 * to drift apart.
 */
export const resumeService = {
  /** Every CV, newest edit first -- the `/documents` list. */
  async list(client: SupabaseClient): Promise<ResumeSummary[]> {
    const { data, error } = await client
      .from('resumes')
      .select('id, title, mode, updated_at, sections, resume_snapshots(version)')
      .order('updated_at', { ascending: false })
    if (error) throw toError(error)
    return ((data ?? []) as SummaryRow[]).map((row) => ({
      id: row.id,
      title: row.title || 'Untitled CV',
      mode: normalizeMode(row.mode),
      updated_at: row.updated_at,
      sections: row.sections ?? null,
      version: latestVersion(row.resume_snapshots),
      hasVersions: (row.resume_snapshots ?? []).length > 0,
    }))
  },

  /**
   * One CV with its content -- what `/cv?draft=<id>` opens.
   *
   * `maybeSingle` rather than `single`: a missing id and a row RLS hides are
   * the same read, and both are a not-found for the route to render, not an
   * exception for it to catch.
   */
  async get(client: SupabaseClient, id: string): Promise<ResumeDraft | null> {
    const { data, error } = await client
      .from('resumes')
      .select('id, title, mode, content, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw toError(error)
    return data ? toDraft(data as ResumeRow) : null
  },

  async create(client: SupabaseClient, input: ResumeCreateInput): Promise<ResumeDraft> {
    const userId = await requireUserId(client)
    const { data, error } = await client
      .from('resumes')
      .insert({ ...input, user_id: userId })
      .select('id, title, mode, content, updated_at')
      .single()
    if (error) throw toError(error)
    return toDraft(data as ResumeRow)
  },

  /** Partial by design: the title field autosaves without resending the CV body. */
  async update(client: SupabaseClient, id: string, patch: ResumePatch): Promise<ResumeDraft> {
    const { data, error } = await client
      .from('resumes')
      .update(patch)
      .eq('id', id)
      .select('id, title, mode, content, updated_at')
      .single()
    if (error) throw toError(error)
    return toDraft(data as ResumeRow)
  },

  async remove(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('resumes').delete().eq('id', id)
    if (error) throw toError(error)
  },
}

/**
 * The highest version among a CV's snapshots, or null when it has none.
 *
 * `resume_snapshots.version` is monotonic per resume and UNIQUE (resume_id,
 * version), and it is assigned in application code by `createSnapshot` --
 * there is no DEFAULT, trigger or sequence behind the column. It is stable
 * across deletes of other snapshots, so counting rows instead would renumber
 * v3 back to v2 the moment v1 was pruned by the ten-snapshot cap; the answer
 * to "which version is this CV on" has to be the maximum, not the count.
 *
 * The `typeof === 'number'` filter is not defensive noise. Rows written before
 * the column was backfilled, or by anything other than `createSnapshot`, carry
 * a null, and a null must not be read as a version -- `Math.max` would coerce
 * it to 0 and claim the CV is on v0.
 */
function latestVersion(snapshots: { version: number | null }[] | null | undefined): number | null {
  const versions = (snapshots ?? [])
    .map((snapshot) => snapshot.version)
    .filter((version): version is number => typeof version === 'number')
  return versions.length > 0 ? Math.max(...versions) : null
}
