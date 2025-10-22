'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'

export function UserDropdown() {
  const { t } = useTranslation()
  const [user, setUser] = useState<{ email: string; name?: string; avatar_url?: string | null } | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        // Try to get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, full_name, avatar_url')
          .eq('id', data.user.id)
          .maybeSingle()

        const displayName = profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.full_name || data.user.email?.split('@')[0]

        setUser({
          email: data.user.email || '',
          name: displayName,
          avatar_url: profile?.avatar_url
        })
      }
    }

    getUser()
  }, [])

  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">{t('user.login')}</Link>
      </Button>
    )
  }

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-8 w-8">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.name || user.email} />
            )}
            <AvatarFallback className="text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('user.myProfile')}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/profile?tab=preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('user.settings')}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={hardLogout}
          className="flex items-center gap-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          {t('user.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}