import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState } from 'react'
import { Job, JobStatus, STATUS_CONFIG } from '@/types'
import JobCard from './JobCard'

interface KanbanBoardProps {
  jobs: Job[]
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
}

interface KanbanColumnProps {
  status: JobStatus
  jobs: Job[]
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
  isActiveDropTarget?: boolean
}

function DraggableJobCard({
  job,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  job: Job
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.id,
      data: { jobId: job.id, status: job.status },
    })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50' : undefined}
      {...attributes}
      {...listeners}
    >
      <JobCard
        job={job}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        compact
      />
    </div>
  )
}

function KanbanColumn({
  status,
  jobs,
  onEdit,
  onDelete,
  onStatusChange,
  isActiveDropTarget = false,
}: KanbanColumnProps) {
  const config = STATUS_CONFIG[status]
  const columnJobs = jobs.filter((job) => job.status === status)

  const { setNodeRef } = useDroppable({
    id: status,
    data: { status },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 snap-start ${
        isActiveDropTarget
          ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-zinc-900 rounded-xl'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 mb-3 py-2 bg-zinc-50 dark:bg-zinc-950">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <h3 className="font-semibold text-zinc-900 dark:text-white">
          {config.label}
        </h3>
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
          {columnJobs.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="space-y-2 min-h-[200px] p-2 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl">
        {columnJobs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-zinc-400 dark:text-zinc-500">
            No jobs
          </div>
        ) : (
          columnJobs.map((job) => (
            <DraggableJobCard
              key={job.id}
              job={job}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({
  jobs,
  onEdit,
  onDelete,
  onStatusChange,
}: KanbanBoardProps) {
  const statuses: JobStatus[] = [
    'wishlist',
    'applied',
    'interviewing',
    'offer',
    'rejected',
  ]

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 175, tolerance: 8 },
    })
  )

  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const activeJob = useMemo(
    () => jobs.find((j) => j.id === activeJobId) ?? null,
    [jobs, activeJobId]
  )

  const [overStatus, setOverStatus] = useState<JobStatus | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveJobId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const fromStatus = event.active.data.current?.status as JobStatus | undefined
    const toStatus = event.over?.id as JobStatus | undefined

    setActiveJobId(null)
    setOverStatus(null)

    if (!fromStatus || !toStatus) return
    if (fromStatus === toStatus) return

    onStatusChange(activeId, toStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(event) => {
        const next = (event.over?.id as JobStatus | undefined) ?? null
        setOverStatus(next)
      }}
      onDragCancel={() => {
        setActiveJobId(null)
        setOverStatus(null)
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory overscroll-x-contain">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            jobs={jobs}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isActiveDropTarget={!!activeJobId && overStatus === status}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="pointer-events-none w-72">
            <JobCard
              job={activeJob}
              onEdit={() => undefined}
              onDelete={() => undefined}
              onStatusChange={() => undefined}
              compact
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
