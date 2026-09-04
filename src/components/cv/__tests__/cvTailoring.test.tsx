import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { useCvTailoring, TailoringTargetRail, TailoringAnalysisRail } from '../CvTailoring'
import { makeJob } from '@/test/fixtures'
import { chooseOption } from '@/test/select'

afterEach(() => cleanup())

const JOBS = [
  makeJob({
    id: 'j1',
    status: 'applied',
    company: 'Initech',
    role: 'Frontend Engineer',
    description: 'We need React, TypeScript and Postgres experience.',
  }),
  makeJob({ id: 'j2', status: 'applied', company: 'Globex', role: 'Backend Engineer', description: null }),
]

/** Both rails over one shared state, the way the editor mounts them. */
function Harness({ cvText, fetchImpl }: { cvText: string; fetchImpl?: typeof fetch }) {
  const state = useCvTailoring({ cvText, jobs: JOBS, fetchImpl })
  return (
    <>
      <TailoringTargetRail state={state} jobs={JOBS} />
      <TailoringAnalysisRail state={state} />
    </>
  )
}

describe('the tailoring rails', () => {
  it('scores nothing until there is a posting to score against', () => {
    render(<Harness cvText="React and TypeScript developer." />)
    expect(screen.getByText(/pick an application or paste a posting/i)).toBeTruthy()
  })

  it('scores the CV against the selected application', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Harness cvText="React and TypeScript developer." />)

    await chooseOption(user, screen.getByLabelText(/application/i), /Frontend Engineer/)
    // A real percentage from the deterministic scorer, not a model's opinion.
    expect(await screen.findByText(/%$/)).toBeTruthy()
    expect(screen.getByText(/missing keywords/i)).toBeTruthy()
  })

  it('lets a pasted posting win over a selected one, and says so', async () => {
    // Pasting is the more recent, more deliberate act. A stale selection
    // silently overriding what somebody just typed is the confusing outcome,
    // and two filled controls with no stated precedence is the confusing UI --
    // so the rail states which one is in effect.
    const user = userEvent.setup({ delay: null })
    render(<Harness cvText="Go and Kubernetes engineer." />)

    await chooseOption(user, screen.getByLabelText(/application/i), /Frontend Engineer/)
    await user.type(screen.getByLabelText(/paste a posting/i), 'We need Go and Kubernetes.')

    expect(await screen.findByText(/using the pasted posting/i)).toBeTruthy()
  })

  it('says when the chosen application has no description stored', async () => {
    // Otherwise the rail sits blank and reads as broken, when the real answer
    // is that there is nothing on that application to score against.
    const user = userEvent.setup({ delay: null })
    render(<Harness cvText="anything" />)
    await chooseOption(user, screen.getByLabelText(/application/i), /Backend Engineer/)
    expect(await screen.findByText(/no job description saved/i)).toBeTruthy()
  })

  it('cannot be run without a posting', () => {
    render(<Harness cvText="React developer" />)
    expect(screen.getByRole('button', { name: /tailor this cv/i })).toBeDisabled()
  })

  it('goes through the app route, never straight at the provider', async () => {
    // The API key lives on the server. A rail that called the provider
    // directly would need the key in the browser, where anyone can read it
    // out of the network tab and spend it.
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, summary: null, suggestions: [] }),
    }) as unknown as typeof fetch
    const user = userEvent.setup({ delay: null })
    render(<Harness cvText="React developer" fetchImpl={fetchImpl} />)

    await chooseOption(user, screen.getByLabelText(/application/i), /Frontend Engineer/)
    await user.click(screen.getByRole('button', { name: /tailor this cv/i }))

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/api/tailor')
  })

  it('sends the deterministic missing keywords, so the model is told rather than guessing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, summary: null, suggestions: [] }),
    }) as unknown as typeof fetch
    const user = userEvent.setup({ delay: null })
    render(<Harness cvText="React developer" fetchImpl={fetchImpl} />)

    await chooseOption(user, screen.getByLabelText(/application/i), /Frontend Engineer/)
    await user.click(screen.getByRole('button', { name: /tailor this cv/i }))

    await waitFor(() => expect(fetchImpl).toHaveBeenCalled())
    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    )
    expect(Array.isArray(body.missingKeywords)).toBe(true)
    expect(body.role).toBe('Frontend Engineer')
    expect(body.company).toBe('Initech')
  })

  it('renders a suggestion with its before, after and reason -- and applies nothing on its own', async () => {
    // A tool that silently rewrote someone's employment history would be
    // producing a claim they have to defend in an interview. Every suggestion
    // is a proposal with an explicit control.
    const onApply = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        summary: null,
        suggestions: [
          { section: 'summary', before: 'old line', after: 'new line', rationale: 'matches posting' },
        ],
      }),
    }) as unknown as typeof fetch

    function Applying() {
      const state = useCvTailoring({ cvText: 'React developer', jobs: JOBS, fetchImpl })
      return (
        <>
          <TailoringTargetRail state={state} jobs={JOBS} />
          <TailoringAnalysisRail state={state} onApply={onApply} />
        </>
      )
    }

    const user = userEvent.setup({ delay: null })
    render(<Applying />)
    await chooseOption(user, screen.getByLabelText(/application/i), /Frontend Engineer/)
    await user.click(screen.getByRole('button', { name: /tailor this cv/i }))

    expect(await screen.findByText('new line')).toBeTruthy()
    expect(screen.getByText('old line')).toBeTruthy()
    expect(screen.getByText('matches posting')).toBeTruthy()
    // Nothing happened until the user asked.
    expect(onApply).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /apply/i }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('reports an unconfigured integration quietly, not as an error', async () => {
    // Nothing is broken -- the capability was never set up. Shouting about it
    // in the error colour would say the app failed.
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: false,
        reason: 'unconfigured',
        message: 'AI tailoring is not configured.',
      }),
    }) as unknown as typeof fetch
    const user = userEvent.setup({ delay: null })
    render(<Harness cvText="React developer" fetchImpl={fetchImpl} />)

    await chooseOption(user, screen.getByLabelText(/application/i), /Frontend Engineer/)
    await user.click(screen.getByRole('button', { name: /tailor this cv/i }))

    const notice = await screen.findByRole('alert')
    expect(notice.textContent).toMatch(/not configured/i)
    expect(notice.className).toContain('text-text-muted')
    expect(notice.className).not.toContain('rejected')
  })
})
