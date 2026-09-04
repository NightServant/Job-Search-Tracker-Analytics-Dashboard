import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup, waitFor } from '@testing-library/react'
import { useLatexCompile } from '../useLatexCompile'

afterEach(() => cleanup())

/** jsdom has no object-URL implementation; these record the calls instead. */
function stubObjectUrls() {
  const created: string[] = []
  const revoked: string[] = []
  let n = 0
  globalThis.URL.createObjectURL = vi.fn(() => {
    const url = `blob:pdf-${n++}`
    created.push(url)
    return url
  }) as unknown as typeof URL.createObjectURL
  globalThis.URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url)
  }) as unknown as typeof URL.revokeObjectURL
  return { created, revoked }
}

const pdfOk = {
  ok: true,
  status: 200,
  blob: async () => new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
}

describe('compiling LaTeX from the editor', () => {
  it('posts the source to this app, never to the compiler', async () => {
    // FORMATEX_API_KEY lives on the server. A client that called
    // api.formatex.io directly would need the key in the bundle, where anyone
    // can read it out of the network tab and spend it.
    stubObjectUrls()
    const fetchImpl = vi.fn().mockResolvedValue(pdfOk) as unknown as typeof fetch
    const { result } = renderHook(() => useLatexCompile({ fetchImpl }))

    await act(async () => {
      await result.current.compile('\\documentclass{article}')
    })

    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      '/api/latex/compile'
    )
    expect(result.current.state).toMatchObject({ status: 'ok' })
  })

  it('revokes the previous PDF on each recompile, so a session does not leak', async () => {
    // Every compile mints an object URL for the iframe. Without the revoke,
    // twenty compiles in one sitting is twenty PDFs held until the tab closes.
    const { created, revoked } = stubObjectUrls()
    const fetchImpl = vi.fn().mockResolvedValue(pdfOk) as unknown as typeof fetch
    const { result, unmount } = renderHook(() => useLatexCompile({ fetchImpl }))

    await act(async () => {
      await result.current.compile('a')
    })
    await act(async () => {
      await result.current.compile('b')
    })
    expect(created).toHaveLength(2)
    // The first is released when the second replaces it.
    expect(revoked).toContain(created[0])

    unmount()
    // And the live one goes at unmount.
    await waitFor(() => expect(revoked).toContain(created[1]))
  })

  it('tells an unconfigured deployment apart from a broken document', async () => {
    // "Set FORMATEX_API_KEY" and "fix line 42" are different problems. The
    // first is not the user's fault and must not appear in the error colour.
    stubObjectUrls()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 501,
      json: async () => ({ reason: 'unconfigured', message: 'not configured' }),
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useLatexCompile({ fetchImpl }))

    await act(async () => {
      await result.current.compile('x')
    })
    expect(result.current.state).toMatchObject({ status: 'error', unconfigured: true })
  })

  it('surfaces the TeX log rather than a generic failure', async () => {
    // The log carries the line number. Replacing it with "compilation failed"
    // throws away the only actionable part.
    stubObjectUrls()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        reason: 'compile',
        message: '! Undefined control sequence. l.42 \\badmacro',
      }),
    }) as unknown as typeof fetch
    const { result } = renderHook(() => useLatexCompile({ fetchImpl }))

    await act(async () => {
      await result.current.compile('x')
    })
    expect(result.current.state).toMatchObject({ status: 'error', unconfigured: false })
    expect(result.current.state.status === 'error' && result.current.state.message).toContain('l.42')
  })

  it('does nothing at all for an empty document', async () => {
    stubObjectUrls()
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const { result } = renderHook(() => useLatexCompile({ fetchImpl }))
    await act(async () => {
      await result.current.compile('   ')
    })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(result.current.state).toMatchObject({ status: 'idle' })
  })
})

describe('auto-compiling as the author types', () => {
  it('waits for a pause, then sends once for a burst of typing', async () => {
    // Gabe asked for automatic compilation. A naive per-keystroke version
    // would be thirty billed compiles of half-typed TeX in one sitting; the
    // debounce collapses a burst into one.
    vi.useFakeTimers()
    try {
      stubObjectUrls()
      const fetchImpl = vi.fn().mockResolvedValue(pdfOk) as unknown as typeof fetch
      const { rerender } = renderHook(
        ({ source }) => useLatexCompile({ fetchImpl, source, debounceMs: 2000 }),
        { initialProps: { source: '\\doc' } }
      )

      for (const source of ['\\docu', '\\docum', '\\document']) {
        rerender({ source })
        await act(async () => {
          vi.advanceTimersByTime(300)
        })
      }
      expect(fetchImpl).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('never re-sends text that has already been compiled', async () => {
    // An undo back to a state that already built, or a re-render with no edit,
    // must cost nothing. Without this the debounce alone would still bill for
    // every round trip through the same document.
    vi.useFakeTimers()
    try {
      stubObjectUrls()
      const fetchImpl = vi.fn().mockResolvedValue(pdfOk) as unknown as typeof fetch
      const { rerender } = renderHook(
        ({ source }) => useLatexCompile({ fetchImpl, source, debounceMs: 100 }),
        { initialProps: { source: 'A' } }
      )
      await act(async () => {
        vi.advanceTimersByTime(200)
      })
      expect(fetchImpl).toHaveBeenCalledTimes(1)

      rerender({ source: 'B' })
      await act(async () => {
        vi.advanceTimersByTime(200)
      })
      expect(fetchImpl).toHaveBeenCalledTimes(2)

      // Back to text that already compiled.
      rerender({ source: 'A' })
      await act(async () => {
        vi.advanceTimersByTime(200)
      })
      // Still 2 -- 'A' was already sent once, so it is not sent again.
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('compiles nothing at all when auto is off', async () => {
    vi.useFakeTimers()
    try {
      stubObjectUrls()
      const fetchImpl = vi.fn() as unknown as typeof fetch
      renderHook(() => useLatexCompile({ fetchImpl, source: 'x', auto: false, debounceMs: 10 }))
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not auto-compile a hook that was given no source', async () => {
    // The manual-only caller must stay manual-only.
    vi.useFakeTimers()
    try {
      stubObjectUrls()
      const fetchImpl = vi.fn() as unknown as typeof fetch
      renderHook(() => useLatexCompile({ fetchImpl }))
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })
      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
