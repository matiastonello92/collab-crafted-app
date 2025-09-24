'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { hardLogout } from '@/lib/hardLogout'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useAppStore } from '@/lib/store'

function computeDisplayName(metadata: Record<string, unknown> | null | undefined, email?: string) {
  const meta = metadata ?? {}
  const first = typeof meta['first_name'] === 'string' ? (meta['first_name'] as string) : undefined
  const last = typeof meta['last_name'] === 'string' ? (meta['last_name'] as string) : undefined
  const full = typeof meta['full_name'] === 'string' ? (meta['full_name'] as string) : undefined
  if (full) return full
  if (first && last) return `${first} ${last}`
  if (first) return first
  return email?.split('@')[0]
}

export function UserDropdown() {
  const router = useRouter()
  const user = useAppStore((state) => state.context.user)

  const profile = useMemo(() => {
    if (!user) return null
    const name = computeDisplayName(user.metadata as Record<string, unknown> | null, user.email)
    return {
      email: user.email ?? '',
      name: name ?? user.email ?? '',
    }
  }, [user])

  const handleLogout = useCallback(async () => {
    await hardLogout()
    router.replace('/login')
  }, [router])

  if (!profile) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Accedi</Link>
      </Button>
    )
  }

  const initials = profile.name
    ? profile.name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto rounded-full px-2.5 py-1.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium">{profile.name}</span>
            <span className="text-xs text-muted-foreground">{profile.email}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{profile.name}</p>
            <p className="text-xs text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/me" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Il Mio Profilo
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Impostazioni
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}