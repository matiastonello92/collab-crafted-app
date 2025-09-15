interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div className={`platform-card p-6 space-y-4 h-32 ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-klyra-surface/60 rounded-full"></div>
          <div className="h-4 bg-klyra-surface/60 rounded w-20"></div>
        </div>
        <div className="h-8 bg-klyra-surface/60 rounded w-16 mb-2"></div>
        <div className="h-3 bg-klyra-surface/60 rounded w-24"></div>
      </div>
    </div>
  )
}