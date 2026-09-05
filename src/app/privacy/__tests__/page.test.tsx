import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Privacy from '../page'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

// The page mounts SessionAttributeSync, which reads the auth context -- and
// reaching the real one drags in the supabase client, which needs credentials
// this suite has no business holding. Signed OUT is the state most of these
// assertions are about anyway: a policy read by somebody deciding whether to
// sign up.
const authState = vi.hoisted(() => ({ user: null as { id: string } | null, loading: false }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }))

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

  it('indexes every section, and indexes nothing that is not a section', () => {
    // A hand-kept table of contents is a second copy of the structure, and the
    // copy is what goes stale -- an index entry pointing at a section that was
    // renamed is worse than no index. Both directions, so neither list can
    // drift from the other.
    render(<Privacy />)
    // Scoped to the index, not to every <nav>: SiteFooter renders one too,
    // and its links are absolute routes rather than in-page anchors.
    const links = [...document.querySelectorAll('[data-privacy-toc] a')]
    expect(links.length).toBeGreaterThan(0)

    for (const link of links) {
      const id = link.getAttribute('href')!.replace('#', '')
      const target = document.getElementById(id)
      expect(target, `the index links to #${id}, which is not on the page`).not.toBeNull()
      // The link text is the heading it points at, not a paraphrase of it.
      expect(target!.querySelector('h2')?.textContent).toBe(link.textContent)
    }

    const sections = [...document.querySelectorAll('article section[id]')]
    expect(sections.length).toBe(links.length)
  })

  it('offers an obvious way back without a site footer', () => {
    // Gabe's call. The footer carried the marketing page's own navigation --
    // including a `privacy` link pointing back at this very page -- so the
    // document ended by offering to take you to itself. The one control this
    // page needs is now in the header, where someone who stepped out of a
    // signup flow will look for it.
    render(<Privacy />)
    const home = screen.getByRole('link', { name: /Back to the home page/i })
    expect(home).toHaveAttribute('href', '/')
    expect(home).toHaveAttribute('data-variant', 'secondary')

    // No second `privacy` link, which is what the footer used to add.
    expect(screen.queryByRole('link', { name: /^privacy$/i })).toBeNull()
  })

  it('names every third party that receives anything', () => {
    // This page said "no analytics vendor, no advertising network and no
    // third-party tracking" -- true when written, and made false the moment
    // Vercel Web Analytics shipped. A policy that describes the previous
    // version of the product is worse than a vague one, because it is
    // confidently wrong. This asserts the two halves that matter: the vendor
    // is named, and the old blanket denial cannot come back.
    render(<Privacy />)
    const text = document.body.textContent ?? ''
    expect(text).toMatch(/Vercel Web Analytics/i)
    expect(text).toMatch(/no cookies/i)
    expect(text, 'the policy still denies having any analytics').not.toMatch(
      /no analytics vendor/i
    )
  })

  it('states whether AI is involved', () => {
    // "Does this thing feed my CV to a model" is the first question a
    // reasonable person asks of a CV tool. Currently the answer is no, and an
    // unanswered question reads as a yes.
    render(<Privacy />)
    expect(document.body.textContent).toMatch(/No AI is used/i)
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
