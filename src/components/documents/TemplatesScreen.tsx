'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { ChevronLeftIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { useHideShellBanner } from '@/components/shell/shellBanner'
import { useAppHref } from '@/components/shell/routeBase'
import { TemplateGallery, type TemplateChoice } from './TemplateGallery'

export interface TemplatesScreenProps {
  onChoose?: (choice: TemplateChoice) => void
  onChooseBlank?: () => void
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
 * WORD TEMPLATES ONLY. The LaTeX editor and preview do not exist below `lg`,
 * so offering a LaTeX template here would create a document that cannot be
 * opened on the device that made it.
 */
export function TemplatesScreen({ onChoose, onChooseBlank, busy = false }: TemplatesScreenProps) {
  useHideShellBanner()
  const appHref = useAppHref()

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
          title="new CV"
          description="start from a template, or from a blank page."
        />
      </div>

      <TemplateGallery
        variant="page"
        modes={['word']}
        busy={busy}
        onChoose={(choice) => onChoose?.(choice)}
        onChooseBlank={() => onChooseBlank?.()}
      />
    </div>
  )
}
