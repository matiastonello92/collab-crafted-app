import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  delta?: {
    value: string
    type: 'positive' | 'negative' | 'neutral'
  }
  loading?: boolean
}

export function KpiCard({ icon: Icon, label, value, sub, delta, loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card className="h-32">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group h-32 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/10">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent p-2 flex items-center justify-center">
            <Icon size={20} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </span>
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-semibold text-foreground">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          <div className="flex items-center space-x-2">
            {sub && (
              <span className="text-xs text-muted-foreground">
                {sub}
              </span>
            )}
            
            {delta && (
              <span
                className={cn(
                  'text-xs font-medium',
                  delta.type === 'positive'
                    ? 'text-klyra-success'
                    : delta.type === 'negative'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {delta.value}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}