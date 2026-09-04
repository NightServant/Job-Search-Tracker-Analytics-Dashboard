'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CssSpinner } from '@/components/ui/css-spinner'
import { DownloadIcon, SearchIcon, UploadIcon } from '@/components/icons'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'

/**
 * Search plus the two CSV controls.
 *
 * `Add` is deliberately absent. The roadmap called it "the remaining
 * inconsistency": it is the same kind of control as Documents' `+ new cv`, and
 * that one sits in the body header. It now sits there here too, which leaves
 * this row holding only the things that act on the list rather than create
 * into it.
 *
 * The file input is owned here rather than by the page so that the picker and
 * the button that opens it cannot drift apart, and it is reset on every change
 * so choosing the same file twice still fires.
 */
export interface ApplicationsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  onCsvFile: (file: File) => void
  onExport: () => void
  importBusy?: boolean
  exportDisabled?: boolean
  className?: string
}

export function ApplicationsToolbar({
  search,
  onSearchChange,
  onCsvFile,
  onExport,
  importBusy = false,
  exportDisabled = false,
  className,
}: ApplicationsToolbarProps) {
  const fileRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {/* The group is the FIELD'S WRAPPER, not a button: the lens should
          react to the box being focused or typed into, which is what
          `zoom`'s focus-within trigger is for. */}
      <div className={cn(ICON_MOTION_GROUP, 'relative w-full sm:max-w-sm')}>
        <SearchIcon
          size={16}
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-3 top-3 text-text-muted',
            iconMotion('zoom', { press: false })
          )}
        />
        <Input
          id="applications-search"
          type="search"
          aria-label="Search applications"
          placeholder="search company or role"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onCsvFile(file)
          }}
        />
        <Button
          variant="secondary"
          size="s"
          onClick={() => fileRef.current?.click()}
          disabled={importBusy}
        >
          {importBusy ? <CssSpinner size={14} /> : <UploadIcon size={16} aria-hidden className={iconMotion('raise')} />}
          Import CSV
        </Button>
        <Button variant="secondary" size="s" onClick={onExport} disabled={exportDisabled}>
          <DownloadIcon size={16} aria-hidden className={iconMotion('drop')} />
          export CSV
        </Button>
      </div>
    </div>
  )
}
