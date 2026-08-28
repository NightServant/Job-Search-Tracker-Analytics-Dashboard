import { describe, it, expect, vi, beforeEach } from 'vitest'

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

interface FakeTable {
  rows: Row[]
  inserts: number
  /** Fails the next insert with this PostgREST error, once. */
  failNextInsert: (error: { code?: string; message: string }, alsoInsert?: Row) => void
  client: { from: (table: string) => unknown }
}

function fakeSnapshots(initial: Partial<Row>[] = []): FakeTable {
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
    client: { from: () => builder() },
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
      const col = state.orderCol as keyof Row
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
    const snapshot = await createSnapshot('cv-1', 'user-1', { type: 'doc' })
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
    const snapshot = await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(snapshot.version).toBe(11)
  })

  it('numbers each CV independently, since the constraint is per resume', async () => {
    const table = install(fakeSnapshots([{ id: 'a', resume_id: 'cv-1', version: 4 }]))
    const snapshot = await createSnapshot('cv-2', 'user-1', { type: 'doc' })
    expect(snapshot.version).toBe(1)
    expect(table.rows.find((row) => row.resume_id === 'cv-2')!.version).toBe(1)
  })

  it('ignores a legacy null-versioned row instead of sorting it to the front', async () => {
    // ORDER BY version DESC defaults to NULLS FIRST in Postgres, so reading the
    // latest version without saying NULLS LAST reads null off a pre-backfill
    // row, restarts at 1, and collides with the real v1.
    install(fakeSnapshots([{ id: 'legacy', version: null }, { id: 'b', version: 3 }]))
    const snapshot = await createSnapshot('cv-1', 'user-1', { type: 'doc' })
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
    const snapshot = await createSnapshot('cv-1', 'user-1', { type: 'doc' })
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
  function tenSnapshots() {
    return Array.from({ length: 10 }, (_, index) => ({
      id: `seed-${index}`,
      version: index + 1,
    }))
  }

  it('drops the oldest once a CV passes ten, keeping the cap', async () => {
    // Snapshots are now written on every 5s typing pause, so this branch runs
    // constantly in a real session. Nothing had ever entered it: no fixture
    // reached eleven rows.
    const table = install(fakeSnapshots(tenSnapshots()))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(table.rows).toHaveLength(10)
    expect(table.rows.find((row) => row.id === 'seed-0')).toBeUndefined()
    expect(table.rows.find((row) => row.version === 11)).toBeDefined()
  })

  it('does not renumber what it kept, so a pruned number is never handed out twice', async () => {
    // The retained rows keep the identity they were written with. Renumbering
    // them by position is exactly what the ledger ruled against, and it would
    // also collide with UNIQUE (resume_id, version) on the next insert.
    const table = install(fakeSnapshots(tenSnapshots()))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(table.rows.map((row) => row.version).sort((a, b) => Number(a) - Number(b))).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])

    const next = await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(next.version).toBe(12)
  })

  it('leaves a CV under the cap alone', async () => {
    const table = install(fakeSnapshots(tenSnapshots().slice(0, 9)))
    await createSnapshot('cv-1', 'user-1', { type: 'doc' })
    expect(table.rows).toHaveLength(10)
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

  it('still prunes to ten once enough forced, distinct snapshots accumulate', async () => {
    const table = install(fakeSnapshots())
    for (let i = 0; i < 11; i += 1) {
      await maybeCreateSnapshot(table.client, 'cv-1', 'user-1', { type: 'doc', body: `v${i}` }, { force: true })
    }
    expect(table.rows).toHaveLength(10)
  })
})
