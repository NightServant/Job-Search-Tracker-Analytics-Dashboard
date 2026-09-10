'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckIcon, DocumentsIcon, ExternalIcon, PencilIcon } from '@/components/icons'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { cn } from '@/lib/utils'

/**
 * The second column: the posting itself, short enough to read.
 *
 * A SCRAPED POSTING IS LONG -- eight hundred words of responsibilities,
 * benefits and legal boilerplate -- and the old record printed all of it into
 * the widest column of the dialog. So the model's summary sits on top and the
 * full text sits under it, in a box the user can type in.
 *
 * THERE IS NO `tidy and summarise` BUTTON (Gabe, 2026-09-10: "the model
 * auto-summarizes the job description"). The add wizard runs the digest on
 * every posting it fetches, so by the time a description reaches a record it
 * has already been tidied and summarised -- a button asking for it again was
 * offering work that had been done.
 *
 * THE SUMMARY IS NOT STORED, and that is deliberate rather than an omission.
 * `jobs` has no column for it, and adding one would mean a migration to hold a
 * derived value that goes stale the moment the description is edited. It is
 * produced during the add flow and shown for as long as that dialog is open;
 * the description it summarises is what actually persists, already tidied by
 * the same pass.
 *
 * IT IS NOT A TEXTAREA AT REST (Gabe, 2026-09-09: "Remove the text area but
 * display the job description with proper format"). A scraped posting has
 * headings, bullets and paragraphs, and a textarea flattens all three into one
 * monospaced-feeling block with its own scrollbar inside a dialog that already
 * scrolls. So it READS as a posting and becomes a field only when someone asks
 * to change it -- which keeps the revision's other requirement, that this
 * column be editable by hand.
 *
 * `PostingBody` below does the rendering, and it invents nothing: it groups
 * lines that are already there. The tidying that produced those lines is
 * `services/postingFormat`, which runs before anything is stored.
 */
export interface RecordDescriptionProps {
  value: string
  onChange: (value: string) => void
  url?: string | null
  /** The summary the add flow's digest produced, if this surface has one. */
  summary?: string
  className?: string
}

/**
 * A posting, rendered as the document it is.
 *
 * THE RULES ARE MECHANICAL, deliberately -- this is a view, and a view that
 * guesses at meaning is a view that will one day be wrong about somebody's job
 * advert. A line is a bullet if it starts with a bullet glyph or a number; it
 * is a heading if it is short and ends in a colon; otherwise it is a
 * paragraph. Nothing is reordered, reworded or dropped.
 *
 * Consecutive bullets collapse into one list, which is the only structural
 * claim made here and the one that matters: eight `<p>` elements each starting
 * with a dash is not a list, it just looks like one until you copy it.
 */
function PostingBody({ text }: { text: string }) {
  const blocks: React.ReactNode[] = []
  const lines = text.split(/\r?\n/)
  let bullets: string[] = []

  const flush = (key: number) => {
    if (bullets.length === 0) return
    blocks.push(
      <ul key={`ul-${key}`} className="flex list-disc flex-col gap-1 pl-5 text-body-m text-text-secondary">
        {bullets.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
    bullets = []
  }

  lines.forEach((raw, index) => {
    const line = raw.trim()
    if (!line) {
      flush(index)
      return
    }
    const bullet = line.match(/^(?:[-–—•·*]|\d+[.)])\s+(.*)$/)
    if (bullet) {
      bullets.push(bullet[1])
      return
    }
    flush(index)
    // A heading is short and ends in a colon. Long lines ending in a colon are
    // sentences that happen to introduce something, and setting them in bold
    // would emphasise a paragraph rather than name a section.
    if (line.length <= 80 && line.endsWith(':')) {
      blocks.push(
        <h4 key={index} className="text-label-caps uppercase text-text-secondary">
          {line.replace(/:$/, '')}
        </h4>
      )
      return
    }
    blocks.push(
      <p key={index} className="text-body-m text-text-secondary">
        {line}
      </p>
    )
  })
  flush(lines.length)

  return (
    <div className="flex flex-col gap-3" data-posting-body>
      {blocks}
    </div>
  )
}

export function RecordDescription({
  value,
  onChange,
  url,
  summary = '',
  className,
}: RecordDescriptionProps) {
  // Reading by default. An empty description opens in edit, because there is
  // nothing to read and a person looking at a blank column should not have to
  // work out that a button turns it into a field.
  const [editing, setEditing] = React.useState(!value.trim())

  return (
    <section className={cn('flex flex-col gap-4', className)} aria-label="Job description">
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-heading-s text-text-primary">
          <DocumentsIcon size={16} aria-hidden className="shrink-0 text-text-muted" />
          job description
        </h3>
        <div className="flex shrink-0 items-center gap-3">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={`${ICON_MOTION_GROUP} flex shrink-0 items-center gap-1 text-body-s text-text-secondary hover:text-text-primary hover:underline`}
            >
              view posting
              <ExternalIcon size={14} className={iconMotion('forward', { press: false })} />
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="s"
            className="px-0"
            onClick={() => setEditing((open) => !open)}
            aria-expanded={editing}
          >
            {editing ? (
              <CheckIcon size={16} aria-hidden className={iconMotion('none')} />
            ) : (
              <PencilIcon size={16} aria-hidden className={iconMotion('edit')} />
            )}
            {editing ? 'done' : 'edit'}
          </Button>
        </div>
      </div>

      {summary && (
        // A RULE, NOT A CARD. The summary is the same text one level up, so it
        // is set apart by a hairline and a label rather than by a filled box,
        // which is the vocabulary the rest of the record uses.
        <div className="flex flex-col gap-1 border-l-2 border-accent-default pl-3" data-posting-summary>
          <p className="text-label-caps uppercase text-text-secondary">summary</p>
          <p className="text-body-m text-text-primary">{summary}</p>
        </div>
      )}

      {editing ? (
        <Textarea
          id="description"
          aria-label="job description"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={!!value.trim()}
          // Tall while it IS a field: this is where a whole posting gets
          // pasted, and a six-line box means scrolling one scrollport inside
          // another to check what you pasted.
          className="min-h-64 @4xl/record:min-h-[26rem]"
          placeholder="paste the posting here, or let the link fill it in."
        />
      ) : value.trim() ? (
        <PostingBody text={value} />
      ) : (
        <p className="text-body-s text-text-muted">
          No description saved. Press edit to paste one — it is what the ATS match reads.
        </p>
      )}
    </section>
  )
}
