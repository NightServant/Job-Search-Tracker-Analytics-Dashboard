import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

/**
 * Every edge function authenticates the caller itself.
 *
 * WHY THIS GATE EXISTS: job-url-autofill shipped without one. Its three
 * siblings each called getUser(); it did not, and nothing in the repo noticed,
 * because "does this function check who is calling" was a habit rather than a
 * rule. The function fetches an arbitrary external URL server-side, so the
 * hole handed anyone on the internet a fetch proxy running on our egress IP
 * and our rate budget. It was found by reading all four side by side during
 * the 2026-09-02 audit -- which is exactly the review that does not happen
 * when function number five is added in a hurry.
 *
 * THE ANON KEY IS A VALID JWT AND IT IS PUBLIC. It ships in the client bundle,
 * deliberately, because RLS is what protects the data. That is the trap this
 * gate is really about: Supabase's platform-level `verify_jwt` only asks "is
 * this token well-formed and signed", and the anon key passes. Only getUser()
 * distinguishes a signed-in person from anyone who has read the bundle.
 *
 * Gating on SOURCE TEXT rather than behaviour is deliberate. These files run
 * on Deno, import over `npm:` specifiers, and call Deno.serve at module scope;
 * standing up a runtime for them inside vitest would cost more than it proves.
 * A text gate cannot verify the check is reachable -- it can only verify the
 * call is present -- so it is a floor, not a ceiling. It is still the thing
 * that would have caught the actual defect.
 */

const FUNCTIONS_DIR = 'supabase/functions'

/** Every deployable function: a directory with an index.ts, minus _shared. */
function edgeFunctions(): { name: string; path: string; source: string }[] {
  return readdirSync(FUNCTIONS_DIR)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => statSync(join(FUNCTIONS_DIR, name)).isDirectory())
    .map((name) => ({ name, path: join(FUNCTIONS_DIR, name, 'index.ts') }))
    .filter((fn) => {
      try {
        return statSync(fn.path).isFile()
      } catch {
        return false
      }
    })
    .map((fn) => ({ ...fn, source: readFileSync(fn.path, 'utf8') }))
}

describe('edge function authentication', () => {
  // POSITIVE COMPANION, and not a formality: every assertion below is inside a
  // loop over this list, so a glob that silently matched nothing -- a renamed
  // directory, a moved functions root -- would turn the whole suite green
  // while checking zero files. Naming the four also means DELETING one is a
  // deliberate edit here rather than a silent reduction in coverage.
  it('finds every function that is expected to exist', () => {
    const names = edgeFunctions().map((fn) => fn.name).sort()
    expect(names).toEqual([
      'analytics-cache-proxy',
      'cv-render',
      'job-url-autofill',
      'resume-export-pdf',
    ])
  })

  it('calls getUser() in every function', () => {
    const unguarded = edgeFunctions()
      .filter((fn) => !/\.auth\s*\.\s*getUser\s*\(/.test(fn.source))
      .map((fn) => fn.name)
    expect(unguarded, 'these functions accept unauthenticated callers').toEqual([])
  })

  it('acts as the caller, never as the service role', () => {
    // The service role bypasses RLS completely. A function holding it while
    // serving a browser request is a single missing `if` away from returning
    // any row in the database to any caller. None of the four need it: they
    // build their client from the anon key plus the caller's own
    // Authorization header, so every query they make stays behind RLS as that
    // user. This asserts that stays true.
    const privileged = edgeFunctions()
      .filter((fn) => /SERVICE_ROLE/.test(fn.source))
      .map((fn) => fn.name)
    expect(privileged, 'these functions can bypass RLS').toEqual([])
  })

  it('forwards the caller Authorization header into the client', () => {
    // getUser() on a client that was never given the caller's token reads the
    // ANON session and returns null forever -- a check that is present, runs,
    // and gates nothing. The header is what makes the call mean anything.
    const missing = edgeFunctions()
      .filter((fn) => !/Authorization/.test(fn.source) || !/SUPABASE_ANON_KEY/.test(fn.source))
      .map((fn) => fn.name)
    expect(missing).toEqual([])
  })
})
