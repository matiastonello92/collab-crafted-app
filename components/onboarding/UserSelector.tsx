'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  full_name: string
  email: string
  primary_job_tag_label?: string
  primary_job_tag_color?: string
}

interface UserSelectorProps {
  users: User[]
  value?: string
  onValueChange: (userId: string) => void
  placeholder?: string
  disabled?: boolean
}

export function UserSelector({
  users,
  value,
  onValueChange,
  placeholder = 'Seleziona utente',
  disabled = false,
}: UserSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            <div className="flex items-center gap-2">
              <span>{user.full_name || user.email}</span>
              {user.primary_job_tag_label && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: user.primary_job_tag_color || 'hsl(var(--border))',
                    color: user.primary_job_tag_color || 'hsl(var(--foreground))',
                  }}
                  className="text-xs"
                >
                  {user.primary_job_tag_label}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
