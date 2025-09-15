import { LucideIcon } from 'lucide-react'

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
      <div className="card-elevated glow-ring p-6 space-y-4 h-32">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-muted rounded-full"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
          <div className="h-8 bg-muted rounded w-16 mb-2"></div>
          <div className="h-3 bg-muted rounded w-24"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="card-elevated glow-ring p-6 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group">
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
            <span className={`text-xs font-medium ${
              delta.type === 'positive' ? 'text-emerald-500' :
              delta.type === 'negative' ? 'text-red-500' :
              'text-muted-foreground'
            }`}>
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}