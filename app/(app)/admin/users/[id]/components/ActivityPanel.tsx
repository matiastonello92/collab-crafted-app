import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, User, Shield } from 'lucide-react'
import { t } from '@/lib/i18n'

interface ActivityPanelProps {
  userId: string
}

// Mock activity data - in produzione verrebbe da una tabella di audit
const mockActivityData = [
  {
    id: '1',
    action: 'role_assigned',
    description: 'Ruolo "manager" assegnato per location Lyon',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 giorni fa
    actor: 'admin@company.com'
  },
  {
    id: '2', 
    action: 'permission_granted',
    description: 'Permesso "orders.approve" concesso',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 giorni fa
    actor: 'admin@company.com'
  },
  {
    id: '3',
    action: 'profile_updated',
    description: 'Profilo utente aggiornato',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 giorni fa
    actor: 'system'
  },
  {
    id: '4',
    action: 'user_created',
    description: 'Account utente creato',
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 giorni fa
    actor: 'system'
  }
]

function getActivityIcon(action: string) {
  switch (action) {
    case 'role_assigned':
    case 'role_removed':
      return Shield
    case 'permission_granted':
    case 'permission_revoked':
      return Shield
    case 'profile_updated':
      return User
    default:
      return Activity
  }
}

function getActivityBadgeVariant(action: string) {
  switch (action) {
    case 'role_assigned':
    case 'permission_granted':
    case 'user_created':
      return 'default' as const
    case 'role_removed':
    case 'permission_revoked':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

export default function ActivityPanel({ userId }: ActivityPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Attività Recenti
        </CardTitle>
        <CardDescription>
          Cronologia delle modifiche e azioni ({mockActivityData.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mockActivityData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-8 w-8 mb-2" />
            <p>{t('common.messages.noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {mockActivityData.map((activity) => {
              const IconComponent = getActivityIcon(activity.action)
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0">
                    <IconComponent className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge 
                        variant={getActivityBadgeVariant(activity.action)}
                        className="text-xs"
                      >
                        {activity.action.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    <p className="text-sm">
                      {activity.description}
                    </p>
                    {activity.actor !== 'system' && (
                      <p className="text-xs text-muted-foreground">
                        da {activity.actor}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Note about audit system */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            {t('common.auditSystemWarning')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}