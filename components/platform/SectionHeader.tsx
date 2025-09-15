interface SectionHeaderProps {
  title: string
  subtitle?: string
  description?: string
}

export function SectionHeader({ title, subtitle, description }: SectionHeaderProps) {
  return (
    <div className="space-y-2 mb-8">
      <h1 className="text-4xl font-bold gradient-title">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xl text-klyra-muted">
          {subtitle}
        </p>
      )}
      {description && (
        <p className="text-sm text-klyra-subtle max-w-2xl">
          {description}
        </p>
      )}
    </div>
  )
}