import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JobCard from '../JobCard'
import { Job } from '@/types'

const job: Job = {
  id: 'job-1',
  user_id: 'user-1',
  company: 'Acme',
  role: 'Frontend Engineer',
  salary_min: null,
  salary_max: null,
  url: null,
  status: 'applied',
  date_applied: null,
  notes: null,
  contact_name: null,
  contact_email: null,
  contact_linkedin: null,
  contact_notes: null,
  location: null,
  work_mode: null,
  source: null,
  is_referral: false,
  tags: [],
  tech_stack: [],
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
}

describe('JobCard compact mode', () => {
  it('renders a dedicated drag handle and keeps menu actions separate', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onStatusChange = vi.fn()

    render(
      <JobCard
        job={job}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        compact
        dragHandleProps={{}}
      />
    )

    expect(screen.getByLabelText('Drag job')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /more actions/i }))
    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(onEdit).toHaveBeenCalledWith(job)
    expect(onDelete).not.toHaveBeenCalled()
  })
})
