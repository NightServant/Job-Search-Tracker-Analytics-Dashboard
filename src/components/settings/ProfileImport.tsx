'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CssSpinner } from '@/components/ui/css-spinner'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { readFileText } from '@/lib/readFileText'
import { DownloadIcon, UploadIcon, TrashIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'

/**
 * SUPERSEDED BY `ProfileFetch` BELOW, and kept rather than deleted (Gabe,
 * Worktrack Revisions item 8: "Do not remove the unused variables in the
 * codebase"). It is still the only source that has ever carried the bullet
 * text under a role, which is the part a CV is written from, so it is worth
 * having when the fetch turns out not to be enough.
 *
 * How a profile gets in: LinkedIn's own data export.
 *
 * WHAT THIS REPLACES, and why none of it survived. The first version asked for
 * a Composio API key; the second asked for a profile URL and scraped the page.
 * The key was an org-wide credential for eight OIDC fields, and the scrape
 * could only ever recover what a rendered page showed -- titles and dates,
 * almost never the bullet text under a role, which is the part a CV is written
 * from. Both are gone. This asks for a file the user already owns.
 *
 * MULTIPLE FILES, because the export is an archive of them and the useful data
 * is spread across several. Dropping in Profile.csv alone works; adding
 * Positions.csv later merges rather than replaces, since each table writes
 * only its own fields.
 *
 * THE BUTTONS SIZE BY CONTAINER, NOT VIEWPORT. They live inside the profile
 * banner, which is a card whose width has nothing to do with the window's --
 * a viewport `sm:w-auto` turns them into two small buttons floating in a
 * narrow card on any screen wider than 640px, which is most of them. The
 * query is on `@container/profile`, declared by ProfileGroup, so it is the
 * panel's own width that decides.
 *
 * NO CREDENTIAL, NO NETWORK CALL. The parsing happens in the browser and only
 * the result is stored, so nothing here can be blocked, rate limited or
 * banned -- which is what the two previous attempts each ran into.
 */
export interface ProfileImportProps {
  onImport: (files: { name: string; text: string }[]) => void
  onClear?: () => void
  importing?: boolean
  clearing?: boolean
  /** Whether there is a stored profile, which is what makes clearing meaningful. */
  hasProfile?: boolean
  /** What went wrong, or what landed, from the last attempt. */
  note?: string | null
}

export function ProfileImport({
  onImport,
  onClear,
  importing = false,
  clearing = false,
  hasProfile = false,
  note = null,
}: ProfileImportProps) {
  const input = React.useRef<HTMLInputElement>(null)
  const busy = importing || clearing

  const choose = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(event.target.files ?? [])]
    // Reset first, so picking the SAME file twice still fires a change event --
    // otherwise a retry after a failed parse is a click that does nothing.
    event.target.value = ''
    if (!chosen.length) return
    onImport(
      await Promise.all(
        chosen.map(async (file) => ({ name: file.name, text: await readFileText(file) }))
      )
    )
  }

  return (
    <div className="flex flex-col gap-3" data-profile-import>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        multiple
        className="sr-only"
        onChange={(event) => void choose(event)}
      />

      {note && (
        <p className="text-body-s text-text-muted" data-profile-note>
          {note}
        </p>
      )}

      {/* Full width on a phone, natural from `sm` -- the standing rule for
          primary actions on this screen. */}
      <div className="flex flex-col gap-2 @sm/profile:flex-row @sm/profile:items-center">
        <Button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="w-full @sm/profile:w-auto"
        >
          <UploadIcon size={16} aria-hidden className={iconMotion('lift')} />
          {importing ? 'Reading' : hasProfile ? 'Import again' : 'Import LinkedIn export'}
        </Button>
        {hasProfile && onClear && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onClear()}
            disabled={busy}
            className="w-full @sm/profile:w-auto"
          >
            <TrashIcon size={16} aria-hidden className={iconMotion('drop')} />
            {clearing ? 'Removing' : 'Remove profile'}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The three steps, shown only when there is nothing yet.
 *
 * Separated from the button so the button can sit alone under a profile that
 * already imported -- instructions somebody has already followed are noise.
 */
export function ProfileImportSteps() {
  return (
    <ol
      className="flex list-decimal flex-col gap-1 pl-5 text-body-s text-text-muted"
      data-profile-steps
    >
      <li>
        On LinkedIn, open <span className="text-text-secondary">Settings &amp; Privacy</span> →{' '}
        <span className="text-text-secondary">Get a copy of your data</span>.
      </li>
      <li>
        Ask for the larger archive, not just connections. LinkedIn emails it — usually
        within minutes, sometimes up to a day.
      </li>
      <li>Unzip it and pick the CSVs here. Profile.csv alone is enough to start.</li>
    </ol>
  )
}

/**
 * How a profile gets in NOW: its public address, read through Firecrawl.
 *
 * WHY A LINK AND NOT A FILE. The export is a good source and a bad ask -- it
 * means opening LinkedIn's settings, requesting an archive, waiting for an
 * email that can take a day, unzipping it and picking the right CSVs before
 * this screen shows anything at all. A profile URL is one paste.
 *
 * WHY IT CAN WORK THIS TIME, given that a page scraper was built and removed
 * on 2026-09-06: that one fetched the page from our own servers and got an
 * authentication wall. Firecrawl runs the page and proxies it, so what comes
 * back is the logged-out profile as a browser sees it -- including the JSON-LD
 * graph in `<head>`, which carries the positions and schools as structured
 * data rather than as text to be scraped off a rendering.
 *
 * WHAT IT STILL WILL NOT GET is said in the warnings the fetch returns rather
 * than promised here: a public profile does not render the paragraph under
 * each role. See `scraper/extractor/profile.py`.
 */
export interface ProfileFetchProps {
  onFetch: (url: string) => void
  onClear?: () => void
  fetching?: boolean
  clearing?: boolean
  hasProfile?: boolean
  /** What went wrong, or what landed, from the last attempt. */
  note?: string | null
  /** The address already stored, so a re-fetch does not need retyping. */
  defaultUrl?: string | null
}

export function ProfileFetch({
  onFetch,
  onClear,
  fetching = false,
  clearing = false,
  hasProfile = false,
  note = null,
  defaultUrl = null,
}: ProfileFetchProps) {
  const [url, setUrl] = React.useState(defaultUrl ?? '')
  const [error, setError] = React.useState('')
  const busy = fetching || clearing

  // A stored profile arriving after first render should fill the box. Typing
  // wins from then on -- the effect only runs when the stored value changes.
  React.useEffect(() => {
    if (defaultUrl) setUrl(defaultUrl)
  }, [defaultUrl])

  const submit = () => {
    const trimmed = url.trim()
    if (!/^https?:\/\/.+/i.test(trimmed)) {
      setError('Paste the full address, starting with https://.')
      return
    }
    setError('')
    onFetch(trimmed)
  }

  return (
    <div className="flex flex-col gap-3" data-profile-fetch>
      <Field
        id="profile-url"
        label="LinkedIn profile URL"
        hint="the public address of your profile — the one you would send to someone."
      >
        <Input
          id="profile-url"
          type="url"
          icon="Link"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value)
            setError('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
          error={error || undefined}
          placeholder="https://www.linkedin.com/in/your-name"
          disabled={busy}
        />
      </Field>

      {note && (
        <p className="text-body-s text-text-muted" data-profile-note>
          {note}
        </p>
      )}

      {/* Full width on a narrow panel, natural once the card has room. The
          query is on `@container/profile`, declared by ProfileGroup: these
          live inside a card whose width has nothing to do with the window's. */}
      <div className="flex flex-col gap-2 @sm/profile:flex-row @sm/profile:items-center">
        <Button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full @sm/profile:w-auto"
        >
          {fetching ? (
            <CssSpinner size={14} />
          ) : (
            <DownloadIcon size={16} aria-hidden className={iconMotion('drop')} />
          )}
          {fetching ? 'Reading' : hasProfile ? 'Fetch again' : 'Build my profile'}
        </Button>
        {hasProfile && onClear && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => onClear()}
            disabled={busy}
            className="w-full @sm/profile:w-auto"
          >
            <TrashIcon size={16} aria-hidden className={iconMotion('lid')} />
            {clearing ? 'Removing' : 'Remove profile'}
          </Button>
        )}
      </div>
    </div>
  )
}

/** What the fetch does, in one paragraph, for the empty state. */
export function ProfileFetchSteps() {
  return (
    <ol
      className="flex list-decimal flex-col gap-1 pl-5 text-body-s text-text-muted"
      data-profile-steps
    >
      <li>Open your LinkedIn profile and copy the address from the browser bar.</li>
      <li>Paste it above. Worktrack reads the public page and fills in what it finds.</li>
      <li>
        Anything the public page does not show — the detail under each role, usually — you
        can write in yourself afterwards.
      </li>
    </ol>
  )
}
