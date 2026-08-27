'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { JobCard } from '@/components/ui/job-card'
import { KanbanColumn } from '@/components/ui/kanban-column'
import { STATUSES } from '@/components/ui/status-marker'
import { IconButton } from '@/components/ui/icon-button'
import { GripVerticalIcon, TrashIcon } from '@/components/icons'
import type { Job, JobStatus } from '@/types'

const COLUMN_TITLES: Record<JobStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

function Card({
  job,
  onEdit,
  onDelete,
}: {
  job: Job
  onEdit?: (job: Job) => void
  onDelete?: (job: Job) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: { status: job.status },
  })

  return (
    <div
      ref={setNodeRef}
      data-testid="kanban-card"
      style={{ transform: CSS.Transform.toString(transform) }}
      className={cn('relative', isDragging && 'opacity-40')}
    >
      <Link
        href={`/applications/${job.id}`}
        className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
      >
        <JobCard
          company={job.company}
          role={job.role}
          status={job.status}
          salaryMin={job.salary_min}
          salaryMax={job.salary_max}
          currency={job.salary_currency}
          className="pr-11"
        />
      </Link>
      <div className="absolute right-1 top-1 flex flex-col gap-1">
        <IconButton
          aria-label={`Drag ${job.role} at ${job.company} to another column`}
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon size={16} aria-hidden />
        </IconButton>
        {onEdit && (
          <IconButton
            aria-label={`Edit ${job.role} at ${job.company}`}
            onClick={() => onEdit(job)}
            className="text-label-caps uppercase"
          >
            Edit
          </IconButton>
        )}
        {onDelete && (
          <IconButton
            aria-label={`Delete ${job.role} at ${job.company}`}
            onClick={() => onDelete(job)}
          >
            <TrashIcon size={16} aria-hidden />
          </IconButton>
        )}
      </div>
    </div>
  )
}

function Column({
  status,
  jobs,
  active,
  onEdit,
  onDelete,
}: {
  status: JobStatus
  jobs: Job[]
  active: boolean
  onEdit?: (job: Job) => void
  onDelete?: (job: Job) => void
}) {
  const { setNodeRef } = useDroppable({ id: status, data: { status } })

  return (
    <div ref={setNodeRef} className={cn('min-w-56', active && 'bg-bg-inset')}>
      <KanbanColumn title={COLUMN_TITLES[status]} count={jobs.length}>
        {jobs.length === 0 ? (
          <p className="py-4 text-body-s text-text-muted">Empty</p>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} job={job} onEdit={onEdit} onDelete={onDelete} />
          ))
        )}
      </KanbanColumn>
    </div>
  )
}

/**
 * The desktop board. Five fixed columns, one per status, and dragging a card
 * between them is the status change.
 *
 * The drop target is tinted with `bg-bg-inset` rather than ringed in the
 * accent: a ring around a column would be the only 5-column-wide accent shape
 * on the screen, and the accent already means "the control you can press".
 *
 * The grid scrolls horizontally rather than compressing between 768px and
 * roughly 1180px, because five columns narrower than `min-w-56` truncate the
 * role -- the one field on the card you actually navigate by.
 */
export interface KanbanViewProps {
  jobs: Job[]
  onStatusChange?: (job: Job, status: JobStatus) => void
  onEdit?: (job: Job) => void
  onDelete?: (job: Job) => void
  className?: string
}

export function KanbanView({
  jobs,
  onStatusChange,
  onEdit,
  onDelete,
  className,
}: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 175, tolerance: 8 } })
  )

  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [overStatus, setOverStatus] = React.useState<JobStatus | null>(null)
  const activeJob = jobs.find((job) => job.id === activeId) ?? null

  const clear = () => {
    setActiveId(null)
    setOverStatus(null)
  }

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  const handleDragEnd = (event: DragEndEvent) => {
    const from = event.active.data.current?.status as JobStatus | undefined
    const to = event.over?.id as JobStatus | undefined
    const job = jobs.find((j) => j.id === String(event.active.id))
    clear()
    if (!job || !from || !to || from === to) return
    onStatusChange?.(job, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={(event) => setOverStatus((event.over?.id as JobStatus | undefined) ?? null)}
      onDragEnd={handleDragEnd}
      onDragCancel={clear}
    >
      <div
        data-kanban
        className={cn('hidden md:grid md:grid-cols-5 gap-4 overflow-x-auto pb-2', className)}
      >
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            jobs={jobs.filter((job) => job.status === status)}
            active={!!activeId && overStatus === status}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="pointer-events-none w-56">
            <JobCard
              company={activeJob.company}
              role={activeJob.role}
              status={activeJob.status}
              salaryMin={activeJob.salary_min}
              salaryMax={activeJob.salary_max}
              currency={activeJob.salary_currency}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
