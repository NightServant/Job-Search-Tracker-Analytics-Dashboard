'use client'

import * as React from 'react'
import {
  buildJobDedupKey,
  parseJobsCsvText,
  type ParsedJobRow,
} from '@/lib/jobCsv'
import type { Job, JobFormData } from '@/types'

/**
 * Reading a CSV, working out what is already here, and importing the rest.
 *
 * THE THIRD SLICE OUT OF `ApplicationsPage` (2026-09-11). It was the clearest
 * case of the lot: three pieces of state, two handlers and six of the
 * component's nineteen props existed only to serve import, and all of them
 * passed through the whole component to reach one small region of the page.
 *
 * DEDUPLICATION IS AGAINST TWO SETS, not one, which is the part worth not
 * losing in a move. A row is a duplicate if it matches something ALREADY IN
 * the list, or something earlier in the same file -- a CSV exported twice and
 * concatenated is a real thing people do, and checking only against the
 * database would import the internal repeats.
 *
 * A FAILED IMPORT KEEPS THE PARSED STATE. `onImport` resolves to `false` on a
 * caught failure rather than throwing, so the deduped result survives for a
 * retry instead of being thrown away behind a toast -- which would mean
 * picking the file again to recover from a dropped connection.
 */

export interface CsvImport {
  fileName: string
  rows: ParsedJobRow[]
  /** Rows that are not duplicates of existing jobs or of each other. */
  importable: ParsedJobRow[]
  duplicates: number
  invalid: number
}

export interface CsvImportState {
  csv: CsvImport | null
  /** Cleared without importing. */
  cancel: () => void
  skipDuplicates: boolean
  setSkipDuplicates: (value: boolean) => void
  /** True while the file is being read and parsed, before any request. */
  parsing: boolean
  handleFile: (file: File) => Promise<void>
  runImport: () => Promise<void>
}

export interface CsvImportOptions {
  /** The current list, which is half of the deduplication check. */
  jobs: Job[]
  onImport?: (rows: JobFormData[]) => Promise<boolean | void> | boolean | void
  onCsvError?: (message: string) => void
}

export function useCsvImport({
  jobs,
  onImport,
  onCsvError,
}: CsvImportOptions): CsvImportState {
  const [csv, setCsv] = React.useState<CsvImport | null>(null)
  const [skipDuplicates, setSkipDuplicates] = React.useState(true)
  const [parsing, setParsing] = React.useState(false)

  const handleFile = React.useCallback(
    async (file: File) => {
      setParsing(true)
      try {
        const result = parseJobsCsvText(await file.text())
        if (result.fatalError) {
          onCsvError?.(result.fatalError)
          setCsv(null)
          return
        }

        const existing = new Set(
          jobs.map((job) =>
            buildJobDedupKey({
              company: job.company,
              role: job.role,
              date_applied: job.date_applied,
              url: job.url,
            })
          )
        )
        // `seen` catches repeats WITHIN the file; `existing` catches repeats
        // against the database. Both, for the reason in the docblock.
        const seen = new Set<string>()
        const importable: ParsedJobRow[] = []
        let duplicates = 0

        for (const row of result.rows) {
          if (existing.has(row.dedupKey) || seen.has(row.dedupKey)) {
            duplicates += 1
            continue
          }
          seen.add(row.dedupKey)
          importable.push(row)
        }

        // Reset on every new file: a checkbox left off from a previous import
        // would silently re-import duplicates from the next one.
        setSkipDuplicates(true)
        setCsv({
          fileName: file.name,
          rows: result.rows,
          importable,
          duplicates,
          invalid: result.issues.length,
        })
      } catch (err) {
        onCsvError?.(err instanceof Error ? err.message : 'Could not read that file.')
        setCsv(null)
      } finally {
        setParsing(false)
      }
    },
    [jobs, onCsvError]
  )

  const runImport = React.useCallback(async () => {
    if (!csv) return
    const rows = skipDuplicates ? csv.importable : csv.rows
    if (rows.length === 0) {
      setCsv(null)
      return
    }
    const ok = await onImport?.(rows.map((row) => row.data))
    // Only clear on success. See the docblock.
    if (ok !== false) setCsv(null)
  }, [csv, skipDuplicates, onImport])

  const cancel = React.useCallback(() => setCsv(null), [])

  return {
    csv,
    cancel,
    skipDuplicates,
    setSkipDuplicates,
    parsing,
    handleFile,
    runImport,
  }
}
