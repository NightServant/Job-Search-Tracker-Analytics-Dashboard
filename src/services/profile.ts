/**
 * The profile Worktrack shows on Settings -> Profile.
 *
 * SOURCE-AGNOSTIC ON PURPOSE. The first version of this screen was bound to
 * Composio's LinkedIn connector and could only ever show the eight fields
 * self-serve OIDC returns -- name, email, picture, locale. That shape leaked
 * into the component, so changing where the data came from meant rewriting the
 * screen. This type is what a CV-writing app wants to know about a person;
 * whatever fills it in is a detail behind it.
 *
 * Everything is optional because every source is partial. A profile with only
 * a name is still a profile, and the panel renders whichever fields arrived
 * rather than blanking on the ones that did not.
 */
export interface ProfileExperience {
  title: string
  company: string | null
  /** Free text, e.g. "Jan 2024 – Present". Sources disagree too much to parse. */
  period: string | null
  location: string | null
  /**
   * The bullet text under a role.
   *
   * THE FIELD THE WHOLE IMPORT EXISTS FOR. A rendered profile page gives up
   * titles and dates; this is the part a CV is actually written from, and only
   * the export carries it.
   */
  description: string | null
}

export interface ProfileCertification {
  name: string
  authority: string | null
  period: string | null
}

export interface ProfileProject {
  title: string
  description: string | null
  url: string | null
}

export interface ProfileEducation {
  school: string
  degree: string | null
  period: string | null
}

export interface UserProfile {
  name: string | null
  /** The one-line professional headline. */
  headline: string | null
  location: string | null
  pictureUrl: string | null
  email: string | null
  /** The "about" paragraph. */
  summary: string | null
  url: string | null
  /** LinkedIn's `Industry`, e.g. "Software Development". */
  industry: string | null
  /**
   * The postal address from the export.
   *
   * SENSITIVE, AND OPTIONAL BY NATURE. LinkedIn's Profile.csv carries a full
   * street address and a birth date. They belong to a CV in some markets and
   * to no CV at all in others, so they are stored when the export has them and
   * shown plainly rather than quietly -- and `/privacy` names them, because a
   * home address is not the same category of fact as a job title.
   */
  address: string | null
  /** As LinkedIn writes it -- "Mar 7". Usually no year, so it is not a date. */
  birthDate: string | null
  websites: string[]
  experiences: ProfileExperience[]
  education: ProfileEducation[]
  skills: string[]
  certifications: ProfileCertification[]
  languages: string[]
  projects: ProfileProject[]
  /** When this snapshot was taken, ISO. Profiles go stale silently otherwise. */
  fetchedAt: string | null
}

export const EMPTY_PROFILE: UserProfile = {
  name: null,
  headline: null,
  location: null,
  pictureUrl: null,
  email: null,
  summary: null,
  url: null,
  industry: null,
  address: null,
  birthDate: null,
  websites: [],
  experiences: [],
  education: [],
  skills: [],
  certifications: [],
  languages: [],
  projects: [],
  fetchedAt: null,
}

/** Whether there is anything worth rendering. */
export function hasProfileContent(profile: UserProfile): boolean {
  return Boolean(
    profile.name ||
      profile.headline ||
      profile.summary ||
      profile.experiences.length ||
      profile.education.length ||
      profile.skills.length ||
      profile.certifications.length ||
      profile.languages.length ||
      profile.projects.length
  )
}
