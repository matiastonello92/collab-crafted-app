'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBarChart, Download, Calendar, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ReportsClientProps {
  locationId: string;
}

export function ReportsClient({ locationId }: ReportsClientProps) {
  const { t } = useTranslation();
  
  const reportTypes = [
    {
      id: 'task-completion',
      titleKey: 'haccp.reports.types.taskCompletion',
      descriptionKey: 'haccp.reports.descriptions.taskCompletion',
      icon: FileText,
    },
    {
      id: 'temperature-logs',
      titleKey: 'haccp.reports.types.temperatureMonitoring',
      descriptionKey: 'haccp.reports.descriptions.temperatureMonitoring',
      icon: FileBarChart,
    },
    {
      id: 'corrective-actions',
      titleKey: 'haccp.reports.types.correctiveActions',
      descriptionKey: 'haccp.reports.descriptions.correctiveActions',
      icon: FileBarChart,
    },
    {
      id: 'compliance',
      titleKey: 'haccp.reports.types.compliance',
      descriptionKey: 'haccp.reports.descriptions.compliance',
      icon: FileBarChart,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('haccp.reports.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('haccp.reports.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('haccp.reports.quickReports')}</h2>
          <div className="space-y-3">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{t(report.titleKey)}</div>
                      <div className="text-sm text-muted-foreground">
                        {t(report.descriptionKey)}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('haccp.reports.export')}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('haccp.reports.customReport')}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('haccp.reports.form.reportType')}</label>
              <select className="w-full mt-1 p-2 border rounded-md">
                <option>{t('haccp.reports.types.taskCompletion')}</option>
                <option>{t('haccp.reports.types.temperatureMonitoring')}</option>
                <option>{t('haccp.reports.types.correctiveActions')}</option>
                <option>{t('haccp.reports.types.compliance')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('haccp.reports.form.dateRange')}</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="date"
                  className="p-2 border rounded-md"
                  placeholder={t('haccp.reports.form.from')}
                />
                <input
                  type="date"
                  className="p-2 border rounded-md"
                  placeholder={t('haccp.reports.form.to')}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('haccp.reports.form.format')}</label>
              <select className="w-full mt-1 p-2 border rounded-md">
                <option>{t('haccp.reports.formats.pdf')}</option>
                <option>{t('haccp.reports.formats.excel')}</option>
                <option>{t('haccp.reports.formats.csv')}</option>
              </select>
            </div>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {t('haccp.reports.generate')}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">{t('haccp.reports.recentReports')}</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{t('haccp.reports.empty.message')}</p>
        </div>
      </Card>
    </div>
  );
}
