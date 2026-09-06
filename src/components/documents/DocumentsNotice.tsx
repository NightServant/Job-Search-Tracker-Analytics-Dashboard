'use client'

import * as React from 'react'
import { useToast } from '@/contexts/ToastContext'
import { useBelowDesktop } from '@/hooks/useBelowDesktop'
import { CloseIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export type NoticeKind = 'success' | 'error' | 'info'

export interface Notice {
  kind: NoticeKind
  title: string
  message?: string
}

/**
 * How the Documents screens report what just happened.
 *
 * DESKTOP KEEPS SONNER. Below `lg` it does not (Gabe, 2026-09-06), and the
 * reason is that a toast and this screen want the same corner. Sonner drops
 * its stack over the bottom-right, which on a phone is the bottom edge --
 * directly on top of the bottom nav, and directly on top of the `new CV` CTA
 * on the Templates screen. A toast that covers the control you just pressed
 * reads as the app breaking rather than replying.
 *
 * A BANNER ALSO PERSISTS, which matters more here than anywhere else in the
 * app. The two things this screen reports are "your draft was created" and
 * "that file could not be imported" -- the second is an explanation, and a
 * four-second explanation is one the reader has to reproduce the failure to
 * read again.
 *
 * One hook rather than a prop, so a screen cannot accidentally use sonner on
 * one path and the banner on another.
 */
export function useDocumentsNotice() {
  const compact = useBelowDesktop()
  const { success, error, info } = useToast()
  const [notice, setNotice] = React.useState<Notice | null>(null)

  const notify = React.useCallback(
    (kind: NoticeKind, title: string, message?: string) => {
      if (compact) {
        setNotice({ kind, title, message })
        return
      }
      const send = kind === 'success' ? success : kind === 'error' ? error : info
      send(title, message)
    },
    [compact, success, error, info]
  )

  return { notify, notice, dismiss: React.useCallback(() => setNotice(null), []) }
}

const KIND_RULE: Record<NoticeKind, string> = {
  // The status palette, used for its documented meanings only: green for a
  // thing that completed, red for a thing that failed, blue for a statement of
  // fact. Orange is the accent and is never a status -- Global Constraint.
  success: 'border-l-status-offer-mark',
  error: 'border-l-status-rejected-mark',
  info: 'border-l-status-applied-mark',
}

/**
 * The banner itself. Fixed above the bottom nav, full width, dismissible.
 *
 * `pb-nav` on the WRAPPER rather than an offset on the card: that utility is
 * already the nav's height plus the iOS home-indicator inset in one calc, so
 * the banner clears the nav on a notched phone without this file knowing what
 * a notch is.
 */
export function DocumentsNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  if (!notice) return null

  return (
    <div
      data-documents-notice
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-gutter pb-nav lg:hidden"
    >
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-auto mb-3 flex items-start gap-3 rounded-md border border-l-2 border-border-subtle bg-bg-canvas p-3',
          KIND_RULE[notice.kind]
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-body-m text-text-primary">{notice.title}</p>
          {notice.message && <p className="text-body-s text-text-muted">{notice.message}</p>}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-text-muted hover:text-text-primary"
        >
          <CloseIcon size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}
