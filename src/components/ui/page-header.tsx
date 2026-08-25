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
 * prop because the four screens don't agree on what belongs there: an "Add"
 * button, a "+ new cv" button, a date-range picker, and here, nothing at all.
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  action?: React.ReactNode
}

export function PageHeader({ title, action, className, ...props }: PageHeaderProps) {
  return (
    <div
      data-body-header
      className={cn('flex items-center justify-between gap-4', className)}
      {...props}
    >
      <h1 className="text-heading-l text-text-primary">{title}</h1>
      {action}
    </div>
  )
}
