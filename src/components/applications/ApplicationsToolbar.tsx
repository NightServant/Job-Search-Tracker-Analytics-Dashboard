'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CssSpinner } from '@/components/ui/css-spinner'
import { JOB_SORTS, type JobSort } from '@/lib/jobSort'
import { DownloadIcon, UploadIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'

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
  /**
   * The order the table is read in. `applied` is the default and the only one
   * that answers "what have I been doing lately"; the other two are the
   * alphabetical filter Gabe asked this table for, on company and on position.
   */
  sort: JobSort
  onSortChange: (value: JobSort) => void
  onCsvFile: (file: File) => void
  onExport: () => void
  importBusy?: boolean
  exportDisabled?: boolean
  className?: string
}

export function ApplicationsToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  onCsvFile,
  onExport,
  importBusy = false,
  exportDisabled = false,
  className,
}: ApplicationsToolbarProps) {
  const fileRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {/* The lens, the offset and the focus-within gesture all live in Input
          now (`icon` + `type="search"`). They were hand-rolled here, which is
          how this box came to sit its glyph at `left-3 top-3` with `pl-9`
          while nothing else in the app agreed -- one field positioning its own
          icon is a field that will eventually disagree with the next one. */}
      <div className="w-full sm:max-w-sm">
        <Input
          id="applications-search"
          type="search"
          icon="Search"
          aria-label="Search applications"
          placeholder="search company or role"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Sorting sits beside the search box rather than in the button
          cluster: both narrow the list rather than acting on it, and the two
          CSV controls are the only things on this row that leave the app. */}
      <div className="w-full sm:w-52">
        <Select
          id="applications-sort"
          icon="Applications"
          aria-label="Sort applications"
          value={sort}
          onValueChange={(next) => onSortChange(next as JobSort)}
          items={JOB_SORTS}
        />
      </div>

      {/* Full width on a phone, for the same reason as PageHeader's action:
          two natural-width buttons on one 320px line leave each of them barely
          wider than its own label. */}
      <div className="flex items-center gap-2 max-sm:[&>button]:flex-1 sm:ml-auto">
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
