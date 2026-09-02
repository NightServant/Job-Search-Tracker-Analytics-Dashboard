import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = vi.fn()
const signIn = vi.fn()
const signUp = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signIn,
    signUp,
    signOut: vi.fn(),
  }),
}))

import LoginRoute from '../login/page'
import SignupRoute from '../signup/page'

beforeEach(() => {
  push.mockClear()
  signIn.mockReset()
  signUp.mockReset()
})

async function fill(password = 'hunter22') {
  await userEvent.type(screen.getByLabelText(/^Email/), 'a@b.test')
  await userEvent.type(screen.getByLabelText(/^Password/), password)
}

describe('the /login route', () => {
  it('signs in and sends the user to the dashboard', async () => {
    signIn.mockResolvedValue(undefined)
    render(<LoginRoute />)
    await fill()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(signIn).toHaveBeenCalledWith('a@b.test', 'hunter22')
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('does not navigate when the sign-in is refused', async () => {
    // The redirect lives inside the resolved path only. Navigating on a
    // rejection is how the old single-screen version lost a form.
    signIn.mockRejectedValue(new Error('Invalid login credentials'))
    render(<LoginRoute />)
    await fill('wrong-one')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})

describe('the /signup route', () => {
  it('creates the account and sends the user to the dashboard', async () => {
    signUp.mockResolvedValue(undefined)
    render(<SignupRoute />)
    await fill()
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(signUp).toHaveBeenCalledWith('a@b.test', 'hunter22')
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('calls signUp, not signIn', async () => {
    // Two four-line files that differ in two identifiers is exactly the shape
    // a copy-paste gets wrong, and the wrong one still compiles.
    signUp.mockResolvedValue(undefined)
    render(<SignupRoute />)
    await fill()
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(signUp).toHaveBeenCalled()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('does not navigate when the signup is refused', async () => {
    signUp.mockRejectedValue(new Error('User already registered'))
    render(<SignupRoute />)
    await fill()
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('User already registered')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
