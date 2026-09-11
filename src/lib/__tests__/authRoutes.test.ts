import { describe, it, expect } from 'vitest'
import { decideRoute, isAuthOnlyPath, isPrivatePath, safeNextPath } from '../authRoutes'

describe('which routes need a session', () => {
  it('covers every screen behind the app shell, including child routes', () => {
    for (const path of [
      '/dashboard',
      '/applications',
      '/applications/abc-123',
      '/calendar',
      '/documents',
      '/documents/templates',
      '/cv',
      '/analytics',
      '/settings',
    ]) {
      expect(isPrivatePath(path), path).toBe(true)
    }
  })

  it('leaves the public surface alone', () => {
    // `/` and `/privacy` are readable signed in or out; `/demo/*` is the whole
    // point of having a demo.
    for (const path of ['/', '/privacy', '/login', '/signup', '/demo/dashboard']) {
      expect(isPrivatePath(path), path).toBe(false)
    }
  })

  it('does not treat a lookalike prefix as private', () => {
    // `/settings-export` is not under `/settings`, and a naive `startsWith`
    // would have locked it. There is no such route today; the guard is for the
    // day somebody adds one.
    expect(isPrivatePath('/settingsomething')).toBe(false)
    expect(isPrivatePath('/cvs')).toBe(false)
    expect(isAuthOnlyPath('/loginhelp')).toBe(false)
  })
})

describe('decideRoute', () => {
  it('sends a signed-out visitor to sign in, carrying where they were going', () => {
    expect(decideRoute('/applications', false).redirectTo).toBe(
      '/login?next=%2Fapplications'
    )
  })

  it('keeps the query string on the way through', () => {
    // A deep link like /applications?application=<id> must survive the round
    // trip, or signing in drops the thing the link was for.
    expect(decideRoute('/applications', false, '?application=abc').redirectTo).toBe(
      '/login?next=%2Fapplications%3Fapplication%3Dabc'
    )
  })

  it('sends a signed-in visitor off the auth pages', () => {
    expect(decideRoute('/login', true).redirectTo).toBe('/dashboard')
    expect(decideRoute('/signup', true).redirectTo).toBe('/dashboard')
  })

  it('lets everyone through where the answer does not depend on a session', () => {
    expect(decideRoute('/applications', true).redirectTo).toBeNull()
    expect(decideRoute('/login', false).redirectTo).toBeNull()
    expect(decideRoute('/privacy', true).redirectTo).toBeNull()
    expect(decideRoute('/privacy', false).redirectTo).toBeNull()
    expect(decideRoute('/demo/dashboard', false).redirectTo).toBeNull()
  })

  it('leaves the landing page to the client, signed in or out', () => {
    // Redirecting `/` in middleware would make a static marketing route
    // dynamic for everyone to serve the minority who are signed in.
    expect(decideRoute('/', true).redirectTo).toBeNull()
    expect(decideRoute('/', false).redirectTo).toBeNull()
  })
})

describe('safeNextPath', () => {
  it('accepts an ordinary app path', () => {
    expect(safeNextPath('/applications')).toBe('/applications')
    expect(safeNextPath('/applications?application=abc-123')).toBe(
      '/applications?application=abc-123'
    )
  })

  it('refuses anything that leaves this origin', () => {
    // `?next=` is in a URL somebody can send you, so it is attacker-controlled
    // by construction. Every one of these is a valid navigation target to a
    // browser and none of them is this app.
    for (const hostile of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
      'evil.com',
      '',
    ]) {
      expect(safeNextPath(hostile), hostile).toBeNull()
    }
  })

  it('refuses nothing at all', () => {
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
  })
})
