import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const getSnapshotsMock = vi.hoisted(() => vi.fn())
const deleteSnapshotMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/resumeSnapshotService', () => ({
  getSnapshots: getSnapshotsMock,
  getSnapshot: vi.fn(),
  deleteSnapshot: deleteSnapshotMock,
  createSnapshot: vi.fn(),
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import { ResumeVersionHistory } from '../ResumeVersionHistory'

function open() {
  render(<ResumeVersionHistory resumeId="cv-1" userId="user-1" onRestore={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /versions/i }))
}

beforeEach(() => {
  vi.clearAllMocks()
  deleteSnapshotMock.mockResolvedValue(undefined)
})
afterEach(() => cleanup())

describe('the editor version panel names versions the way the database does', () => {
  it('labels a snapshot with its stored version, not its position in the list', async () => {
    // The list is capped at ten and the oldest are pruned, so position and
    // version diverge permanently the first time a CV passes ten snapshots.
    // Labelling by position made /documents say "v12" and this panel say
    // "Version 10" about the same row.
    getSnapshotsMock.mockResolvedValue([
      { id: 's-12', resume_id: 'cv-1', version: 12, created_at: '2026-08-20T10:00:00.000Z' },
      { id: 's-11', resume_id: 'cv-1', version: 11, created_at: '2026-08-19T10:00:00.000Z' },
      { id: 's-10', resume_id: 'cv-1', version: 10, created_at: '2026-08-18T10:00:00.000Z' },
    ])
    open()
    await waitFor(() => expect(screen.getByText(/v11/)).toBeTruthy())
    expect(screen.getByText(/v12/)).toBeTruthy()
    expect(screen.getByText(/v10/)).toBeTruthy()
    expect(screen.queryByText(/Version 3/)).toBeNull()
    expect(screen.queryByText(/Version 2/)).toBeNull()
  })

  it('still marks the newest one as the version you are already on', async () => {
    getSnapshotsMock.mockResolvedValue([
      { id: 's-2', resume_id: 'cv-1', version: 2, created_at: '2026-08-20T10:00:00.000Z' },
      { id: 's-1', resume_id: 'cv-1', version: 1, created_at: '2026-08-19T10:00:00.000Z' },
    ])
    open()
    await waitFor(() => expect(screen.getByText(/latest/i)).toBeTruthy())
    expect(screen.getByText(/latest/i).textContent).toContain('v2')
    // Restoring the version you are already on is a no-op that overwrites.
    const restores = screen.getAllByRole('button', { name: /restore/i }) as HTMLButtonElement[]
    expect(restores[0].disabled).toBe(true)
    expect(restores[1].disabled).toBe(false)
  })

  it('says a pre-backfill snapshot is unnumbered rather than inventing a number for it', async () => {
    getSnapshotsMock.mockResolvedValue([
      { id: 's-old', resume_id: 'cv-1', version: null, created_at: '2026-08-01T10:00:00.000Z' },
    ])
    open()
    await waitFor(() => expect(screen.getByText(/unnumbered/i)).toBeTruthy())
  })

  it('says so plainly when a CV has never been snapshotted', async () => {
    getSnapshotsMock.mockResolvedValue([])
    open()
    await waitFor(() => expect(screen.getByText(/no versions yet/i)).toBeTruthy())
  })
})

describe('deleting a snapshot', () => {
  // Task 4 (M5.5): window.confirm here is the same defect class as the
  // dialogs Gabe asked back for -- unstyled, unthemeable, untestable without
  // stubbing a global.
  it('confirms before deleting, and does not delete on Cancel', async () => {
    getSnapshotsMock.mockResolvedValue([
      { id: 's-2', resume_id: 'cv-1', version: 2, created_at: '2026-08-20T10:00:00.000Z' },
      { id: 's-1', resume_id: 'cv-1', version: 1, created_at: '2026-08-19T10:00:00.000Z' },
    ])
    const user = userEvent.setup()
    open()
    await waitFor(() => expect(screen.getByText(/v2/)).toBeTruthy())

    await user.click(screen.getAllByRole('button', { name: /remove this version/i })[0])
    expect(screen.getByRole('alertdialog', { name: /delete this version/i })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'cancel' }))
    expect(deleteSnapshotMock).not.toHaveBeenCalled()
  })

  it('deletes the named snapshot once the confirm is accepted', async () => {
    getSnapshotsMock.mockResolvedValue([
      { id: 's-2', resume_id: 'cv-1', version: 2, created_at: '2026-08-20T10:00:00.000Z' },
      { id: 's-1', resume_id: 'cv-1', version: 1, created_at: '2026-08-19T10:00:00.000Z' },
    ])
    const user = userEvent.setup()
    open()
    await waitFor(() => expect(screen.getByText(/v1/)).toBeTruthy())

    await user.click(screen.getAllByRole('button', { name: /remove this version/i })[1])
    await user.click(screen.getByRole('button', { name: 'delete' }))
    await waitFor(() => expect(deleteSnapshotMock).toHaveBeenCalledWith('s-1', 'user-1'))
  })
})
