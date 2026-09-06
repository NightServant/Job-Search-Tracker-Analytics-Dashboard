import { describe, it, expect } from 'vitest'
import { isDisallowedHostname, normalizeTargetUrl, rejectReason } from '../jobUrl'

/**
 * The SSRF gate on the Next side.
 *
 * THIS IS THE PRIMARY CONTROL. `/api/autofill` decides whether a fetch happens
 * at all; without it an authenticated user could point the server at
 * `http://169.254.169.254/` and read cloud metadata off our own egress. The
 * extractor re-checks where a redirect LANDS, which is a different question
 * only the fetcher can answer.
 *
 * Ported from the Deno function rather than re-derived, and the Python copy of
 * this same gate proves why: leaning on the standard library there silently
 * let carrier-grade NAT through, because Python reports 100.64.0.0/10 as
 * public. Every range below is listed explicitly on both sides now.
 */
describe('which hosts auto-fill may be pointed at', () => {
  it.each([
    ['localhost', 'localhost'],
    ['a .localhost subdomain', 'app.localhost'],
    ['an mDNS name', 'printer.local'],
    ['an .internal name', 'db.internal'],
    ['a single label', 'intranet'],
    ['loopback', '127.0.0.1'],
    ['RFC1918 /8', '10.0.0.1'],
    ['RFC1918 /12 low', '172.16.0.1'],
    ['RFC1918 /12 high', '172.31.255.255'],
    ['RFC1918 /16', '192.168.1.1'],
    ['cloud metadata', '169.254.169.254'],
    ['carrier-grade NAT', '100.64.0.1'],
    ['unspecified', '0.0.0.0'],
    ['multicast', '224.0.0.1'],
    ['IPv6 loopback', '::1'],
    ['IPv6 link-local', 'fe80::1'],
    ['IPv6 unique-local', 'fd00::1'],
  ])('refuses %s', (_label, host) => {
    expect(isDisallowedHostname(host)).toBe(true)
  })

  it.each(['boards.greenhouse.io', 'jobs.lever.co', 'www.linkedin.com', '8.8.8.8'])(
    'allows %s',
    (host) => {
      // The positive companion: a gate that refuses everything passes every
      // assertion above and breaks the feature outright.
      expect(isDisallowedHostname(host)).toBe(false)
    }
  )

  it('is not fooled by punctuation around the same target', () => {
    expect(isDisallowedHostname('127.0.0.1.')).toBe(true)
    expect(isDisallowedHostname('[::1]')).toBe(true)
  })
})

describe('what a person pastes', () => {
  it('reads a bare host and a protocol-relative URL as https', () => {
    expect(normalizeTargetUrl('acme.com/jobs/1')).toBe('https://acme.com/jobs/1')
    expect(normalizeTargetUrl('//acme.com/jobs/1')).toBe('https://acme.com/jobs/1')
    expect(normalizeTargetUrl('https://acme.com/jobs/1')).toBe('https://acme.com/jobs/1')
    expect(normalizeTargetUrl('   ')).toBe('')
  })

  it('names the reason it refuses, so the message can be shown', () => {
    expect(rejectReason(undefined)).toBe('URL is required')
    expect(rejectReason('')).toBe('URL is required')
    expect(rejectReason(`https://acme.com/${'a'.repeat(3000)}`)).toBe('URL is too long')
    expect(rejectReason('ftp://acme.com/x')).toBe('URL must start with http:// or https://')
    expect(rejectReason('file:///etc/passwd')).toBe('URL must start with http:// or https://')
    expect(rejectReason('http://169.254.169.254/latest/meta-data/')).toBe(
      'URL must be a public job posting URL'
    )
    expect(rejectReason('https://boards.greenhouse.io/acme/jobs/1')).toBeNull()
  })
})
