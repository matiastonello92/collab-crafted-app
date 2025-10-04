'use client';

import { useState } from 'react';
import { AlertCircle, StickyNote, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useTranslation } from '@/lib/i18n';

interface ServiceNote {
  id: string;
  note_text: string;
  created_at: string;
  created_by_profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ServiceNotesSectionProps {
  recipeId: string;
  notes: ServiceNote[];
  onNoteAdded?: (note: ServiceNote) => void;
}

export function ServiceNotesSection({ recipeId, notes: initialNotes, onNoteAdded }: ServiceNotesSectionProps) {
  const { t } = useTranslation()
  const [notes, setNotes] = useState<ServiceNote[]>(initialNotes || []);
  const [newNoteText, setNewNoteText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/recipes/${recipeId}/service-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: newNoteText.trim() }),
      });

      if (!response.ok) throw new Error('Failed to add service note');

      const data = await response.json();
      const newNote = data.note;

      setNotes([newNote, ...notes]);
      setNewNoteText('');
      setIsAdding(false);
      onNoteAdded?.(newNote);

      toast.success(t('serviceNotes.noteAdded'), {
        description: t('serviceNotes.noteAddedDesc')
      });
    } catch (error) {
      console.error('Error adding service note:', error);
      toast.error(t('serviceNotes.errorAdding'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning" />
            <div>
              <CardTitle className="text-lg">{t('serviceNotes.title')}</CardTitle>
              <CardDescription>
                {t('serviceNotes.description')}
              </CardDescription>
            </div>
          </div>
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('serviceNotes.addNote')}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-2 p-4 border rounded-lg bg-background">
            <Textarea
              placeholder={t('serviceNotes.writeNote')}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewNoteText('');
                }}
                disabled={loading}
              >
                {t('serviceNotes.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNoteText.trim() || loading}
              >
                {loading ? t('serviceNotes.saving') : t('serviceNotes.save')}
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('serviceNotes.noNotes')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex gap-3 p-3 rounded-lg bg-background border"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={note.created_by_profile?.avatar_url} />
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {note.created_by_profile?.full_name || t('serviceNotes.user')}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), {
                        addSuffix: true,
                        locale: it,
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.note_text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
