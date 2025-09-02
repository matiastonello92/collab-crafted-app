import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Key, CheckCircle, XCircle } from 'lucide-react'
import type { UserPermissionOverride } from '@/lib/data/admin'

interface PermissionOverridesPanelProps {
  overrides: UserPermissionOverride[]
}

export default function PermissionOverridesPanel({ overrides }: PermissionOverridesPanelProps) {
  const groupedByCategory = overrides.reduce((acc, override) => {
    const category = override.permission_category || 'Altri'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(override)
    return acc
  }, {} as Record<string, UserPermissionOverride[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Override Permessi
        </CardTitle>
        <CardDescription>
          Permessi specificatamente concessi o negati ({overrides.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {overrides.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="mx-auto h-8 w-8 mb-2" />
            <p>Nessun override specifico</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByCategory).map(([category, categoryOverrides]) => (
              <div key={category}>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h4>
                <div className="space-y-2">
                  {categoryOverrides.map((override, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {override.permission_display_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {override.permission_name}
                        </div>
                        {override.location_name && (
                          <Badge variant="outline" className="text-xs">
                            {override.location_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {override.granted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="text-xs font-medium">
                          {override.granted ? 'Concesso' : 'Negato'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}