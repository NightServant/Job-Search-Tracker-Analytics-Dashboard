import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { hasLiveSession } from '../instantRedirect'

// The component reads the project URL to build the storage key. CI has no
// Supabase credentials, so the config is supplied here rather than the tests
// silently exercising the not-configured branch and asserting nothing.
const readSupabaseConfig = vi.hoisted(() => vi.fn())
vi.mock('@/lib/env', () => ({ currentEnvSource: () => ({}), readSupabaseConfig }))

import { InstantSignedInRedirect } from '../InstantSignedInRedirect'

beforeEach(() => {
  readSupabaseConfig.mockReturnValue({
    isConfigured: true,
    url: 'https://somyuulytwgzltiboewm.supabase.co',
    anonKey: 'anon',
  })
})

const NOW = 1_800_000_000_000
const live = { expires_at: Math.floor(NOW / 1000) + 3600, user: { id: 'u1' } }
const dead = { expires_at: Math.floor(NOW / 1000) - 60, user: { id: 'u1' } }

describe('deciding before the page paints', () => {
  it('recognises a live session', () => {
    expect(hasLiveSession(JSON.stringify(live), NOW)).toBe(true)
  })

  it('reads the base64 form supabase-js also writes', () => {
    // 2.9x uses a `base64-` prefix in some configurations and plain JSON in
    // others. Handling one and not the other means the fast path silently
    // stops working on a version bump.
    const encoded = 'base64-' + Buffer.from(JSON.stringify(live)).toString('base64')
    expect(hasLiveSession(encoded, NOW)).toBe(true)
  })

  it('reads the older currentSession wrapper', () => {
    expect(hasLiveSession(JSON.stringify({ currentSession: live }), NOW)).toBe(true)
  })

  it('does NOT redirect on an expired token', () => {
    // supabase-js may refresh it successfully a moment later, and
    // SignedInRedirect moves the visitor then. Sending them to a guarded
    // screen on a dead token risks a bounce straight back out.
    expect(hasLiveSession(JSON.stringify(dead), NOW)).toBe(false)
  })

  it('treats anything unreadable as signed out', () => {
    // It runs before anything else on the page. A throw here would be a blank
    // landing page for every visitor, so every branch has to fail safe.
    for (const raw of [null, '', 'not json', '{}', 'base64-!!!', JSON.stringify({ expires_at: 'soon' })]) {
      expect(hasLiveSession(raw, NOW), `"${raw}" was treated as a session`).toBe(false)
    }
  })
})

describe('the inline script', () => {
  it('embeds the real function rather than a copy of it', () => {
    // The script is built with `hasLiveSession.toString()`. A hand-written
    // duplicate in a template string would be a second implementation of the
    // rule, and only one of them would have the tests above.
    const { container } = render(<InstantSignedInRedirect />)
    const script = container.querySelector('[data-instant-redirect]')
    expect(script).toBeTruthy()
    expect(script!.innerHTML).toContain('base64-')
    expect(script!.innerHTML).toContain('expires_at')
    expect(script!.innerHTML).toContain('window.location.replace("/dashboard")')
  })

  it('is self-contained, because a serialised function has no scope', () => {
    // `hasLiveSession` must reference nothing outside its own body. If it grew
    // an import or a helper it would still typecheck, still pass the tests
    // above, and throw in the browser -- so the serialised text is checked for
    // the shapes a bundler emits for an outside reference.
    const source = hasLiveSession.toString()
    expect(source).not.toMatch(/\b(require|import)\s*\(/)
    // Webpack rewrites module references to `_something.foo` or `(0, x.y)`.
    expect(source).not.toMatch(/\(0,\s*\w+\.\w+\)/)
    // And it must actually still work after a round trip through text --
    // which is what the browser does with it.
    const revived = new Function(`return (${source})`)() as typeof hasLiveSession
    expect(revived(JSON.stringify(live), NOW)).toBe(true)
    expect(revived(JSON.stringify(dead), NOW)).toBe(false)
  })

  it('targets the project\'s own storage key', () => {
    const { container } = render(<InstantSignedInRedirect />)
    expect(container.querySelector('[data-instant-redirect]')!.innerHTML).toContain(
      'sb-somyuulytwgzltiboewm-auth-token'
    )
  })

  it('renders nothing when Supabase is not configured', () => {
    // CI and a fresh clone. A script referencing an empty storage key would
    // run on every visit and never match anything.
    readSupabaseConfig.mockReturnValue({ isConfigured: false, url: '', anonKey: '' })
    const { container } = render(<InstantSignedInRedirect />)
    expect(container.querySelector('[data-instant-redirect]')).toBeNull()
  })

  it('refuses a project ref that is not a plain identifier', () => {
    // The only interpolated value in a dangerouslySetInnerHTML string. The
    // pattern makes a crafted value unrepresentable rather than merely
    // unlikely -- asserted, because "it comes from a build-time env var" is a
    // reason to be careful, not a reason to skip the check.
    for (const url of [
      'https://evil").concat(alert(1)).concat(".supabase.co',
      'https://a-b.supabase.co/path',
      'http://plain.supabase.co',
      'https://sub.domain.supabase.co',
    ]) {
      readSupabaseConfig.mockReturnValue({ isConfigured: true, url, anonKey: 'anon' })
      const { container } = render(<InstantSignedInRedirect />)
      expect(
        container.querySelector('[data-instant-redirect]'),
        `"${url}" produced a script`
      ).toBeNull()
    }
  })
})
