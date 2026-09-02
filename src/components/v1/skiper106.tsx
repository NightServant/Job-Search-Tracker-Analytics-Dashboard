'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import React, { type ComponentPropsWithoutRef, useEffect, useRef, useState } from 'react'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'

/**
 * Skiper UI's "Smooth caret input" (skiper106), vendored via the shadcn
 * registry and then edited heavily to this project. M6 Task 4.
 *
 * ATTRIBUTION IS A LICENCE OBLIGATION, NOT A COURTESY. Skiper UI's free tier
 * requires crediting Skiper UI, and the registry copies source in-tree rather
 * than installing a package, so the obligation attaches to THIS FILE. The
 * credit sentence lives in SKIPER_ATTRIBUTION in src/lib/attribution.ts and is
 * asserted verbatim against README.md by a test. Do not delete this file
 * without also removing its entry there.
 *
 * WHAT IT DOES: hides the native caret and draws its own, springing it to the
 * position of the text cursor so it glides between characters instead of
 * jumping. The width of the text before the caret is measured with a hidden
 * span that mirrors the input's computed font.
 *
 * Six edits, each one a thing that would have broken this app:
 *
 * 1. dialkit REMOVED, and this is the important one. Its hook is a live-tweak
 *    control panel, and it does not merely display values -- it RETURNS them,
 *    and the vendor read type, placeholder, font size and spring config from
 *    the panel rather than from props. An email field would
 *    have taken its `type` and `placeholder` from a developer tool, and a
 *    visitor could have switched it to a password field from a GUI. Props are
 *    authoritative again; the dependency is uninstalled.
 * 2. The password glyph was computed from the user agent string in a
 *    TOP-LEVEL CONST. That global does not exist on the server, so importing
 *    this file anywhere in a Next app threw during render before any component
 *    mounted. It is now read inside a function, called after mount.
 * 3. The vendor's own `Input` export is gone. No literal module collision --
 *    ours is @/components/ui/input -- but two components called Input in one
 *    codebase is how the wrong one gets imported six months from now.
 * 4. framer-motion -> motion/react. The registry installs framer-motion beside
 *    the `motion` package this repo already has: the same library under its
 *    old name.
 * 5. useReducedMotion -> the app's own usePrefersReducedMotion, so there is one
 *    motion subscription in the codebase rather than two implementations that
 *    can disagree.
 * 6. Retokened. bg-muted2 and outline-muted3 do not exist in this system, and
 *    the vendor's 16px corner radius is four times the cap. The wrapper now carries no chrome at all --
 *    the field's border, background and focus ring come from the caller, which
 *    is what lets this sit inside the app's own Field/Input language rather
 *    than beside it.
 */

/**
 * The bullet a password field renders per character.
 *
 * Firefox draws U+25CF, everything else U+2022, and the measuring span has to
 * use the same one or the caret lands short on a masked field. Read inside the
 * component rather than at module scope -- see edit 2.
 */
function passwordChar(): string {
  if (typeof navigator === 'undefined') return '•'
  return /firefox|fxios/i.test(navigator.userAgent) ? '●' : '•'
}

type SmoothInputType = 'text' | 'password'

export type SmoothInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  type?: SmoothInputType
  /** Classes for the element wrapping the input, where the caret is drawn. */
  wrapperClassName?: string
}

const SmoothInput = ({
  className,
  wrapperClassName,
  value,
  defaultValue,
  onChange,
  onBlur,
  type = 'text',
  ...props
}: SmoothInputProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const caretX = useMotionValue(0)
  const caretOpacity = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  const isControlled = value !== undefined
  const inputValue = isControlled ? String(value) : internalValue

  // Under reduced motion the caret still moves -- it has to, it is a caret --
  // but it snaps rather than glides. A spring is the thing being opted out of.
  const springCaretX = useSpring(
    caretX,
    prefersReducedMotion
      ? { stiffness: 10000, damping: 100, mass: 0.1 }
      : { stiffness: 500, damping: 30, mass: 0.5 }
  )

  const syncMeasureSpan = () => {
    const input = inputRef.current
    const measureSpan = measureRef.current
    if (!input || !measureSpan) return

    const styles = window.getComputedStyle(input)
    const isPassword = input.type === 'password'

    let fontSize = styles.fontSize
    if (
      passwordChar() === '•' &&
      isPassword &&
      !navigator.userAgent.match(/chrome|chromium|crios/i)
    ) {
      fontSize = `${parseFloat(fontSize) + 6.25}px`
    }

    measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize} ${styles.fontFamily}`
    measureSpan.style.letterSpacing = styles.letterSpacing
    measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings
    measureSpan.style.fontVariationSettings = styles.fontVariationSettings
  }

  const measurePrefixWidth = (text: string) => {
    const input = inputRef.current
    const measureSpan = measureRef.current
    if (!input || !measureSpan) return null

    syncMeasureSpan()
    measureSpan.textContent = text

    const paddingLeft = parseFloat(window.getComputedStyle(input).paddingLeft) || 0
    return text.length > 0 ? measureSpan.offsetWidth + paddingLeft : paddingLeft - 1
  }

  const scrollCaretIntoView = (target: HTMLInputElement, absoluteWidth: number) => {
    const styles = window.getComputedStyle(target)
    const paddingLeft = parseFloat(styles.paddingLeft) || 0
    const paddingRight = parseFloat(styles.paddingRight) || 0
    const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth)
    const visibleRight = target.scrollLeft + target.clientWidth - paddingRight
    const visibleLeft = target.scrollLeft + paddingLeft

    if (absoluteWidth > visibleRight) {
      target.scrollLeft = Math.min(absoluteWidth - target.clientWidth + paddingRight, maxScroll)
      return
    }
    if (absoluteWidth < visibleLeft) {
      target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft)
    }
  }

  const getCaretIndex = (target: HTMLInputElement) => {
    const selectionStart = target.selectionStart ?? 0
    const selectionEnd = target.selectionEnd ?? 0
    if (selectionStart === selectionEnd) return selectionStart
    return target.selectionDirection === 'backward' ? selectionStart : selectionEnd
  }

  const updateCaretFromInput = (target: HTMLInputElement) => {
    const selectionStart = target.selectionStart ?? 0
    const selectionEnd = target.selectionEnd ?? 0
    const hasSelection = selectionStart !== selectionEnd
    const caretIndex = getCaretIndex(target)
    const isPassword = target.type === 'password'
    const textBeforeCaret = isPassword
      ? passwordChar().repeat(caretIndex)
      : target.value.slice(0, caretIndex)

    const absoluteWidth = measurePrefixWidth(textBeforeCaret)
    if (absoluteWidth === null) return

    scrollCaretIntoView(target, absoluteWidth)

    const styles = window.getComputedStyle(target)
    const paddingLeft = parseFloat(styles.paddingLeft) || 0
    const paddingRight = parseFloat(styles.paddingRight) || 0
    const caretPosition = absoluteWidth - target.scrollLeft
    const minX = paddingLeft - 1
    const maxX = target.clientWidth - paddingRight
    const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1

    caretX.set(Math.min(caretPosition, maxX))

    if (!isCaretVisible || hasSelection) {
      caretOpacity.set(0)
      return
    }
    caretOpacity.set(1)
  }

  const updateCaretRef = useRef(updateCaretFromInput)
  updateCaretRef.current = updateCaretFromInput
  const caretOpacityRef = useRef(caretOpacity)
  caretOpacityRef.current = caretOpacity

  useEffect(() => {
    const input = inputRef.current
    if (input && document.activeElement === input) {
      updateCaretRef.current(input)
    }
  }, [inputValue, type])

  useEffect(() => {
    const input = inputRef.current
    const container = containerRef.current
    if (!input || !container) return

    const updateCaretIfFocused = () => {
      if (document.activeElement === input) updateCaretRef.current(input)
    }

    const handleSelectionChange = () => {
      if (document.activeElement !== input) return
      requestAnimationFrame(() => {
        if (document.activeElement === input) updateCaretRef.current(input)
      })
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    input.addEventListener('scroll', updateCaretIfFocused)

    // document.fonts is absent in jsdom and in older Safari; a metric change
    // after a webfont swaps in only matters where it exists.
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    fonts?.addEventListener('loadingdone', updateCaretIfFocused)
    void fonts?.ready.then(updateCaretIfFocused)

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateCaretIfFocused)
    resizeObserver?.observe(container)

    updateCaretIfFocused()

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      input.removeEventListener('scroll', updateCaretIfFocused)
      fonts?.removeEventListener('loadingdone', updateCaretIfFocused)
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <div className={cn('relative w-full', wrapperClassName)}>
      <div
        ref={containerRef}
        className="relative grid grid-cols-1"
        style={{ caretColor: 'transparent' }}
      >
        <input
          {...props}
          ref={inputRef}
          type={type}
          className={cn(
            'col-start-1 col-end-2 row-start-1 row-end-2 w-full bg-transparent text-inherit outline-none',
            className
          )}
          value={inputValue}
          onChange={(e) => {
            if (!isControlled) setInternalValue(e.target.value)
            onChange?.(e)
            requestAnimationFrame(() => updateCaretRef.current(e.target))
          }}
          onBlur={(e) => {
            caretOpacityRef.current.set(0)
            onBlur?.(e)
          }}
        />
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre"
        />
        <motion.div
          aria-hidden
          className="pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 h-[1.1em] w-0.5 self-center bg-accent-default"
          style={{ x: springCaretX, opacity: caretOpacity }}
        />
      </div>
    </div>
  )
}

export { SmoothInput }

/**
 * Skiper 106 Smooth caret input — React
 * https://skiper-ui.com/components
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 */
