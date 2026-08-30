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
      <h1 className="text-display-m text-text-primary">{title}</h1>
      {action}
    </div>
  )
}
