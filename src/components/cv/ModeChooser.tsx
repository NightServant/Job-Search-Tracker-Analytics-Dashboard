'use client'

/**
 * Which editor a new CV opens in.
 *
 * M5 made this a full page at `/cv?draft=new`, reasoning that a dialog over
 * an otherwise empty screen has nothing behind it to protect. Gabe overruled
 * that (2026-08-29): "Editing applications and creating a new CV -- why did
 * you remove the dialog? The dialog adds user experience." It is a dialog
 * again -- `AppDialog`, opened from `DocumentsPage` so the list it used to
 * float over now actually is behind it, and still reachable at
 * `/cv?draft=new` as a deep link (`src/app/(app)/cv/page.tsx` opens the same
 * dialog directly when that param is `new`, so a bookmark behaves the same).
 * It no longer owns a `PageHeader` or a `backHref` link -- the dialog's own
 * title and close button are that chrome now.
 *
 * The choice is permanent in practice -- a Word CV and a LaTeX CV store
 * different content shapes and neither editor will open the other's -- so it
 * is asked once, up front, rather than offered as a toggle inside the editor.
 */
export interface ModeChooserProps {
  creating?: boolean
  onChoose: (mode: 'word' | 'latex') => void
}

const CHOICE =
  'flex flex-col gap-1 border-b border-border-subtle py-4 text-left ' +
  'transition-colors duration-[--duration-fast] hover:bg-bg-inset ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default ' +
  'disabled:pointer-events-none disabled:opacity-50'

export function ModeChooser({ creating = false, onChoose }: ModeChooserProps) {
  return (
    <div className="flex flex-col">
      <button type="button" disabled={creating} onClick={() => onChoose('word')} className={CHOICE}>
        <span className="text-body-m text-text-primary">Word editor</span>
        <span className="text-body-s text-text-muted">
          A document-style editor with autosave and PDF export.
        </span>
      </button>
      <button type="button" disabled={creating} onClick={() => onChoose('latex')} className={CHOICE}>
        <span className="text-body-m text-text-primary">LaTeX editor</span>
        <span className="text-body-s text-text-muted">
          source-code editing with a live preview, for LaTeX users.
        </span>
      </button>
    </div>
  )
}
