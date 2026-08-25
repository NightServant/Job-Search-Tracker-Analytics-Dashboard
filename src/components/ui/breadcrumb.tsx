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
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)} {...props}>
      <ol className="flex items-center gap-2 text-body-s">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {last || !item.href ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'text-text-primary' : 'text-text-muted'}
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
              {!last && <ArrowRightIcon size={14} className="text-text-muted" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
