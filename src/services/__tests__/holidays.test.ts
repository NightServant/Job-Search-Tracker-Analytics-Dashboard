import { describe, it, expect } from 'vitest'
import { holidaysByDay, resolveHolidayCountry, type PublicHoliday } from '../holidays'
import { countryFromTimeZone, knownZoneCount } from '../timezoneCountry'

const holiday = (date: string, localName: string): PublicHoliday => ({
  date,
  localName,
  name: localName,
  countryCode: 'PH',
  global: true,
})

describe('resolveHolidayCountry', () => {
  // THE LANGUAGE CASES PASS `null` FOR THE ZONE, deliberately. The clock is
  // consulted first now, and it answers with whatever the machine running the
  // suite is set to -- which on the author's laptop is Asia/Manila, so every
  // one of these returned "PH" the moment the zone was wired in. Passing null
  // isolates the fallback these tests are actually about.
  it('takes the region off the first tag that carries one', () => {
    expect(resolveHolidayCountry(['en-PH', 'en-US'], null)).toBe('PH')
    expect(resolveHolidayCountry(['en', 'fil-PH'], null)).toBe('PH')
    expect(resolveHolidayCountry(['pt-BR'], null)).toBe('BR')
  })

  it('refuses to invent one from a bare language', () => {
    // `en` means "reads English". Maximising it to US is a guess dressed up as
    // knowledge, and a calendar showing the wrong country's holidays is worse
    // than one showing none until asked.
    expect(resolveHolidayCountry(['en'], null)).toBeNull()
    expect(resolveHolidayCountry([], null)).toBeNull()
  })

  it('normalises case and accepts the underscore form', () => {
    expect(resolveHolidayCountry(['en_ph'], null)).toBe('PH')
  })

  it('is not fooled by a script subtag standing where a region would', () => {
    // `zh-Hans` is a script, not a place. Four letters, so the region pattern
    // must not match it -- otherwise every Simplified Chinese browser would be
    // asked for holidays in country "HA".
    expect(resolveHolidayCountry(['zh-Hans'], null)).toBeNull()
    expect(resolveHolidayCountry(['zh-Hans-CN'], null)).toBe('CN')
  })

  it('stops at a Unicode extension rather than reading `ca` as Canada', () => {
    expect(resolveHolidayCountry(['en-u-ca-buddhist'], null)).toBeNull()
    expect(resolveHolidayCountry(['en-PH-u-ca-gregory'], null)).toBe('PH')
  })
})

describe('holidaysByDay', () => {
  it('buckets on the wall-calendar day string, never on a parsed instant', () => {
    const grouped = holidaysByDay([holiday('2026-04-09', 'Araw ng Kagitingan')])
    expect([...grouped.keys()]).toEqual(['2026-04-09'])
  })

  it('keeps every holiday that lands on one day', () => {
    // The Philippines stacks observances onto the same date in some years, and
    // a map that overwrote would silently drop one.
    const grouped = holidaysByDay([
      holiday('2026-04-09', 'Araw ng Kagitingan'),
      holiday('2026-04-09', "Eid'l Fitr"),
    ])
    expect(grouped.get('2026-04-09')).toHaveLength(2)
  })
})

describe('the clock outranks the language tag', () => {
  it('reads the Philippines off Asia/Manila even when the browser says en-US', () => {
    // THE EXACT DEFECT Gabe reported (2026-09-11). Chrome on a Manila machine
    // reports `en-US`, so the language-only version offered him United States
    // holidays. The clock is not confused about where it is.
    expect(resolveHolidayCountry(['en-US'], 'Asia/Manila')).toBe('PH')
  })

  it('agrees with the language tag when they agree', () => {
    expect(resolveHolidayCountry(['pt-BR'], 'America/Sao_Paulo')).toBe('BR')
  })

  it('falls back to the language region when the zone is unknown or absent', () => {
    // A browser too old to report a zone, or a zone the tzdb table has not
    // heard of, must not lose the weaker signal it used to run on.
    expect(resolveHolidayCountry(['en-GB'], 'Mars/Olympus_Mons')).toBe('GB')
    expect(resolveHolidayCountry(['en-GB'], null)).toBe('GB')
  })

  it('maps the zones this app is most likely to meet', () => {
    for (const [zone, country] of [
      ['Asia/Manila', 'PH'],
      ['Asia/Singapore', 'SG'],
      ['America/Chicago', 'US'],
      ['America/New_York', 'US'],
      ['Europe/London', 'GB'],
      ['Australia/Sydney', 'AU'],
      ['Asia/Tokyo', 'JP'],
      // A `backward` alias Safari still reports.
      ['Asia/Calcutta', 'IN'],
    ] as const) {
      expect(countryFromTimeZone(zone), zone).toBe(country)
    }
  })

  it('knows it does not know, rather than guessing', () => {
    expect(countryFromTimeZone('Nowhere/Nothing')).toBeNull()
    expect(countryFromTimeZone('')).toBeNull()
  })

  it('carries the whole tzdb table, not a hand-picked handful', () => {
    // Generated from zone.tab; a hand-written subset is how "America/Chicago
    // is not in the map" ships.
    expect(knownZoneCount()).toBeGreaterThan(400)
  })
})
