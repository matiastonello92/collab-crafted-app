'use client';

import { useState, useRef, useEffect } from 'react';
import { useMentionSuggestions } from '@/hooks/useMentionSuggestions';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect?: (userId: string) => void;
  placeholder?: string;
  locationId?: string;
  className?: string;
  maxLength?: number;
}

export function MentionInput({
  value,
  onChange,
  onMentionSelect,
  placeholder,
  locationId,
  className,
  maxLength,
}: MentionInputProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { users, isLoading } = useMentionSuggestions(query, locationId);

  useEffect(() => {
    // Detect @ symbol and extract query
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/@(\w*)$/);

    if (match) {
      setQuery(match[1]);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setQuery('');
    }
  }, [value]);

  const insertMention = (userName: string, userId: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    
    // Find the @ symbol position
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const newValue = 
      value.slice(0, atIndex) + 
      `@${userName} ` + 
      textAfterCursor;

    onChange(newValue);
    onMentionSelect?.(userId);
    setShowSuggestions(false);

    // Set cursor after mention
    setTimeout(() => {
      const newPosition = atIndex + userName.length + 2;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || users.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % users.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault();
      const selectedUser = users[selectedIndex];
      if (selectedUser) {
        insertMention(selectedUser.full_name, selectedUser.id);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('resize-none', className)}
        maxLength={maxLength}
      />

      {/* Suggestions Popover */}
      {showSuggestions && users.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-popover border rounded-lg shadow-lg overflow-hidden z-50">
          <div className="max-h-48 overflow-y-auto">
            {users.map((user, index) => (
              <button
                key={user.id}
                type="button"
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors',
                  index === selectedIndex && 'bg-accent'
                )}
                onClick={() => insertMention(user.full_name, user.id)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>
                    {user.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user.full_name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && showSuggestions && (
        <div className="absolute bottom-full left-0 mb-2 w-full max-w-sm bg-popover border rounded-lg shadow-lg p-3 z-50">
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      )}
    </div>
  );
}
