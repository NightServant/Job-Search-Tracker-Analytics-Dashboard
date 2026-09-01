import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The strip every authenticated screen's body opens with: a title and an
 * optional action on the trailing edge.
 *
 * Four screens need this exact shape -- Dashboard, Applications, Documents,
 * Analytics -- and the roadmap's explicit goal is that they read as one
 * screen wearing four different data sets, not four screens that happen to
 * agree by coincidence. `action` is a generic slot rather than a typed button
 * Display/M (28px), not Heading/L. Overview rendered its own h1 at Display/M
 * while every other screen went through this component at 20px, so six pages
 * disagreed about how big a page title is. Figma's frames are Display/M, so
 * this component moved rather than Overview.
 *
 * prop because the four screens don't agree on what belongs there: an "Add"
 * button, a "+ new cv" button, a date-range picker, and here, nothing at all.
 *
 * `description` is one lowercase line under the title, saying what the screen
 * is for. It sits BELOW the title/action row rather than inside it, so a long
 * sentence never squeezes the action off the trailing edge, and it is a
 * sibling of the h1 rather than part of it -- a heading's accessible name
 * should be the page's name, not the name plus a sentence of prose.
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  /** One lowercase line saying what this screen is for. */
  description?: React.ReactNode
  action?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div data-body-header className={cn('flex flex-col gap-1', className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-display-m text-text-primary">{title}</h1>
        {action}
      </div>
      {description ? (
        <p data-page-description className="max-w-prose text-body-s text-text-muted">
          {description}
        </p>
      ) : null}
    </div>
  )
}
