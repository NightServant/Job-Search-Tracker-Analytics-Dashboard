'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { WORD_TEMPLATES, LATEX_TEMPLATES } from '@/services/resumeTemplateService'
import type { ResumeTemplate } from '@/services/resumeTemplateService'
import type { ResumeMode } from '@/services/resumeService'

export interface TemplateChoice {
  mode: ResumeMode
  template: ResumeTemplate
}

export interface TemplateGalleryProps {
  onChoose: (choice: TemplateChoice) => void
  busy?: boolean
  className?: string
}

const MODE_LABEL: Record<ResumeMode, string> = { word: 'word', latex: 'LaTeX' }

/**
 * The start-a-new-CV gallery, laid out the way Word's own start screen lays
 * out its templates: a horizontal row of page-shaped cards, each a preview
 * over its name.
 *
 * Word leads its own gallery with a "Blank Document" card. This one does NOT,
 * at Gabe's instruction: `new CV` is already a primary button on this screen,
 * so a blank card here would be a third route to the same blank document. The
 * gallery is for the choices `new CV` cannot express.
 *
 * This is where templates live now. They used to be a dropdown inside each
 * editor, which put the choice at the wrong moment: by the time the editor is
 * open there is already a document, so picking a template REPLACED what was on
 * screen -- a destructive action wearing the same chrome as "reset" and
 * "save". Gabe had that dropdown removed. Choosing here, before anything
 * exists, means a template is a starting point rather than an overwrite.
 *
 * The thumbnails are drawn in CSS rather than rendered from the template
 * content. A real preview would mean mounting a tiptap editor (or a LaTeX
 * renderer) per card just to throw the instance away, and neither engine
 * paints at 96px in a way anyone can read. What the reader needs from a
 * thumbnail is which SHAPE the document has -- one column of prose, a dense
 * multi-section layout, a heading-led academic one -- and a rule diagram says
 * that at this size where miniature body text cannot.
 *
 * Word and LaTeX cards sit in one row rather than two tabbed panels. The
 * choice of engine and the choice of layout are the same decision made once:
 * splitting them would ask the reader to pick a tab before they can see what
 * is behind it.
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
export function TemplateGallery({ onChoose, busy = false, className }: TemplateGalleryProps) {
  const cards = React.useMemo(
    () => [
      ...WORD_TEMPLATES.map((t) => ({
        key: t.id,
        mode: 'word' as const,
        template: t,
        name: t.name.toLowerCase(),
      })),
      ...LATEX_TEMPLATES.map((t) => ({
        key: t.id,
        mode: 'latex' as const,
        template: t,
        name: t.name.toLowerCase(),
      })),
    ],
    []
  )

  return (
    <section data-template-gallery className={cn('relative flex flex-col gap-3', className)}>
      <div className="flex items-baseline gap-4">
        <h2 className="text-heading-s text-text-primary">start a new CV</h2>
        <p className="text-body-s text-text-muted">pick a starting point</p>
      </div>

      <Carousel
        opts={{ align: 'start', dragFree: true, containScroll: 'trimSnaps' }}
        className="w-full"
      >
        {/* -ml-4 / pl-4 is the carousel's own gutter idiom: the track is
            shifted left by one gap so the first card sits flush with the page
            margin while every later card keeps its spacing. */}
        <CarouselContent className="-ml-4">
          {cards.map((card) => (
            <CarouselItem key={card.key} className="basis-auto pl-4">
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
                <Thumbnail id={card.template.id} mode={card.mode} />
                <span className="flex flex-col">
                  <span className="truncate text-body-s text-text-primary">{card.name}</span>
                  <span className="text-caption text-text-muted">{MODE_LABEL[card.mode]}</span>
                </span>
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Inside the header row rather than floating over the first and last
            cards, which is where the shadcn default puts them -- over a 132px
            card an overlaid arrow covers a third of the thumbnail. */}
        <div className="pointer-events-none absolute inset-x-0 -top-9 flex justify-end gap-2">
          <CarouselPrevious className="pointer-events-auto static translate-y-0" />
          <CarouselNext className="pointer-events-auto static translate-y-0" />
        </div>
      </Carousel>
    </section>
  )
}

/** A page-shaped diagram of the template's structure, in rules rather than type. */
function Thumbnail({ id, mode }: { id: string; mode: ResumeMode }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex aspect-[3/4] w-32 flex-col gap-1.5 overflow-hidden rounded-sm border p-3',
        'border-border-subtle bg-bg-canvas',
        'transition-colors duration-[--duration-fast]',
        'group-hover/template:border-accent-default'
      )}
    >
      <ThumbnailRules id={id} mode={mode} />
    </span>
  )
}

/** Bar = heading, hairline = body. Ratios differ per template so the shapes do. */
function ThumbnailRules({ id, mode }: { id: string; mode: ResumeMode }) {
  const heading = mode === 'latex' ? 'bg-chart-2' : 'bg-accent-default'
  const body = 'bg-border-default'
  const rows: Array<[type: 'heading' | 'body', width: string]> =
    id.endsWith('compact')
      ? [
          ['heading', 'w-2/3'],
          ['body', 'w-full'],
          ['body', 'w-5/6'],
          ['heading', 'w-1/2'],
          ['body', 'w-full'],
          ['body', 'w-4/5'],
          ['body', 'w-full'],
        ]
      : id.endsWith('detailed') || id.endsWith('academic')
        ? [
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
        : [
            ['heading', 'w-2/3'],
            ['body', 'w-full'],
            ['body', 'w-1/2'],
            ['heading', 'w-1/2'],
            ['body', 'w-full'],
            ['body', 'w-4/5'],
          ]

  return (
    <>
      {rows.map(([type, width], i) => (
        <span
          key={i}
          className={cn(
            'block rounded-[1px]',
            width,
            type === 'heading' ? `h-1.5 ${heading}` : `h-0.5 ${body}`
          )}
        />
      ))}
    </>
  )
}
