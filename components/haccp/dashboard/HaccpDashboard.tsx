'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TasksOverview } from './TasksOverview';
import { TemperatureAlerts } from './TemperatureAlerts';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { AlertCircle, CheckCircle2, Clock, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface HaccpDashboardProps {
  orgId: string;
  locationId: string;
}

interface DashboardStats {
  stats: {
    tasksDueToday: number;
    tasksOverdue: number;
    tasksCompleted: number;
    tasksPending: number;
    complianceRate: number;
  };
  temperatureAlerts: any[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export function HaccpDashboard({ orgId, locationId }: HaccpDashboardProps) {
  const { t } = useTranslation();
  const { isMobile } = useBreakpoint();
  const { data, error, isLoading } = useSWR<DashboardStats>(
    `/api/v1/haccp/dashboard?location_id=${locationId}`,
    fetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('haccp.errors.loadingDashboard')}</h2>
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const { stats, temperatureAlerts } = data || {
    stats: {
      tasksDueToday: 0,
      tasksOverdue: 0,
      tasksCompleted: 0,
      tasksPending: 0,
      complianceRate: 0
    },
    temperatureAlerts: []
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('haccp.dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('haccp.dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button asChild className="flex-1 sm:flex-none min-h-[44px]">
            <Link href="/haccp/tasks">
              <ClipboardList className="h-4 w-4 mr-2" />
              {t('haccp.dashboard.viewTasks')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'md:grid-cols-2 lg:grid-cols-4 gap-6'} mb-6`}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('haccp.dashboard.stats.dueToday')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasksDueToday}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('haccp.dashboard.stats.tasksRequiringAttention')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('haccp.dashboard.stats.overdue')}</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.tasksOverdue}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('haccp.dashboard.stats.tasksPastDue')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('haccp.dashboard.stats.completedToday')}</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.tasksCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('haccp.dashboard.stats.tasksFinished')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">{t('haccp.dashboard.stats.complianceRate')}</CardTitle>
              <div className="text-xs text-muted-foreground">7d</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{t('haccp.dashboard.stats.last7Days')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Alerts */}
      {temperatureAlerts.length > 0 && (
        <div className="mb-6">
          <TemperatureAlerts alerts={temperatureAlerts} />
        </div>
      )}

      {/* Recent Activity Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <TabsTrigger value="tasks" className="min-h-[44px]">{t('haccp.dashboard.tabs.tasks')}</TabsTrigger>
          <TabsTrigger value="templates" className="min-h-[44px]">{t('haccp.dashboard.tabs.templates')}</TabsTrigger>
          {!isMobile && <TabsTrigger value="reports" className="min-h-[44px]">{t('haccp.dashboard.tabs.reports')}</TabsTrigger>}
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
          <TasksOverview locationId={locationId} />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('haccp.templates.title')}</CardTitle>
              <CardDescription>{t('haccp.templates.manageRecurringTemplates')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full min-h-[44px]">
                <Link href="/haccp/templates">{t('haccp.templates.manageTemplates')}</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {!isMobile && (
          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('haccp.reports.audit.title')}</CardTitle>
                <CardDescription>{t('haccp.reports.audit.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full min-h-[44px]">
                  <Link href="/haccp/reports">{t('haccp.reports.audit.viewReports')}</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
