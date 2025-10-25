'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileBarChart, Download, Calendar, FileText } from 'lucide-react';

interface ReportsClientProps {
  locationId: string;
}

export function ReportsClient({ locationId }: ReportsClientProps) {
  const reportTypes = [
    {
      id: 'task-completion',
      title: 'Task Completion Report',
      description: 'Summary of completed HACCP tasks',
      icon: FileText,
    },
    {
      id: 'temperature-logs',
      title: 'Temperature Monitoring Report',
      description: 'Complete temperature logs history',
      icon: FileBarChart,
    },
    {
      id: 'corrective-actions',
      title: 'Corrective Actions Report',
      description: 'List of all corrective actions taken',
      icon: FileBarChart,
    },
    {
      id: 'compliance',
      title: 'Compliance Summary',
      description: 'Overall HACCP compliance status',
      icon: FileBarChart,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HACCP Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and export HACCP compliance reports
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Reports</h2>
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
                      <div className="font-medium">{report.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {report.description}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Custom Report</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <select className="w-full mt-1 p-2 border rounded-md">
                <option>Task Completion</option>
                <option>Temperature Logs</option>
                <option>Corrective Actions</option>
                <option>Full Compliance</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Date Range</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="date"
                  className="p-2 border rounded-md"
                  placeholder="From"
                />
                <input
                  type="date"
                  className="p-2 border rounded-md"
                  placeholder="To"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Format</label>
              <select className="w-full mt-1 p-2 border rounded-md">
                <option>PDF</option>
                <option>Excel (XLSX)</option>
                <option>CSV</option>
              </select>
            </div>
            <Button className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No reports generated yet</p>
        </div>
      </Card>
    </div>
  );
}
