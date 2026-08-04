import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { enumLabel } from '@/lib/i18n';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Bell } from 'lucide-react';
import type { Alert, BadgeVariant, Paginated } from '@/api/types';

export function AlertsPage() {
  const { currentProject, language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const projectId = currentProject?.id;

  const loadAlerts = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId, page: String(page), limit: '20' });
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterStatus) params.set('status', filterStatus);
      const res = await api.get<Paginated<Alert>>(`/alerts?${params}`);
      setAlerts(res.items || []);
      setTotal(res.total || 0);
    } catch { /* keep */ }
    setLoading(false);
  }, [projectId, page, filterSeverity, filterStatus]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  async function handleResolve(id: string) {
    try {
      await api.post(`/alerts/${id}/resolve`, {});
      loadAlerts();
    } catch { alert(t('Failed to resolve alert')); }
  }

  async function handleAcknowledge(id: string) {
    try {
      await api.patch(`/alerts/${id}`, { status: 'ACKNOWLEDGED' });
      loadAlerts();
    } catch { alert(t('Failed to update alert')); }
  }

  const severityBadge = (s: string): BadgeVariant => {
    const map: Record<string, BadgeVariant> = { CRITICAL: 'danger', WARNING: 'warning', INFO: 'info' };
    return map[s] || 'default';
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t('Monitor and manage system warnings')}</p>

      <div className="flex gap-4">
        <Select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(1); }}>
          <option value="">{t('All Severities')}</option>
          <option value="CRITICAL">{t('Critical')}</option>
          <option value="WARNING">{t('Warning')}</option>
          <option value="INFO">{t('Info')}</option>
        </Select>
        <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">{t('All Statuses')}</option>
          <option value="NEW">{t('New')}</option>
          <option value="ACKNOWLEDGED">{t('Acknowledged')}</option>
          <option value="RESOLVED">{t('Resolved')}</option>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{total} {t('alerts')}</span>
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <Card
            key={a.id}
            className={cn(
              'transition-colors',
              a.status === 'RESOLVED' ? 'opacity-80' : 'hover:border-primary/30',
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={severityBadge(a.severity)}>{enumLabel(a.severity, language)}</Badge>
                    <Badge variant={a.status === 'NEW' ? 'danger' : a.status === 'ACKNOWLEDGED' ? 'warning' : 'success'}>
                      {a.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{a.type}</span>
                  </div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.status === 'NEW' && (
                    <Button variant="outline" size="sm" onClick={() => handleAcknowledge(a.id)}>
                      <Bell className="w-3 h-3 mr-1" /> {t('Ack')}
                    </Button>
                  )}
                  {a.status !== 'RESOLVED' && (
                    <Button variant="outline" size="sm" onClick={() => handleResolve(a.id)}>
                      <CheckCircle className="w-3 h-3 mr-1" /> {t('Resolve')}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('No alerts found')}</p>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('Page')} {page}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Prev')}</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
