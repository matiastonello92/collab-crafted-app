'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface PartialCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  incompleteTasks: number;
}

export function PartialCompletionDialog({
  open,
  onOpenChange,
  onConfirm,
  incompleteTasks,
}: PartialCompletionDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <DialogTitle>Completamento Parziale</DialogTitle>
          </div>
          <DialogDescription>
            {incompleteTasks} {incompleteTasks === 1 ? 'attività non è stata completata' : 'attività non sono state completate'}. 
            Per procedere, specifica il motivo del completamento parziale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="reason">Motivo del completamento parziale *</Label>
          <Textarea
            id="reason"
            placeholder="Es: Materiale di pulizia esaurito, mancanza di tempo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason('');
            }}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!reason.trim()}
            variant="default"
          >
            Conferma Completamento Parziale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
