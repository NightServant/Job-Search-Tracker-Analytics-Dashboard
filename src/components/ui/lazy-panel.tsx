'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The placeholder a code-split panel holds until its chunk arrives.
 *
 * ONE HEIGHT, GIVEN BY THE CALLER. A lazy panel that collapses to nothing and
 * then springs open is worse than no splitting at all: the page reflows under
 * the reader's cursor, and on a grid of four charts it reflows four times. The
 * caller states the height it is reserving, so the layout is final before the
 * chunk lands.
 *
 * `role="status"` and a label, because this is a loading state a screen reader
 * should be able to hear. `aria-busy` says it is still coming.
 */
export function LazyPanel({ height = 'h-56', label }: { height?: string; label: string }) {
  return (
    <div role="status" aria-busy className={cn('w-full', height)}>
      <Skeleton className="size-full" />
      <span className="sr-only">Loading {label}</span>
    </div>
  )
}
