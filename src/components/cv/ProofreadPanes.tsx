'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { PanelSection } from '@/components/ui/panel-section'
import { CssSpinner } from '@/components/ui/css-spinner'
import { contextOf, type GrammarIssue } from '@/services/grammar'
import type { ProofreadState } from './useProofread'
import type { ThesaurusState } from './useThesaurus'

/**
 * The Spell Check and Grammar Check panes, following Word's Editor pane.
 *
 * SPELL CHECK IS GONE AND THIS PANE ABSORBED WHAT WAS WORTH KEEPING (Gabe,
 * 2026-09-11). Spelling produced 26 findings on a real CV, two thirds of them
 * proper nouns LanguageTool has no dictionary for; whitespace findings offered
 * a suggestion that was literally a space. Both are filtered at the service
 * boundary now, so this pane shows grammar and style and nothing else.
 *
 * WHAT "ENHANCED" MEANT IN PRACTICE: every finding now carries the SENTENCE it
 * sits in, with the flagged span marked inside it. "Agreement error" over a
 * bare fragment tells you something is wrong but not whether the checker has
 * understood you -- and that matters more once spelling is gone, because what
 * is left is grammar, where the false positives are subtler and the
 * surrounding words are how you spot one.
 *
 * BOTH REFERENCE FEATURES ARE REAL SINCE LANGUAGETOOL REPLACED GRAMMARBOT,
 * which is worth recording because the pane was written twice:
 *
 *   THE SUGGESTION LIST holds every alternative the service returns, as Word's
 *   does. GrammarBot returned exactly one replacement per error, so the list
 *   could only ever have had a single row and the reference layout would have
 *   been a lie about the data.
 *
 *   THE REFINEMENTS BLOCK is populated. Word shows clarity, conciseness and
 *   formality; LanguageTool tags REDUNDANCY, STYLE and TYPOGRAPHY rules with
 *   `issueType: style`, so that section counts findings that exist rather than
 *   inventing numbers to fill a shape.
 *
 * STILL LABELLED FOR WHAT IT DOES: Word's "Add to Dictionary" is "ignore
 * everywhere" here, because a `useState` Set is not a dictionary and dressing
 * one up as saved would lose somebody's words on reload. See useProofread.
 *
 * THE SCORE IS DERIVED, NOT FETCHED, from correction and refinement density
 * against word count -- the same two inputs Word uses. `proofreadScore`
 * documents the floor and why style weighs less.
 *
 * ONE ISSUE AT A TIME, BY DESIGN. Applying a correction invalidates every
 * offset after it, so the list empties on accept and the pane asks for a
 * re-check. Presenting a stale list as actionable is how a batch "fix all"
 * would corrupt a CV.
 */

/**
 * A replacement, made visible.
 *
 * THE BUG THIS FIXES was on screen: "Possible typo: you repeated a whitespace"
 * offered a suggestion button that rendered as an EMPTY WHITE BOX, because the
 * replacement really is a single space and a space has no glyph. An empty
 * control is not a control -- there was no way to tell what taking it would do,
 * or that it was a button at all.
 *
 * So whitespace is shown as a middle dot, and the empty string is shown as the
 * deletion it actually is. Both get a word alongside, because "·" alone is not
 * much better than nothing.
 */
function ReplacementLabel({ value }: { value: string }) {
  if (value === '') return <>delete this</>
  if (value.trim() === '') {
    const dots = '·'.repeat(Math.max(1, value.length))
    return (
      <>
        <span className="font-mono text-text-muted">{dots}</span>
        <span className="ml-1.5 text-text-muted">
          {value.length === 1 ? 'single space' : `${value.length} spaces`}
        </span>
      </>
    )
  }
  return <>{value}</>
}

/** A count against a rule, never a filled pill. */
function CountRow({
  label,
  count,
  muted = false,
}: {
  label: string
  count: number
  muted?: boolean
}) {
  const clean = count === 0
  return (
    <div className="flex items-center justify-between border-b border-border-subtle py-2.5 last:border-b-0">
      <span className={muted ? 'text-body-m text-text-muted' : 'text-body-m text-text-secondary'}>
        {label}
      </span>
      {clean ? (
        // A tick, matching the reference's "nothing to fix" state.
        <span className="text-body-s text-status-offer-mark" aria-label={`${label}: none`}>
          ✓
        </span>
      ) : (
        <span className="text-body-m tabular-nums text-text-primary">{count}</span>
      )}
    </div>
  )
}

function RunButton({ state }: { state: ProofreadState }) {
  return (
    <Button
      variant="primary"
      size="s"
      onClick={() => void state.run()}
      disabled={state.running}
      className="w-fit"
    >
      {state.running ? (
        <>
          <CssSpinner size={14} />
          checking
        </>
      ) : state.ran ? (
        're-check'
      ) : (
        'check document'
      )}
    </Button>
  )
}

function Unavailable({ state }: { state: ProofreadState }) {
  if (!state.error) return null
  return (
    <p role="alert" className="text-body-s text-status-rejected-mark">
      {state.error}
    </p>
  )
}

/** ONE GRAMMAR FINDING: the correction and why, with the same three exits. */
function GrammarCard({
  issue,
  source,
  state,
}: {
  issue: GrammarIssue
  source: string
  state: ProofreadState
}) {
  const context = contextOf(source, issue)

  return (
    <li
      data-finding="grammar"
      className="flex min-h-[8rem] flex-col gap-2 rounded-[4px] border border-border-subtle bg-bg-canvas p-3"
    >
      {/* THE SENTENCE, with the flagged span marked inside it. A fragment on
          its own cannot be judged; this is how you tell a real error from the
          checker misreading you. */}
      <p className="text-body-s leading-[1.6] text-text-muted">
        {context.before}
        <span className="bg-status-rejected-mark/15 text-text-primary underline decoration-status-rejected-mark decoration-wavy underline-offset-2">
          {context.flagged || '·'}
        </span>
        {context.after}
      </p>
      {issue.message && <p className="text-body-m text-text-primary">{issue.message}</p>}
      {issue.replacements.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-2 pt-1">
          {issue.replacements.map((replacement) => (
            <li key={replacement}>
              <Button variant="secondary" size="s" onClick={() => state.apply(issue, replacement)}>
                <ReplacementLabel value={replacement} />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-s text-text-muted">no automatic fix offered.</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="ghost" size="s" onClick={() => state.ignore(issue)}>
          ignore
        </Button>
      </div>
    </li>
  )
}

/**
 * Synonyms for the word under the caret, over Datamuse.
 *
 * WORD PUTS A THESAURUS IN ITS REVIEW TAB and this pane had nothing like it,
 * which mattered more once spelling was removed: what is left is grammar and
 * style, and "find a better verb" is the single most common thing a person
 * does to a CV. Gabe asked for more free, open APIs -- this is the one of four
 * probed that was both keyless and CORS-open, and the only one whose answers
 * were usable. See `services/thesaurus` for why the other three were not.
 *
 * IT ONLY APPEARS WHEN IT HAS SOMETHING TO SAY. A permanent empty panel
 * reading "select a word" is a line of instruction occupying a rail; an
 * absence is quieter and says the same thing.
 */
function ThesaurusPanel({ state }: { state: ThesaurusState }) {
  if (!state.word) return null

  return (
    <PanelSection title="synonyms" icon="Search">
      <div className="flex flex-col gap-2">
        <p className="text-body-s text-text-muted">
          for <span className="text-text-primary">{state.word}</span>
        </p>

        {state.loading && <p className="text-body-s text-text-muted">looking up…</p>}

        {!state.loading && state.empty && (
          <p className="text-body-s text-text-muted">nothing found for that word.</p>
        )}

        {state.synonyms.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {state.synonyms.map((synonym) => (
              <li key={synonym.word}>
                <button
                  type="button"
                  onClick={() => state.apply(synonym.word)}
                  title={`replace with ${synonym.word}`}
                  className="rounded-[4px] border border-border-default bg-bg-canvas px-2 py-1 text-body-s text-text-primary transition-colors hover:border-accent-default hover:text-accent-default active:scale-[0.98]"
                >
                  {synonym.word}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelSection>
  )
}

export function GrammarCheckPane({
  state,
  thesaurus,
}: {
  state: ProofreadState
  thesaurus?: ThesaurusState
}) {
  const { score } = state

  return (
    // A MINIMUM HEIGHT so the rail holds its shape before a check has run and
    // when one comes back clean, rather than collapsing to one button.
    <div className="flex min-h-[24rem] flex-col gap-6" data-pane="grammar">
      <PanelSection title="editor score" icon="Pencil" className="border-t-0 pt-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-display-s tabular-nums text-text-primary">
              {state.ran ? `${score.value}%` : '—'}
            </span>
            <span className="text-body-s text-text-muted">
              {state.ran ? `${score.words} words` : 'not checked yet'}
            </span>
          </div>

          {/* A rule that fills, not a bar in a box: the design system draws
              progress as a line rather than a container. */}
          <div
            className="h-[2px] w-full bg-border-subtle"
            role="progressbar"
            aria-valuenow={state.ran ? score.value : 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="editor score"
          >
            <div
              className="h-full bg-accent-default transition-[width] duration-(--duration-slow)"
              style={{ width: `${state.ran ? score.value : 0}%` }}
            />
          </div>

          <RunButton state={state} />
          <Unavailable state={state} />
        </div>
      </PanelSection>

      <PanelSection title="corrections" icon="AlertCircle">
        <div className="flex flex-col">
          <CountRow label="grammar" count={score.grammar} />
        </div>
      </PanelSection>

      {/* REAL SINCE LANGUAGETOOL: style-tagged findings are the reference's
          Refinements. They are counted separately and weighted lower in the
          score, because a redundant phrase is a preference and an agreement
          error is a mistake. */}
      <PanelSection title="refinements" icon="Info">
        <div className="flex flex-col">
          <CountRow label="style and redundancy" count={score.style} />
        </div>
        {state.style.length > 0 && (
          <ul className="flex flex-col gap-2 pt-2">
            {state.style.map((issue, index) => (
              <GrammarCard
                key={`${issue.start}-${index}`}
                issue={issue}
                source={state.text}
                state={state}
              />
            ))}
          </ul>
        )}
      </PanelSection>

      {state.grammar.length > 0 && (
        <PanelSection title="findings" icon="Info">
          <ul className="flex flex-col gap-2">
            {state.grammar.map((issue, index) => (
              <GrammarCard
                key={`${issue.start}-${index}`}
                issue={issue}
                source={state.text}
                state={state}
              />
            ))}
          </ul>
        </PanelSection>
      )}

      {state.ran && state.grammar.length === 0 && !state.error && (
        <p className="text-body-s text-text-muted">no grammar problems found.</p>
      )}

      {thesaurus && <ThesaurusPanel state={thesaurus} />}
    </div>
  )
}
