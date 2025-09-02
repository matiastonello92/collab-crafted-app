import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MapPin, Shield } from 'lucide-react'
import type { UserRolesByLocation } from '@/lib/data/admin'

interface RolesByLocationPanelProps {
  roles: UserRolesByLocation[]
}

export default function RolesByLocationPanel({ roles }: RolesByLocationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Ruoli per Location
        </CardTitle>
        <CardDescription>
          Ruoli assegnati per ciascuna location ({roles.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="mx-auto h-8 w-8 mb-2" />
            <p>Nessun ruolo assegnato</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-medium">
                      {role.location_name}
                    </div>
                    {role.assigned_at && (
                      <div className="text-xs text-muted-foreground">
                        Dal {new Date(role.assigned_at).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="secondary">
                        {role.role_display_name}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Livello {role.role_level}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={role.is_active ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {role.is_active ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}