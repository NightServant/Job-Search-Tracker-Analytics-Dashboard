import { readFileSync, readdirSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * shadcn source is copied into the tree, so it becomes ours the moment it
 * lands -- including its defaults, which contradict three of this project's
 * stated constraints. With 62 components these rules are checked mechanically
 * because "remember to edit the file after `shadcn add`" is not a process.
 *
 * The dependency grep is @base-ui, NOT @radix-ui. components.json sets
 * `style: base-nova`, which is a Base UI style; a @radix-ui grep would have
 * passed on every commit while asserting nothing.
 */
const UI_DIR = 'src/components/ui'

function uiFiles(): string[] {
  return readdirSync(UI_DIR).filter((f) => f.endsWith('.tsx'))
}

function read(file: string): string {
  return readFileSync(`${UI_DIR}/${file}`, 'utf8')
}

/**
 * A circle is not a rounded rectangle. The 4px cap governs corners on
 * rectangles; every file below draws something genuinely circular (an avatar, a
 * radio, a slider handle, a switch thumb, a carousel control) or a capsule
 * thinner than 8px, where `rounded-full` resolves to 2px anyway (a scrollbar
 * thumb, a drag handle, a progress track). Each carries a comment at the top of
 * the file saying which. Allowlisted by file rather than by weakening the
 * regex, so a `rounded-full` on a twelfth component still fails -- as it did
 * for `bubble.tsx`, whose reaction badge is a text pill and was rewritten.
 */
const ROUNDED_FULL_ALLOWED = new Set([
  'avatar.tsx', 'carousel.tsx', 'css-spinner.tsx', 'drawer.tsx', 'message.tsx',
  'progress.tsx', 'questionnaire.tsx', 'radio-group.tsx', 'scroll-area.tsx',
  'slider.tsx', 'switch.tsx',
])

describe('the installed component set', () => {
  it('is the whole catalogue minus the one item with no source', () => {
    // 63 registry:ui items; `form` ships no files under base-nova. Six more are
    // declined in favour of M4's own primitives (Step 1), and `field`,
    // `sidebar` and `spinner` land under second names.
    const present = new Set(uiFiles().map((f) => f.replace(/\.tsx$/, '')))
    const mustExist = [
      'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'attachment', 'avatar',
      'badge', 'bubble', 'button-group', 'calendar', 'card', 'carousel', 'chart',
      'checkbox', 'collapsible', 'combobox', 'command', 'context-menu', 'dialog',
      'direction', 'drawer', 'dropdown-menu', 'empty', 'hover-card', 'input-group',
      'input-otp', 'item', 'kbd', 'label', 'marker', 'menubar', 'message',
      'message-scroller', 'native-select', 'navigation-menu', 'pagination',
      'popover', 'progress', 'questionnaire', 'radio-group', 'resizable',
      'scroll-area', 'separator', 'sheet', 'skeleton', 'slider',
      'sonner', 'spinner', 'switch', 'table', 'tabs', 'toast', 'toggle',
      'toggle-group', 'tooltip', 'shadcn-field', 'shadcn-sidebar',
    ]
    for (const name of mustExist) {
      expect(present, `src/components/ui/${name}.tsx is missing`).toContain(name)
    }
  })

  it('keeps the M4 primitives that were deliberately not replaced', () => {
    // Positive companion: an install that overwrote button/input/select would
    // satisfy every rule below while destroying the design system.
    const present = new Set(uiFiles().map((f) => f.replace(/\.tsx$/, '')))
    for (const name of [
      'button', 'input', 'textarea', 'select', 'breadcrumb', 'field', 'sidebar', 'css-spinner',
    ]) {
      expect(present, `${name}.tsx was overwritten or lost`).toContain(name)
    }
    expect(read('button.tsx'), "button.tsx is no longer M4's").toContain('data-variant')
    expect(read('input.tsx'), 'input.tsx lost PasswordInput').toContain('PasswordInput')
    // sidebar.tsx is the app's navigation, not a layout primitive kit. Gabe's
    // commits eb9d784 and 8e69406 edited this exact file; shadcn's `sidebar`
    // lands as shadcn-sidebar.tsx so it cannot silently revert them.
    expect(read('sidebar.tsx'), 'sidebar.tsx is no longer the app navigation').toContain('export const NAV')
    expect(read('sidebar.tsx'), 'a second sign-out control came back into the sidebar').not.toContain('signOut')
  })

  it('imports no icons from lucide-react', () => {
    // AnimateIcons inlines its path data and does not depend on lucide, so the
    // ban survives Gabe's icon-library decision. This narrows the failure to
    // the file that reintroduced it; noLucide.test.ts greps all of src.
    for (const file of uiFiles()) {
      expect(read(file), `${file} imports from lucide-react`).not.toMatch(
        /from\s+['"]lucide-react['"]/
      )
    }
  })

  it('leaves no unresolved IconPlaceholder', () => {
    // base-nova ships <IconPlaceholder lucide=... tabler=... /> rather than a
    // real import. iconLibrary is "@/components/icons", which the shim has no
    // key for, so the CLI cannot resolve it and the component will not compile.
    for (const file of uiFiles()) {
      const src = read(file)
      expect(src, `${file} still contains an unresolved IconPlaceholder`).not.toContain(
        'IconPlaceholder'
      )
      expect(src, `${file} still imports from the registry's internal app path`).not.toContain(
        '@/app/(create)'
      )
      expect(src, `${file} still imports from the registry's own source tree`).not.toContain(
        '@/registry/'
      )
    }
  })

  it('respects the 4px radius cap', () => {
    // --radius: 4px makes rounded-lg 4px, but xl/2xl/3xl/full exceed the cap
    // regardless of the variable.
    for (const file of uiFiles()) {
      // Matches the directional and numbered forms too. The plan's original
      // regex was /\brounded-(xl|2xl|3xl|full)\b/, which missed `rounded-t-xl`
      // (card, drawer, dialog, alert-dialog) and `rounded-4xl` (badge) -- five
      // real violations that would have shipped past a green gate.
      const pattern = ROUNDED_FULL_ALLOWED.has(file)
        ? /(?<![\w-])rounded(-[trbles]{1,2})?-(xl|[0-9]+xl)(?![\w-])/
        : /(?<![\w-])rounded(-[trbles]{1,2})?-(xl|[0-9]+xl|full)(?![\w-])/
      expect(read(file), `${file} uses a radius above the 4px cap`).not.toMatch(pattern)
    }
  })

  it('does not use bg-accent, whose meaning collides with the design system', () => {
    // shadcn's `accent` is a hover surface; this project's `accent` is orange.
    for (const file of uiFiles()) {
      const src = read(file)
      // The trailing lookahead matters: /\bbg-accent\b/ also matches
      // `bg-accent-default`, which is this design system's OWN orange token and
      // is correct everywhere it appears. Only the bare shadcn name is banned.
      expect(src, `${file} uses bg-accent`).not.toMatch(/\bbg-accent(?![\w-])/)
      expect(src, `${file} uses text-accent-foreground`).not.toMatch(/\btext-accent-foreground(?![\w-])/)
    }
  })

  it('carries no drop shadows', () => {
    // Separation is hairline rules. Dialog, popover, sheet, drawer, hover-card,
    // menubar, context-menu and dropdown-menu all ship shadows by default.
    for (const file of uiFiles()) {
      expect(read(file), `${file} has a shadow utility`).not.toMatch(
        /\bshadow-(sm|md|lg|xl|2xl)\b/
      )
    }
  })

  it('lists every third-party package it imports', () => {
    // A component whose peer failed to install fails at build time, not at test
    // time. base-nova pulls @base-ui/react, not @radix-ui.
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
    const declared = { ...pkg.dependencies, ...pkg.devDependencies }
    const bare = new Set<string>()
    for (const file of uiFiles()) {
      for (const m of read(file).matchAll(/from\s+['"]([^'".][^'"]*)['"]/g)) {
        const spec = m[1]
        if (spec.startsWith('@/') || spec.startsWith('.')) continue
        bare.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])
      }
    }
    // Positive companion: prove the scan found something before asserting on it.
    expect(bare.has('@base-ui/react'), 'no @base-ui import found -- did the install run?').toBe(true)
    for (const dep of bare) {
      if (dep === 'react' || dep === 'react-dom') continue
      expect(declared, `${dep} is imported but not in package.json`).toHaveProperty(dep)
    }
  })
})
