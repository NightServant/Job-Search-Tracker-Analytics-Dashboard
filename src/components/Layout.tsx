'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { runtimeFlags } from '@/lib/env'
import { useState } from 'react'
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from 'next-themes'
import { useToast } from '@/contexts/ToastContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'CV Maker', href: '/cv', icon: FileText },
]

function formatBuildTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Layout({ children }: { children?: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem('sidebarCollapsed')
      return v === '1'
    } catch (e) {
      return false
    }
  })
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { user, signOut } = useAuth()
  const { resolvedTheme: theme, setTheme } = useTheme()
  const { error: showError } = useToast()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      // Sidebar and redirect are handled automatically:
      // - Sidebar closes due to UI unmount
      // - ProtectedRoute detects user === null and redirects to /login
      setSidebarOpen(false)
    } catch (error) {
      setIsSigningOut(false)
      console.error('Error signing out:', error)
      const message = error instanceof Error ? error.message : 'Failed to sign out'
      showError('Sign Out Failed', message)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-card border-r border-zinc-200 dark:border-border transform transition-all duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-full ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className={`flex items-center h-16 border-b border-zinc-200 dark:border-border ${
              sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            <button
              onClick={() => {
                const next = !sidebarCollapsed
                setSidebarCollapsed(next)
                try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0') } catch (e) {}
              }}
              className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${
                sidebarCollapsed ? 'w-full justify-center' : ''
              }`}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className={`font-semibold text-zinc-900 dark:text-white ${sidebarCollapsed ? 'hidden' : 'inline'}`}>
                Job Tracker
              </span>
            </button>
            <button
              className="lg:hidden p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-11 min-w-11"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg text-sm font-medium transition-colors min-h-11 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className={`${sidebarCollapsed ? 'hidden' : 'ml-1'}`}>{item.name}</span>
                  {/* removed active chevron; active state is indicated by background/text color only */}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'hidden' : ''}`}>
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-2 mt-2 ${sidebarCollapsed ? 'hidden' : ''}`}>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors min-h-11"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
              >
                {isSigningOut ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    Signing Out...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-white dark:bg-card border-b border-zinc-200 dark:border-border lg:hidden">
          <button
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-11 min-w-11"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-zinc-500" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-900 dark:text-white">
              Job Tracker
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}

          <footer className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
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
            <span>v{runtimeFlags.appVersion}</span>
            <span className="mx-2">·</span>
            <span>sha {__BUILD_SHA__.slice(0, 8)}</span>
            <span className="mx-2">·</span>
            <span>{formatBuildTime(__BUILD_TIME__)}</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
