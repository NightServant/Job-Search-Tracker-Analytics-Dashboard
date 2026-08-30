'use client'

import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * The 200ms gate the Figma motion spec requires (node 43:523: "Shows after
 * 200ms, so fast loads never flash"). Every cached react-query read on this
 * app resolves well inside that, so without the gate a navigation between two
 * warm screens paints a full fake page for one frame.
 */
export function DelayedSkeleton({
  delayMs = 200,
  children,
}: {
  delayMs?: number
  children: React.ReactNode
}) {
  const [shown, setShown] = React.useState(false)
  React.useEffect(() => {
    const id = window.setTimeout(() => setShown(true), delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs])
  return shown ? <>{children}</> : null
}

function Bar({ className }: { className?: string }) {
  return <Skeleton data-skeleton className={cn('h-4 w-full', className)} />
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Bar key={i} className={i === rows - 1 ? 'w-2/3' : undefined} />
      ))}
    </div>
  )
}

export type RouteSkeletonVariant = 'dashboard' | 'list' | 'table' | 'detail' | 'analytics'

/**
 * Route-level replacement for RouteLoading's centred spinner. The shapes are
 * deliberately different per route: a skeleton whose job is to tell you what is
 * about to arrive stops doing that job the moment it is the same grey rectangle
 * on every screen.
 */
export function RouteSkeleton({ variant }: { variant: RouteSkeletonVariant }) {
  return (
    <DelayedSkeleton>
      <div role="status" aria-busy="true" className="flex flex-col gap-8">
        <span className="sr-only">Loading</span>
        {variant === 'dashboard' && (
          <>
            <Bar className="h-8 w-64" />
            <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
              {Array.from({ length: 5 }, (_, i) => <Bar key={i} className="h-16" />)}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[460fr_300fr_280fr]">
              <Bar className="h-80" /><Bar className="h-80" /><Bar className="h-80" />
            </div>
          </>
        )}
        {variant === 'list' && (
          <>
            <Bar className="h-8 w-48" />
            {Array.from({ length: 6 }, (_, i) => <Bar key={i} className="h-12" />)}
          </>
        )}
        {variant === 'table' && (
          <>
            <Bar className="h-8 w-48" />
            <Bar className="h-6" />
            {Array.from({ length: 8 }, (_, i) => <Bar key={i} className="h-10" />)}
          </>
        )}
        {variant === 'detail' && (
          <>
            <Bar className="h-5 w-40" />
            <Bar className="h-8 w-72" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Bar className="h-48" /><Bar className="h-48" />
            </div>
          </>
        )}
        {variant === 'analytics' && (
          <>
            <Bar className="h-8 w-48" />
            {Array.from({ length: 4 }, (_, i) => <Bar key={i} className="h-40" />)}
          </>
        )}
      </div>
    </DelayedSkeleton>
  )
}
