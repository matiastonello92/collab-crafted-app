'use client'

import { Bell, Calendar, ChevronRight, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNotifications } from '@/hooks/useNotifications'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'
import { useState } from 'react'

export function NotificationsBell() {
  const { count, notifications, loading } = useNotifications()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'calendar': return <Calendar className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl hover:bg-accent/50 transition-all"
          aria-label="Notifiche"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-500 hover:bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 rounded-2xl shadow-xl border border-border/40"
      >
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <h3 className="font-semibold text-sm">Notifiche</h3>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {count} nuove
            </Badge>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Caricamento...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nessuna notifica</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification: any) => (
                <div key={notification.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        {getIcon(notification.icon)}
                      </div>
                      <span className="font-medium text-sm">{notification.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {notification.count}
                    </Badge>
                  </div>

                  <div className="space-y-2 ml-8">
                    {notification.items.slice(0, 3).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => {
                          router.push(item.link)
                          setOpen(false)
                        }}
                      >
                        {item.avatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={item.avatar} />
                            <AvatarFallback>{item.title[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatDistanceToNow(new Date(item.timestamp), { 
                              addSuffix: true, 
                              locale: it 
                            })}
                          </p>
                        </div>
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    ))}
                  </div>

                  {notification.count > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={() => {
                        router.push(notification.link)
                        setOpen(false)
                      }}
                    >
                      Vedi tutte ({notification.count})
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-border/40 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium"
              onClick={() => {
                router.push('/admin/leave/inbox')
                setOpen(false)
              }}
            >
              Vedi Tutte le Notifiche
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
