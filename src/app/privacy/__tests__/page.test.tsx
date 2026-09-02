import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Privacy from '../page'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

const MIGRATIONS = 'supabase/migrations'

/** Every table the app really creates, read from the migrations. */
function tablesInSchema(): string[] {
  const sql = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
    .join('\n')
  const names = new Set<string>()
  for (const m of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?([a-z_]+)/gi)) {
    names.add(m[1].toLowerCase())
  }
  return [...names].sort()
}

describe('the privacy page', () => {
  it('names every category of data the app actually stores', () => {
    render(<Privacy />)
    for (const heading of [
      'What is stored',
      'Where it is stored',
      'Who can read it',
      'Deleting your account',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
  })

  it('lists the real tables, and no table the app does not have', () => {
    // THE POINT OF THIS PAGE. A policy assembled from a template lists things
    // that do not exist and omits things that do -- and unlike most inaccurate
    // copy, this kind has legal weight. Both directions are asserted: every
    // table in the schema is named, and every table named is in the schema.
    render(<Privacy />)
    const text = document.body.textContent ?? ''
    const schema = tablesInSchema()
    expect(schema.length).toBeGreaterThan(5)

    // Forwards: nothing in the schema is left unmentioned.
    for (const table of schema) {
      expect(text, `the schema has ${table} and the policy never mentions it`).toContain(table)
    }

    // Backwards, and scoped to the <dt> cells rather than to any snake_case
    // string in the prose. The first draft of this test read the whole body
    // and failed on `delete_own_account` -- which is a FUNCTION, correctly
    // named in the deletion section. The list of TABLES is the claim being
    // checked, so the list is what gets read.
    const claimed = [...document.querySelectorAll('dt')].map((dt) =>
      (dt.textContent ?? '').trim()
    )
    expect(claimed.length).toBe(schema.length)
    for (const table of claimed) {
      expect(schema, `the policy claims a ${table} table the schema does not have`).toContain(
        table
      )
    }
  })

  it('states that row-level security scopes every table to its owner', () => {
    render(<Privacy />)
    expect(screen.getByText(/row-level security/i)).toBeInTheDocument()
  })

  it('points at the self-service deletion the app really implements', () => {
    // /settings has a delete-account control backed by delete_own_account().
    // A privacy page promising a deletion path that does not exist is a lie
    // with legal weight.
    render(<Privacy />)
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
  })

  it('names the deletion function that actually exists', () => {
    const sql = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
      .join('\n')
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.delete_own_account/i)

    render(<Privacy />)
    expect(document.body.textContent).toContain('delete_own_account')
  })

  it('does not invent a region, a retention period or a third party', () => {
    // The plan's instruction was explicit: name the region if it is known at
    // write time, do not guess it. It is not known here, so the page says
    // where the data lives without pretending to know where that is
    // geographically -- and claims no analytics vendor, because there is none.
    render(<Privacy />)
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\b(us-east|eu-west|ap-southeast|[a-z]{2}-[a-z]+-\d)\b/i)
    expect(text).not.toMatch(/\b(Google Analytics|Segment|Mixpanel|Facebook)\b/i)
  })
})
