'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { PieChartIcon } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'
import { useEmployeeShifts } from '../hooks/useEmployeeShifts'
import { startOfMonth, endOfMonth } from 'date-fns'
import { useMemo } from 'react'

interface ShiftDistributionChartProps {
  userId: string
  month: Date
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))']

export function ShiftDistributionChart({ userId, month }: ShiftDistributionChartProps) {
  const { t } = useTranslation()

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const { shifts, loading } = useEmployeeShifts(
    userId,
    monthStart.toISOString(),
    monthEnd.toISOString()
  )

  const distributionData = useMemo(() => {
    const statusCounts = shifts.reduce((acc, shift) => {
      acc[shift.status] = (acc[shift.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: t(`employees.shifts.status.${status}` as any) || status,
      value: count,
      status
    }))
  }, [shifts, t])

  const totalShifts = distributionData.reduce((sum, item) => sum + item.value, 0)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione Turni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {t('common.loading')}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (totalShifts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuzione Turni
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Nessun turno nel periodo selezionato
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Distribuzione Turni per Stato
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {distributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        {/* Stats Summary */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
          {distributionData.map((item, index) => (
            <div key={item.status} className="text-center">
              <div 
                className="inline-block w-3 h-3 rounded-full mb-1"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
