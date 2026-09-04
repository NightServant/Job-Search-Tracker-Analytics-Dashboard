/**
 * The icon motion vocabulary.
 *
 * ONE PLACE. The class names below are the vocabulary; src/index.css holds
 * what each one does. A reader who wants the gesture reads the stylesheet; a
 * reader who wants to know which control uses which reads this.
 *
 * WHY THIS EXISTS WHEN THE ICONS ARE ALREADY ANIMATED. Every glyph in this
 * directory is an AnimateIcons component with its own hover animation. Two
 * things were wrong with relying on them:
 *
 *   1. THEY FIRE ON THE GLYPH, NOT THE CONTROL. The handler is on the icon's
 *      own 20px <div>, so hovering a 200px nav row did nothing unless the
 *      pointer happened to cross the icon itself. Focus and press were not
 *      handled at all, so the keyboard got no feedback anywhere.
 *   2. THEY ARE THE WRONG ANIMATIONS FOR THIS SYSTEM. The registry's defaults
 *      are 0.6-1.2s springy overshoots -- the plus does
 *      `scale: [1, 1.2, 0.85, 1], rotate: [0, 10, -10, 0]`, the chevron emits
 *      a ghost trail, the search lens wiggles on three axes for 1.2 seconds.
 *      That is a playful consumer aesthetic. This system is Swiss: minimal,
 *      fast, functional, and explicitly not decorative.
 *
 * So the barrel turns the built-in hover off (`isAnimated: false`, see
 * ./index.ts) and this is the single system in its place. Vendored shadcn
 * primitives that import a glyph directly -- accordion, combobox, calendar --
 * keep the registry's behaviour, because rewriting 39 registry files is a
 * different change than the one being asked for.
 *
 * CSS-FIRST, NO JAVASCRIPT. Every variant is a transform on the icon's
 * wrapper, selected by the control's own `:hover`, `:focus-visible` and
 * `:active`. There is no hook, no ref and no listener anywhere in this
 * system.
 *
 * REDUCED MOTION IS A MEDIA QUERY in the stylesheet that returns every
 * transform to `none` and drops the transition. The icon holds still rather
 * than moving quickly, which is what the preference actually asks for. The
 * colour transitions each control already had are untouched: a colour change
 * is not motion.
 *
 * ONE DURATION, `--duration-fast` (160ms), for everything except the press,
 * which uses `--duration-instant` (100ms). Nothing is slower than that and
 * nothing repeats.
 */

/**
 * Put this on the control -- button, link, row, field wrapper -- that should
 * drive its icon. It is a plain class, and the stylesheet keys every variant
 * off it as a descendant selector.
 */
export const ICON_MOTION_GROUP = 'icon-trigger'

/**
 * WHY PLAIN CSS CLASSES AND NOT TAILWIND VARIANTS.
 *
 * This was first written as `motion-safe:group-hover/icon:*` utilities, and
 * two REAL faults in that version are why it is not one any more. Both were
 * found by reading the built stylesheet in a browser; neither was visible in
 * the source or catchable by a test that only looked at the source.
 *
 *   1. `cn()` SILENTLY DROPPED HALF THE TIMING. The base carried
 *      `duration-(--duration-fast)` and the press carried
 *      `duration-(--duration-instant)`; tailwind-merge treats two `duration-*`
 *      utilities as a conflict and keeps the last, so every icon in the app
 *      shipped with the base duration deleted. The rendered class list showed
 *      it plainly and nothing else ever would have.
 *   2. A TEST FILE BECAME A SOURCE OF PRODUCTION CSS. Tailwind scans every
 *      file, comments included, so an assertion that quoted a class name made
 *      Tailwind emit that class for real -- ungated by `motion-safe:` and used
 *      by nothing. Dead CSS is the small half; the ungated half would have
 *      been a genuine bug the moment anything used it.
 *
 * Written as ordinary CSS neither is possible: the declaration IS the
 * transform, there is nothing for a merge to collapse, and no string anywhere
 * can conjure a rule.
 *
 * FOR THE RECORD, because a later reader will otherwise repeat the
 * investigation: the utility version was ALSO briefly believed not to move at
 * all. That was wrong, and it was a measurement artifact -- the browser pane
 * was hidden, a hidden pane does not tick the compositor, and a CSS transition
 * therefore never advances past its start value. Every "the icon did not move"
 * reading came from that. Disable the transition and the hover state is
 * observable immediately; that is how this version was verified (-1px,
 * measured). The rewrite stands on the two faults above, not on that.
 *
 * The public shape is unchanged -- these are still class strings passed as
 * `className` -- so every call site reads the same either way.
 */
export const ICON_MOTION = {
  /**
   * A destination. Rises a single pixel toward the reader.
   *
   * One pixel is the point: at 20px it is felt more than seen, which is what
   * "subtle" has to mean for something that fires on every row of a six-item
   * sidebar.
   */
  lift: 'icon-motion icon-motion-lift',
  /** Settings. A gear turns; 45 degrees is one detent, not a spin. */
  turn: 'icon-motion icon-motion-turn',
  /**
   * Search. The lens closes in rather than wandering around.
   *
   * The only variant whose stylesheet rule also answers `:focus-within`,
   * because search is the only one whose trigger is a FIELD: the group is the
   * input's wrapper and the thing that takes focus is the input inside it.
   */
  zoom: 'icon-motion icon-motion-zoom',
  /** Add. A quarter turn -- the plus becoming an x, opening something. */
  open: 'icon-motion icon-motion-open',
  /** Forward: next, an outbound link, a call to action. Moves the way it sends you. */
  forward: 'icon-motion icon-motion-forward',
  /** Back: previous, back to the list, restore an earlier version. */
  back: 'icon-motion icon-motion-back',
  /** Upload / import. Away from the reader, into the system. */
  raise: 'icon-motion icon-motion-raise',
  /** Download / export. Toward the reader, out of the system. */
  drop: 'icon-motion icon-motion-drop',
  /**
   * Delete. Tilts like a lid coming off the bin -- the one variant that
   * rotates AND translates, because a lid that only rotates pivots through
   * the bin. It is also the only destructive action here, and it earns a
   * fractionally larger gesture for that.
   */
  lid: 'icon-motion icon-motion-lid',
  /** Edit. Nudges up-right, along the axis a pencil is held on. */
  edit: 'icon-motion icon-motion-edit',
  /** Press only, for an icon whose meaning is already carried by state. */
  none: 'icon-motion',
} as const

export type IconMotion = keyof typeof ICON_MOTION

/**
 * The press acknowledgement, added unless a caller opts out.
 *
 * A separate class rather than a rule on every variant, so an icon in
 * something unpressable -- a status glyph, the lens inside a text field --
 * can decline it without declining the hover gesture too.
 */
export const ICON_PRESS = 'icon-motion-press'

/**
 * The class for one variant.
 *
 * `press` defaults on: an icon inside a control the user can click should
 * acknowledge the click, and a 0.9 scale for 100ms is the cheapest honest way
 * to say "that landed".
 */
export function iconMotion(variant: IconMotion, options?: { press?: boolean }): string {
  const press = options?.press ?? true
  return press ? `${ICON_MOTION[variant]} ${ICON_PRESS}` : ICON_MOTION[variant]
}

/**
 * STATE CHANGES, which are not hover and cannot be a `:hover` variant.
 *
 * These run once, on mount or when a key changes, and their keyframes live in
 * src/index.css beside the app's other named animations. Each is wrapped in
 * its own `@media (prefers-reduced-motion: reduce)` guard there, which is the
 * only way to gate a keyframe animation -- `motion-safe:` gates the utility
 * that starts it, but these are started by the element appearing.
 */
export const ICON_STATE_MOTION = {
  /** Something arrived or changed under the reader: a success, a new status. One quiet pop. */
  settle: 'icon-settle',
  /** Something was refused. Two short shakes, once. Says "no" without turning red twice. */
  refuse: 'icon-refuse',
} as const

/**
 * NO STROKE-DRAWING VARIANT, and that is a limit rather than an omission.
 *
 * Drawing a stroke means animating `stroke-dashoffset` on a path inside the
 * <svg>, and motion holds every one of those paths at an inline style for its
 * `initial="normal"` variant. Inline styles beat stylesheets, so a CSS
 * keyframe aimed there does nothing at all -- silently, which is the worst
 * way for it to fail. The glyphs that ship their own draw (check, settings)
 * still have it on their imperative handle; nothing in the app calls it yet.
 */

export type IconStateMotion = keyof typeof ICON_STATE_MOTION
