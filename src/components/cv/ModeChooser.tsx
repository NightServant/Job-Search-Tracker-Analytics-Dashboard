'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { buttonVariants } from '@/components/ui/button'

/**
 * Which editor a new CV opens in.
 *
 * This was a modal over the drafts list. It is a page now, because the list it
 * used to sit on top of moved to `/documents`: a dialog floating over an
 * otherwise empty screen is a dialog with nothing behind it to protect. It is
 * reached at `/cv?draft=new`, so `+ new cv` on the Documents header can be a
 * plain link and every write to `resumes` stays on one route.
 *
 * The choice is permanent in practice -- a Word CV and a LaTeX CV store
 * different content shapes and neither editor will open the other's -- so it
 * is asked once, up front, rather than offered as a toggle inside the editor.
 */
export interface ModeChooserProps {
  backHref: string
  creating?: boolean
  onChoose: (mode: 'word' | 'latex') => void
}

const CHOICE =
  'flex flex-col gap-1 border-b border-border-subtle py-4 text-left ' +
  'transition-colors duration-[--duration-fast] hover:bg-bg-inset ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default ' +
  'disabled:pointer-events-none disabled:opacity-50'

export function ModeChooser({ backHref, creating = false, onChoose }: ModeChooserProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New CV"
        action={
          <Link href={backHref} className={buttonVariants({ variant: 'ghost', size: 's' })}>
            Back
          </Link>
        }
      />
      <div className="border-t border-border-subtle">
        <button type="button" disabled={creating} onClick={() => onChoose('word')} className={CHOICE}>
          <span className="text-body-m text-text-primary">Word editor</span>
          <span className="text-body-s text-text-muted">
            A document-style editor with autosave and PDF export.
          </span>
        </button>
        <button type="button" disabled={creating} onClick={() => onChoose('latex')} className={CHOICE}>
          <span className="text-body-m text-text-primary">LaTeX editor</span>
          <span className="text-body-s text-text-muted">
            Source-code editing with a live preview, for LaTeX users.
          </span>
        </button>
      </div>
    </div>
  )
}
