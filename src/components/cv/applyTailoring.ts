import type { JSONContent } from '@tiptap/core'
import type { TailoringSuggestion } from '@/services/integrations/tailoring'
import type { ResumeContent } from '@/services/resumeService'

/**
 * Turning a model's list of rewrites into a document.
 *
 * THE SUGGESTION LIST WAS THE PRODUCT UNTIL 2026-09-13 AND IT SHOULD NOT HAVE
 * BEEN. `tailor this CV` used to return a column of before/after pairs, each
 * with its own `apply` button that edited the document you were looking at, so
 * taking eight rewrites was eight clicks and the original was gone by the end
 * of them. Gabe asked for the button to "create a new version of the
 * document": the tailored CV is the deliverable, and the one you had open is
 * the version you keep.
 *
 * PURE, AND IN ITS OWN FILE, because this is the only part of tailoring that
 * can silently corrupt somebody's CV. A walk that mutated a shared node, or a
 * replacement that fired on the wrong substring, would show up as a document
 * that looks fine and says something its author never wrote. It takes content
 * and gives back content -- no editor, no network, no React -- so it can be
 * tested on the shapes rather than through a rail.
 *
 * SUGGESTIONS APPLY IN ORDER, TO THE RUNNING RESULT, and that is accepted
 * rather than accidental (named in review, 2026-09-13). Suggestion n's
 * `before` can therefore match text suggestion n-1 just inserted:
 * `[led -> spearheaded, spearheaded -> drove]` ends at `drove`, a word the
 * model proposed for a different line. Applying all of them against the
 * ORIGINAL text instead would trade that for a worse problem -- two
 * suggestions whose spans overlap would both claim the same characters, and
 * merging them means picking a winner with no basis for the choice. Sequential
 * application at least produces a document every single edit was valid
 * against. The prompt asks for section-scoped rewrites, so the collision needs
 * two suggestions quoting each other's output to bite.
 *
 * NOTHING IS FORCED. A suggestion whose `before` is not in the document is
 * skipped, not approximated: the model quotes from a plain-text rendering of
 * the CV and Tiptap stores a node tree, so a quote that spans a bold run or a
 * list boundary will not be found in any single text node. Rewriting the
 * nearest thing instead is how a tool ends up editing a line nobody pointed at.
 */

/**
 * IDENTITY IS THE "NOTHING CHANGED" SIGNAL. Every function here returns the
 * value it was given when no replacement landed, so the caller can ask
 * `next === content` instead of deep-comparing two documents -- which is what
 * stops a run that matched nothing from creating a byte-identical duplicate.
 */
function rewrite(text: string, suggestions: TailoringSuggestion[]): string {
  let next = text
  for (const suggestion of suggestions) {
    const { before, after } = suggestion
    // An empty `before` matches everywhere and nowhere: `split('')` shatters
    // the string into characters. A non-string `after` is a malformed row.
    if (!before || typeof after !== 'string') continue
    if (!next.includes(before)) continue
    // `split`/`join` RATHER THAN `String.replace`. A string replacement in
    // `replace` is not literal -- `$&`, `$'` and `$1` in the model's `after`
    // would be expanded against the match -- and a CV line containing a price
    // or a regex is not a hypothetical. This is the same edit with no
    // substitution grammar, and it takes every occurrence rather than the
    // first, which is what a reader expects from "replace this phrase".
    next = next.split(before).join(after)
  }
  return next
}

/** Tiptap's tree, walked immutably: only the branches that changed are rebuilt. */
function walk(node: JSONContent, suggestions: TailoringSuggestion[]): JSONContent {
  let next = node
  if (typeof node.text === 'string') {
    const text = rewrite(node.text, suggestions)
    if (text !== node.text) next = { ...next, text }
  }
  if (Array.isArray(node.content)) {
    const children = node.content.map((child) => walk(child, suggestions))
    if (children.some((child, i) => child !== node.content![i])) {
      next = { ...next, content: children }
    }
  }
  return next
}


/**
 * Apply every suggestion to a COPY of the document.
 *
 * Both shapes, because both editors call it: the Word editor stores a Tiptap
 * doc and the LaTeX editor stores a source string, and a tailored CV has to be
 * possible in either. Returns the input unchanged -- by reference -- when no
 * suggestion matched.
 */
export function applySuggestions(
  content: ResumeContent,
  suggestions: TailoringSuggestion[]
): ResumeContent {
  if (suggestions.length === 0) return content
  return walk(content, suggestions)
}

/**
 * What the new document is called.
 *
 * `<original> — <company>` when the posting has one, `<original> — tailored`
 * when it does not. The company is the useful half: an account tailoring the
 * same CV to nine wishlisted roles gets nine titles it can tell apart in
 * `/documents`, where "Backend CV (copy 4)" would be nine it cannot.
 *
 * IT DOES NOT APPEND TWICE. Tailoring a tailored CV to the same company is an
 * ordinary thing to do -- run it, read it, run it again -- and the naive
 * version produces "Backend CV — Initech — Initech" on the second pass and a
 * title bar full of one word on the fifth.
 */
export function tailoredTitle(originalTitle: string, company?: string | null): string {
  const collapse = (value: string) => value.trim().replace(/\s+/g, ' ')
  const base = collapse(originalTitle)
  const suffix = collapse(company ?? '') || 'tailored'
  const tail = ` — ${suffix}`
  if (!base) return suffix
  return base.endsWith(tail) ? base : `${base}${tail}`
}
