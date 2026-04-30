import { createContext, useContext } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'

/** Context to pass drag listeners down to a DragHandle child */
const DragHandleContext = createContext<{
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
} | null>(null)

interface SortableItemProps {
  id: string
  data?: Record<string, unknown>
  /** When true, listeners are NOT spread on the wrapper div. Use <DragHandle> inside children instead. */
  dragHandle?: boolean
  children: React.ReactNode
}

export function SortableItem({ id, data, dragHandle, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.72 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
    filter: isDragging ? 'drop-shadow(0 18px 36px rgba(42, 52, 55, 0.18))' : undefined,
    willChange: 'transform',
  }

  if (dragHandle) {
    return (
      <DragHandleContext.Provider value={{ attributes, listeners }}>
        <div ref={setNodeRef} style={style} data-dragging={isDragging ? 'true' : 'false'}>
          {children}
        </div>
      </DragHandleContext.Provider>
    )
  }

  return (
    <div ref={setNodeRef} style={style} data-dragging={isDragging ? 'true' : 'false'} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

/** Renders a drag handle area that captures dnd-kit listeners. Must be inside a SortableItem with dragHandle. */
export function DragHandle({ children, className }: { children?: React.ReactNode; className?: string }) {
  const ctx = useContext(DragHandleContext)
  if (!ctx) return <>{children}</>
  return (
    <div
      className={className}
      onMouseDown={(event) => event.preventDefault()}
      {...ctx.attributes}
      {...ctx.listeners}
    >
      {children}
    </div>
  )
}
