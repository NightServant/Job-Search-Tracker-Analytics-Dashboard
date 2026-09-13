'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'
import { IconButton } from '@/components/ui/icon-button'
import { PlusIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { ModeChooser } from '@/components/cv/ModeChooser'
import { DocumentRow, DOCUMENT_GRID } from './DocumentRow'
import { TemplateGallery, type TemplateChoice } from './TemplateGallery'
import { useBelowDesktop } from '@/hooks/useBelowDesktop'
import { buttonVariants } from '@/components/ui/button-variants'
import { ICON_MOTION_GROUP } from '@/components/icons/motion'
import Link from 'next/link'
import { useAppHref } from '@/components/shell/routeBase'
import { VersionHistory, type VersionEntry } from './VersionHistory'
import { IMPORT_ACCEPT } from '@/lib/documentImport'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * `/cv?draft=new` still works as a deep link -- `src/app/(app)/cv/page.tsx`
 * opens the same `ModeChooser` dialog directly when it lands there with
 * nothing else to sit behind it.
 */
export const NEW_CV_HREF = '/cv?draft=new'

/**
 * Which kinds of document the list can be narrowed to (Gabe, 2026-09-10).
 *
 * `word` and `latex` ARE THE TWO KINDS, not a taxonomy that might grow:
 * `ResumeSummary.mode` has exactly these values, the editor forks on them, and
 * `DocumentRow` already labels every row with one. So the filter is a closed
 * set rather than a search over a free-text field.
 */
const DOC_FILTERS = [
  { value: 'all', label: 'all documents' },
  { value: 'word', label: 'Word only' },
  { value: 'latex', label: 'LaTeX only' },
] as const

type DocFilter = (typeof DOC_FILTERS)[number]['value']

/**
 * Five a page, and only where there is a pager to turn (Gabe, 2026-09-13:
 * "pagination should display 5 documents only in larger screens and laptop
 * screens. Remove the pagination and maintain the scroll in tablet and mobile
 * screens").
 *
 * IT WAS TEN, on a discoverability argument borrowed from /applications: at
 * twenty, somebody with a dozen CVs never sees a pager and cannot tell the
 * list is paged. Five keeps that and buys something else -- the desktop
 * screen opens with the template gallery above this list, and ten rows pushed
 * the pager itself under the fold, so the control that proves the list
 * continues was the part you had to scroll to find.
 *
 * BELOW `lg` THERE IS NO PAGER AT ALL and the list runs to its full length.
 * A phone scrolls; that is what a phone does. Paging a scrolling surface asks
 * somebody to tap a number to see the eleventh of twelve CVs when a thumb
 * would have got there on its own -- and it puts a row of tap targets between
 * them and the thing they came for.
 */
const PAGE_SIZE = 5

/**
 * The Documents screen, laid out the way Microsoft Word lays out its start
 * screen, at Gabe's instruction: a row of template cards across the top, then
 * the list of documents you already have beneath it.
 *
 * That ordering is the whole idea and it is worth stating why it is right
 * here rather than only in Word. This screen has two jobs -- start something,
 * or reopen something -- and the old layout served only the second, with
 * starting hidden behind one button in the corner. Putting the templates on
 * the page makes the first job visible without a click and gives the empty
 * state something to actually be empty OF.
 *
 * **Where `new CV` lives is conditional, deliberately.** With documents on the
 * page it sits in the header, where a page-level action belongs. With none, it
 * does NOT: the empty state already owns the screen and already carries the
 * call to action, and a second identical button in the corner is the same
 * offer made twice, three inches apart. Gabe asked for exactly this.
 *
 * `import` sits beside `new CV` wherever `new CV` is -- header when there are
 * documents, empty state when there are not -- because they are the two ways
 * to get a document into this list and separating them would imply a
 * hierarchy that does not exist.
 *
 * Version history is one row at a time. Loading every CV's snapshots to render
 * a list of CVs would be one query per row for information almost nobody
 * opens, so the caller fetches on demand and this component only says which
 * row asked.
 */
export interface DocumentsPageProps {
  docs: ResumeSummary[]
  onDelete?: (doc: ResumeSummary) => void
  onToggleVersions?: (doc: ResumeSummary) => void
  openVersionsFor?: string | null
  versions?: VersionEntry[]
  versionsLoading?: boolean
  versionsError?: boolean
  /** Fires once a mode is chosen in the New CV dialog; the caller owns the write and the navigation. */
  onCreateDraft?: (mode: 'word' | 'latex') => void
  /** Fires when a template card is picked. A null template means a blank document. */
  onChooseTemplate?: (choice: TemplateChoice) => void
  /** Fires with the picked file; the caller parses it and owns the write. */
  onImport?: (file: File) => void
  creatingDraft?: boolean
}

export function DocumentsPage({
  docs,
  onDelete,
  onToggleVersions,
  openVersionsFor = null,
  versions = [],
  versionsLoading = false,
  versionsError = false,
  onCreateDraft,
  onChooseTemplate,
  onImport,
  creatingDraft = false,
}: DocumentsPageProps) {
  // BELOW `lg` THIS SCREEN IS A DIFFERENT SHAPE, on Gabe's instruction
  // (2026-09-06): recents first, one CTA, and the template grid moved to its
  // own page. Desktop is deliberately UNCHANGED -- he was explicit that the
  // desktop layout stays as it is.
  //
  // LaTeX is gone entirely at these widths: no gallery entry, no mode chooser,
  // no editor and no preview. Existing LaTeX CVs still list (see the row's
  // `unavailable` note for why hiding them would be worse).
  const compact = useBelowDesktop()
  const appHref = useAppHref()
  const openDoc = docs.find((doc) => doc.id === openVersionsFor) ?? null
  const [newCvOpen, setNewCvOpen] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const hasDocs = docs.length > 0

  const [filter, setFilter] = React.useState<DocFilter>('all')
  const [query, setQuery] = React.useState('')
  const [page, setPage] = React.useState(1)

  /**
   * SEARCH BY NAME, and it is the control this screen was missing: the list
   * pages at five, so an account with twenty CVs reached the one it wanted by
   * turning pages and reading titles. A format filter narrows by KIND; it
   * cannot answer "where is the Northwind one".
   *
   * EVERY TERM MUST MATCH, in any order -- `engineer north` finds "Software
   * Engineer — Northwind Pay". Substring rather than prefix, because a CV is
   * named after a company as often as after a role and nobody remembers which
   * word came first. The same rule the CV editor's application picker uses;
   * two search boxes in one app should not disagree about what a match is.
   */
  const terms = React.useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  )
  const filtered = React.useMemo(() => {
    const byMode = filter === 'all' ? docs : docs.filter((doc) => doc.mode === filter)
    if (terms.length === 0) return byMode
    return byMode.filter((doc) => {
      const title = doc.title.toLowerCase()
      return terms.every((term) => title.includes(term))
    })
  }, [docs, filter, terms])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // CLAMPED, NOT STORED. Deleting the last row of page 3, or narrowing to
  // LaTeX when only page 1 has any, would otherwise strand the reader on an
  // empty page with no control that leads anywhere.
  const current = Math.min(page, pageCount)
  // COMPACT TAKES THE WHOLE LIST. Slicing it and then hiding the pager would
  // be worse than either: the rows past the fifth would exist, be filtered,
  // be counted -- and be unreachable, with no control on screen admitting it.
  const paged = compact ? filtered : filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // Either control changes the result set, so the page index it was valid for
  // is meaningless afterwards.
  React.useEffect(() => {
    setPage(1)
  }, [filter, query])

  // ONE CTA, TWO BEHAVIOURS. Below `lg` it is a link to the Templates page;
  // on desktop it opens the mode chooser exactly as before. A link and a
  // button rather than one control that branches on click: the compact one is
  // a navigation and should be middle-clickable, openable in a new tab, and
  // announced as a link.
  const newCvCta = compact ? (
    // `buttonVariants` rather than <Button asChild>: this Button has no
    // `asChild`, and the variants module exists precisely so a link can wear
    // the button's clothes -- see button.tsx's note on why it is a separate
    // file and must not be re-exported from there.
    <Link
      href={appHref('/documents/templates')}
      className={cn(ICON_MOTION_GROUP, buttonVariants({ size: 's' }))}
    >
      <PlusIcon size={16} aria-hidden className={iconMotion('open')} />
      new CV
    </Link>
  ) : (
    <Button size="s" onClick={() => setNewCvOpen(true)}>
      <PlusIcon size={16} aria-hidden className={iconMotion('open')} />
      new CV
    </Button>
  )

  const importButton = (
    <Button variant="secondary" size="s" onClick={() => fileInput.current?.click()}>
      <UploadIcon size={16} aria-hidden className={iconMotion('raise')} />
      import
    </Button>
  )

  return (
    <div className="flex flex-col gap-8">
      {/*
        A hidden input rather than a drop zone or a dialog: the picker is the
        platform's own and already knows how to filter by extension, remember
        the last folder, and search. Rendered once at the top so both call
        sites -- header and empty state -- drive the same element.
      */}
      <input
        ref={fileInput}
        type="file"
        accept={IMPORT_ACCEPT}
        data-import-input
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared unconditionally, so picking the same file twice in a row
          // fires change twice rather than once.
          event.target.value = ''
          if (file) onImport?.(file)
        }}
      />

      <PageHeader
        title="documents"
        description="the CVs you send out, and every version you have saved of them."
        action={
          // Below `lg` the CTA is present WHETHER OR NOT there are documents.
          // On desktop it is suppressed on an empty screen because the empty
          // state already carries the same offer three inches away -- but the
          // compact screen puts recents first, so on a full list the empty
          // state is not there to carry it.
          //
          // Stacked and full width on a phone; a row at their natural width
          // from `sm`. Sized HERE rather than in PageHeader, whose action slot
          // is deliberately untyped -- when PageHeader tried to size it
          // generically it stacked /applications' single button's own icon
          // above its own label.
          hasDocs || compact ? (
            <div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col max-sm:[&>*]:w-full">
              {importButton}
              {newCvCta}
            </div>
          ) : undefined
        }
        rule
      />

      {/* DESKTOP ONLY. Below `lg` the grid is a page of its own reached by
          the CTA above -- a six-card gallery pushed the user's actual
          documents below the fold on every phone, which is the wrong thing to
          put first on a screen called "documents". Rendered conditionally
          rather than with `hidden`, because it is the LaTeX cards' only
          appearance and they must not exist in the compact DOM at all. */}
      {!compact && (
        <TemplateGallery
          busy={creatingDraft}
          onChoose={(choice) => onChooseTemplate?.(choice)}
        />
      )}

      {/* `gap-5`, NOT `gap-3` (Gabe, 2026-09-10: "implement proper vertical
          spacing for this section"). Three things stack here -- a heading row,
          a table and a pager -- and at 12px the column labels sat against the
          heading, so "your documents" read as a caption on the NAME column
          rather than as the section's own title. The filter control made it
          worse by raising that row to 40px while the heading stayed 20px. */}
      <section className="flex flex-col gap-5">
        {/* THE FILTER LIVES WITH THE LIST IT NARROWS, not in the page header
            beside `new CV` and `import`. Those two are page-level actions; this
            one only means anything next to the rows it hides. It is drawn only
            when there are documents, for the same reason `new CV` leaves the
            header on an empty screen -- a control over nothing. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-heading-s text-text-primary">your documents</h2>
          {hasDocs && (
            <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
              {/* SEARCH FIRST, THEN THE FORMAT. They are not the same kind of
                  control: one finds a document you already have in mind, the
                  other changes which kind of documents the list is about. The
                  finder goes first because it is the one somebody arrives
                  wanting, and it is wider because a title is longer than a
                  format. */}
              <div className="w-56 max-sm:w-full">
                <Input
                  id="document-search"
                  type="search"
                  icon="Search"
                  aria-label="Search documents by name"
                  placeholder="search documents"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {/* Width on a wrapper, not on the Select: `Select`'s own root is
                  `w-full` and only its trigger takes `className`. Same trap the
                  calendar's country picker hit. */}
              <div className="w-44 max-sm:w-full">
                <Select
                  id="document-filter"
                  icon="Documents"
                  aria-label="Filter documents"
                  value={filter}
                  onValueChange={(next) => setFilter(next as DocFilter)}
                  items={DOC_FILTERS.map((option) => ({ ...option }))}
                />
              </div>
            </div>
          )}
        </div>

        {hasDocs ? (
          <div>
            {/* Column labels, Word's own recents header: the row already had
                four columns and nothing said what any of them were. */}
            <div
              data-document-columns
              className={cn(
                // `pb-3` matches the rows' own `py-3`, so the label row sits
                // on the same rhythm as the data under it instead of being
                // pinched against the first one.
                'hidden border-b border-border-subtle pb-3',
                // No labels over nothing: a filter that matches no rows should
                // not leave four column headings floating above its message.
                filtered.length > 0 && 'md:grid',
                DOCUMENT_GRID
              )}
            >
              <span className="text-label-caps uppercase text-text-muted">name</span>
              <span className="text-label-caps uppercase text-text-muted">ATS</span>
              <span className="text-label-caps uppercase text-text-muted">version</span>
              <span className="text-label-caps uppercase text-text-muted">modified</span>
              {/* The actions track, empty. Present so the label row declares
                  the same five tracks the data rows do. */}
              <span />
            </div>
            {paged.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                unavailable={
                  compact && doc.mode === 'latex'
                    ? 'LaTeX — opens on a larger screen'
                    : undefined
                }
                onOpenVersions={() => onToggleVersions?.(doc)}
                // The same verb, twice, for two surfaces: `onDelete` builds
                // the compact row's overflow menu item, `actions` fills the
                // desktop row's controls column. Passing the callback rather
                // than a second button keeps the two from drifting on what
                // delete MEANS while letting each look right where it is.
                onDelete={() => onDelete?.(doc)}
                actions={
                  <IconButton aria-label={`Delete ${doc.title}`} onClick={() => onDelete?.(doc)}>
                    <TrashIcon size={16} aria-hidden className={`[&_svg]:size-4 ${iconMotion('lid')}`} />
                  </IconButton>
                }
              />
            ))}

            {/* A FILTER THAT MATCHES NOTHING IS NOT AN EMPTY ACCOUNT, and it
                must not borrow the empty state's copy -- "no CVs yet" would be
                a false claim about the account whenever somebody picks LaTeX
                and owns only Word documents. */}
            {filtered.length === 0 && (
              // WHICH CONTROL EMPTIED THE LIST IS THE WHOLE MESSAGE. There are
              // two narrowers now, and the old copy named the format whatever
              // had happened -- so searching for a word that matches nothing
              // while the filter said `all` announced "no LaTeX documents",
              // which is a false claim about the account. The search is
              // reported first because it is the one the reader just typed.
              <p className="py-8 text-body-m text-text-muted" data-documents-filter-empty>
                {terms.length > 0 ? (
                  <>
                    nothing matches “{query.trim()}”
                    {filter === 'all' ? '' : filter === 'word' ? ' in Word documents' : ' in LaTeX documents'}.
                  </>
                ) : (
                  <>
                    no {filter === 'word' ? 'Word' : 'LaTeX'} documents. there
                    {docs.length === 1 ? ' is ' : ' are '}
                    {docs.length} in the other format.
                  </>
                )}
              </p>
            )}

            {filtered.length > 0 && (
              // `pt-5` clears the last row's own hairline. At `pt-4` the
              // count and the pager crowded a rule they are not part of.
              <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
                {/* THE COUNT SURVIVES THE PAGER, and says a different thing on
                    each surface because a different thing is true. Paged, it
                    is which slice you are looking at; scrolling, there is no
                    slice -- so it states the total rather than pretending to
                    describe a window that does not exist. */}
                <p className="text-body-s text-text-muted" data-documents-count>
                  {compact ? (
                    <>
                      {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
                    </>
                  ) : (
                    <>
                      {(current - 1) * PAGE_SIZE + 1}&ndash;
                      {Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </>
                  )}
                </p>
                {/* NO PAGER BELOW `lg`. See PAGE_SIZE: the list is whole there
                    and a phone scrolls it. */}
                {!compact && (
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        aria-disabled={current === 1}
                        className={current === 1 ? 'pointer-events-none opacity-50' : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          setPage((value) => Math.max(1, value - 1))
                        }}
                      />
                    </PaginationItem>
                    {pageCount > 1 &&
                      Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                        <PaginationItem key={number}>
                          <PaginationLink
                            href="#"
                            isActive={number === current}
                            onClick={(event) => {
                              event.preventDefault()
                              setPage(number)
                            }}
                          >
                            {number}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        aria-disabled={current === pageCount}
                        className={
                          current === pageCount ? 'pointer-events-none opacity-50' : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault()
                          setPage((value) => Math.min(pageCount, value + 1))
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                )}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon="Documents"
            action={
              // Primary, at Gabe's instruction, and correct: with the header
              // action gone this is the only call to action on the screen, so
              // a secondary button here would leave the page with no primary
              // at all. `import` sits beside it as the other way in.
              <div className="flex flex-wrap items-center justify-center gap-2">
                {newCvCta}
                {importButton}
              </div>
            }
          >
            {compact
              ? 'no CVs yet. start from a template, or import a document you already have.'
              : 'no CVs yet. start from a template above, write one from scratch, or import a document you already have.'}
          </EmptyState>
        )}
      </section>

      <AppDialog
        open={openDoc !== null}
        onOpenChange={(next) => {
          if (!next && openDoc) onToggleVersions?.(openDoc)
        }}
        title={openDoc ? `versions of ${openDoc.title}` : 'versions'}
        icon="RotateCcw"
      >
        {openDoc && (
          <VersionHistory
            editHref={`/cv?draft=${openDoc.id}`}
            versions={versions}
            loading={versionsLoading}
            error={versionsError}
          />
        )}
      </AppDialog>

      <AppDialog open={newCvOpen} onOpenChange={setNewCvOpen} title="new CV" icon="Documents">
        <ModeChooser creating={creatingDraft} onChoose={(mode) => onCreateDraft?.(mode)} />
      </AppDialog>
    </div>
  )
}
