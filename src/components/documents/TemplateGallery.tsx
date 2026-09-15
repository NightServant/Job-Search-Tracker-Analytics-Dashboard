'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/ui/filter-bar'
import { StatusState } from '@/components/ui/status-state'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselRow,
} from '@/components/ui/carousel'
import { getTemplatesForMode } from '@/services/resumeTemplateService'
import type { ResumeTemplate } from '@/services/resumeTemplateService'
import type { ResumeMode } from '@/services/resumeService'
import { matchesTerms, searchTerms } from '@/lib/search'

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

  /*
    ONE `FilterBar`, NOT A HAND-BUILT ROW (2026-09-15). The widths, the gaps
    and the phone-width stacking were spelled out here, in DocumentsPage and in
    JobFeed, and the three copies had drifted to three different widths for the
    same control.

    `Tag` rather than the `Documents` glyph the list's own filter uses. Two
    identical icons on two dropdowns eight inches apart is the strongest
    possible hint that they are the same control, and at desktop width both are
    on screen at once.
  */
  const controls = (
    <FilterBar
      search={{
        id: 'template-search',
        label: 'Search templates by name',
        placeholder: 'search templates',
        value: query,
        onChange: setQuery,
      }}
      selects={[
        {
          id: 'template-filter',
          label: 'Filter templates by kind',
          icon: 'Tag',
          width: 'l',
          value: kind,
          onValueChange: (next) => setKind(next as TemplateFilter),
          items: TEMPLATE_FILTERS.map((option) => ({ ...option })),
        },
      ]}
    />
  )

  // A SEARCH THAT MATCHES NOTHING IS NOT AN EMPTY GALLERY. The same rule the
  // documents list follows: say which control emptied it, and there are two.
  // Only the search can ever empty this one -- every kind has templates -- so
  // the kind is named as the place that was searched rather than as a cause.
  const nothingMatches =
    visible.length === 0 ? (
      /* `StatusState kind="no-results"`, the same component the documents list
         under this gallery now uses (2026-09-15). Two sections on one screen
         reporting the same outcome must report it the same way -- that is the
         rule this whole gallery's docblock already argues for its search and
         its dropdown, applied to the result of using them. The SENTENCE is
         unchanged; the glyph and the centring are what it gains. */
      <StatusState
        kind="no-results"
        compact
        data-template-empty
        title="no matching templates"
        message={
          <>
            no templates match “{query.trim()}”
            {kind === 'all' ? '' : ` in ${kind === 'word' ? 'CV templates' : 'cover letters'}`}.
          </>
        }
        action={
          <Button variant="secondary" size="s" onClick={() => setQuery('')}>
            clear the search
          </Button>
        }
      />
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
      {/* THE ARROWS LEFT THE HEADING ROW on 2026-09-15 and now flank the rail
          itself -- the one arrangement every carousel in this app uses; see
          `CarouselRow` in ui/carousel. They had been on the heading row since
          the search box and dropdown arrived, which was the best available
          answer while the alternative was Swiper's own floating controls over
          the first and last card.

          What the move buys here specifically: the heading row now carries
          only the things that NARROW the gallery, and the things that MOVE it
          sit on the rail they move. Those are two different jobs and they were
          reading as one four-control cluster. */}
      <Carousel
        opts={{ align: 'start', dragFree: true, containScroll: 'trimSnaps' }}
        // `gap-6` (24px), up from 12. This is now the distance from the
        // section's HEADER GROUP to the rail, not from a heading to the next
        // thing -- see FilterBar for the three steps and why 12/12 read as a
        // flat stack.
        className="flex w-full flex-col gap-6"
      >
        {/* THE HEADER GROUP: the name of the gallery and the controls that
            narrow it, 12px apart, because they are one thing. The heading is
            its own line now and the controls are their own row below it
            (Gabe, 2026-09-15: "implement a new row containing that
            components").

            `items-baseline` so "pick a starting point" sits on the h2's
            baseline rather than its box -- they are one phrase in two weights,
            not two stacked things. */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className="text-heading-s text-text-primary">start a new document</h2>
            <p className="text-body-s text-text-muted">pick a starting point</p>
          </div>
          {controls}
        </div>

        {/* ARROWS ONLY WHEN THERE IS A RAIL TO PAGE, which is the rule the two
            calendar rails already follow -- two disabled chevrons flanking an
            empty band are controls for a list that is not there. Seen on
            screen the moment the flanking layout landed: a search matching
            nothing left `<` and `>` facing each other across 200px of nothing,
            above the message explaining why.

            `visible.length` rather than a separate flag: when it is zero the
            blank card is gone too (it hides while a search is running, because
            a blank page is not a search result), so the row would hold nothing
            at all. */}
        {visible.length > 0 && (
          <CarouselRow>
            <CarouselPrevious />
            {/* -ml-4 / pl-4 is the carousel's own gutter idiom: the track is
                shifted left by one gap so the first card sits flush with the
                row's own left edge while every later card keeps its spacing. */}
            <CarouselContent className="-ml-4">
              {blankCard && <CarouselItem className="basis-auto pl-4">{blankCard}</CarouselItem>}
              {visible.map((card) => (
                <CarouselItem key={card.key} className="basis-auto pl-4">
                  {cardButton(card)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselNext />
          </CarouselRow>
        )}
      </Carousel>

      {nothingMatches}
    </section>
  )
}

/** A page-shaped diagram of the template's structure, in rules rather than type. */
/**
 * The card's preview of a template.
 *
 * IT HAS TO SHOW THE DIFFERENCE, which is the whole reason it changed on
 * 2026-09-15. Gabe: "CV and Cover Letter templates felt the same." The gallery
 * is where that impression is formed -- it is eleven cards side by side, and
 * before this they were eleven near-identical stacks of stripes. Worse, the
 * rule table branched on `compact` and `academic`, two template ids DELETED
 * some time ago, so five of the six CVs fell through to one default shape and
 * the gallery was telling the truth: they really were the same.
 *
 * SO THE THUMBNAIL IS DRIVEN BY THE TEMPLATE'S ACTUAL DESIGN rather than by a
 * hand-drawn guess at it. `THUMBNAILS` below mirrors the table in
 * resumeTemplateService: the page's margins become the card's padding, the
 * leading becomes the gap between rules, a centred header becomes centred
 * bars, and a ruled section heading becomes a hairline under the bar. Somebody
 * changing a template's typography and not this will see the two disagree,
 * which is the best that can be done without rendering the real document.
 *
 * IT IS STILL A DIAGRAM, NOT A PREVIEW. Rendering eleven real documents means
 * mounting eleven tiptap editors to throw away, and at 128px no reader could
 * tell Georgia from Helvetica anyway. What a thumbnail has to answer is "how
 * is this one SHAPED" -- dense or airy, centred or left, ruled or plain -- and
 * those survive the reduction.
 */
function Thumbnail({ id }: { id: string }) {
  const spec = THUMBNAILS[id] ?? DEFAULT_THUMBNAIL

  return (
    <span
      aria-hidden
      className={cn(
        'flex aspect-[3/4] w-32 flex-col overflow-hidden rounded-sm border',
        'border-border-subtle bg-bg-canvas',
        'transition-colors duration-(--duration-fast)',
        'group-hover/template:border-accent-default',
        // THE PAGE'S OWN MARGINS, scaled to the card. A 0.6in template really
        // does put more on the page than a 1.25in one, and padding is the only
        // honest way a 128px card can say so.
        spec.pad,
        // And its leading. `gap` here is doing the job `lineHeight` does in
        // the document.
        spec.gap
      )}
    >
      {spec.rows.map(([kind, width], i) => (
        <span
          key={i}
          className={cn(
            'block rounded-[1px]',
            width,
            kind === 'heading' || kind === 'title'
              ? 'bg-accent-default'
              : 'bg-border-default',
            kind === 'title' ? 'h-2' : kind === 'heading' ? 'h-1.5' : 'h-0.5',
            // `right` is the sender block and the date of a block letter,
            // which sit against the right margin -- it is what makes the shape
            // read as a letter rather than as a very sparse CV.
            kind === 'right' && 'ml-auto',
            kind === 'centre' && 'mx-auto',
            // The rule under a section heading, drawn as the card's own
            // hairline rather than a second bar: at this size a 1px gap
            // between two bars is invisible, and a border is not.
            kind === 'heading' && spec.ruled && 'border-b border-border-default pb-0.5'
          )}
        />
      ))}
    </span>
  )
}

/**
 * One row of the diagram.
 *
 * `title` is the name at the top of a CV, which is the biggest thing on the
 * page and the first thing the eye lands on; `heading` is a section. They were
 * one kind before, which is part of why every card looked alike -- a CV whose
 * name is 22pt and one whose name is 14pt drew the identical bar.
 */
type Rule = [kind: 'title' | 'heading' | 'body' | 'right' | 'centre', width: string]

interface ThumbnailSpec {
  /** Tailwind padding, standing in for the page's margins. */
  pad: string
  /** Tailwind gap, standing in for the leading. */
  gap: string
  /** Whether section headings carry a rule, as the template does. */
  ruled: boolean
  rows: Rule[]
}

const DEFAULT_THUMBNAIL: ThumbnailSpec = {
  pad: 'p-3',
  gap: 'gap-1.5',
  ruled: false,
  rows: [
    ['title', 'w-2/3'],
    ['body', 'w-full'],
    ['heading', 'w-1/2'],
    ['body', 'w-full'],
    ['body', 'w-4/5'],
  ],
}

/**
 * The eleven, keyed by the SAME ids the templates use.
 *
 * KEYED EXACTLY, with no `endsWith` and no fallthrough chain. The old table
 * matched on suffixes and still carried branches for `compact` and `academic`,
 * which have not existed for some time -- a suffix match fails silently when
 * an id changes, and silently is how five of six CVs ended up sharing one
 * shape. An id that is missing here gets `DEFAULT_THUMBNAIL`, and the test
 * beside this file asserts that none of them does.
 */
const THUMBNAILS: Record<string, ThumbnailSpec> = {
  // Centred name and contact over ruled sections: the printed-CV convention.
  'word-classic': {
    pad: 'p-3',
    gap: 'gap-1.5',
    ruled: true,
    rows: [
      ['title', 'w-1/2 mx-auto'],
      ['body', 'w-2/3 mx-auto'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
    ],
  },
  // The airy one: no rules, the widest gaps, and the biggest name on the page.
  'word-modern': {
    pad: 'p-3.5',
    gap: 'gap-2.5',
    ruled: false,
    rows: [
      ['title', 'w-3/4'],
      ['body', 'w-1/2'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['heading', 'w-1/3'],
      ['body', 'w-5/6'],
    ],
  },
  // Seven sections at 9.5pt on 0.6in margins: the densest page here, and the
  // thumbnail has to be the busiest card in the gallery or it is lying.
  'word-detailed': {
    pad: 'p-1.5',
    gap: 'gap-1',
    ruled: true,
    rows: [
      ['title', 'w-2/3'],
      ['body', 'w-full'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['heading', 'w-1/4'],
      ['body', 'w-3/4'],
    ],
  },
  // DELIBERATELY THE PLAINEST CARD IN THE GALLERY. No rules, nothing centred,
  // even widths, even gaps. A parser should meet nothing it has to decide
  // about, and the thumbnail says so by having nothing to look at.
  'word-ats': {
    pad: 'p-3',
    gap: 'gap-1.5',
    ruled: false,
    rows: [
      ['title', 'w-1/2'],
      ['body', 'w-2/3'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
    ],
  },
  // The roomiest: fewest rows, widest gaps, centred header. Half a page of
  // content that fills a page honestly.
  'word-entry': {
    pad: 'p-4',
    gap: 'gap-2.5',
    ruled: false,
    rows: [
      ['title', 'w-1/2 mx-auto'],
      ['body', 'w-2/3 mx-auto'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['heading', 'w-1/3'],
      ['body', 'w-4/5'],
    ],
  },
  // Skills-forward and tight: a short ruled block near the top, then the runs.
  'word-technical': {
    pad: 'p-2',
    gap: 'gap-1',
    ruled: true,
    rows: [
      ['title', 'w-3/5'],
      ['body', 'w-full'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-2/3'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['body', 'w-3/4'],
    ],
  },

  // THE LETTERS. What separates these on a card is the FURNITURE -- how much
  // of the page is spent before the prose starts -- which is exactly what
  // distinguishes them in use.
  'cover-standard': {
    pad: 'p-3',
    gap: 'gap-1.5',
    ruled: false,
    rows: [
      ['body', 'w-1/2'],
      ['body', 'w-2/5'],
      ['body', 'w-1/3'],
      ['body', 'w-2/5'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['body', 'w-3/4'],
      ['body', 'w-1/4'],
    ],
  },
  // No furniture at all and the widest margins: straight into three
  // paragraphs, which is the whole pitch of this one.
  'cover-concise': {
    pad: 'p-4',
    gap: 'gap-2.5',
    ruled: false,
    rows: [
      ['heading', 'w-1/2'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['body', 'w-2/3'],
      ['body', 'w-1/3'],
    ],
  },
  // Modified block: the date sits right, which is the one visible difference
  // between this and `standard` on a page.
  'cover-career-change': {
    pad: 'p-3',
    gap: 'gap-1.5',
    ruled: false,
    rows: [
      ['body', 'w-1/2'],
      ['right', 'w-1/3'],
      ['body', 'w-2/5'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['body', 'w-1/4'],
    ],
  },
  // The shortest letter here: a name, a salutation and three short paragraphs.
  'cover-referral': {
    pad: 'p-2.5',
    gap: 'gap-1.5',
    ruled: false,
    rows: [
      ['body', 'w-1/2'],
      ['heading', 'w-1/3'],
      ['body', 'w-full'],
      ['body', 'w-5/6'],
      ['body', 'w-full'],
      ['body', 'w-1/4'],
    ],
  },
  // The widest margins of the five, so the narrowest column on the card.
  'cover-speculative': {
    pad: 'p-5',
    gap: 'gap-2',
    ruled: false,
    rows: [
      ['body', 'w-1/2'],
      ['right', 'w-1/3'],
      ['heading', 'w-2/5'],
      ['body', 'w-full'],
      ['body', 'w-full'],
      ['body', 'w-1/3'],
    ],
  },
}

/** Exported for the test that asserts every shipped template has a card. */
export const THUMBNAIL_IDS = Object.keys(THUMBNAILS)
