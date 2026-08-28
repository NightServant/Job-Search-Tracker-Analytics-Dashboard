import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobCard } from '../job-card'

describe('JobCard', () => {
  it('renders the figure in the currency it is passed, never a default', () => {
    // currency used to default to 'USD'. A default is exactly the inference
    // the Global Constraint forbids -- a PHP job rendered through a call site
    // that forgot the prop would show a dollar sign on a peso figure.
    render(
      <JobCard company="Grab" role="Engineer" status="applied" salaryMin={100000} currency="PHP" />
    )
    expect(screen.getByText(/₱100,000/)).toBeTruthy()
    expect(screen.queryByText(/\$/)).toBeNull()
  })
})
