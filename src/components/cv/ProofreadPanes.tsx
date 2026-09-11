'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { PanelSection } from '@/components/ui/panel-section'
import { CssSpinner } from '@/components/ui/css-spinner'
import type { GrammarIssue } from '@/services/grammar'
import type { ProofreadState } from './useProofread'

/**
 * The Spell Check and Grammar Check panes, following Word's Editor pane.
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

/**
 * ONE FLAGGED WORD, following the reference's spelling card.
 *
 * The word, what it is being replaced with, and the three ways out: take it,
 * skip this one, skip every one. The heading says "not in dictionary" as the
 * reference does, because that is the accurate description of what a spell
 * checker knows -- it has not found a mistake, it has failed to find the word.
 */
function SpellingCard({
  issue,
  source,
  state,
}: {
  issue: GrammarIssue
  source: string
  state: ProofreadState
}) {
  const word = source.slice(issue.start, issue.end)

  return (
    <li
      data-finding="spelling"
      className="flex min-h-[9rem] flex-col gap-3 rounded-[4px] border border-border-subtle bg-bg-canvas p-3"
    >
      <div className="flex flex-col gap-1">
        <span className="text-label-caps uppercase text-text-muted">not in dictionary</span>
        <span
          className="text-body-l text-text-primary underline decoration-status-rejected-mark decoration-wavy underline-offset-4"
          lang="en"
        >
          {word || '(blank)'}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-label-caps uppercase text-text-secondary">suggestions</span>
        {issue.replacements.length > 0 ? (
          // EVERY ALTERNATIVE, as the reference shows -- taking one applies
          // that one, not the first. Buttons rather than a list with a
          // separate Apply: the suggestion IS the control.
          <ul className="flex flex-col items-start gap-1">
            {issue.replacements.map((replacement) => (
              <li key={replacement}>
                <button
                  type="button"
                  onClick={() => state.apply(issue, replacement)}
                  className="rounded-[4px] border border-border-default bg-bg-canvas px-2 py-1 text-body-m text-text-primary transition-colors hover:border-accent-default hover:text-accent-default active:scale-[0.99]"
                >
                  <ReplacementLabel value={replacement} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-s text-text-muted">
            no alternative offered — the word is simply not in the dictionary.
          </p>
        )}
        {issue.message && <p className="text-body-s text-text-muted">{issue.message}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="s" onClick={() => state.ignore(issue)}>
          ignore once
        </Button>
        <Button variant="ghost" size="s" onClick={() => state.ignoreAll(issue)}>
          ignore everywhere
        </Button>
      </div>
    </li>
  )
}

export function SpellCheckPane({ state }: { state: ProofreadState }) {
  return (
    // A MINIMUM HEIGHT so the pane holds its shape before a check has run and
    // when a check comes back clean. Without it the rail collapsed to the
    // height of one button and the column read as broken rather than empty.
    <div className="flex min-h-[24rem] flex-col gap-6" data-pane="spelling">
      <PanelSection title="spell check" icon="Check" className="border-t-0 pt-0">
        <div className="flex flex-col gap-4">
          <RunButton state={state} />
          <Unavailable state={state} />

          {state.ran && state.spelling.length === 0 && !state.error && (
            <p className="text-body-s text-text-muted">
              no spelling problems found.
            </p>
          )}

          {state.spelling.length > 0 && (
            <ul className="flex flex-col gap-2">
              {state.spelling.map((issue, index) => (
                <SpellingCard
                  key={`${issue.start}-${index}`}
                  issue={issue}
                  source={state.text}
                  state={state}
                />
              ))}
            </ul>
          )}

          {state.ignored.size > 0 && (
            <p className="border-t border-border-subtle pt-3 text-body-s text-text-muted">
              {state.ignored.size} word{state.ignored.size === 1 ? '' : 's'} ignored for this
              session. this is not saved to a dictionary.
            </p>
          )}

          <p className="text-body-s text-text-muted">English (United States)</p>
        </div>
      </PanelSection>
    </div>
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
  const original = source.slice(issue.start, issue.end)

  return (
    <li
      data-finding="grammar"
      className="flex min-h-[8rem] flex-col gap-2 rounded-[4px] border border-border-subtle bg-bg-canvas p-3"
    >
      <p className="text-body-s text-text-muted line-through decoration-text-muted/40">
        {original || '(insertion)'}
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

export function GrammarCheckPane({ state }: { state: ProofreadState }) {
  const { score } = state

  return (
    // See SpellCheckPane: a floor, so the rail keeps its shape when there is
    // nothing to report yet.
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
          <CountRow label="spelling" count={score.spelling} />
          <CountRow label="grammar" count={score.grammar} />
        </div>
      </PanelSection>

      {/* REAL SINCE LANGUAGETOOL: style-tagged findings are the reference's
          Refinements. They are counted separately and weighted lower in the
          score, because a redundant phrase is a preference and a misspelling
          is a mistake. */}
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
    </div>
  )
}
