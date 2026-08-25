import { describe, it, expect } from 'vitest'
import { isDevSurfaceEnabled } from '../isDevSurface'

describe('isDevSurfaceEnabled', () => {
  it('is on in development', () => {
    expect(isDevSurfaceEnabled({ NODE_ENV: 'development' })).toBe(true)
  })

  it('is off in production by default', () => {
    expect(isDevSurfaceEnabled({ NODE_ENV: 'production' })).toBe(false)
  })

  it('can be opted into in production for design review', () => {
    expect(isDevSurfaceEnabled({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_GALLERY: 'true' })).toBe(true)
  })

  it('treats an absent NODE_ENV as development, not production', () => {
    expect(isDevSurfaceEnabled({})).toBe(true)
  })
})
