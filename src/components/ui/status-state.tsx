'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { icons, type IconName } from '@/components/icons'
import { ICON_STATE_MOTION } from '@/components/icons/motion'

/**
 * The states a screen can be in that are NOT "here is your data".
 *
 * WHY ONE COMPONENT AND A TABLE, rather than ten components. Gabe asked for
 * ten named states on 2026-09-15 -- empty, error, loading, no internet, slow
 * internet, no search result, permission denied, session expired, form
 * validation, success -- and ten components would be ten places for the same
 * layout to drift, which is the defect this whole pass exists to fix. What
 * genuinely differs between them is three things: a glyph, a colour, and the
 * words. Everything else -- the centring, the type scale, the gap, where the
 * action sits -- is identical and must stay identical, so it is written once.
 *
 * THE TONE IS NOT DECORATION. It is the only thing telling a reader, at a
 * glance and before reading a word, whether they are looking at something
 * that went wrong, something they have to fix, or nothing at all having
 * happened yet. That distinction cost a fix round in M5, when an empty panel,
 * a loading panel and a failed panel all rendered as the same grey sentence --
 * and it is the reason `EmptyState`'s docblock forbids passing an error
 * through it.
 *
 * WHICH IS WHY `EmptyState` SURVIVES BESIDE THIS. It is not folded in, and it
 * is not a preset here. Its argument is that an empty account is a true,
 * unalarming statement about somebody with nothing saved yet, drawn as a large
 * soft glyph over one sentence -- and it is used inline, half-height, inside
 * panels that are otherwise fine. This component is for a state that is the
 * WHOLE of what a surface can show. Merging them would mean one size that is
 * wrong in one of the two places, which is the same trade `IconButton` refused
 * against `Button`.
 *
 * LOADING IS HERE TOO, WHICH IS THE ODD ONE. A skeleton is the better loading
 * state whenever the shape of what is coming is known -- that is what
 * `loading-skeletons.tsx` is for, and it should still be the first choice on a
 * route. This one is for a wait whose OUTPUT HAS NO SHAPE YET: the model
 * reading a posting, an import being parsed. A skeleton of a form you have not
 * generated yet is a lie about what is about to appear.
 *
 * NOTHING HERE IS A TOAST. A toast reports something that finished and then
 * goes away; these describe the state a surface is IN right now. `success` is
 * the one that looks like it should be a toast and is not -- it is for a flow
 * whose last screen IS the confirmation, such as a finished import, where a
 * message that disappears after four seconds is the wrong medium.
 */

/** The ten states, as the callers name them. */
export type StatusKind =
  | 'loading'
  | 'error'
  | 'offline'
  | 'slow'
  | 'no-results'
  | 'denied'
  | 'expired'
  | 'invalid'
  | 'success'

/**
 * Glyph, colour and default words, per state.
 *
 * THE COPY HERE IS A FALLBACK AND USUALLY THE WRONG WORDS. A generic "nothing
 * matched your search" is worse than "none of the 40 roles here match
 * 'designer'", because the second names the number, the thing and the term.
 * Every caller that can say something specific should pass `title` and
 * `message`; these exist so that a caller which genuinely has nothing to add
 * is not forced to invent a sentence, and so the wording of the states nobody
 * customises stays consistent across screens.
 *
 * THE TONES MAP ONTO THE STATUS COLOURS THIS APP ALREADY HAS, and there are
 * only three of them because there are only three things worth saying at a
 * glance:
 *
 *   muted    nothing is wrong and nothing has happened. Loading, no results.
 *   warn     something is in your way but nothing is broken and nothing is
 *            lost -- you are offline, the connection is slow, the session ran
 *            out, the form is not valid yet. Every one of these is recoverable
 *            by the reader, which is why they must not be red: red says "this
 *            failed" and sends somebody looking for what they broke.
 *   error    a request failed or the answer is no. Error, permission denied.
 *   success  it worked.
 */
const PRESETS: Record<
  StatusKind,
  {
    icon: IconName
    tone: 'muted' | 'warn' | 'error' | 'success'
    title: string
    message: string
    /** A motion variant from ICON_STATE_MOTION, for the states that earn one. */
    motion?: keyof typeof ICON_STATE_MOTION
  }
> = {
  loading: {
    icon: 'Clock',
    tone: 'muted',
    title: 'working on it',
    message: 'This takes a few seconds.',
  },
  error: {
    icon: 'AlertCircle',
    tone: 'error',
    title: 'that did not work',
    message: 'Something failed on the way. Try again, and if it keeps happening the problem is ours.',
    motion: 'refuse',
  },
  offline: {
    icon: 'Globe',
    tone: 'warn',
    title: 'you are offline',
    message:
      'This device has no connection right now. Worktrack will pick up where it left off when it comes back.',
  },
  slow: {
    icon: 'Clock',
    tone: 'warn',
    title: 'this connection is slow',
    message: 'Still waiting on the network. Nothing is broken; it is just taking longer than usual.',
  },
  'no-results': {
    icon: 'Search',
    tone: 'muted',
    title: 'nothing matched',
    message: 'No result matches what you typed. Try fewer words, or clear the search.',
  },
  denied: {
    icon: 'Lock',
    tone: 'error',
    title: 'you cannot open this',
    message: 'This belongs to another account. If it should be yours, sign in as that account.',
    motion: 'refuse',
  },
  expired: {
    icon: 'Clock',
    tone: 'warn',
    title: 'your session expired',
    message: 'You were signed out for security. Sign in again and you will come straight back here.',
  },
  invalid: {
    icon: 'AlertCircle',
    tone: 'warn',
    title: 'check the form',
    message: 'Some answers still need fixing. Each one is marked below.',
    motion: 'refuse',
  },
  success: {
    icon: 'CircleCheck',
    tone: 'success',
    title: 'done',
    message: 'That worked.',
    motion: 'settle',
  },
}

/**
 * The glyph colours, as tokens.
 *
 * `status-rejected-mark` is the app's red and `status-offer-mark` its green --
 * borrowed from the pipeline rather than a second palette invented for states,
 * which is the rule this design system holds to everywhere: one orange, one
 * red, one green, and status colour is semantic rather than decorative.
 *
 * `warn` is deliberately NOT a fourth hue. It is the accent, which is the only
 * chroma this system has to spend and reads as "look here" without reading as
 * "this failed" -- and adding a yellow for four screens would be introducing a
 * colour language to say something the existing one already says.
 */
const TONE_CLASS = {
  muted: 'text-text-muted opacity-60',
  warn: 'text-accent-default',
  error: 'text-status-rejected-mark',
  success: 'text-status-offer-mark',
} as const

/**
 * `React.HTMLAttributes` is extended so a caller's `data-*` hook reaches the
 * DOM, which is how `EmptyState` is already shaped and why. Several screens
 * identify their states by attribute rather than by copy -- `data-job-feed-
 * state="empty"`, `data-documents-filter-empty` -- because asserting on a
 * sentence makes rewording a message a red test. Without the spread below,
 * TypeScript accepts a hyphenated attribute on a component and then the
 * component silently drops it, which is the worst of both: it type-checks and
 * the selector finds nothing.
 */
export interface StatusStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {
  kind: StatusKind
  /**
   * Overrides the preset's heading. Say the specific thing when you know it.
   *
   * `null` DROPS THE HEADING ENTIRELY, which is not the same as omitting the
   * prop -- omitting it keeps the preset's. It exists for the one real case:
   * a state rendered inside something that already carries a heading of its
   * own. `SessionExpiredDialog` is that case, and without this it printed
   * "your session expired" as the dialog's title and again two lines below it.
   */
  title?: React.ReactNode | null
  /** Overrides the preset's sentence. */
  message?: React.ReactNode
  /** A button or a link, under the copy. One, not three. */
  action?: React.ReactNode
  /**
   * Half the vertical padding, for a state that fills one PANEL rather than a
   * whole screen. The same `py-10` the calendar's two rails already pass to
   * `EmptyState` for the same reason.
   */
  compact?: boolean
  /**
   * The element the heading renders as. `p` by default.
   *
   * A STATE INSIDE A PANEL MUST NOT ADD A HEADING. Most of these sit under a
   * section title that already owns the outline level, so an `<h2>` here would
   * insert a phantom subsection into a screen reader's document outline for
   * "nothing matched".
   *
   * A STATE THAT IS THE WHOLE PAGE MUST. The registration flow's success
   * screen is the only content on it, and a page whose only text is a
   * paragraph has no heading at all -- which is the thing a screen reader user
   * navigates by. That one caller passes `h1`, and it is why this prop exists
   * rather than the element being hard-coded either way.
   */
  titleAs?: 'p' | 'h1' | 'h2'
  className?: string
}

/*
  `title` AND `role` ARE OMITTED FROM THE SPREAD, and both for the same reason:
  the DOM already has an attribute by that name and it means something else.

  `title` on an element is the tooltip string, typed `string | undefined`; here
  it is the state's heading, a ReactNode that may be `null`. Keeping both would
  mean the heading could not be a node.

  `role` is computed from `kind` -- `alert` for the two failures, `status` for
  everything else -- and a caller overriding it would break the one thing this
  component gets right about screen readers without anybody noticing.
*/


export function StatusState({
  kind,
  title,
  message,
  action,
  compact = false,
  titleAs: TitleTag = 'p',
  className,
  ...rest
}: StatusStateProps) {
  const preset = PRESETS[kind]
  const Icon = icons[preset.icon]

  return (
    <div
      data-status-state={kind}
      data-tone={preset.tone}
      /**
       * `role="status"` on everything except the two failures.
       *
       * A polite live region is right for "loading", "offline", "nothing
       * matched" and "done": a screen reader is told when the surface changes
       * without being interrupted mid-sentence. `role="alert"` is assertive
       * and interrupts, which is correct for a request that failed and for an
       * answer of no -- and wrong for the other seven, where interrupting
       * somebody to say a list is empty is the behaviour that makes people
       * turn a screen reader's verbosity down.
       */
      role={kind === 'error' || kind === 'denied' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col items-center gap-4 px-4 text-center',
        compact ? 'py-10' : 'py-20',
        className
      )}
      {...rest}
    >
      {/* `aria-hidden`, always. The glyph carries nothing the two sentences do
          not -- it is there to give the eye something to land on in a
          rectangle that is otherwise empty, and a glyph that needed announcing
          would mean the copy was incomplete. */}
      <Icon
        size={48}
        aria-hidden
        className={cn(
          TONE_CLASS[preset.tone],
          '[&_svg]:size-12',
          preset.motion && ICON_STATE_MOTION[preset.motion],
          /*
            THE ONE CONTINUOUS MOTION, and it is applied here rather than
            through `preset.motion` on purpose. `ICON_STATE_MOTION` is state
            COMMENTARY -- each of its entries remarks on something that just
            happened and stops -- and `iconMotion.test` enforces that every
            entry runs exactly once, because the brief's rule is "avoid
            continuous or distracting animations". Putting `breathe` in that
            map failed it, correctly.

            `loading` is the one kind whose condition is still true for as
            long as it is on screen, so it is the one that has to repeat. It
            is the same category as the skeleton pulse and the button
            spinner, neither of which lives in that vocabulary either.

            Without it this drew a clock face sitting perfectly still, which
            is indistinguishable from a page that has given up -- the exact
            impression a loading state exists to prevent.
          */
          kind === 'loading' && 'icon-breathe'
        )}
      />

      <div className="flex max-w-prose flex-col gap-1.5">
        {/* `!== null` rather than `??`: null is a caller SUPPRESSING the
            heading, and `??` would fall through to the preset's and print it
            anyway. `undefined` -- the prop not passed -- still takes the
            preset. */}
        {title !== null && (
          <TitleTag
            className={cn(
              'text-text-primary',
              // The type scale follows the element, because the element says
              // what the thing IS: a page's own heading is display-adjacent, a
              // line above a sentence in a panel is body copy. Two props for
              // one decision is how they end up disagreeing.
              TitleTag === 'p' ? 'text-body-m' : 'text-heading-l'
            )}
          >
            {title ?? preset.title}
          </TitleTag>
        )}
        <p className="text-body-s text-text-muted">{message ?? preset.message}</p>
      </div>

      {action}
    </div>
  )
}

/**
 * A label that cycles while something is pending (Gabe, 2026-09-15: "implement
 * a dynamic text behavior" on the wizard's loading state).
 *
 * WHY IT IS WORTH ANYTHING AT ALL. A spinner that has been turning for eight
 * seconds and a spinner that has been turning for eighty look identical, so
 * the only honest signal a reader has that the app is still working is that
 * the words keep changing. That is the whole argument, and it has one
 * condition attached: the phrases must be TRUE IN ORDER. Reading the page
 * really does happen before the sections are organised, so saying so in that
 * order is a progress report. A random shuffle of synonyms would be
 * decoration pretending to be one.
 *
 * IT STOPS ON THE LAST PHRASE rather than looping. A cycle that returns to
 * "reading the page" after "organising what it says" tells the reader the work
 * restarted, which on a step that takes ten seconds is alarming and untrue.
 * The last phrase is the honest resting place for a wait that has gone on
 * longer than expected.
 *
 * NOT RENDERED UNDER REDUCED MOTION? NO -- it stays. `prefers-reduced-motion`
 * is about movement, and this is text changing every few seconds, which is
 * what a live region does by design. Removing it would take away the only
 * progress signal from the reader most likely to be waiting on a slow device.
 *
 * `aria-live` is deliberately ABSENT. The surrounding state already carries
 * `role="status"`, and nesting a second live region inside one makes some
 * screen readers announce the whole block again on every phrase.
 */
export function RotatingText({
  phrases,
  intervalMs = 2600,
  className,
}: {
  /** In the order the work actually happens. Two or more. */
  phrases: string[]
  intervalMs?: number
  className?: string
}) {
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    // Nothing to advance to. `setInterval` on a one-phrase list would be a
    // timer that fires forever to set state to the value it already has.
    if (phrases.length < 2) return
    const id = setInterval(() => {
      setIndex((current) => Math.min(current + 1, phrases.length - 1))
    }, intervalMs)
    return () => clearInterval(id)
  }, [phrases.length, intervalMs])

  // Reset when the caller swaps the list out -- otherwise a second run of a
  // shorter sequence would start parked on its last phrase.
  React.useEffect(() => setIndex(0), [phrases])

  return (
    <span data-rotating-text className={className}>
      {phrases[Math.min(index, phrases.length - 1)]}
    </span>
  )
}
