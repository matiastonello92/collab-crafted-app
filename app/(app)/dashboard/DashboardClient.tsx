'use client';

import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { useIsClient } from '@/lib/hydration/HydrationToolkit';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { getUserLevel, getVisibleWidgets } from '@/lib/dashboard/widget-selector';
import { WidgetSkeleton } from '@/components/dashboard/WidgetSkeleton';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { DraggableWidget } from '@/components/dashboard/DraggableWidget';
import { calculateAutoLayout, calculateDropPosition, sizeToColumns, WidgetPosition } from '@/lib/dashboard/grid-layout';
import { toast } from 'sonner';

export default function DashboardClient() {
  const { t } = useTranslation();
  const isClient = useIsClient();
  const { permissions, isAdmin, isLoading: permissionsLoading } = usePermissions();
  const { preferences, isLoading: widgetsLoading, updateWidgetPosition } = useDashboardWidgets();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [gridCols, setGridCols] = useState(3);

  // Responsive grid columns
  useEffect(() => {
    const updateGridCols = () => {
      const width = window.innerWidth;
      if (width < 768) setGridCols(1);
      else if (width < 1024) setGridCols(2);
      else setGridCols(3);
    };

    updateGridCols();
    window.addEventListener('resize', updateGridCols);
    return () => window.removeEventListener('resize', updateGridCols);
  }, []);

  // Drag sensors with activation constraints
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const isMobile = gridCols === 1;

  if (!isClient || permissionsLoading || widgetsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WidgetSkeleton size="large" />
          <WidgetSkeleton size="medium" />
          <WidgetSkeleton size="small" />
        </div>
      </div>
    );
  }

  const userLevel = getUserLevel(isAdmin, permissions);
  const visibleWidgets = getVisibleWidgets(userLevel, permissions, preferences);

  // Calculate widget positions
  const widgetPositions = useMemo(() => {
    return calculateAutoLayout(visibleWidgets, gridCols);
  }, [visibleWidgets, gridCols]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);

    const { active, delta } = event;
    if (!delta.x && !delta.y) return;

    const widgetId = active.id as string;
    const activePosition = widgetPositions.find(p => p.id === widgetId);
    
    if (!activePosition || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPosition = calculateDropPosition(
      { delta },
      activePosition,
      containerRect,
      { cols: gridCols, rowHeight: 200, gap: 24 }
    );

    // Update position
    await updateWidgetPosition(
      widgetId,
      newPosition.x,
      newPosition.y,
      activePosition.w,
      activePosition.h
    );

    toast.success(t('dashboard.positionUpdated') || 'Position updated');
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={isMobile ? [] : sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard.welcome')}</h1>
            <p className="text-muted-foreground mt-1">{t('dashboard.overview')}</p>
          </div>
          <Link href="/settings/dashboard">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div 
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {visibleWidgets.map((widget) => {
            const WidgetComponent = widget.component;
            const size = widget.preference?.size || widget.defaultSize;
            const config = widget.preference?.config || {};
            const position = widgetPositions.find(p => p.id === widget.id);

            if (!position) return null;

            return (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                position={position}
                disabled={isMobile}
              >
                <Suspense fallback={<WidgetSkeleton size={size} />}>
                  <WidgetComponent size={size} config={config} />
                </Suspense>
              </DraggableWidget>
            );
          })}
        </div>

        {visibleWidgets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('dashboard.noWidgets')}</p>
            <Link href="/settings/dashboard">
              <Button className="mt-4">
                {t('dashboard.addWidgets')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="opacity-50">
            <WidgetSkeleton />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
