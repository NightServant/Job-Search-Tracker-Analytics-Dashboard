'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CloseIcon } from '@/components/icons'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastOptions {
  type?: ToastType
  title: string
  message?: string
  durationMs?: number
}

interface ToastInternal extends Required<Omit<ToastOptions, 'type'>> {
  id: string
  type: ToastType
}

interface ToastContextValue {
  push: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crypto as any).randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getToastStyles(type: ToastType): { border: string; title: string } {
  switch (type) {
    case 'success':
      return {
        border: 'border-l-4 border-green-500',
        title: 'text-green-700 dark:text-green-300',
      }
    case 'error':
      return {
        border: 'border-l-4 border-red-500',
        title: 'text-red-700 dark:text-red-300',
      }
    case 'info':
    default:
      return {
        border: 'border-l-4 border-primary-600 dark:border-primary-500',
        title: 'text-primary-700 dark:text-primary-300',
      }
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (options: ToastOptions) => {
      const id = makeId()
      const durationMs = Math.max(1000, options.durationMs ?? 3500)
      const toast: ToastInternal = {
        id,
        type: options.type ?? 'info',
        title: options.title,
        message: options.message ?? '',
        durationMs,
      }

      setToasts((prev) => [...prev, toast])

      window.setTimeout(() => {
        remove(id)
      }, durationMs)
    },
    [remove],
  )

  const value = useMemo<ToastContextValue>(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:top-4 md:left-auto md:right-4 md:bottom-auto md:translate-x-0 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type)
          return (
            <div
              key={toast.id}
              className={`card p-4 ${styles.border}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${styles.title}`}>
                    {toast.title}
                  </p>
                  {toast.message ? (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 break-words">
                      {toast.message}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => remove(toast.id)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Dismiss"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')

  const toast = ctx.push

  return {
    toast,
    success: (title: string, message?: string, durationMs?: number) =>
      toast({ type: 'success', title, message, durationMs }),
    error: (title: string, message?: string, durationMs?: number) =>
      toast({ type: 'error', title, message, durationMs }),
    info: (title: string, message?: string, durationMs?: number) =>
      toast({ type: 'info', title, message, durationMs }),
  }
}
