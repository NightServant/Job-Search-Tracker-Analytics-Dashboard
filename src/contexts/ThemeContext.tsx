import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }

    return 'light'
  })

  useEffect(() => {
    const root = window.document.documentElement
    const body = window.document.body
    const resolvedTheme = theme

    // Match shadcn's class-based approach and keep native form controls aligned.
    root.style.colorScheme = resolvedTheme
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    const disableTransitions = window.document.createElement('style')
    disableTransitions.appendChild(
      window.document.createTextNode(
        `*, *::before, *::after { transition: none !important; }`
      )
    )
    window.document.head.appendChild(disableTransitions)
    window.requestAnimationFrame(() => {
      disableTransitions.remove()
    })

    localStorage.setItem('theme', theme)

    // Keep the page background transition smooth once the theme settles.
    body.style.colorScheme = resolvedTheme
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
