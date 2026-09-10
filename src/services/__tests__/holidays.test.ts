import { describe, it, expect } from 'vitest'
import { holidaysByDay, resolveHolidayCountry, type PublicHoliday } from '../holidays'

const holiday = (date: string, localName: string): PublicHoliday => ({
  date,
  localName,
  name: localName,
  countryCode: 'PH',
  global: true,
})

describe('resolveHolidayCountry', () => {
  it('takes the region off the first tag that carries one', () => {
    expect(resolveHolidayCountry(['en-PH', 'en-US'])).toBe('PH')
    expect(resolveHolidayCountry(['en', 'fil-PH'])).toBe('PH')
    expect(resolveHolidayCountry(['pt-BR'])).toBe('BR')
  })

  it('refuses to invent one from a bare language', () => {
    // `en` means "reads English". Maximising it to US is a guess dressed up as
    // knowledge, and a calendar showing the wrong country's holidays is worse
    // than one showing none until asked.
    expect(resolveHolidayCountry(['en'])).toBeNull()
    expect(resolveHolidayCountry([])).toBeNull()
  })

  it('normalises case and accepts the underscore form', () => {
    expect(resolveHolidayCountry(['en_ph'])).toBe('PH')
  })

  it('is not fooled by a script subtag standing where a region would', () => {
    // `zh-Hans` is a script, not a place. Four letters, so the region pattern
    // must not match it -- otherwise every Simplified Chinese browser would be
    // asked for holidays in country "HA".
    expect(resolveHolidayCountry(['zh-Hans'])).toBeNull()
    expect(resolveHolidayCountry(['zh-Hans-CN'])).toBe('CN')
  })

  it('stops at a Unicode extension rather than reading `ca` as Canada', () => {
    expect(resolveHolidayCountry(['en-u-ca-buddhist'])).toBeNull()
    expect(resolveHolidayCountry(['en-PH-u-ca-gregory'])).toBe('PH')
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
