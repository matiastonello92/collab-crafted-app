'use client'

import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PERMISSION_CATEGORIES } from '@/lib/permissions/categories'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/lib/i18n'

interface PermissionCategoryAccordionProps {
  selectedPermissions: Set<string>
  onPermissionToggle: (permission: string, checked: boolean) => void
  disabled?: boolean
}

export function PermissionCategoryAccordion({
  selectedPermissions,
  onPermissionToggle,
  disabled = false
}: PermissionCategoryAccordionProps) {
  const { t } = useTranslation()
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const handleSelectAll = (categoryKey: string, permissions: string[]) => {
    const allSelected = permissions.every(p => selectedPermissions.has(p))
    permissions.forEach(permission => {
      onPermissionToggle(permission, !allSelected)
    })
  }

  const getCategoryStats = (permissions: string[]) => {
    const selected = permissions.filter(p => selectedPermissions.has(p)).length
    return { selected, total: permissions.length }
  }

  return (
    <Accordion 
      type="multiple" 
      value={expandedCategories}
      onValueChange={setExpandedCategories}
      className="w-full"
    >
      {PERMISSION_CATEGORIES.map(category => {
        const stats = getCategoryStats(category.permissions)
        const allSelected = stats.selected === stats.total
        const someSelected = stats.selected > 0 && stats.selected < stats.total

        return (
          <AccordionItem key={category.key} value={category.key}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <span className="text-lg">{category.icon}</span>
                <span className="font-medium text-sm flex-1 text-left">
                  {category.labelKey.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || category.key}
                </span>
                <Badge 
                  variant={allSelected ? 'default' : someSelected ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {stats.selected}/{stats.total}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(category.key, category.permissions)}
                    disabled={disabled}
                    className="text-xs"
                  >
                    {allSelected ? t('admin.permissionActions.deselectAll') : t('admin.permissionActions.selectAll')}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {category.permissions.map(permission => (
                    <div 
                      key={permission} 
                      className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <Checkbox
                        id={`${category.key}-${permission}`}
                        checked={selectedPermissions.has(permission)}
                        onCheckedChange={(checked) => 
                          onPermissionToggle(permission, checked as boolean)
                        }
                        disabled={disabled}
                      />
                      <Label 
                        htmlFor={`${category.key}-${permission}`}
                        className="flex-1 cursor-pointer text-sm font-mono"
                      >
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
