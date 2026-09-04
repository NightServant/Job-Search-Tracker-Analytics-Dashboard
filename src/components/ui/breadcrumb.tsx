import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowRightIcon } from '@/components/icons'

/**
 * The trail above a page title.
 *
 * The last crumb is the current page, so it is text rather than a link and
 * carries `aria-current="page"`. A link to where you already are is a dead
 * control that still takes a tab stop.
 */
export interface Crumb {
  label: string
  href?: string
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: Crumb[]
}

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex min-w-0 items-center', className)} {...props}>
      <ol className="flex min-w-0 items-center gap-2 text-body-s">
        {items.map((item, i) => {
          const last = i === items.length - 1
          // THE LAST CRUMB TRUNCATES, the others do not. A trail reads
          // "documents / word / <this document>": the first two are short
          // fixed words, the last is a user-supplied filename that can run to
          // eighty characters. Truncating the whole row would eat the path;
          // truncating the leaf keeps every ancestor legible and clickable,
          // which is the part a breadcrumb is actually for. `title` carries
          // the full text, so what the ellipsis hides stays reachable.
          return (
            <li key={`${item.label}-${i}`} className={cn('flex items-center gap-2', last && 'min-w-0')}>
              {last || !item.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  title={last ? item.label : undefined}
                  className={cn(
                    last ? 'block min-w-0 truncate text-text-primary' : 'text-text-muted'
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-text-muted hover:text-text-primary hover:underline"
                >
                  {item.label}
                </Link>
              )}
              {!last && <ArrowRightIcon size={14} className="shrink-0 text-text-muted" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
