import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * These tests drive `createSnapshot` through a stand-in for the
 * `resume_snapshots` table rather than through canned return values, because
 * the defect they exist to prevent was invisible to canned values: every
 * fixture in this milestone supplied `version` as an inline literal that the
 * production insert path could not actually produce, so "no version is ever
 * written" passed every test in the suite.
 *
 * The stand-in therefore models the two things that make version assignment
 * hard: it stores what it is given and reads it back, and it enforces
 * `UNIQUE (resume_id, version)` the way Postgres does -- including treating
 * NULLs as distinct from each other, which is exactly why that constraint did
 * not catch the missing assignment.
 */
type Row = {
  id: string
  resume_id: string
  user_id: string
  content: unknown
  version: number | null
  created_at: string
}

const clientRef = vi.hoisted(() => ({ current: null as unknown as { from: unknown } }))

vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: (_target, prop: string) => (clientRef.current as Record<string, unknown>)[prop],
    }
  ),
}))

import { createSnapshot, getSnapshots, maybeCreateSnapshot } from '../resumeSnapshotService'
import type { ResumeSnapshot, SnapshotReaderClient } from '../resumeSnapshotService'

/**
 * `createSnapshot`'s `.select().single<ResumeSnapshot>()` selects every
 * column (no explicit list), so the row it returns always carries `version`
 * even though `ResumeSnapshot` doesn't declare it -- unlike `getSnapshot`,
 * which explicitly names its column list and leaves `version` out. These
 * tests assert on that real column; this retypes the value locally to what
 * `createSnapshot` actually returns, without touching the production type.
 */
type CreatedSnapshot = ResumeSnapshot & { version: number | null }

interface FakeTable {
  rows: Row[]
  inserts: number
  /** Fails the next insert with this PostgREST error, once. */
  failNextInsert: (error: { code?: string; message: string }, alsoInsert?: Row) => void
  /** Makes the pinned-snapshot lookup fail, so the prune must refuse. */
  failPinnedLookup: (error: { message: string }) => void
  client: SnapshotReaderClient
}

/**
 * `pinned` models `application_documents.snapshot_id`.
 *
 * The fake's `from()` used to ignore the table name, which was fine while
 * `resume_snapshots` was the only table this service touched. `deleteOldSnapshots`
 * now asks which snapshots a job still points at, so the name has to matter --
 * otherwise that query reads the snapshot rows back and finds no `snapshot_id`
 * on any of them, and the exemption silently never applies.
 */
function fakeSnapshots(initial: Partial<Row>[] = [], pinned: string[] = []): FakeTable {
  let seq = 0
  const rows: Row[] = initial.map((row, index) => ({
    id: row.id ?? `seed-${index}`,
    resume_id: row.resume_id ?? 'cv-1',
    user_id: row.user_id ?? 'user-1',
    content: row.content ?? {},
    version: row.version ?? null,
    created_at: row.created_at ?? new Date(1_700_000_000_000 + index * 1000).toISOString(),
  }))

  const table: FakeTable = {
    rows,
    inserts: 0,
    failNextInsert: () => {},
    failPinnedLookup: () => {},
    client: {
      from: ((name: string) =>
        name === 'application_documents'
          ? pinnedBuilder()
          : builder()) as unknown as SnapshotReaderClient['from'],
    },
  }

  let pinnedFailure: { message: string } | null = null
  table.failPinnedLookup = (error) => {
    pinnedFailure = error
  }

  const failures: { error: { code?: string; message: string }; alsoInsert?: Row }[] = []
  table.failNextInsert = (error, alsoInsert) => {
    failures.push({ error, alsoInsert })
  }

  interface State {
    verb: 'select' | 'insert' | 'delete' | null
    payload: Record<string, unknown> | null
    filters: [string, unknown][]
    inIds: string[] | null
    orderCol: string | null
    ascending: boolean
    nullsFirst: boolean | undefined
    limitN: number | null
  }

  function run(state: State, mode: 'single' | 'maybeSingle' | 'many') {
    if (state.verb === 'insert') {
      table.inserts += 1
      const payload = state.payload as Partial<Row>
      const failure = failures.shift()
      if (failure) {
        if (failure.alsoInsert) rows.push(failure.alsoInsert)
        return { data: null, error: failure.error }
      }
      // UNIQUE (resume_id, version). NULLs are distinct in Postgres, so a null
      // version never collides -- which is the whole reason the constraint sat
      // there for a milestone without catching anything.
      const collides = rows.some(
        (row) =>
          row.resume_id === payload.resume_id &&
          row.version !== null &&
          row.version === payload.version
      )
      if (collides) {
        return {
          data: null,
          error: {
            code: '23505',
            message:
              'duplicate key value violates unique constraint "resume_snapshots_version_unique"',
          },
        }
      }
      seq += 1
      const created: Row = {
        id: `snap-${seq}`,
        resume_id: String(payload.resume_id),
        user_id: String(payload.user_id),
        content: payload.content,
        version: payload.version ?? null,
        created_at: new Date(1_800_000_000_000 + seq * 1000).toISOString(),
      }
      rows.push(created)
      return { data: created, error: null }
    }

    if (state.verb === 'delete') {
      const ids = new Set(state.inIds ?? [])
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (ids.has(rows[i].id)) rows.splice(i, 1)
      }
      return { data: null, error: null }
    }

    let matched = rows.filter((row) =>
      state.filters.every(([col, value]) => (row as unknown as Record<string, unknown>)[col] === value)
    )

    if (state.orderCol) {
      // Only 'version' and 'created_at' are ever ordered on (see
      // resumeSnapshotService.ts's four `.order(...)` call sites) --
      // narrower than `keyof Row` on purpose, because `content: unknown`
      // being reachable through the wider cast is what made `av`/`bv` below
      // possibly-undefined to the compiler.
      const col = state.orderCol as 'version' | 'created_at'
      const nullsFirst = state.nullsFirst ?? !state.ascending
      matched = [...matched].sort((a, b) => {
        const av = a[col]
        const bv = b[col]
        if (av === null && bv === null) return 0
        if (av === null) return nullsFirst ? -1 : 1
        if (bv === null) return nullsFirst ? 1 : -1
        if (av === bv) return 0
        return (av < bv ? -1 : 1) * (state.ascending ? 1 : -1)
      })
    }

    if (state.limitN !== null) matched = matched.slice(0, state.limitN)

    if (mode === 'single') {
      return matched[0]
        ? { data: matched[0], error: null }
        : { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    }
    if (mode === 'maybeSingle') return { data: matched[0] ?? null, error: null }
    return { data: matched, error: null }
  }

  /** Just enough of the link table for the pinned-snapshot lookup. */
  function pinnedBuilder() {
    const result = pinnedFailure
      ? { data: null, error: pinnedFailure as { message: string } | null }
      : {
          data: pinned.map((snapshot_id) => ({ snapshot_id })),
          error: null as { message: string } | null,
        }
    const chain = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    }
    return chain
  }

  function builder() {
    const state: State = {
      verb: null,
      payload: null,
      filters: [],
      inIds: null,
      orderCol: null,
      ascending: true,
      nullsFirst: undefined,
      limitN: null,
    }
    const chain = {
      select() {
        if (!state.verb) state.verb = 'select'
        return chain
      },
      insert(payload: Record<string, unknown>) {
        state.verb = 'insert'
        state.payload = payload
        return chain
      },
      delete() {
        state.verb = 'delete'
        return chain
      },
      eq(col: string, value: unknown) {
        state.filters.push([col, value])
        return chain
      },
      in(_col: string, values: string[]) {
        state.inIds = values
        return chain
      },
      order(col: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
        state.orderCol = col
        state.ascending = options?.ascending ?? true
        state.nullsFirst = options?.nullsFirst
        return chain
      },
      limit(n: number) {
        state.limitN = n
        return chain
      },
      single: () => Promise.resolve(run(state, 'single')),
      maybeSingle: () => Promise.resolve(run(state, 'maybeSingle')),
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(run(state, 'many')).then(onFulfilled, onRejected),
    }
    return chain
  }

  return table
}

function install(table: FakeTable) {
  clientRef.current = table.client
  return table
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSnapshot assigns a version', () => {
  it('numbers the first snapshot of a CV v1, not null', async () => {
    // The column is nullable with no DEFAULT, no trigger and no sequence
    // (migration 20260825040236 added it and backfilled once), so if the
    // insert does not name a number, nothing else will.
    const table = install(fakeSnapshots())
    const snapshot = (await createSnapshot('cv-1', 'user-1', { type: 'doc' })) as CreatedSnapshot
    expect(snapshot.version).toBe(1)
    expect(table.rows[0].version).toBe(1)
  })

  it('numbers the next snapshot v2, reading back what it just wrote', async () => {
    const table = install(fakeSnapshots())
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(table.rows.map((row) => row.version)).toEqual([1, 2])
  })

  it('takes max + 1, not count + 1, so pruning an old snapshot cannot reuse a number', async () => {
    // resume_snapshots is capped at 10 per CV, so old rows really do get
    // deleted. Counting rows would hand v11 back out as v10 the moment v1 was
    // pruned, and UNIQUE (resume_id, version) would then reject it.
    const table = install(
      fakeSnapshots([{ id: 'a', version: 8 }, { id: 'b', version: 9 }, { id: 'c', version: 10 }])
    )
    table.rows.splice(0, 1) // v8 pruned
    const snapshot = (await createSnapshot('cv-1', 'user-1', { type: 'doc' })) as CreatedSnapshot
    expect(snapshot.version).toBe(11)
  })

  it('numbers each CV independently, since the constraint is per resume', async () => {
    const table = install(fakeSnapshots([{ id: 'a', resume_id: 'cv-1', version: 4 }]))
    const snapshot = (await createSnapshot('cv-2', 'user-1', { type: 'doc' })) as CreatedSnapshot
    expect(snapshot.version).toBe(1)
    expect(table.rows.find((row) => row.resume_id === 'cv-2')!.version).toBe(1)
  })

  it('ignores a legacy null-versioned row instead of sorting it to the front', async () => {
    // ORDER BY version DESC defaults to NULLS FIRST in Postgres, so reading the
    // latest version without saying NULLS LAST reads null off a pre-backfill
    // row, restarts at 1, and collides with the real v1.
    install(fakeSnapshots([{ id: 'legacy', version: null }, { id: 'b', version: 3 }]))
    const snapshot = (await createSnapshot('cv-1', 'user-1', { type: 'doc' })) as CreatedSnapshot
    expect(snapshot.version).toBe(4)
  })
})

describe('createSnapshot and the unique constraint', () => {
  it('retries once when another writer takes the number first', async () => {
    // Two tabs editing the same CV both read max=1 and both try v2. The
    // constraint is what makes that safe, so the loser re-reads and takes v3
    // rather than surfacing a duplicate-key error to someone who was typing.
    const table = install(fakeSnapshots([{ id: 'a', version: 1 }]))
    table.failNextInsert(
      { code: '23505', message: 'duplicate key value violates unique constraint' },
      {
        id: 'other-writer',
        resume_id: 'cv-1',
        user_id: 'user-1',
        content: {},
        version: 2,
        created_at: '2026-08-20T10:00:00.000Z',
      }
    )
    const snapshot = (await createSnapshot('cv-1', 'user-1', { type: 'doc' })) as CreatedSnapshot
    expect(snapshot.version).toBe(3)
    expect(table.inserts).toBe(2)
  })

  it('gives up after the retry rather than spinning on a constraint it cannot win', async () => {
    // Two collisions in a row is not contention any more, it is something the
    // retry cannot fix -- a third attempt would just be a slower failure.
    const table = install(fakeSnapshots())
    table.failNextInsert({ code: '23505', message: 'duplicate key' })
    table.failNextInsert({ code: '23505', message: 'duplicate key' })
    await expect(createSnapshot('cv-1', 'user-1', { type: 'doc' })).rejects.toThrow(
      /Failed to create snapshot: duplicate key/
    )
    expect(table.inserts).toBe(2)
  })

  it('does not retry an error the constraint did not cause', async () => {
    // An RLS denial will fail identically the second time; retrying it only
    // doubles the write attempts against a policy that already said no.
    const table = install(fakeSnapshots())
    table.failNextInsert({ code: '42501', message: 'new row violates row-level security policy' })
    await expect(createSnapshot('cv-1', 'user-1', { type: 'doc' })).rejects.toThrow(
      /row-level security/
    )
    expect(table.inserts).toBe(1)
  })
})

describe('pruning the oldest snapshots', () => {
  // The cap moved from 10 to 60 on 2026-09-11, so these build to the cap
  // rather than to a literal ten. Read from the service so raising it again
  // does not quietly stop these tests exercising the prune branch at all.
  const CAP = 60

  function atCap(count = CAP) {
    return Array.from({ length: count }, (_, index) => ({
      id: `seed-${index}`,
      version: index + 1,
    }))
  }

  it('drops the oldest once a CV passes the cap', async () => {
    // Snapshots are written on every 5s typing pause, so this branch runs
    // constantly in a real session. Nothing had ever entered it: no fixture
    // reached the cap.
    const table = install(fakeSnapshots(atCap()))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(table.rows).toHaveLength(CAP)
    expect(table.rows.find((row) => row.id === 'seed-0')).toBeUndefined()
    expect(table.rows.find((row) => row.version === CAP + 1)).toBeDefined()
  })

  it('does not renumber what it kept, so a pruned number is never handed out twice', async () => {
    // The retained rows keep the identity they were written with. Renumbering
    // them by position is exactly what the ledger ruled against, and it would
    // also collide with UNIQUE (resume_id, version) on the next insert.
    const table = install(fakeSnapshots(atCap()))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    const versions = table.rows.map((row) => Number(row.version)).sort((a, b) => a - b)
    expect(versions[0]).toBe(2)
    expect(versions.at(-1)).toBe(CAP + 1)

    const next = (await createSnapshot('cv-1', 'user-1', { type: 'doc' })) as CreatedSnapshot
    expect(next.version).toBe(CAP + 2)
  })

  it('NEVER prunes a snapshot an application still points at', async () => {
    // THE TEST THIS CHANGE EXISTS FOR. `application_documents.snapshot_id`
    // pins the exact version sent to a job, and the foreign key is ON DELETE
    // SET NULL -- so pruning it does not error, does not remove the link, and
    // quietly erases which version a company received. Raising the cap alone
    // would not have fixed that; it would only have delayed it.
    // Two more than the cap, so that exempting two pinned rows still leaves
    // the unpinned history over the limit and the prune genuinely runs. At
    // exactly the cap it would correctly do nothing, which would prove less.
    const table = install(fakeSnapshots(atCap(CAP + 2), ['seed-0', 'seed-1']))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })

    expect(table.rows.find((row) => row.id === 'seed-0')).toBeDefined()
    expect(table.rows.find((row) => row.id === 'seed-1')).toBeDefined()
    // The oldest UNPINNED row is what went instead.
    expect(table.rows.find((row) => row.id === 'seed-2')).toBeUndefined()
  })

  it('does not let pinned snapshots eat the autosave window', async () => {
    // Pinned rows are exempt AND uncounted. Counting them would let forty-five
    // tailored versions squeeze crash-recovery history down to nothing, which
    // is the case the cap exists to serve.
    const pinnedIds = Array.from({ length: 40 }, (_, i) => `seed-${i}`)
    const table = install(fakeSnapshots(atCap(), pinnedIds))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })

    // Every pinned row survives, and the unpinned history is still under the
    // cap rather than having been squeezed by them.
    for (const id of pinnedIds) {
      expect(table.rows.find((row) => row.id === id), id).toBeDefined()
    }
    expect(table.rows.length).toBe(CAP + 1)
  })

  it('refuses to prune at all if the pinned lookup fails', async () => {
    // Keeping too much history costs storage; deleting a sent version cannot
    // be undone. Pruning blind is not an acceptable fallback.
    const table = install(fakeSnapshots(atCap()))
    table.failPinnedLookup({ message: 'network' })
    await expect(createSnapshot('cv-1', 'user-1', { type: 'doc' })).rejects.toThrow(
      /pinned/i
    )
    // The insert happened; only the prune was refused.
    expect(table.rows.length).toBe(CAP + 1)
  })

  it('leaves a CV under the cap alone', async () => {
    const table = install(fakeSnapshots(atCap(CAP - 1)))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(table.rows).toHaveLength(CAP)
    expect(table.rows.find((row) => row.id === 'seed-0')).toBeDefined()
  })
})

describe('getSnapshots', () => {
  it('reads back the version the insert assigned, so the two surfaces agree', async () => {
    install(fakeSnapshots())
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    const metas = await getSnapshots('cv-1', 'user-1')
    expect(metas.map((meta) => meta.version).sort()).toEqual([1, 2])
  })
})

/**
 * `maybeCreateSnapshot` is the cadence policy in front of `createSnapshot`:
 * never write a snapshot identical to the latest one, and never write an
 * autosave-triggered one more than once per five minutes -- unless it is the
 * very first snapshot of the session, which has no predecessor to compare or
 * throttle against.
 *
 * Every test here fixes the clock with `vi.setSystemTime` and back-dates the
 * seeded snapshot's `created_at` relative to it, because the floor is a real
 * wall-clock comparison and the fake table's default timestamps are neither
 * "now" nor consistently before it.
 */
describe('maybeCreateSnapshot applies the cadence policy', () => {
  const NOW = new Date('2026-08-27T12:00:00.000Z').getTime()
  const FIVE_MIN = 5 * 60_000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes the first snapshot of a session, since there is no predecessor to block it', async () => {
    const table = install(fakeSnapshots())
    const outcome = await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: 'A' })
    expect(outcome).toBe('written')
    expect(table.rows).toHaveLength(1)
  })

  it('skips a snapshot whose content is identical to the latest one', async () => {
    const table = install(
      fakeSnapshots([
        {
          id: 'a',
          version: 1,
          content: { type: 'doc', body: 'A' },
          created_at: new Date(NOW - 6 * 60_000).toISOString(),
        },
      ])
    )
    const outcome = await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: 'A' })
    expect(outcome).toBe('skipped-unchanged')
    expect(table.rows).toHaveLength(1)
  })

  it('treats key order as irrelevant when comparing content, since JSONB does not promise to preserve it', async () => {
    const table = install(
      fakeSnapshots([
        {
          id: 'a',
          version: 1,
          content: { body: 'A', type: 'doc' },
          created_at: new Date(NOW - 6 * 60_000).toISOString(),
        },
      ])
    )
    const outcome = await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: 'A' })
    expect(outcome).toBe('skipped-unchanged')
    expect(table.rows).toHaveLength(1)
  })

  it('blocks an autosave-triggered snapshot inside the 5-minute floor', async () => {
    const table = install(
      fakeSnapshots([
        {
          id: 'a',
          version: 1,
          content: { type: 'doc', body: 'A' },
          created_at: new Date(NOW - 2 * 60_000).toISOString(),
        },
      ])
    )
    const outcome = await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: 'B' })
    expect(outcome).toBe('skipped-too-soon')
    expect(table.rows).toHaveLength(1)
  })

  it('writes once the 5-minute floor has passed', async () => {
    const table = install(
      fakeSnapshots([
        {
          id: 'a',
          version: 1,
          content: { type: 'doc', body: 'A' },
          created_at: new Date(NOW - FIVE_MIN - 1).toISOString(),
        },
      ])
    )
    const outcome = await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: 'B' })
    expect(outcome).toBe('written')
    expect(table.rows).toHaveLength(2)
  })

  it('lets an explicit save bypass the floor', async () => {
    const table = install(
      fakeSnapshots([
        {
          id: 'a',
          version: 1,
          content: { type: 'doc', body: 'A' },
          created_at: new Date(NOW - 2 * 60_000).toISOString(),
        },
      ])
    )
    const outcome = await maybeCreateSnapshot(
      table.client,
      'cv-1',
      'user-1',
      { type: 'doc', body: 'B' },
      { force: true }
    )
    expect(outcome).toBe('written')
    expect(table.rows).toHaveLength(2)
  })

  it('still applies the delta guard to a forced save, since a deliberate save of unchanged content is not a new version', async () => {
    const table = install(
      fakeSnapshots([
        {
          id: 'a',
          version: 1,
          content: { type: 'doc', body: 'A' },
          created_at: new Date(NOW - 2 * 60_000).toISOString(),
        },
      ])
    )
    const outcome = await maybeCreateSnapshot(
      table.client,
      'cv-1',
      'user-1',
      { type: 'doc', body: 'A' },
      { force: true }
    )
    expect(outcome).toBe('skipped-unchanged')
    expect(table.rows).toHaveLength(1)
  })

  it('still prunes to the cap once enough forced, distinct snapshots accumulate', async () => {
    const table = install(fakeSnapshots())
    for (let i = 0; i < 61; i += 1) {
      await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: `v${i}` }, { force: true })
    }
    expect(table.rows).toHaveLength(60)
  })
})
