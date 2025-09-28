'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface PresenceUser {
  user_id: string;
  full_name?: string;
}

interface InventoryPresenceProps {
  users: PresenceUser[];
}

export function InventoryPresence({ users }: InventoryPresenceProps) {
  if (users.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Solo tu</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4" />
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.user_id} className="h-8 w-8 border-2 border-background">
            <AvatarFallback>
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        ))}
        {users.length > 3 && (
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs">
            +{users.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}