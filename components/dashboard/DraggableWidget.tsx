'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { WidgetPosition } from '@/lib/dashboard/grid-layout';
import { DashboardWidget } from '@/lib/dashboard/types';

interface DraggableWidgetProps {
  widget: DashboardWidget;
  position: WidgetPosition;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DraggableWidget({ 
  widget, 
  position, 
  children, 
  disabled = false 
}: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    data: { widget, position },
    disabled,
  });

  const style: React.CSSProperties = {
    gridColumn: `span ${position.w}`,
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative"
    >
      {children}
    </div>
  );
}
