import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

describe('lucide-react is fully removed', () => {
  // The custom 34-icon set (src/components/icons) is the single icon
  // vocabulary. Gate on IMPORTS, not the bare package name, so that
  // documenting the decision in a docblock (theme-toggle.tsx) is not itself a
  // gate failure -- that would penalise the comment that exists specifically
  // to stop the dependency coming back. Filtering in JS (rather than a single
  // shell regex) sidesteps a shell-quoting trap: a pattern matching both `'`
  // and `"` cannot itself be embedded in either quote style without escaping
  // that is easy to get subtly wrong.
  it('has no lucide-react imports anywhere in src', () => {
    const raw = execSync('grep -rn "lucide-react" src || true', { encoding: 'utf8' }).trim()
    const lines = raw ? raw.split('\n') : []
    const importLines = lines.filter((line) => {
      const afterColon = line.replace(/^[^:]+:\d+:/, '')
      return (
        /\bfrom\s+['"]lucide-react['"]/.test(afterColon) ||
        /\brequire\(\s*['"]lucide-react['"]\s*\)/.test(afterColon)
      )
    })
    expect(importLines).toEqual([])
  })

  it('does not list lucide-react as a dependency', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(pkg.dependencies).not.toHaveProperty('lucide-react')
    expect(pkg.devDependencies).not.toHaveProperty('lucide-react')
  })
})
