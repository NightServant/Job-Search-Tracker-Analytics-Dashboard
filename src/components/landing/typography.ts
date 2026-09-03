/**
 * The landing page's type contract.
 *
 * WHY THIS FILE EXISTS. The page had drifted into three sizes for one job. An
 * item title was `heading-s` in the problem and product sections and
 * `heading-m` in the proof section; an item body was `body-s` in two sections,
 * `body-m` in the FAQ and `body-l` in proof; and the closing section's title
 * was `display-m` while every other section title was `heading-l`. None of
 * that was a decision -- each section was written on its own and picked a
 * plausible size, which is exactly how a page stops looking designed. Gabe
 * called it on 2026-09-03.
 *
 * The fix is not "pick better sizes once", because that decays the moment a
 * seventh section is written. It is naming the ROLES, so a new section asks
 * "what is this text for" rather than "what size looks right here". A role is
 * a decision that can be reviewed; a raw `text-body-s` is a guess that cannot.
 *
 * THE HIERARCHY, and why each step is where it is. Four levels, each
 * separated from its neighbour by size, weight, or both -- a level that is
 * distinguished by neither is not a level:
 *
 *   sectionTitle  28px/700   display-m   the section's own name
 *   sectionLede   16px/400   body-l      one sentence under that name
 *   itemTitle     16px/700   heading-m   a thing inside the section
 *   itemBody      14px/400   body-m      what that thing is
 *
 * The lede and the item title are deliberately THE SAME SIZE. They are not the
 * same level -- 400 against 700 is what separates them -- and giving the lede
 * its own step would have meant a fifth size on a page that only has four
 * things to say. Weight is the cheaper axis and the one this design system
 * already leans on.
 *
 * SECTION TITLES MOVED UP, from `heading-l` (20px) to `display-m` (28px). Four
 * of the five sections were at 20px and the closing CTA at 28px, so unifying
 * downward was the smaller edit -- and it was the wrong one. 20px is this
 * design system's APP heading, the size a panel title takes inside the
 * dashboard, and a marketing page whose section titles match its own settings
 * screen reads as an app screen with paragraphs in it. 28px is also the only
 * step between the hero's 56px and body copy, so the page now steps 56 → 28 →
 * 16 → 14 instead of falling off a cliff from 56 to 20.
 *
 * EVERY ROLE STATES ITS OWN WEIGHT, and that is not redundancy. Tailwind v4
 * carries a default weight on each font-size utility -- `text-heading-m` is
 * 700 by way of `--text-heading-m--font-weight` -- so writing `font-bold`
 * beside it looks like saying the same thing twice. It is not, because a
 * COMPONENT LIBRARY'S BASE CLASS BEATS IT. shadcn's AccordionTrigger ships
 * `text-sm font-medium`; tailwind-merge resolves the size in our favour (they
 * are the same group) but treats `font-medium` as a different group entirely
 * and keeps it, so the FAQ questions rendered at 16px/500 while every other
 * item title on the page was 16px/700. Gabe spotted it in the browser on
 * 2026-09-03; a source-text guard could not, because the class WAS applied --
 * it was overridden after the fact.
 *
 * Stating the weight makes each role win wherever it is applied, rather than
 * only where nothing else has an opinion.
 *
 * Colour travels with the role. A title that is `text-text-secondary` in one
 * section and `text-text-primary` in another is the same drift in a different
 * property, and splitting size from colour would leave half the contract
 * unenforceable.
 *
 * NOT EVERY STRING ON THE PAGE IS IN HERE. The hero (display-xl), the navbar,
 * the rail, the section index and the footer are chrome rather than section
 * content: they are sized against the viewport and each other, not against
 * this hierarchy. `landingTypography.test.ts` names them as the exceptions, so
 * the exemption is a list someone has to edit rather than an assumption.
 */
export const LANDING_TYPE = {
  /** A section's own name. One per section, always an <h2>. */
  sectionTitle: 'text-display-m font-bold text-text-primary',
  /** The single sentence under a section title. */
  sectionLede: 'text-body-l font-normal text-text-secondary',
  /** The small caps line above a section title. */
  eyebrow: 'text-label-caps font-bold uppercase text-accent-default',
  /** A thing inside a section -- a claim, a pain, a proof entry. Always <h3>. */
  itemTitle: 'text-heading-m font-bold text-text-primary',
  /** What that thing is. */
  itemBody: 'text-body-m font-normal text-text-secondary',
  /**
   * An item body that is the ANSWER to the item, not a description of it --
   * the problem section's resolution line. Same size as itemBody and a
   * stronger colour, because it is the half of the pair that pays off.
   */
  itemAnswer: 'text-body-m font-normal text-text-primary',
  /** Ordinals, counts, and link labels beside an item. */
  meta: 'text-body-s font-normal text-text-muted',
  /** A link that ends an item. Sized with meta, coloured as an action. */
  itemLink: 'text-body-s font-normal text-accent-default',
} as const

export type LandingTypeRole = keyof typeof LANDING_TYPE
