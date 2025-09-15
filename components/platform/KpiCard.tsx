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
      <div className="platform-card glow-ring p-6 space-y-4 h-32">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-klyra-surface rounded-full"></div>
            <div className="h-4 bg-klyra-surface rounded w-20"></div>
          </div>
          <div className="h-8 bg-klyra-surface rounded w-16 mb-2"></div>
          <div className="h-3 bg-klyra-surface rounded w-24"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="platform-card glow-ring p-6 hover:shadow-glow transition-all duration-300 group">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-klyra-primary to-klyra-accent p-2 flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        <span className="text-sm font-medium text-klyra-muted group-hover:text-klyra-fg transition-colors">
          {label}
        </span>
      </div>
      
      <div className="space-y-1">
        <div className="text-3xl font-semibold text-klyra-fg">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        <div className="flex items-center space-x-2">
          {sub && (
            <span className="text-xs text-klyra-subtle">
              {sub}
            </span>
          )}
          
          {delta && (
            <span className={`text-xs font-medium ${
              delta.type === 'positive' ? 'text-klyra-success' :
              delta.type === 'negative' ? 'text-klyra-danger' :
              'text-klyra-subtle'
            }`}>
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}