import { describe, it, expect } from 'vitest'
import { dedupeContactsByEmail, type Contact } from '../contacts'

const c = (id: string, email: string | null): Contact => ({
  id, user_id: 'u1', name: 'Recruiter', email, linkedin: null, notes: null,
})

describe('dedupeContactsByEmail', () => {
  it('collapses two contacts sharing an email', () => {
    expect(dedupeContactsByEmail([c('a', 'r@stripe.com'), c('b', 'r@stripe.com')])).toHaveLength(1)
  })

  it('treats email comparison as case-insensitive', () => {
    expect(dedupeContactsByEmail([c('a', 'R@Stripe.com'), c('b', 'r@stripe.com')])).toHaveLength(1)
  })

  it('keeps contacts with no email as distinct', () => {
    expect(dedupeContactsByEmail([c('a', null), c('b', null)])).toHaveLength(2)
  })
})
