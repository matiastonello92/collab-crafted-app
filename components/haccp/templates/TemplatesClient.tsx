'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, AlertCircle } from 'lucide-react';

interface TemplatesClientProps {
  locationId: string;
}

export function TemplatesClient({ locationId }: TemplatesClientProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['haccp-templates', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('haccp_templates')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="p-6">Loading templates...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HACCP Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage HACCP task templates
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template: any) => (
          <Card key={template.id} className="p-6">
            <div className="flex items-start justify-between">
              <FileText className="h-8 w-8 text-primary" />
              <span className={`px-2 py-1 text-xs rounded-full ${
                template.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {template.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="font-semibold mt-4">{template.name}</h3>
            <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {template.recurrence_type || 'One-time'}
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {template.priority}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first HACCP task template to get started
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      )}
    </div>
  );
}
