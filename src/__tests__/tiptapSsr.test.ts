import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * Gabe hit this live: "Tiptap Error: SSR has been detected, please set
 * `immediatelyRender` explicitly to `false`... Application error: a
 * client-side exception has occurred" on the `/cv?draft=new` path, in
 * `@tiptap/react` ^3.22.5. `WordResumeEditor` is `'use client'`, but that
 * does not exempt it -- App Router still server-renders a client component
 * for its initial HTML, and `/cv` is statically prerendered, so `useEditor`
 * genuinely runs on the server without this option.
 *
 * jsdom does not perform an SSR pass, so no render-based test in this suite
 * can reproduce the crash -- which is exactly why the route's 27 existing
 * tests never caught it. This greps the source for the option at every
 * `useEditor` call site instead: a real, falsifiable check (delete the
 * option and this goes red), but it only proves the option is present in
 * source, not that Tiptap actually honours it at runtime or that no other
 * SSR-unsafe pattern exists. That gap is deliberate scope, not an oversight
 * -- see `docs/superpowers/plans/2026-08-29-m5.5-shadcn-remediation.md`
 * Task 4's note on assertions that cannot fail.
 */
describe('tiptap useEditor is SSR-safe', () => {
  it('every useEditor call site in src passes immediatelyRender: false', () => {
    const raw = execSync('grep -rln "useEditor(" src --include="*.tsx" || true', {
      encoding: 'utf8',
    }).trim()
    const files = raw ? raw.split('\n') : []
    // Positive companion: proves the grep actually found the known call site
    // rather than this test vacuously passing over an empty file list.
    expect(files).toContain('src/components/cv/WordResumeEditor.tsx')

    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      const start = src.indexOf('useEditor(')
      const call = src.slice(start, start + 1200)
      expect(call, `${file} calls useEditor without immediatelyRender: false`).toMatch(
        /immediatelyRender:\s*false/
      )
    }
  })
})
