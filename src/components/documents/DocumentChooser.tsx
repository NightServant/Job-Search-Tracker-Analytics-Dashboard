'use client'

import type { ResumeMode } from '@/services/resumeService'

/**
 * Which KIND of document is about to be created: a CV, or a cover letter.
 *
 * THIS IS THE OLD `ModeChooser`, BACK, AND ASKING A DIFFERENT QUESTION. It
 * used to ask which EDITOR -- Word or LaTeX -- and it was deleted on
 * 2026-09-13 along with the LaTeX editor, on the entirely correct grounds
 * that a modal with one button is not a choice. What makes it a choice again
 * is that `ResumeMode` now names the kind of document rather than the engine
 * (see `resumeService`), and the two kinds are genuinely different documents:
 * different templates start them, different tokens fill them in, and a letter
 * personalised as a CV is not a letter with a formatting problem, it is the
 * wrong document.
 *
 * IT IS ASKED BEFORE ANYTHING EXISTS, not offered as a toggle inside the
 * editor, for the same reason the template gallery moved out of the editor: by
 * the time a document is open, changing its kind means replacing what is on
 * screen, which is a destructive action wearing the chrome of a setting.
 *
 * IT LIVES IN `documents/` RATHER THAN `cv/`. The old one sat beside the
 * editors because it picked between them. This one picks what to create, and
 * every surface that creates something is a Documents surface -- the list
 * header, the empty state, the Templates page and the `/cv?draft=new` deep
 * link, which is a Documents entry point that happens to be parked on the
 * editor's route.
 *
 * IT RENDERS NO DIALOG OF ITS OWN. Three callers put it inside their own
 * `AppDialog`, and two of them already own a dialog's worth of state; a
 * component that opened itself would have to be told when to close by each of
 * them anyway.
 */
export interface DocumentChooserProps {
  creating?: boolean
  onChoose: (mode: ResumeMode) => void
}

const CHOICE =
  'flex flex-col gap-1 border-b border-border-subtle py-4 text-left ' +
  'transition-colors duration-(--duration-fast) hover:bg-bg-inset ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default ' +
  'disabled:pointer-events-none disabled:opacity-50'

export function DocumentChooser({ creating = false, onChoose }: DocumentChooserProps) {
  return (
    <div className="flex flex-col">
      {/* Sentence case, because these are prose rather than chrome: they are
          the names of two documents, not the labels on two controls. */}
      <button
        type="button"
        disabled={creating}
        data-document-choice="word"
        onClick={() => onChoose('word')}
        className={CHOICE}
      >
        <span className="text-body-m text-text-primary">Curriculum Vitae</span>
        <span className="text-body-s text-text-muted">
          Your history in sections, filled in from your LinkedIn profile.
        </span>
      </button>
      <button
        type="button"
        disabled={creating}
        data-document-choice="cover_letter"
        onClick={() => onChoose('cover_letter')}
        className={CHOICE}
      >
        <span className="text-body-m text-text-primary">Cover Letter</span>
        <span className="text-body-s text-text-muted">
          One page of prose addressed to a company, for a single application.
        </span>
      </button>
    </div>
  )
}
