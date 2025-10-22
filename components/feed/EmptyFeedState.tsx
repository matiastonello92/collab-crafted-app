import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyFeedStateProps {
  canCreate?: boolean;
  onCreatePost?: () => void;
}

export function EmptyFeedState({ canCreate, onCreatePost }: EmptyFeedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-accent/10 p-6 mb-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Nessun post ancora</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {canCreate
          ? 'Sii il primo a condividere qualcosa con il team!'
          : 'Non ci sono ancora post da mostrare.'}
      </p>
      {canCreate && onCreatePost && (
        <Button onClick={onCreatePost}>Crea il primo post</Button>
      )}
    </div>
  );
}
