import { describe, it, expect } from 'vitest'
import { emptyCvDocument, isValidCvDocument } from '../cvSchema'

describe('emptyCvDocument', () => {
  it('creates a document with the required top-level keys', () => {
    const doc = emptyCvDocument()
    expect(Object.keys(doc).sort()).toEqual(
      ['awards', 'basics', 'education', 'projects', 'skills', 'work'].sort()
    )
  })

  it('starts every collection empty', () => {
    const doc = emptyCvDocument()
    expect(doc.work).toEqual([])
    expect(doc.education).toEqual([])
  })
})

describe('isValidCvDocument', () => {
  it('accepts an empty document', () => {
    expect(isValidCvDocument(emptyCvDocument())).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidCvDocument(null)).toBe(false)
  })

  it('rejects a document missing basics', () => {
    const doc = emptyCvDocument() as unknown as Record<string, unknown>
    delete doc.basics
    expect(isValidCvDocument(doc)).toBe(false)
  })

  it('rejects a document whose work is not an array', () => {
    const doc = { ...emptyCvDocument(), work: 'nope' }
    expect(isValidCvDocument(doc)).toBe(false)
  })
})
