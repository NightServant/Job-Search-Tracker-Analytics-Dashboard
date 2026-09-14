import { describe, it, expect } from 'vitest'
import {
  asDocumentTab,
  DEFAULT_DOCUMENT_TAB,
  DOCUMENT_TABS,
  tabById,
  type DocumentTabId,
} from '../documentTabs'

/**
 * Which panes each kind of document gets, and what happens to a remembered tab
 * that the open document does not have.
 *
 * THE SECOND HALF IS THE REAL BUG. The selected tab is stored under one key for
 * both editors (see `WordResumeEditor` for why), so somebody who leaves a CV on
 * `tailor` and then opens a cover letter restores a tab that is not in that
 * rail: a tablist selecting nothing, above a pane holding nothing, with no
 * error anywhere to explain it. It is the kind of defect that only appears on
 * the second visit, which is exactly the kind a unit test is for.
 */

const idsOf = (kind: 'word' | 'cover_letter'): DocumentTabId[] =>
  DOCUMENT_TABS[kind].map((tab) => tab.id)

describe('the document tab sets', () => {
  it('leaves a CV exactly as it was: grammar, then tailoring', () => {
    expect(idsOf('word')).toEqual(['grammar', 'tailor'])
  })

  it('gives a cover letter the letter check in place of tailoring', () => {
    // A letter is not scored against a posting -- there is no keyword
    // inventory to match and nothing a rewrite would tailor that the letter
    // does not already say on purpose. See documentTabs' docblock.
    expect(idsOf('cover_letter')).toEqual(['grammar', 'suggestions'])
    expect(idsOf('cover_letter')).not.toContain('tailor')
  })

  it('shares one grammar tab rather than describing it twice', () => {
    // Not pedantry: two copies is two places for the label, the hint and the
    // icon to drift, and the rail, the pane switch and the compact fallback
    // all read them.
    expect(DOCUMENT_TABS.word[0]).toBe(DOCUMENT_TABS.cover_letter[0])
  })

  it('starts both kinds on a pane that works with nothing else set up', () => {
    for (const kind of ['word', 'cover_letter'] as const) {
      expect(idsOf(kind)[0]).toBe(DEFAULT_DOCUMENT_TAB)
      expect(DOCUMENT_TABS[kind].find((tab) => tab.id === DEFAULT_DOCUMENT_TAB)?.needsApplication)
        .toBe(false)
    }
  })

  it('only ever marks a tab as needing an application where one exists', () => {
    // `needsApplication` drives the rail's "needs an application" hint. On a
    // cover letter there is no application to pick, so the hint would be an
    // instruction with nothing to follow it.
    expect(DOCUMENT_TABS.cover_letter.some((tab) => tab.needsApplication)).toBe(false)
  })

  it('resolves a tab by id whichever kind it belongs to', () => {
    expect(tabById('suggestions').label).toBe('letter check')
    expect(tabById('tailor').needsApplication).toBe(true)
  })
})

describe('restoring a remembered tab', () => {
  it('keeps a CV on the tab it was left on', () => {
    expect(asDocumentTab('tailor', 'word')).toBe('tailor')
    expect(asDocumentTab('grammar', 'word')).toBe('grammar')
  })

  it('does not strand a cover letter on the CV-only tailor pane', () => {
    expect(asDocumentTab('tailor', 'cover_letter')).toBe(DEFAULT_DOCUMENT_TAB)
  })

  it('does not strand a CV on the letter-only suggestions pane either', () => {
    // The same bug in the other direction, which is the one it is easy to
    // forget: the coercion is about what the OPEN document has, not about
    // which tab is newer.
    expect(asDocumentTab('suggestions', 'word')).toBe(DEFAULT_DOCUMENT_TAB)
    expect(asDocumentTab('suggestions', 'cover_letter')).toBe('suggestions')
  })

  it('falls back for anything a previous version of the app wrote', () => {
    for (const stored of ['spelling', '', null, undefined, 42, {}]) {
      expect(asDocumentTab(stored, 'word')).toBe(DEFAULT_DOCUMENT_TAB)
      expect(asDocumentTab(stored, 'cover_letter')).toBe(DEFAULT_DOCUMENT_TAB)
    }
  })
})
