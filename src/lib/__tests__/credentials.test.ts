import { describe, it, expect } from 'vitest'
import {
  isDisposableEmail,
  normalizeEmail,
  isValidEmail,
  passwordRequirements,
  isPasswordStrong,
  passwordScore,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../credentials'

describe('normalizeEmail', () => {
  it('collapses the case variants that would otherwise be separate accounts', () => {
    // The duplicate-account vector: without this, these are three sign-ups for
    // one person, and a script walking case permutations of one address can
    // create a great many rows that all belong to them.
    const forms = ['Gabe@Example.com', 'gabe@example.com', '  GABE@EXAMPLE.COM  ']
    expect(new Set(forms.map(normalizeEmail)).size).toBe(1)
    expect(normalizeEmail(forms[0])).toBe('gabe@example.com')
  })

  it('strips surrounding whitespace, which paste introduces', () => {
    expect(normalizeEmail(' a@b.co\n')).toBe('a@b.co')
  })
})

describe('isValidEmail', () => {
  it('accepts ordinary addresses, including the awkward legal ones', () => {
    for (const email of [
      'a@b.co',
      'first.last@example.com',
      'user+tag@sub.example.co.uk',
      "o'neill@example.org".replace("'", ''),
      'x!#$%&*+-/=?^_`{|}~@example.com',
    ]) {
      expect(isValidEmail(email), `${email} should be valid`).toBe(true)
    }
  })

  it('rejects the shapes that are certainly undeliverable', () => {
    for (const email of [
      '',
      'no-at-sign',
      '@example.com',
      'user@',
      'user@nodot',
      'user@.com',
      'user@example.',
      'user@-example.com',
      'user@example-.com',
      '.user@example.com',
      'user.@example.com',
      'us..er@example.com',
      'user name@example.com',
      'user@exam ple.com',
      'user@@example.com',
      'user@example.c',
      'user@example.12',
    ]) {
      expect(isValidEmail(email), `${email} should be invalid`).toBe(false)
    }
  })

  it('rejects an address past the RFC length limit', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })

  it('validates the NORMALISED form, so case never changes the verdict', () => {
    expect(isValidEmail('  USER@EXAMPLE.COM ')).toBe(true)
  })
})

describe('passwordRequirements', () => {
  it('reports each rule separately so the form can say which one is unmet', () => {
    // A form that says only "too weak" makes the person guess, and guessing at
    // a password field produces Password1! -- the shape that satisfies every
    // naive checker and appears in every breach corpus.
    const reqs = passwordRequirements('short')
    expect(reqs.map((r) => r.id)).toEqual([
      'length',
      'lowercase',
      'uppercase',
      'number',
      'symbol',
      'nospaces',
    ])
    expect(reqs.find((r) => r.id === 'lowercase')!.met).toBe(true)
    expect(reqs.find((r) => r.id === 'length')!.met).toBe(false)
    expect(reqs.find((r) => r.id === 'uppercase')!.met).toBe(false)
  })

  it('fails a password that is only long', () => {
    const reqs = passwordRequirements('aaaaaaaaaaaaaaaaaaaa')
    expect(reqs.find((r) => r.id === 'length')!.met).toBe(true)
    expect(reqs.find((r) => r.id === 'number')!.met).toBe(false)
  })

  it('catches a trailing space, which is a support ticket rather than a typo', () => {
    // Stored as typed, then never matches what the person types next time.
    expect(passwordRequirements('Str0ng!Pass ').find((r) => r.id === 'nospaces')!.met).toBe(
      false
    )
    expect(passwordRequirements('Str0ng!Pass').find((r) => r.id === 'nospaces')!.met).toBe(true)
  })

  it('treats an empty password as meeting nothing', () => {
    expect(passwordRequirements('').every((r) => !r.met)).toBe(true)
  })
})

describe('isPasswordStrong', () => {
  it('accepts a password meeting every rule', () => {
    expect(isPasswordStrong('Str0ng!Passw0rd')).toBe(true)
  })

  it('rejects one that misses any single rule', () => {
    expect(isPasswordStrong('str0ng!passw0rd')).toBe(false) // no uppercase
    expect(isPasswordStrong('Strong!Password')).toBe(false) // no number
    expect(isPasswordStrong('Str0ngPassw0rd')).toBe(false) // no symbol
    expect(isPasswordStrong('Str0ng!')).toBe(false) // too short
  })

  it('rejects a password past bcrypt truncation', () => {
    // Supabase hashes with bcrypt, which silently truncates at 72 BYTES.
    // Accepting more lets a person believe in protection they do not have.
    const long = `Aa1!${'x'.repeat(PASSWORD_MAX_LENGTH)}`
    expect(long.length).toBeGreaterThan(PASSWORD_MAX_LENGTH)
    expect(isPasswordStrong(long)).toBe(false)
  })

  it('uses a floor above the commodity-cracking range', () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(10)
  })
})

describe('passwordScore', () => {
  it('runs 0 to 1 across the rule set', () => {
    expect(passwordScore('')).toBe(0)
    expect(passwordScore('Str0ng!Passw0rd')).toBe(1)
    expect(passwordScore('abc')).toBeGreaterThan(0)
    expect(passwordScore('abc')).toBeLessThan(1)
  })
})

describe('isDisposableEmail', () => {
  it('catches the throwaway providers people actually reach for', () => {
    for (const address of [
      'someone@mailinator.com',
      'someone@yopmail.com',
      'someone@guerrillamail.com',
      'SOMEONE@10MinuteMail.com',
    ]) {
      expect(isDisposableEmail(address), address).toBe(true)
    }
  })

  it('catches subdomains, which several providers hand out by design', () => {
    // mailinator advertises `anything.mailinator.com`, so an exact-domain
    // match would be sidestepped by the provider's own headline feature.
    expect(isDisposableEmail('someone@inbox.mailinator.com')).toBe(true)
    expect(isDisposableEmail('someone@a.b.mailinator.com')).toBe(true)
  })

  it('does not flag a lookalike that merely ends in the same letters', () => {
    // `notmailinator.com` shares no label boundary with `mailinator.com`, and
    // a naive endsWith would have refused a real address.
    expect(isDisposableEmail('someone@notmailinator.com')).toBe(false)
    expect(isDisposableEmail('someone@mailinator.com.example.org')).toBe(false)
  })

  it('leaves ordinary addresses alone', () => {
    for (const address of [
      'someone@gmail.com',
      'someone@outlook.com',
      'someone@a-company.co.uk',
      'not-an-email',
      '',
    ]) {
      expect(isDisposableEmail(address), address).toBe(false)
    }
  })
})
