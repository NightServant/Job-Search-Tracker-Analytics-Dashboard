import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Briefcase, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from 'next-themes'
import { hasValidSupabaseConfig } from '@/lib/supabase'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const { resolvedTheme: theme } = useTheme()
  const navigate = useNavigate()

  const hasSupabaseConfig = hasValidSupabaseConfig

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      navigate('/dashboard')
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'An error occurred'
      const lowered = raw.toLowerCase()
      if (lowered.includes('failed to fetch')) {
        setError('Could not reach the authentication server. Check your internet connection and Supabase URL in .env.local.')
      } else if (lowered.includes('supabase is not configured') || lowered.includes('set vite_supabase_url')) {
        setError('Authentication is not configured for localhost yet. Add real Supabase values to .env.local and restart the dev server.')
      } else {
        setError(raw)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 dark:bg-primary-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Job Search Tracker</span>
        </div>
        
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Track Your Job Search Journey
          </h1>
          <p className="text-lg text-primary-100">
            Organize applications, visualize your progress, and land your dream job
            with data-driven insights.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">100%</div>
            <div className="text-sm text-primary-200">Free to use</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">∞</div>
            <div className="text-sm text-primary-200">Unlimited jobs</div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background text-foreground">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-white">
              Job Search Tracker
            </span>
          </div>

          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            {isLogin
              ? 'Sign in to continue tracking your job applications'
              : 'Start organizing your job search today'}
          </p>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-6 text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError(null)
              }}
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {import.meta.env.DEV && !hasSupabaseConfig && (
            <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
              <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                <strong>Demo Mode:</strong> Configure Supabase credentials in{' '}
                <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded">
                  .env.local
                </code>{' '}
                to enable authentication.
              </p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
            Made by{' '}
            <a
              href="https://github.com/Ensues"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              @Ensues
            </a>
            <span className="mx-2">·</span>
            <a
              href="https://github.com/Ensues/Job-Search-Tracker-Analytics-Dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              Source
            </a>
            <span className="mx-2">·</span>
            <a
              href="https://github.com/Ensues/Job-Search-Tracker-Analytics-Dashboard/issues"
              target="_blank"
              rel="noreferrer"
              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
            >
              Report a bug
            </a>
            <span className="mx-2">·</span>
            <span>v{__APP_VERSION__}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
