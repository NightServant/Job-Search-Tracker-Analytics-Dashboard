import { describe, it, expect } from 'vitest'
import { activeNavHref } from '../activeNav'

describe('activeNavHref', () => {
  it('treats a detail route as a child of its section', () => {
    expect(activeNavHref('/applications/abc', ['/dashboard', '/applications'])).toBe(
      '/applications'
    )
  })

  it('highlights nothing on settings', () => {
    expect(activeNavHref('/settings', ['/dashboard', '/applications'])).toBeNull()
  })

  it('does not match a prefix that is not a path segment', () => {
    expect(activeNavHref('/applications-archive', ['/applications'])).toBeNull()
  })
})
