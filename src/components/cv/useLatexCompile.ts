'use client'

import * as React from 'react'

/**
 * FNV-1a over the source, so the already-compiled check costs a number per
 * document rather than a copy of it. Collisions would mean a skipped compile,
 * which the explicit button always overrides -- and at 32 bits across eight
 * entries the odds are not worth guarding against.
 */
function hashSource(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export type CompileState =
  | { status: 'idle' }
  | { status: 'compiling' }
  | { status: 'ok'; url: string }
  | { status: 'error'; message: string; unconfigured: boolean }

/**
 * Compiles LaTeX to a PDF through this app's own route.
 *
 * AUTO-COMPILE, ON GABE'S INSTRUCTION (2026-09-05), with three brakes.
 *
 * I had built this manual-only to protect the FormaTeX quota: a naive debounce
 * on a document somebody is actively editing is twenty or thirty compiles a
 * sitting, most of them of half-typed TeX that was never going to build. He
 * asked for automatic, so it is automatic -- but the brakes are what keep that
 * from being the same thing as wasteful:
 *
 *   1. A 2s idle debounce, so a burst of typing is one compile, not thirty.
 *   2. Every source already sent is remembered (by hash, capped at eight), so
 *      returning to text that already compiled -- an undo, a paste-and-revert,
 *      a re-render with no edit -- sends nothing.
 *   3. No overlap: while one compile is in flight the timer does not start
 *      another. A slow build cannot pile up behind itself.
 *
 * `compile()` stays exported for the explicit button, which bypasses the
 * debounce for someone who wants the result now.
 *
 * THE BLOB URL IS REVOKED. Each compile creates an object URL for the iframe;
 * without the cleanup, every compile in a session leaks a PDF (tens of KB
 * each) until the tab closes.
 */
export function useLatexCompile(options?: {
  fetchImpl?: typeof fetch
  /** The live document. Passing it turns on auto-compile. */
  source?: string
  /** Idle time before an automatic compile. */
  debounceMs?: number
  /** Off switch, for a deployment with no compiler configured. */
  auto?: boolean
}) {
  const [state, setState] = React.useState<CompileState>({ status: 'idle' })

  // Held in a ref as well as in state: the cleanup effect must revoke the URL
  // that is live at unmount, and reading it from state there would capture
  // whichever value the effect closed over instead.
  const urlRef = React.useRef<string | null>(null)
  const replaceUrl = React.useCallback((next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = next
  }, [])

  React.useEffect(() => () => replaceUrl(null), [replaceUrl])

  const compile = React.useCallback(
    async (latex: string) => {
      if (!latex.trim()) return
      setState({ status: 'compiling' })
      const doFetch = options?.fetchImpl ?? fetch
      try {
        const response = await doFetch('/api/latex/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latex }),
        })

        if (!response.ok) {
          // 501 is "never configured", which is not a failure the user caused
          // and must not be shown in the error colour.
          const body = (await response.json().catch(() => null)) as
            | { message?: string; reason?: string }
            | null
          setState({
            status: 'error',
            message: body?.message ?? `Compilation failed (${response.status}).`,
            unconfigured: response.status === 501 || body?.reason === 'unconfigured',
          })
          return
        }

        const url = URL.createObjectURL(await response.blob())
        replaceUrl(url)
        setState({ status: 'ok', url })
      } catch {
        setState({
          status: 'error',
          message: 'Could not reach the compiler.',
          unconfigured: false,
        })
      }
    },
    [options?.fetchImpl, replaceUrl]
  )

  // EVERY SOURCE ALREADY SENT, not just the last one.
  //
  // The first version held a single `lastSent` string, and its comment claimed
  // an undo back to compiled text cost nothing. It did not: typing A, then B,
  // then undoing to A compiled A twice, because only B was remembered. The
  // test caught it.
  //
  // Hashes, not the documents themselves -- a CV is tens of KB and holding
  // eight copies to avoid a network call is the wrong trade. Capped at eight,
  // which covers the undo depth anyone reaches for mid-edit; past that a
  // recompile is the correct outcome anyway.
  const sentHashes = React.useRef<number[]>([])
  const compiling = state.status === 'compiling'

  const auto = options?.auto ?? true
  const source = options?.source
  const debounceMs = options?.debounceMs ?? 2000

  React.useEffect(() => {
    if (!auto || source === undefined) return
    const trimmed = source.trim()
    if (!trimmed) return
    if (sentHashes.current.includes(hashSource(source)) || compiling) return

    const timer = setTimeout(() => {
      const hash = hashSource(source)
      sentHashes.current = [hash, ...sentHashes.current.filter((h) => h !== hash)].slice(0, 8)
      void compile(source)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [auto, source, debounceMs, compiling, compile])

  return { state, compile }
}
