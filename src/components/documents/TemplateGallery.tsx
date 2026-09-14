'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { getTemplatesForMode } from '@/services/resumeTemplateService'
import type { ResumeTemplate } from '@/services/resumeTemplateService'
import type { ResumeMode } from '@/services/resumeService'
import { matchesTerms, searchTerms } from './search'

export interface TemplateChoice {
  mode: ResumeMode
  template: ResumeTemplate
}

export interface TemplateGalleryProps {
  /** When given, a "blank document" card is offered first. */
  onChooseBlank?: () => void
  /** `rail` is the strip above the documents list; `page` is the Templates screen. */
  variant?: 'rail' | 'page'
  onChoose: (choice: TemplateChoice) => void
  busy?: boolean
  className?: string
}

/**
 * THE `modes` PROP IS GONE, and the dropdown below is what replaced it.
 *
 * It used to mean "word cards, latex cards, or both", and the filtering was
 * done in the data rather than in CSS because below `lg` the LaTeX editor did
 * not exist, so a LaTeX card had to be absent from the DOM rather than merely
 * invisible -- a `display:none` card is still tabbable in some browsers and
 * still clickable by a test that does not know it is meant to be hidden.
 *
 * That argument was about a card that must never be chosen ON THIS DEVICE.
 * Both kinds of document can be created on every device now, so there is no
 * card anyone must be prevented from reaching -- there is only a gallery of
 * eleven that is easier to read a slice at a time. That is a filter, and a
 * filter is a control the reader operates, not a prop the caller sets. Leaving
 * both would mean two ways to narrow the same list, one of them invisible.
 */
const ALL_MODES: ResumeMode[] = ['word', 'cover_letter']

const MODE_LABEL: Record<ResumeMode, string> = { word: 'CV', cover_letter: 'cover letter' }

/**
 * Which kinds of template the gallery can be narrowed to.
 *
 * The labels all say "templates" where the documents list's own filter says
 * "documents", and that is the point rather than verbosity: at desktop width
 * both dropdowns are on screen at once, and "CVs" in two places would be two
 * controls that look like the same control twice.
 */
const TEMPLATE_FILTERS = [
  { value: 'all', label: 'all templates' },
  { value: 'word', label: 'CV templates' },
  { value: 'cover_letter', label: 'cover letter templates' },
] as const

type TemplateFilter = (typeof TEMPLATE_FILTERS)[number]['value']

/**
 * The start-a-new-document gallery, laid out the way Word's own start screen
 * lays out its templates: a horizontal row of page-shaped cards, each a
 * preview over its name.
 *
 * Word leads its own gallery with a "Blank Document" card. The rail does NOT,
 * at Gabe's instruction: `new document` is already a primary button on that
 * screen, so a blank card there would be a third route to the same blank
 * document. The Templates page has no such button, so it keeps the card.
 *
 * This is where templates live now. They used to be a dropdown inside each
 * editor, which put the choice at the wrong moment: by the time the editor is
 * open there is already a document, so picking a template REPLACED what was on
 * screen -- a destructive action wearing the same chrome as "reset" and
 * "save". Gabe had that dropdown removed. Choosing here, before anything
 * exists, means a template is a starting point rather than an overwrite.
 *
 * CVS AND COVER LETTERS SIT IN ONE ROW rather than two tabbed panels. The
 * argument that kept Word and LaTeX together survives the change of what the
 * two sets ARE: splitting them into tabs asks the reader to commit to a kind
 * before they can see what is behind it, and the dropdown answers the same
 * question without hiding the other half until it is asked.
 *
 * The thumbnails are drawn in CSS rather than rendered from the template
 * content. A real preview would mean mounting a tiptap editor per card just to
 * throw the instance away, and it does not paint at 96px in a way anyone can
 * read. What the reader needs from a thumbnail is which SHAPE the document has
 * -- and at eleven cards that is now doing real work, because the five cover
 * letters differ from each other mostly in emphasis and a reader picks the one
 * whose silhouette matches the letter they had in mind.
 *
 * SEARCH AND FILTER SIT ON THE GALLERY'S OWN HEADING ROW, and that placement
 * is the answer to a real problem rather than a layout preference. At desktop
 * width this gallery and the documents list are on one screen, each with a
 * search box and a kind dropdown -- four controls, two of which narrow
 * templates nobody owns yet and two of which narrow documents they do. The
 * rule that keeps them apart is that a narrowing control sits on the row of
 * the heading it narrows: these ride with "start a new document", the list's
 * ride with "your documents", and the two sections are a section gap apart.
 * Labelling carries the rest -- "search templates" against "search documents",
 * "CV templates" against "CVs". A third control that switched between the two
 * was the alternative and is worse: it would make one of the two lists
 * unreachable to explain a distinction the page can simply show.
 *
 * Below `lg` only ONE of the two pairs exists at a time, because the gallery is
 * not on `/documents` there at all -- it is `/documents/templates`, its own
 * route, which is exactly where Gabe asked for the search and dropdown to
 * appear on mobile and tablet. The `variant` prop is that seam, so both
 * surfaces get the controls from one implementation.
 *
 * A shadcn `Carousel` rather than a bare `overflow-x-auto`, at Gabe's
 * instruction, and it earns itself at eleven templates: a scroll container
 * gives a mouse user no affordance at all, so the cards past the fold were
 * reachable only by a trackpad swipe or a shift-wheel nobody thinks to try.
 * The carousel keeps the free-dragging scroll AND adds arrows.
 *
 * `align: 'start'` and per-item basis rather than a slide-per-view: these are
 * cards in a rail, not slides. Snapping a 132px card to the centre of a
 * 1000px rail would leave most of the row empty on every arrow press.
 */
export function TemplateGallery({
  onChoose,
  onChooseBlank,
  variant = 'rail',
  busy = false,
  className,
}: TemplateGalleryProps) {
  const [query, setQuery] = React.useState('')
  const [kind, setKind] = React.useState<TemplateFilter>('all')

  const cards = React.useMemo(
    () =>
      ALL_MODES.flatMap((mode) =>
        getTemplatesForMode(mode).map((t) => ({
          key: t.id,
          mode,
          template: t,
          name: t.name.toLowerCase(),
        }))
      ),
    []
  )

  // SEARCH FIRST, THEN THE KIND, and the same match rule as the documents
  // list -- see `./search`. The DESCRIPTION is searched as well as the name,
  // because it is the only place "for a career change" is written down: the
  // card whose name is "Career change" is found by either word, but the one
  // somebody describes to themselves as "the referral one" is found by its
  // description alone.
  const terms = React.useMemo(() => searchTerms(query), [query])
  const visible = React.useMemo(
    () =>
      cards.filter(
        (card) =>
          (kind === 'all' || card.mode === kind) &&
          matchesTerms(terms, card.name, card.template.description)
      ),
    [cards, kind, terms]
  )

  // THE BLANK CARD IS FIRST, as it is in Word's own New screen. Somebody who
  // already knows what they are writing should not have to read eleven
  // template names to find the option that gets out of the way.
  //
  // IT DISAPPEARS WHILE A SEARCH IS RUNNING, because it is not a search
  // result: leaving it above a filtered grid would say the blank page matched
  // the word that was typed. The kind dropdown does not hide it -- a blank
  // document is whichever kind you say it is, which is what the chooser asks.
  const blankCard =
    onChooseBlank && terms.length === 0 ? (
      <button
        type="button"
        disabled={busy}
        data-template-card="blank"
        onClick={onChooseBlank}
        className={cn(
          'flex w-32 flex-col gap-2 text-left',
          'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
          'disabled:pointer-events-none disabled:opacity-50',
          'group/template'
        )}
      >
        <span
          aria-hidden
          className={cn(
            'aspect-[3/4] w-32 overflow-hidden rounded-sm border p-3',
            'border-border-subtle bg-bg-canvas',
            'transition-colors duration-(--duration-fast)',
            'group-hover/template:border-accent-default'
          )}
        />
        <span className="flex flex-col">
          <span className="truncate text-body-s text-text-primary">blank document</span>
          {/* It used to say `word`, which was true when there was one kind.
              Naming both is what stops the card claiming to be a CV. */}
          <span className="text-caption text-text-muted">CV or cover letter</span>
        </span>
      </button>
    ) : null

  const cardButton = (card: (typeof cards)[number]) => (
    <button
      type="button"
      disabled={busy}
      data-template-card={card.key}
      onClick={() => onChoose({ mode: card.mode, template: card.template })}
      className={cn(
        'flex w-32 flex-col gap-2 text-left',
        'rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
        'disabled:pointer-events-none disabled:opacity-50',
        'group/template'
      )}
    >
      <Thumbnail id={card.template.id} />
      <span className="flex flex-col">
        <span className="truncate text-body-s text-text-primary">{card.name}</span>
        <span className="text-caption text-text-muted">{MODE_LABEL[card.mode]}</span>
      </span>
    </button>
  )

  const controls = (
    <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
      <div className="w-52 max-sm:w-full">
        <Input
          id="template-search"
          type="search"
          icon="Search"
          aria-label="Search templates by name"
          placeholder="search templates"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {/* Width on a wrapper, not on the Select: `Select`'s own root is
          `w-full` and only its trigger takes `className`. Same trap the
          calendar's country picker hit.

          `Tag` rather than the `Documents` glyph the list's own filter uses.
          Two identical icons on two dropdowns eight inches apart is the
          strongest possible hint that they are the same control. */}
      <div className="w-52 max-sm:w-full">
        <Select
          id="template-filter"
          icon="Tag"
          aria-label="Filter templates by kind"
          value={kind}
          onValueChange={(next) => setKind(next as TemplateFilter)}
          items={TEMPLATE_FILTERS.map((option) => ({ ...option }))}
        />
      </div>
    </div>
  )

  // A SEARCH THAT MATCHES NOTHING IS NOT AN EMPTY GALLERY. The same rule the
  // documents list follows: say which control emptied it, and there are two.
  // Only the search can ever empty this one -- every kind has templates -- so
  // the kind is named as the place that was searched rather than as a cause.
  const nothingMatches =
    visible.length === 0 ? (
      <p className="py-8 text-body-m text-text-muted" data-template-empty>
        no templates match “{query.trim()}”
        {kind === 'all' ? '' : ` in ${kind === 'word' ? 'CV templates' : 'cover letters'}`}.
      </p>
    ) : null

  // A GRID, NOT A RAIL, on the Templates page. A carousel is right for a strip
  // sitting above a list of documents -- it is a secondary offer and must not
  // spend the page's height. On a screen whose ONLY job is choosing a
  // template, hiding half the options behind a drag is the wrong trade, and
  // Word's own New screen is a grid for the same reason.
  if (variant === 'page') {
    return (
      <section data-template-gallery className={cn('flex flex-col gap-6', className)}>
        {controls}
        <div
          data-template-grid
          className="grid grid-cols-2 justify-items-center gap-6 sm:grid-cols-3 md:grid-cols-4"
        >
          {blankCard}
          {visible.map((card) => (
            <React.Fragment key={card.key}>{cardButton(card)}</React.Fragment>
          ))}
        </div>
        {nothingMatches}
      </section>
    )
  }

  return (
    <section data-template-gallery className={cn('flex flex-col gap-3', className)}>
      {/* The heading row moved INSIDE the Carousel, because the arrows are on
          it now. They used to float over the rail at `-top-9`, which put them
          exactly where the search box and the dropdown had to go; the previous
          arrangement only worked because that half of the row was empty.
          Inside the Carousel they can be static, which is also less code than
          the absolute-positioning override they carried. */}
      <Carousel
        opts={{ align: 'start', dragFree: true, containScroll: 'trimSnaps' }}
        className="flex w-full flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-4">
            <h2 className="text-heading-s text-text-primary">start a new document</h2>
            <p className="text-body-s text-text-muted">pick a starting point</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
            {controls}
            {/* After the narrowers, not before: these move the rail, and the
                rail is whatever the two controls to their left left behind. */}
            <div className="flex items-center gap-2">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          </div>
        </div>

        {/* -ml-4 / pl-4 is the carousel's own gutter idiom: the track is
            shifted left by one gap so the first card sits flush with the page
            margin while every later card keeps its spacing. */}
        <CarouselContent className="-ml-4">
          {blankCard && <CarouselItem className="basis-auto pl-4">{blankCard}</CarouselItem>}
          {visible.map((card) => (
            <CarouselItem key={card.key} className="basis-auto pl-4">
              {cardButton(card)}
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {nothingMatches}
    </section>
  )
}

/** A page-shaped diagram of the template's structure, in rules rather than type. */
function Thumbnail({ id }: { id: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex aspect-[3/4] w-32 flex-col gap-1.5 overflow-hidden rounded-sm border p-3',
        'border-border-subtle bg-bg-canvas',
        'transition-colors duration-(--duration-fast)',
        'group-hover/template:border-accent-default'
      )}
    >
      <ThumbnailRules id={id} />
    </span>
  )
}

/**
 * Bar = heading, hairline = body. Ratios differ per template so the shapes do.
 *
 * A LETTER HAS A DIFFERENT SILHOUETTE FROM A CV, and drawing it as one was the
 * bug: every `cover-*` id fell through to the default arm and got the CV's
 * alternating heading/body ladder, so the five letters were five identical
 * cards. At 128px the thumbnail is the only thing telling them apart -- the
 * names are one word each -- so it has to show the letter's own furniture: a
 * right-aligned sender block, a date, a left recipient block, a salutation,
 * then unbroken prose and a short sign-off. No mid-document headings at all,
 * which is the single most visible difference from every CV beside it.
 *
 * The variations between the five are the real ones. `concise` drops the
 * address blocks (its description says "no address block") and runs three
 * short paragraphs; `speculative` has no recipient to address, so it opens
 * straight into prose under the date; `referral` and `career-change` keep the
 * full block layout and differ in how the body is weighted.
 */
function ThumbnailRules({ id }: { id: string }) {
  const heading = 'bg-accent-default'
  const body = 'bg-border-default'
  // `right` is the sender block and the date, which sit against the right
  // margin in a block letter -- `ml-auto` is what makes the shape read as a
  // letter rather than as a very sparse CV.
  const rows: Rule[] = id.startsWith('cover-') ? coverRules(id) : cvRules(id)

  return (
    <>
      {rows.map(([type, width], i) => (
        <span
          key={i}
          className={cn(
            'block rounded-[1px]',
            width,
            type === 'heading' ? `h-1.5 ${heading}` : `h-0.5 ${body}`,
            type === 'right' && 'ml-auto'
          )}
        />
      ))}
    </>
  )
}

type Rule = [type: 'heading' | 'body' | 'right', width: string]

function cvRules(id: string): Rule[] {
  if (id.endsWith('compact')) {
    return [
      ['heading', 'w-2/3'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['heading', 'w-1/2'],
      ['body', 'w-full'],
      ['body', 'w-4/5'],
      ['body', 'w-full'],
    ]
  }
  if (id.endsWith('detailed') || id.endsWith('academic')) {
    return [
      ['heading', 'w-3/4'],
      ['body', 'w-full'],
      ['heading', 'w-1/2'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['heading', 'w-1/2'],
      ['body', 'w-3/4'],
    ]
  }
  return [
    ['heading', 'w-2/3'],
    ['body', 'w-full'],
    ['body', 'w-1/2'],
    ['heading', 'w-1/2'],
    ['body', 'w-full'],
    ['body', 'w-4/5'],
  ]
}

function coverRules(id: string): Rule[] {
  // No address blocks at all, and three short paragraphs: this is the one for
  // an online form, where the furniture of a posted letter is dead weight.
  if (id === 'cover-concise') {
    return [
      ['heading', 'w-1/2'],
      ['body', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['body', 'w-2/3'],
      ['body', 'w-full'],
      ['body', 'w-1/2'],
    ]
  }
  // Nobody to address: a speculative letter keeps the sender and the date and
  // then goes straight into prose, so the recipient block is simply absent.
  if (id === 'cover-speculative') {
    return [
      ['right', 'w-1/2'],
      ['right', 'w-1/3'],
      ['body', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['body', 'w-1/3'],
    ]
  }
  // The full block letter: sender right, date right, recipient left,
  // salutation, body, sign-off. `referral` and `career-change` differ from
  // `standard` only in how much of the page the body takes.
  const bodyRuns: Rule[] =
    id === 'cover-referral'
      ? [
          ['body', 'w-full'],
          ['body', 'w-5/6'],
          ['body', 'w-full'],
        ]
      : [
          ['body', 'w-full'],
          ['body', 'w-full'],
          ['body', 'w-3/4'],
        ]
  return [
    ['right', 'w-1/2'],
    ['right', 'w-1/3'],
    ['body', 'w-2/5'],
    ['heading', 'w-1/3'],
    ...bodyRuns,
    ['body', 'w-1/4'],
  ]
}
