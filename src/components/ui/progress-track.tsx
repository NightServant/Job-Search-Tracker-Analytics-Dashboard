'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { icons, type IconName } from '@/components/icons'
import { ACCENT_TONE, type ProgressTone } from '@/components/ui/progress-tones'

/**
 * One progress tracker, for every place this app shows progress.
 *
 * THERE WERE THREE OF THESE AND THEY AGREED ON NOTHING (Gabe, 2026-09-11:
 * "all components that involves progress bar must be refactored properly").
 * The application pipeline drew a rule per step in the status palette, the add
 * wizard drew a rule per step in the accent, and registration drew a single
 * filled track with icons floating above it — three answers to one question,
 * on three screens of the same product.
 *
 * THE SHAPE IS SHOPEE'S ORDER TRACKER, which is what Gabe asked for and is the
 * right reference: a row of icon nodes joined by a line, each node carrying a
 * heading and a line of description, with everything behind you filled in and
 * everything ahead of you hollow. It answers "where am I" in one glance
 * because the filled run has a visible END, which a row of equal-weight blocks
 * never does.
 *
 * WHERE IT DEPARTS FROM SHOPEE, and why that is not a compromise:
 *
 *   SHOPEE FILLS THE NODE. This system's oldest rule is that a status is a
 *   rule and a label, never a filled pill — and four of the five things this
 *   tracker shows ARE application statuses. So the solid colour lives in the
 *   CONNECTOR, which is a rule, and the node is an outline in the same tone
 *   with a tinted centre. The tracker reads as filled-up-to-here without a
 *   single status pill anywhere on it.
 *
 *   It also sidesteps a real contrast problem rather than papering over one.
 *   A filled node needs a foreground that clears AA against it, and the five
 *   status colours inverse between light and dark — white on
 *   `status-interviewing-mark` is fine in one theme and unreadable in the
 *   other. Tone-on-canvas is the pairing `DangerZone` already ships and the
 *   contrast suite already covers.
 *
 * THE NODES ARE CIRCLES, which is the one place this file departs from the 4px
 * radius cap. That cap governs RECTANGLES; `shadcnHouseRules` keeps an explicit
 * allowlist for components that draw something genuinely circular, and a
 * tracker node is as circular as an avatar.
 *
 * IT TURNS THE CORNER ON A PHONE. Below `sm` the columns stack, and a
 * horizontal connector between two vertically stacked nodes joins nothing --
 * so the run would have read as four loose circles exactly where a tracker is
 * most useful. Stacked, it becomes a VERTICAL tracker: node on the left, text
 * beside it, and the line runs down through the gap from one node to the next.
 * That is what Shopee itself does on a phone, and it is the same component
 * rather than a second one behind a breakpoint.
 *
 * ANIMATION IS THE CONNECTOR FILLING, not the nodes arriving. A tracker's
 * motion should say "this is how far it has got", so the line grows from the
 * previous node to the current one, staggered along the run, and the node you
 * are ON keeps a slow pulse. Everything else is still.
 *
 * IT ALWAYS ENDS CORRECT. The fill is a width transition flipped by a mounted
 * flag rather than a keyframe with a backwards fill: if the transition never
 * runs — reduced motion, a paused compositor, a prerender — the bar is already
 * at its final width instead of stuck at zero. An animation that can strand
 * content at its start value is not an animation, it is a bug with a delay.
 */

export type { ProgressTone } from '@/components/ui/progress-tones'

export interface ProgressStep {
  id: string
  label: string
  description?: string
  icon: IconName
  /** Defaults to the accent. The application pipeline colours by status. */
  tone?: ProgressTone
}

export interface ProgressTrackProps {
  steps: ProgressStep[]
  /** Zero-based. Everything before it is done, everything after is ahead. */
  current: number
  /** Named for a screen reader; the list itself carries the state. */
  label: string
  className?: string
}

/** The node, in the three states a step can be in. */
function state(index: number, current: number) {
  if (index < current) return 'done' as const
  if (index === current) return 'current' as const
  return 'todo' as const
}

export function ProgressTrack({ steps, current, label, className }: ProgressTrackProps) {
  if (steps.length === 0) return null

  return (
    <ol
      className={cn('grid gap-x-2 gap-y-6 sm:grid-flow-col sm:auto-cols-fr', className)}
      aria-label={label}
      data-progress-track
    >
      {steps.map((step, index) => {
        const Icon = icons[step.icon]
        const status = state(index, current)
        const tone = step.tone ?? ACCENT_TONE
        const reached = status !== 'todo'
        // The segment BEHIND this node is filled once this node is reached --
        // so the run of colour stops at the node you are on rather than
        // running past it.
        const behindFilled = reached && index > 0
        const aheadFilled = index < current

        return (
          <li
            key={step.id}
            // A ROW ON A PHONE, A COLUMN FROM `sm`. Same children, same order;
            // only the axis changes, so nothing is rendered twice and there is
            // no second markup path to keep in step.
            className="relative flex min-w-0 gap-3 sm:flex-col sm:gap-2.5"
            data-step={step.id}
            data-state={status}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            {/* THE VERTICAL RUN, phone only, anchored to the ROW rather than to
                the node. The node is a fixed 36px but the row is as tall as its
                text, so a connector hanging off the node's own box fell short
                of the next node by however much the description added -- 5px
                with one line, more with two. From the row it runs from under
                the node to the row's bottom edge and on through the list's own
                24px gap, which lands on the next node whatever the text does. */}
            <DownConnector
              filled={aheadFilled}
              tone={tone}
              index={index}
              hidden={index === steps.length - 1}
            />
            {/* THE NODE ROW. The connectors are absolutely positioned at the
                node's own vertical centre and run to the column edges, so they
                meet the neighbouring column's connector exactly — no
                arithmetic, and it holds at any number of steps. Below `sm` the
                columns stack and the connectors are hidden: a horizontal line
                between two vertically stacked nodes joins nothing. */}
            <span
              aria-hidden
              className="relative flex h-9 w-9 shrink-0 items-center justify-center sm:w-full"
            >
              <Connector
                side="left"
                filled={behindFilled}
                tone={tone}
                index={index}
                hidden={index === 0}
              />
              <Connector
                side="right"
                filled={aheadFilled}
                tone={tone}
                index={index}
                hidden={index === steps.length - 1}
              />

              <span
                data-progress-node
                className={cn(
                  'relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2',
                  'transition-colors duration-(--duration-base)',
                  'motion-reduce:transition-none',
                  reached ? tone.edge : 'border-border-subtle',
                  status === 'current' ? tone.tint : 'bg-bg-canvas'
                )}
              >
                {/* THE PULSE MARKS ONLY THE STEP YOU ARE ON. It is a ring
                    behind the node rather than a change to the node itself, so
                    nothing under it moves and the layout never reflows. */}
                {status === 'current' && (
                  <span
                    data-progress-pulse
                    className={cn(
                      'absolute inset-0 rounded-full opacity-40',
                      'animate-progress-pulse motion-reduce:animate-none',
                      tone.line
                    )}
                  />
                )}
                <Icon
                  size={16}
                  aria-hidden
                  className={cn('relative shrink-0', reached ? tone.ink : 'text-text-muted')}
                />
              </span>
            </span>

            {/* `pb-*` on the phone layout only: the text is what makes a
                stacked row tall enough for the vertical connector to have
                somewhere to run. Without it a step with no description leaves
                the line hanging in space. */}
            {/* CENTRED UNDER ITS OWN NODE from `sm` up (Gabe, 2026-09-11:
                "text not aligned to the icon itself"). The node is centred in
                its column and the text was not, so every label sat at the
                column's leading edge while its icon was in the middle -- the
                two rows read as unrelated. Left-aligned below `sm`, where the
                layout is a row and the text sits BESIDE the node rather than
                under it. */}
            <span className="flex min-w-0 flex-1 flex-col gap-1 pb-1 sm:items-center sm:pb-0 sm:text-center">
              <span
                className={cn(
                  'truncate text-label-caps uppercase transition-colors duration-(--duration-base)',
                  'motion-reduce:transition-none',
                  status === 'current'
                    ? 'text-text-primary'
                    : status === 'done'
                      ? 'text-text-secondary'
                      : 'text-text-muted'
                )}
              >
                {step.label}
              </span>
              {/* The state a listener cannot see, said in words. Colour is not
                  available to everyone and neither is a filled line. */}
              <span className="sr-only">
                {status === 'done'
                  ? '(completed)'
                  : status === 'current'
                    ? '(current step)'
                    : '(not yet)'}
              </span>
              {step.description && (
                <span className="text-body-s text-text-muted">{step.description}</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Half a connector, from a node to the edge of its own column.
 *
 * TWO HALVES RATHER THAN ONE BAR PER GAP, because each column owns its own
 * markup: a bar spanning two grid columns would have to be rendered by one of
 * them and positioned into the other, which breaks the moment the columns
 * stack. Each half reaches the column edge and meets its neighbour there.
 *
 * The growth direction matters: the left half grows from the node OUTWARD to
 * meet what came before, and the right half grows from the node toward what is
 * next, so the whole run reads as filling forwards from the start.
 */
function Connector({
  side,
  filled,
  tone,
  index,
  hidden,
}: {
  side: 'left' | 'right'
  filled: boolean
  tone: ProgressTone
  index: number
  hidden: boolean
}) {
  if (hidden) return null
  return (
    <span
      className={cn(
        // STOPS SHORT OF THE NODE. These ran to the column's centre -- i.e.
        // underneath the 36px node -- and relied on the node's own background
        // to cover them. That works for a `bg-bg-canvas` node and fails for the
        // CURRENT one, whose centre is a 10% tint: the line showed straight
        // through the icon. `calc(50% + 22px)` is the node's 18px radius plus a
        // 4px breath, so there is nothing to cover in the first place.
        'absolute top-1/2 hidden h-[2px] -translate-y-1/2 bg-border-subtle sm:block',
        side === 'left'
          ? 'left-0 right-[calc(50%+22px)]'
          : 'left-[calc(50%+22px)] right-0'
      )}
    >
      {filled && (
        <span
          data-progress-fill
          className={cn(
            'absolute inset-y-0 block w-full',
            // A KEYFRAME WITH NO FILL MODE, not a transition off a state flip.
            // The resting width is already 100%, so the bar is correct before
            // the animation starts and correct if it never starts at all --
            // reduced motion, a prerender, a paused compositor. The keyframe
            // only says how it got there.
            //
            // The first version of this was a `transition-[width]` driven by a
            // mounted flag, which had to render 0% first to have something to
            // travel from. That is the shape that strands a bar at zero when
            // the transition does not run.
            'animate-progress-fill motion-reduce:animate-none',
            side === 'left' ? 'right-0 origin-right' : 'left-0 origin-left',
            tone.line
          )}
          style={{
            // Staggered along the run, so the line reads as travelling rather
            // than as four bars appearing at once. Capped so a long run does
            // not finish a second after the dialog opens.
            animationDelay: `${Math.min(index, 5) * 90}ms`,
          }}
        />
      )}
    </span>
  )
}

/**
 * The line from one node down to the next, on the stacked layout.
 *
 * `top-full` plus `h-6` rather than a computed height: the tracker's own
 * `gap-y-6` is 24px, so the connector spans exactly the gap it is bridging. If
 * that gap ever changes, this is the one other number to change, which is why
 * they are named together here rather than discovered apart.
 */
function DownConnector({
  filled,
  tone,
  index,
  hidden,
}: {
  filled: boolean
  tone: ProgressTone
  index: number
  hidden: boolean
}) {
  if (hidden) return null
  return (
    // `left-[17px]`: the node column is `w-9` (36px) at the row's leading
    // edge, so its centre is 18px in and a 2px line centres at 17.
    <span className="absolute -bottom-6 left-[17px] top-9 w-[2px] bg-border-subtle sm:hidden">
      {filled && (
        <span
          data-progress-fill
          className={cn(
            // `origin-top` with a scaleY keyframe rather than a height one:
            // this bar is positioned by top AND bottom, so it has no height of
            // its own to animate.
            'absolute inset-0 block origin-top',
            'animate-progress-drop motion-reduce:animate-none',
            tone.line
          )}
          style={{ animationDelay: `${Math.min(index, 5) * 90}ms` }}
        />
      )}
    </span>
  )
}
