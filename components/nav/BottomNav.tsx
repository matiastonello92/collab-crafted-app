'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export function BottomNav() {
  const { t } = useTranslation()
  const pathname = usePathname()
  
  const navItems = [
    { href: '/dashboard', icon: Home, label: t('nav.home') },
    { href: '/planner', icon: Calendar, label: t('nav.planner') },
    { href: '/my-shifts', icon: Calendar, label: t('nav.myShifts') },
    { href: '/settings', icon: Settings, label: t('nav.other') },
  ]
  
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-inset-bottom">
      <div className="flex justify-around p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[60px] min-h-[44px] p-2 rounded-lg transition-colors",
                "active:scale-95 touch-manipulation",
                isActive 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
