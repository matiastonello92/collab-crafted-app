'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Search, RefreshCw, Filter, ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  provider_id?: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  metadata: Record<string, any>;
}

interface EmailLogsClientProps {
  orgId: string;
}

export function EmailLogsClient({ orgId }: EmailLogsClientProps) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const supabase = createSupabaseBrowserClient();
  const { t } = useTranslation();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = (supabase.from('email_logs') as any)
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (typeFilter !== 'all') {
        query = query.eq('email_type', typeFilter);
      }

      if (searchTerm) {
        query = query.or(`recipient_email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching email logs:', error);
      toast.error(t('admin.emailLogsErrorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, typeFilter]);

  const getStatusBadge = (status: string) => {
    const config = {
      sent: { icon: CheckCircle2, variant: 'default' as const, label: t('admin.emailLogsSent'), color: 'text-green-600' },
      pending: { icon: Clock, variant: 'secondary' as const, label: t('admin.emailLogsPending'), color: 'text-yellow-600' },
      failed: { icon: XCircle, variant: 'destructive' as const, label: t('admin.emailLogsFailed'), color: 'text-red-600' },
      bounced: { icon: AlertTriangle, variant: 'destructive' as const, label: t('admin.emailLogsBounced'), color: 'text-orange-600' }
    };

    const { icon: Icon, variant, label, color } = config[status as keyof typeof config] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {label}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rota_published: t('admin.emailLogsRotaPublished'),
      shift_assignment_change: t('admin.emailLogsShiftChange'),
      leave_decision: t('admin.emailLogsLeaveDecision')
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/settings">
            <ArrowLeft className="h-4 w-4" />
            {t('admin.backToSettings')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('admin.emailLogs')}
              </CardTitle>
              <CardDescription>
                {t('admin.emailLogsDesc')}
              </CardDescription>
            </div>
            <Button
              onClick={fetchLogs}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.emailLogsRefresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.emailLogsSearch')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchLogs();
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('admin.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.emailLogsAllStatuses')}</SelectItem>
                <SelectItem value="sent">{t('admin.emailLogsSent')}</SelectItem>
                <SelectItem value="pending">{t('admin.emailLogsPending')}</SelectItem>
                <SelectItem value="failed">{t('admin.emailLogsFailed')}</SelectItem>
                <SelectItem value="bounced">{t('admin.emailLogsBounced')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[220px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('admin.emailLogsType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.emailLogsAllTypes')}</SelectItem>
                <SelectItem value="rota_published">{t('admin.emailLogsRotaPublished')}</SelectItem>
                <SelectItem value="shift_assignment_change">{t('admin.emailLogsShiftChange')}</SelectItem>
                <SelectItem value="leave_decision">{t('admin.emailLogsLeaveDecision')}</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTypeFilter('all');
                }}
              >
                {t('admin.emailLogsResetFilters')}
              </Button>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.emailLogsDate')}</TableHead>
                  <TableHead>{t('admin.emailLogsRecipient')}</TableHead>
                  <TableHead>{t('admin.emailLogsType')}</TableHead>
                  <TableHead>{t('admin.emailLogsSubject')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.emailLogsDetails')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('admin.loading')}
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t('admin.emailLogsNone')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: it })}
                      </TableCell>
                      <TableCell className="font-medium">{log.recipient_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTypeLabel(log.email_type)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-right">
                        {log.error_message && (
                          <span className="text-xs text-destructive" title={log.error_message}>
                            {log.error_message.substring(0, 30)}...
                          </span>
                        )}
                        {log.provider_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.provider_id.substring(0, 8)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.status === 'sent').length}
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.emailLogsSent')}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {logs.filter(l => l.status === 'pending').length}
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.emailLogsPending')}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.status === 'failed').length}
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.emailLogsFailed')}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {logs.filter(l => l.status === 'bounced').length}
              </div>
              <div className="text-xs text-muted-foreground">{t('admin.emailLogsBounced')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
