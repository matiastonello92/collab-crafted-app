'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { hapticLight } from '@/lib/capacitor/native';
import { format } from 'date-fns';

interface TaskEvidenceListProps {
  taskId: string;
  evidences: any[];
  onUpdate: () => void;
}

export function TaskEvidenceList({ taskId, evidences, onUpdate }: TaskEvidenceListProps) {
  const { isMobile } = useBreakpoint();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large (max 5MB)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (caption) formData.append('caption', caption);

      const response = await fetch(`/api/v1/haccp/tasks/${taskId}/evidences`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await hapticLight();
      toast.success('Evidence uploaded successfully');
      setSelectedFile(null);
      setCaption('');
      setShowUploadDialog(false);
      onUpdate();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload evidence');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (evidenceId: string) => {
    if (!confirm('Delete this evidence? This action cannot be undone.')) return;

    try {
      const response = await fetch(
        `/api/v1/haccp/tasks/${taskId}/evidences?evidence_id=${evidenceId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await hapticLight();
      toast.success('Evidence deleted');
      onUpdate();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete evidence');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Evidence Files</CardTitle>
            <CardDescription>Photos and videos attached to this task</CardDescription>
          </div>
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px]">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className={isMobile ? 'max-w-[95vw]' : undefined}>
              <DialogHeader>
                <DialogTitle>Upload Evidence</DialogTitle>
                <DialogDescription>
                  Add photo or video evidence for this task
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="min-h-[44px] mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 5MB • Images or videos
                  </p>
                </div>

                {selectedFile && (
                  <div className="p-3 rounded-lg border bg-muted">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="caption">Caption (optional)</Label>
                  <Input
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[44px] mt-2"
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full min-h-[44px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Evidence'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {evidences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No evidence files yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {evidences.map((evidence) => (
              <div key={evidence.id} className="relative group">
                <div className="aspect-video rounded-lg border overflow-hidden bg-muted">
                  {evidence.file_type?.startsWith('image/') ? (
                    <img
                      src={evidence.public_url || `/api/storage/haccp-evidence/${evidence.file_url}`}
                      alt={evidence.caption || 'Evidence'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(evidence.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {evidence.caption && (
                  <p className="text-sm mt-2 text-muted-foreground">{evidence.caption}</p>
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(evidence.uploaded_at), 'MMM dd, HH:mm')}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
