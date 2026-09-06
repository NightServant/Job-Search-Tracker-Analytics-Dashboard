import { describe, it, expect } from 'vitest'
import { importLinkedInExport } from '../linkedinExport'

/**
 * VERBATIM from a real LinkedIn export (2026-09-06). The header row and the
 * quoting are exactly as LinkedIn writes them -- including the comma-bearing
 * address, which is the thing a naive split would break on.
 */
const PROFILE_CSV = `First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers
Elijah Gabe,Cervantes,,"Block 2, Lot 29, Metrobamban Subdivision, Brgy. Anupul, Bamban, Tarlac",Mar 7,Detail-oriented and motivated Computer Science graduate from Tarlac State University seeking to start my career as a Front-End Developer while continuously expanding my expertise towards Full-Stack Development.,,Software Development,,"Bamban, Central Luzon, Philippines",,,
`

const file = (name: string, text: string) => ({ name, text })

describe('importing a LinkedIn export', () => {
  it('reads the real Profile.csv', () => {
    const { profile, recognised } = importLinkedInExport([file('Profile.csv', PROFILE_CSV)])
    expect(recognised).toEqual(['Profile'])
    expect(profile.name).toBe('Elijah Gabe Cervantes')
    expect(profile.industry).toBe('Software Development')
    expect(profile.location).toBe('Bamban, Central Luzon, Philippines')
    expect(profile.birthDate).toBe('Mar 7')
    expect(profile.headline).toContain('Computer Science graduate')
    // Summary is empty in this export, and an empty cell must be null rather
    // than an empty string the panel would render as a blank paragraph.
    expect(profile.summary).toBeNull()
  })

  it('keeps a quoted address whole, commas and all', () => {
    const { profile } = importLinkedInExport([file('Profile.csv', PROFILE_CSV)])
    expect(profile.address).toBe(
      'Block 2, Lot 29, Metrobamban Subdivision, Brgy. Anupul, Bamban, Tarlac'
    )
  })

  it('identifies a table by its HEADER, not its filename', () => {
    // LinkedIn renames and re-cases these between exports, and a user can drag
    // one file in without the archive around it.
    const { recognised, profile } = importLinkedInExport([
      file('some-renamed-file.csv', PROFILE_CSV),
    ])
    expect(recognised).toEqual(['Profile'])
    expect(profile.name).toBe('Elijah Gabe Cervantes')
  })

  it('reads positions with their descriptions', () => {
    // The bullet text is the whole reason the export beats a scrape.
    const csv = `Company Name,Title,Description,Location,Started On,Finished On
Worktrack,Front-end Developer,"Built the tracker.
Shipped the editor.",Remote,Jan 2025,
Previous Co,Developer,Maintained the platform.,Manila,Jan 2023,Dec 2024
`
    const { profile, recognised } = importLinkedInExport([file('Positions.csv', csv)])
    expect(recognised).toEqual(['Positions'])
    expect(profile.experiences).toHaveLength(2)
    expect(profile.experiences[0]).toMatchObject({
      title: 'Front-end Developer',
      company: 'Worktrack',
      location: 'Remote',
      // An empty end date is a role you are still in.
      period: 'Jan 2025 – present',
    })
    expect(profile.experiences[0].description).toContain('Shipped the editor.')
    expect(profile.experiences[1].period).toBe('Jan 2023 – Dec 2024')
  })

  it('merges tables regardless of the order they arrive in', () => {
    const skills = `Name\nReact\nTypeScript\n`
    const forwards = importLinkedInExport([
      file('Profile.csv', PROFILE_CSV),
      file('Skills.csv', skills),
    ])
    const backwards = importLinkedInExport([
      file('Skills.csv', skills),
      file('Profile.csv', PROFILE_CSV),
    ])
    expect(forwards.profile.name).toBe(backwards.profile.name)
    expect(forwards.profile.skills).toEqual(['React', 'TypeScript'])
    expect(backwards.profile.skills).toEqual(['React', 'TypeScript'])
  })

  it('tells the caller which files it could not read', () => {
    const { recognised, unrecognised } = importLinkedInExport([
      file('Profile.csv', PROFILE_CSV),
      file('Connections.csv', 'Something,Else\n1,2\n'),
    ])
    expect(recognised).toEqual(['Profile'])
    expect(unrecognised).toEqual(['Connections.csv'])
  })

  it('does not confuse Education with Positions -- both carry dates', () => {
    const csv = `School Name,Degree Name,Start Date,End Date,Notes
Tarlac State University,BS Computer Science,2021,2025,
`
    const { recognised, profile } = importLinkedInExport([file('Education.csv', csv)])
    expect(recognised).toEqual(['Education'])
    expect(profile.education[0]).toMatchObject({
      school: 'Tarlac State University',
      degree: 'BS Computer Science',
      period: '2021 – 2025',
    })
    expect(profile.experiences).toEqual([])
  })

  it('reports nothing recognised rather than inventing a profile', () => {
    const { recognised, profile } = importLinkedInExport([
      file('Random.csv', 'a,b\n1,2\n'),
    ])
    expect(recognised).toEqual([])
    expect(profile.name).toBeNull()
  })
})
