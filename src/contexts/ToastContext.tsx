'use client'

import * as React from 'react'
import { toast as sonner } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastOptions {
  type?: ToastType
  title: string
  message?: string
  durationMs?: number
}

/**
 * The app's toasts, on sonner (M5.5 Item 6).
 *
 * `useToast()` keeps the exact shape it always had -- `toast`, `success`,
 * `error`, `info`, each taking `(title, message?, durationMs?)` -- so all nine
 * call sites are untouched. What changed is everything underneath.
 *
 * What this replaces, and why each part mattered:
 *
 * - `className="card p-4"`. `card` is the LEGACY v3 utility (`rounded-xl` plus
 *   `shadow-sm`), living in the block of `index.css` marked "delete with the
 *   last old screen". So every toast in the app was drawing a 12px radius and
 *   a shadow, in a system whose radius caps at 4px and which separates with
 *   hairline rules.
 * - Severity in raw palette colours: `green-500`, `red-500`, and `primary-600`
 *   -- the pre-M4 indigo -- rather than tokens. The indigo one is the tell:
 *   an info toast was painting a colour the design system no longer contains.
 * - `role="status"` on every toast, errors included. `status` is a polite live
 *   region: a screen reader queues it until the user is idle. A failed save
 *   announced politely can arrive long after the user has moved on. Errors are
 *   `role="alert"` now, which is assertive; success and info stay polite.
 * - A bare `setTimeout` removal with no exit transition, so toasts vanished
 *   between frames.
 *
 * Motion follows Figma's motion row 43:559: 160ms in, 100ms out. The rule
 * there reads "Out is faster than in. Always." -- a leaving element should not
 * hold attention it no longer needs. Those durations are set in `index.css`
 * against sonner's own `[data-sonner-toast]` states, since sonner owns the
 * animation; reduced motion is handled there too rather than with a second
 * `matchMedia` read in JS.
 *
 * Severity reads as a 2px rule in the status colour, not a filled card and not
 * a glyph -- the same Status Marker vocabulary the rest of the app uses. Note
 * `sonner.tsx` deliberately ships no `error` icon: base-nova wanted lucide's
 * octagon and the 542-icon set has no octagon, so rather than substitute a
 * different shape and invent a severity vocabulary, severity stays on the rule.
 */
const TONE: Record<ToastType, string> = {
  success: 'border-l-2 border-l-status-offer-mark',
  error: 'border-l-2 border-l-status-rejected-mark',
  info: 'border-l-2 border-l-accent-default',
}

/**
 * Errors are mirrored into a dedicated assertive live region.
 *
 * sonner renders ONE `<section aria-live="polite">` wrapping the whole
 * toaster, with no per-toast politeness -- verified against the rendered DOM,
 * not assumed. Polite means a screen reader queues the announcement until the
 * user is idle, so a failed save can arrive long after they have moved on.
 * That is the same defect the hand-rolled toast had with `role="status"`, and
 * swapping renderers did not fix it.
 *
 * Making the whole region assertive would be worse: every success and info
 * toast would then interrupt whatever the user was reading. So errors -- and
 * only errors -- are also written into a small visually-hidden assertive
 * region. The visible toast is unchanged; this is purely what gets announced.
 */
type ErrorListener = (text: string) => void
const errorListeners = new Set<ErrorListener>()

function announceError(text: string) {
  for (const listener of errorListeners) listener(text)
}

function show({ type = 'info', title, message, durationMs }: ToastOptions) {
  const options = {
    description: message,
    duration: Math.max(1000, durationMs ?? 3500),
    className: TONE[type],
  }
  if (type === 'success') return sonner.success(title, options)
  if (type === 'error') {
    announceError(message ? `${title}. ${message}` : title)
    return sonner.error(title, options)
  }
  return sonner.info(title, options)
}

/**
 * Kept as a provider component so `app/providers.tsx` and every test that
 * wraps in it carry on working. sonner needs no React context -- `toast()` is
 * a module-level call -- so this only mounts the `<Toaster />` the toasts
 * render into. Without that mount they would be raised and never drawn.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = React.useState({ text: '', seq: 0 })

  React.useEffect(() => {
    const listener: ErrorListener = (text) => {
      // The seq bump remounts the region via `key`, so two identical errors in
      // a row are two announcements. Setting the same string on the same node
      // is a no-op a screen reader ignores -- and "your save failed" twice
      // means it failed twice.
      setAlert((prev) => ({ text, seq: prev.seq + 1 }))
    }
    errorListeners.add(listener)
    return () => {
      errorListeners.delete(listener)
    }
  }, [])

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{ classNames: { toast: 'cn-toast' } }}
      />
      <div
        key={alert.seq}
        data-toast-alerts
        role="alert"
        aria-live="assertive"
        className="sr-only"
      >
        {alert.text}
      </div>
    </>
  )
}

export function useToast() {
  return React.useMemo(
    () => ({
      toast: show,
      success: (title: string, message?: string, durationMs?: number) =>
        show({ type: 'success', title, message, durationMs }),
      error: (title: string, message?: string, durationMs?: number) =>
        show({ type: 'error', title, message, durationMs }),
      info: (title: string, message?: string, durationMs?: number) =>
        show({ type: 'info', title, message, durationMs }),
    }),
    []
  )
}
