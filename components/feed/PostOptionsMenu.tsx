'use client';

import { MoreVertical, Edit, Trash2, Pin, EyeOff, Link2, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface PostOptionsMenuProps {
  postId: string;
  isAuthor: boolean;
  isAdmin: boolean;
  isPinned: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onReport?: () => void;
}

export function PostOptionsMenu({
  postId,
  isAuthor,
  isAdmin,
  isPinned,
  onEdit,
  onDelete,
  onPin,
  onReport,
}: PostOptionsMenuProps) {
  const handleCopyLink = () => {
    const url = `${window.location.origin}/feed?post=${postId}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiato negli appunti');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-sm z-50">
        {isAuthor && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </DropdownMenuItem>
        )}
        
        {(isAuthor || isAdmin) && onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </DropdownMenuItem>
        )}
        
        {isAdmin && onPin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onPin}>
              <Pin className="h-4 w-4 mr-2" />
              {isPinned ? 'Rimuovi fissaggio' : 'Fissa post'}
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 className="h-4 w-4 mr-2" />
          Copia link
        </DropdownMenuItem>
        
        {!isAuthor && onReport && (
          <DropdownMenuItem onClick={onReport}>
            <Flag className="h-4 w-4 mr-2" />
            Segnala
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
