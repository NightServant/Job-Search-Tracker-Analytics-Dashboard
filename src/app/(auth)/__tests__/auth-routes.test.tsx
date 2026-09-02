import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = vi.fn()
const signIn = vi.fn()
const signUp = vi.fn()
const verifySignUpOtp = vi.fn()
const resendSignUpOtp = vi.fn()
const signInWithProvider = vi.fn()
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
    verifySignUpOtp,
    resendSignUpOtp,
    signInWithProvider,
    signOut: vi.fn(),
  }),
}))

import LoginRoute from '../login/page'
import SignupRoute from '../signup/page'

beforeEach(() => {
  push.mockClear()
  signIn.mockReset()
  signUp.mockReset()
  verifySignUpOtp.mockReset()
  resendSignUpOtp.mockReset()
  signInWithProvider.mockReset()
  window.localStorage.clear()
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
  // The route now renders the three-step flow rather than a single screen, so
  // a successful signUp advances to verification -- it does NOT navigate. The
  // dashboard is reached only after the code is accepted, which is the whole
  // point of adding the step: an unverified address must not become a usable
  // session.
  async function fillDetails(email = 'a@b.test') {
    await userEvent.type(screen.getByLabelText(/^Email/), email)
    await userEvent.type(screen.getByLabelText(/^Password/), 'Str0ng!Passw0rd')
    await userEvent.type(screen.getByLabelText(/^Confirm password/), 'Str0ng!Passw0rd')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
  }

  it('creates the account and asks for the emailed code', async () => {
    signUp.mockResolvedValue(undefined)
    render(<SignupRoute />)
    await fillDetails()
    expect(signUp).toHaveBeenCalledWith('a@b.test', 'Str0ng!Passw0rd')
    expect(await screen.findByLabelText(/^Verification code/)).toBeInTheDocument()
    // Not yet: the address is unverified.
    expect(push).not.toHaveBeenCalled()
  })

  it('calls signUp, not signIn', async () => {
    // Two four-line files that differ in two identifiers is exactly the shape
    // a copy-paste gets wrong, and the wrong one still compiles.
    signUp.mockResolvedValue(undefined)
    render(<SignupRoute />)
    await fillDetails()
    expect(signUp).toHaveBeenCalled()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('reaches the dashboard only after the code is verified', async () => {
    signUp.mockResolvedValue(undefined)
    verifySignUpOtp.mockResolvedValue(undefined)
    render(<SignupRoute />)
    await fillDetails()
    await userEvent.type(await screen.findByLabelText(/^Verification code/), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify and continue' }))

    expect(verifySignUpOtp).toHaveBeenCalledWith('a@b.test', '123456')
    expect(await screen.findByText('you are all set')).toBeInTheDocument()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'), { timeout: 4000 })
  })

  it('does not advance when the signup is refused', async () => {
    signUp.mockRejectedValue(new Error('User already registered'))
    render(<SignupRoute />)
    await fillDetails()
    expect(await screen.findByText('User already registered')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Verification code/)).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })
})
