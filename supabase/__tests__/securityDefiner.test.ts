import { readFileSync, readdirSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * Every SECURITY DEFINER function is either caller-guarded or not executable
 * by `anon`.
 *
 * THE JUSTIFICATION FOR THIS TEST CHANGED, AND THE OLD ONE WAS TOO NARROW. It
 * was written to protect a shared demo account from writes, back when the demo
 * was a real Supabase user with published credentials. That demo no longer
 * exists -- /demo/* is a public URL space over a fixture in the repo, with no
 * session and no write path -- but the defect this guards was never about
 * demos:
 *
 *   A SECURITY DEFINER function runs as its OWNER and does not consult RLS at
 *   all. So a missing guard is a hole for EVERY user, not a demo one, and no
 *   RESTRICTIVE policy can close it.
 *
 * M5 found exactly that in `delete_own_account`, which shipped without an
 * `is_demo()` guard, and then found `anon` still holding EXECUTE on it through
 * Supabase's ALTER DEFAULT PRIVILEGES -- a `REVOKE ... FROM PUBLIC` does not
 * touch a grant held by a named role. Two migrations closed it
 * (20260828090000 for the guard, 20260828093000 for the revoke). This test is
 * what stops the third one reopening it.
 */
const DIR = 'supabase/migrations'

function migrations(): { file: string; sql: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: readFileSync(`${DIR}/${file}`, 'utf8') }))
}

/** Strips `--` line comments so prose about SECURITY DEFINER is not scanned. */
function code(sql: string): string {
  return sql.replace(/--[^\n]*/g, '')
}

interface DefinerFn {
  name: string
  file: string
  body: string
}

function securityDefinerFunctions(): DefinerFn[] {
  const found: DefinerFn[] = []
  for (const { file, sql } of migrations()) {
    const stripped = code(sql)
    // Split on CREATE FUNCTION so each body is scanned against its own header.
    const chunks = stripped.split(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+/i).slice(1)
    for (const chunk of chunks) {
      if (!/SECURITY\s+DEFINER/i.test(chunk)) continue
      const name = chunk.match(/^([\w.]+)/)?.[1] ?? '(unnamed)'
      found.push({ name, file, body: chunk })
    }
  }
  return found
}

describe('SECURITY DEFINER functions in the migrations', () => {
  const fns = securityDefinerFunctions()

  it('finds the functions it claims to audit', () => {
    // Positive companion, and the one that matters most here. Every assertion
    // below is a for-loop over this list: if the parser stopped matching --
    // a formatting change, a renamed keyword -- the whole suite would pass
    // while auditing nothing at all. M5 shipped four tests with exactly that
    // shape.
    expect(fns.length).toBeGreaterThan(0)
    const names = fns.map((f) => f.name)
    expect(names).toContain('public.is_demo')
    expect(names).toContain('public.delete_own_account')
  })

  it('gives every definer function an explicit search_path', () => {
    // A SECURITY DEFINER function without a pinned search_path can be steered
    // into a caller-controlled schema and made to run someone else's
    // same-named function as the owner.
    for (const fn of fns) {
      expect(fn.body, `${fn.name} (${fn.file}) has no SET search_path`).toMatch(
        /SET\s+search_path/i
      )
    }
  })

  it('either guards the caller or takes EXECUTE away from anon', () => {
    const all = migrations().map((m) => code(m.sql)).join('\n')

    for (const fn of fns) {
      const bare = fn.name.replace(/^public\./, '')

      // Guarded: the body checks who is calling before it acts.
      const guardsCaller =
        /auth\.uid\(\)/i.test(fn.body) || /public\.is_demo\(\)/i.test(fn.body)

      // Or: anon cannot call it at all.
      const revokedFromAnon = new RegExp(
        `REVOKE[\\s\\S]{0,80}FUNCTION\\s+(?:public\\.)?${bare}\\s*\\([^)]*\\)[\\s\\S]{0,40}FROM\\s+anon`,
        'i'
      ).test(all)

      expect(
        guardsCaller || revokedFromAnon,
        `${fn.name} (${fn.file}) is SECURITY DEFINER but neither checks its caller ` +
          `nor has EXECUTE revoked from anon. A definer function bypasses RLS by ` +
          `definition, so no policy can cover for this.`
      ).toBe(true)
    }
  })

  it('keeps delete_own_account both guarded AND unreachable by anon', () => {
    // The one that actually shipped broken, so it is asserted specifically
    // rather than only through the loop above. Defence in depth: the in-body
    // guard is what makes it safe today, and the revoke is what keeps a future
    // reordering of those statements from becoming a remote-triggerable
    // delete.
    const fn = fns.find((f) => f.name === 'public.delete_own_account')
    expect(fn).toBeDefined()
    expect(fn!.body).toMatch(/auth\.uid\(\)/i)

    const all = migrations().map((m) => code(m.sql)).join('\n')
    expect(all).toMatch(/REVOKE[\s\S]{0,80}delete_own_account\s*\(\)[\s\S]{0,40}FROM\s+anon/i)
  })
})
