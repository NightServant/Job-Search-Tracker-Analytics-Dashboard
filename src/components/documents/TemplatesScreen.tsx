'use client'

import * as React from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { AppDialog } from '@/components/ui/app-dialog'
import { ChevronLeftIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { useHideShellBanner } from '@/components/shell/shellBanner'
import { useAppHref } from '@/components/shell/routeBase'
import { TemplateGallery, type TemplateChoice } from './TemplateGallery'
import { DocumentChooser } from './DocumentChooser'
import type { ResumeMode } from '@/services/resumeService'

export interface TemplatesScreenProps {
  onChoose?: (choice: TemplateChoice) => void
  /** Fires once the blank card's kind has been chosen. */
  onChooseBlank?: (mode: ResumeMode) => void
  busy?: boolean
}

/**
 * The Templates screen: Word's "New" page, as a route of its own.
 *
 * WHY IT IS A PAGE AND NOT THE DIALOG IT REPLACES. Below `lg` the documents
 * screen leads with the user's own CVs, so the eleven-card rail that used to
 * sit above them had nowhere to go. A dialog was the other option and is
 * wrong for this: choosing a template is the start of a task, not a
 * confirmation, and a phone-sized modal holding a grid of cards is a page
 * wearing a scrim. Gabe asked for a page (2026-09-06), and it also gives the
 * choice a URL, a back button and a browser history entry.
 *
 * IT KEEPS THE APP SHELL. The top bar and the bottom nav stay, on Gabe's
 * instruction -- this is still a place inside the app, unlike the editor,
 * which takes the whole viewport. The demo banner is the one thing suppressed
 * (see useHideShellBanner): the visitor read it on the way in, and a second
 * copy would push the first row of cards off the screen.
 *
 * IT CARRIES BOTH KINDS OF TEMPLATE, AND THE CONTROLS THAT NARROW THEM. The
 * old rule here was "Word templates only", because the LaTeX editor did not
 * exist below `lg` and a LaTeX template would have created a document that
 * could not be opened on the device that made it. Cover letters have no such
 * problem -- they are the same row, the same editor and the same snapshots as
 * a CV -- so both sets are offered, and this is the screen Gabe named for the
 * search box and the kind dropdown on mobile and tablet. They are the
 * gallery's own controls (see `TemplateGallery`), which is what keeps them
 * identical to the pair desktop gets above the documents list.
 *
 * THE BLANK CARD ASKS WHICH KIND FIRST. Every other card on this screen names
 * its kind under its thumbnail; the blank one cannot, because a blank page is
 * whichever kind you say it is. So it opens the same chooser the `new
 * document` button opens on desktop, rather than quietly defaulting to a CV
 * and handing a letter-writer a Skills heading to delete.
 */
export function TemplatesScreen({ onChoose, onChooseBlank, busy = false }: TemplatesScreenProps) {
  useHideShellBanner()
  const appHref = useAppHref()
  const [blankOpen, setBlankOpen] = React.useState(false)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        {/* The way back, and the only one: the bottom nav's `documents` entry
            leads here too, but a screen reached BY a tap should offer the tap
            that undoes it rather than making the reader find the equivalent
            destination. */}
        <Link
          href={appHref('/documents')}
          className="inline-flex w-fit items-center gap-1.5 text-body-s text-text-secondary hover:text-text-primary"
        >
          <ChevronLeftIcon size={14} aria-hidden className={iconMotion('back')} />
          documents
        </Link>
        <PageHeader
          title="new document"
          description="start from a CV or cover letter template, or from a blank page."
        />
      </div>

      <TemplateGallery
        variant="page"
        busy={busy}
        onChoose={(choice) => onChoose?.(choice)}
        onChooseBlank={() => setBlankOpen(true)}
      />

      <AppDialog
        open={blankOpen}
        onOpenChange={setBlankOpen}
        title="new document"
        icon="Documents"
      >
        <DocumentChooser
          creating={busy}
          onChoose={(mode) => {
            setBlankOpen(false)
            onChooseBlank?.(mode)
          }}
        />
      </AppDialog>
    </div>
  )
}
