interface SectionHeaderProps {
  title: string
  subtitle?: string
  description?: string
}

export function SectionHeader({ title, subtitle, description }: SectionHeaderProps) {
  return (
    <div className="space-y-2 mb-8">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xl text-muted-foreground">
          {subtitle}
        </p>
      )}
      {description && (
        <p className="text-sm text-muted-foreground/80 max-w-2xl">
          {description}
        </p>
      )}
    </div>
  )
}