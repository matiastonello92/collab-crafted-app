'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface HoursChartProps {
  data: Array<{
    week: string
    planned: number
    actual: number
  }>
}

export function HoursChart({ data }: HoursChartProps) {
  const { t } = useTranslation()

  if (!data || data.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('employees.shifts.analytics.hoursChart')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="planned" 
              fill="hsl(var(--primary))" 
              name={t('employees.shifts.analytics.plannedHours')}
            />
            <Bar 
              dataKey="actual" 
              fill="hsl(var(--chart-2))" 
              name={t('employees.shifts.analytics.actualHours')}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
