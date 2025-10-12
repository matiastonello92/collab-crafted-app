'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Lock, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardWidgets } from '@/hooks/useDashboardWidgets';
import { getAllWidgets } from '@/lib/dashboard/widget-registry';
import { getUserLevel, canAccessWidget } from '@/lib/dashboard/widget-selector';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';

interface SortableWidgetCardProps {
  widget: any;
  hasAccess: boolean;
  isVisible: boolean;
  onToggle: () => void;
  t: any;
}

function SortableWidgetCard({ widget, hasAccess, isVisible, onToggle, t }: SortableWidgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card ref={setNodeRef} style={style} className={!hasAccess ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {t(widget.title)}
              {!hasAccess && <Lock className="h-4 w-4 text-muted-foreground" />}
            </CardTitle>
            <CardDescription>
              {t(widget.description)}
            </CardDescription>
          </div>
          <Switch
            checked={isVisible && hasAccess}
            onCheckedChange={onToggle}
            disabled={!hasAccess}
          />
        </div>
      </CardHeader>
    </Card>
  );
}

export default function DashboardSettingsClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const { permissions, isAdmin } = usePermissions();
  const { preferences, isLoading, updateWidget } = useDashboardWidgets();
  
  const userLevel = getUserLevel(isAdmin, permissions);
  const allWidgets = getAllWidgets();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedWidgets = useMemo(() => {
    return [...allWidgets].sort((a, b) => {
      const prefA = preferences.find(p => p.widget_id === a.id);
      const prefB = preferences.find(p => p.widget_id === b.id);
      const posA = prefA?.position ?? 999;
      const posB = prefB?.position ?? 999;
      return posA - posB;
    });
  }, [allWidgets, preferences]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const handleToggle = async (widgetId: string, currentVisible: boolean) => {
    await updateWidget(widgetId, { is_visible: !currentVisible });
    toast.success(t('settings.changesSaved'));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedWidgets.findIndex(w => w.id === active.id);
      const newIndex = sortedWidgets.findIndex(w => w.id === over.id);
      const reordered = arrayMove(sortedWidgets, oldIndex, newIndex);
      for (let i = 0; i < reordered.length; i++) {
        await updateWidget(reordered[i].id, { position: i });
      }
      toast.success(t('settings.orderUpdated'));
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        <h1 className="text-3xl font-bold">{t('settings.dashboardCustomization')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('settings.dashboardCustomizationDesc')}
        </p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {sortedWidgets.map(widget => {
              const hasAccess = canAccessWidget(widget, userLevel, permissions);
              const preference = preferences.find(p => p.widget_id === widget.id);
              const isVisible = preference?.is_visible ?? widget.defaultVisible;
              return (
                <SortableWidgetCard
                  key={widget.id}
                  widget={widget}
                  hasAccess={hasAccess}
                  isVisible={isVisible}
                  onToggle={() => handleToggle(widget.id, isVisible)}
                  t={t}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
