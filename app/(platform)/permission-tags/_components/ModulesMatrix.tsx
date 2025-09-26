'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { 
  Settings, 
  ChevronDown, 
  ChevronRight,
  Shield,
  Eye,
  Edit,
  Plus,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  FileText,
  Users,
  Building2,
  Package,
  ShoppingCart,
  Wrench,
  AlertTriangle,
  CheckSquare,
  Widget,
  Webhook
} from 'lucide-react'
import { 
  grantModulePermissionToTag, 
  revokeModulePermissionFromTag 
} from '../actions'
import { 
  APP_MODULES, 
  PERMISSION_TAGS, 
  PermissionTag, 
  ModuleKey,
  getPermissionKey 
} from '@/lib/permissions/modules'

interface ModulePermission {
  roleCode: string
  permissionName: string
}

interface ModulesMatrixProps {
  initialPermissions: ModulePermission[]
}

// Icons mapping for modules
const MODULE_ICONS: Record<ModuleKey, React.ComponentType<any>> = {
  inventory: Package,
  suppliers: Building2,
  purchase_orders: ShoppingCart,
  haccp: FileText,
  technicians: Wrench,
  incidents: AlertTriangle,
  tasks: CheckSquare,
  widgets: Widget,
  import_export: Upload,
  settings: Settings,
  webhooks: Webhook
}

// Icons mapping for actions
const ACTION_ICONS: Record<string, React.ComponentType<any>> = {
  view: Eye,
  create: Plus,
  update: Edit,
  delete: Trash2,
  export: Download,
  import: Upload,
  approve: CheckCircle,
  send: Upload,
  receive: Download,
  check: CheckCircle,
  sign: FileText,
  close: CheckCircle,
  complete: CheckCircle,
  configure: Settings
}

export function ModulesMatrix({ initialPermissions }: ModulesMatrixProps) {
  const [permissions, setPermissions] = useState<ModulePermission[]>(initialPermissions)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  // Check if a permission is granted for a role
  const hasPermission = (moduleKey: ModuleKey, action: string, tag: PermissionTag): boolean => {
    const permissionKey = getPermissionKey(moduleKey, action)
    const roleCode = PERMISSION_TAGS[tag].roleCode
    
    return permissions.some(p => 
      p.roleCode === roleCode && p.permissionName === permissionKey
    )
  }

  // Toggle module expansion
  const toggleModule = (moduleKey: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleKey)) {
      newExpanded.delete(moduleKey)
    } else {
      newExpanded.add(moduleKey)
    }
    setExpandedModules(newExpanded)
  }

  // Handle permission toggle
  const handlePermissionToggle = async (
    moduleKey: ModuleKey, 
    action: string, 
    tag: PermissionTag, 
    currentlyHas: boolean
  ) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('moduleKey', moduleKey)
      formData.append('actionKey', action)
      formData.append('tag', tag)

      const result = currentlyHas 
        ? await revokeModulePermissionFromTag(formData)
        : await grantModulePermissionToTag(formData)
      
      if (result.success) {
        // Optimistically update local state
        const permissionKey = getPermissionKey(moduleKey, action)
        const roleCode = PERMISSION_TAGS[tag].roleCode
        
        if (currentlyHas) {
          // Remove permission
          setPermissions(prev => 
            prev.filter(p => 
              !(p.roleCode === roleCode && p.permissionName === permissionKey)
            )
          )
        } else {
          // Add permission
          setPermissions(prev => [
            ...prev,
            { roleCode, permissionName: permissionKey }
          ])
        }

        toast.success(result.message)
      } else {
        toast.error(result.error)
      }
    })
  }

  // Get module access summary for a tag
  const getModuleAccessSummary = (moduleKey: ModuleKey, tag: PermissionTag) => {
    const moduleConfig = APP_MODULES[moduleKey]
    const grantedCount = moduleConfig.permissions.filter(action => 
      hasPermission(moduleKey, action, tag)
    ).length
    
    return {
      granted: grantedCount,
      total: moduleConfig.permissions.length,
      percentage: Math.round((grantedCount / moduleConfig.permissions.length) * 100)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Modules Permissions Matrix
        </CardTitle>
        <CardDescription>
          Configure module access and action permissions for each permission tag
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {Object.entries(APP_MODULES).map(([moduleKey, moduleConfig]) => {
            const ModuleIcon = MODULE_ICONS[moduleKey as ModuleKey]
            const isExpanded = expandedModules.has(moduleKey)
            
            return (
              <Card key={moduleKey} className="border">
                <Collapsible>
                  <CollapsibleTrigger asChild onClick={() => toggleModule(moduleKey)}>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <ModuleIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{moduleConfig.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {moduleConfig.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {Object.keys(PERMISSION_TAGS).map(tag => {
                            const summary = getModuleAccessSummary(moduleKey as ModuleKey, tag as PermissionTag)
                            return (
                              <div key={tag} className="flex items-center gap-2">
                                <Badge 
                                  variant={
                                    tag === 'admin' ? 'destructive' : 
                                    tag === 'manager' ? 'default' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {PERMISSION_TAGS[tag as PermissionTag].name}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {summary.granted}/{summary.total}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Action</TableHead>
                            {Object.entries(PERMISSION_TAGS).map(([tag, config]) => (
                              <TableHead key={tag} className="text-center">
                                <Badge 
                                  variant={
                                    tag === 'admin' ? 'destructive' : 
                                    tag === 'manager' ? 'default' : 'secondary'
                                  }
                                >
                                  {config.name}
                                </Badge>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {moduleConfig.permissions.map((action) => {
                            const ActionIcon = ACTION_ICONS[action] || Settings
                            
                            return (
                              <TableRow key={action}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <ActionIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="capitalize font-medium">{action}</span>
                                  </div>
                                </TableCell>
                                
                                {Object.keys(PERMISSION_TAGS).map(tag => {
                                  const hasAccess = hasPermission(
                                    moduleKey as ModuleKey, 
                                    action, 
                                    tag as PermissionTag
                                  )
                                  
                                  return (
                                    <TableCell key={tag} className="text-center">
                                      <Switch
                                        checked={hasAccess}
                                        disabled={isPending}
                                        onCheckedChange={() => handlePermissionToggle(
                                          moduleKey as ModuleKey,
                                          action,
                                          tag as PermissionTag,
                                          hasAccess
                                        )}
                                      />
                                    </TableCell>
                                  )
                                })}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>

        {/* Summary Stats */}
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Permission Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(PERMISSION_TAGS).map(([tag, config]) => {
                const totalPermissions = Object.values(APP_MODULES).reduce(
                  (sum, module) => sum + module.permissions.length, 0
                )
                const grantedPermissions = permissions.filter(
                  p => p.roleCode === config.roleCode
                ).length
                
                return (
                  <div key={tag} className="text-center p-4 rounded-lg border">
                    <Badge 
                      variant={
                        tag === 'admin' ? 'destructive' : 
                        tag === 'manager' ? 'default' : 'secondary'
                      }
                      className="mb-2"
                    >
                      {config.name}
                    </Badge>
                    <div className="text-2xl font-bold">
                      {grantedPermissions}/{totalPermissions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.round((grantedPermissions / totalPermissions) * 100)}% access
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}