import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { enumLabel } from '@/lib/i18n';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, Plus } from 'lucide-react';
import type { BadgeVariant, MaterialRequest, Paginated } from '@/api/types';

export function MaterialRequestsPage() {
  const { currentProject, user, language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitId, setUnitId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const projectId = currentProject?.id;

  const loadRequests = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get<Paginated<MaterialRequest>>(`/material-requests?projectId=${projectId}&page=${page}&limit=20`);
      setRequests(res.items || []);
    } catch { /* keep */ }
    setLoading(false);
  }, [projectId, page]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  async function handleCreate() {
    if (!materialId || !quantity || !unitId || !projectId) return;
    try {
      await api.post('/material-requests', { projectId, materialId, quantity: parseFloat(quantity), unitId, purpose, notes: notes || undefined });
      setShowCreate(false);
      setMaterialId(''); setQuantity(''); setUnitId(''); setPurpose(''); setNotes('');
      loadRequests();
    } catch { alert(t('Failed to create request')); }
  }

  async function handleApprove(id: string) {
    try {
      await api.post(`/material-requests/${id}/approve-reject`, { status: 'APPROVED', notes: t('Approved by admin') });
      loadRequests();
    } catch { alert(t('Failed to approve')); }
  }

  async function handleReject(id: string) {
    try {
      await api.post(`/material-requests/${id}/approve-reject`, { status: 'REJECTED', notes: t('Rejected') });
      loadRequests();
    } catch { alert(t('Failed to reject')); }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, BadgeVariant> = { DRAFT: 'secondary', SUBMITTED: 'info', APPROVED: 'success', REJECTED: 'danger', FULFILLED: 'success' };
    return <Badge variant={map[s] || 'secondary'}>{enumLabel(s, language)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('Request materials from warehouse')}</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t('New Request')}
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Requested By')}</TableHead>
              <TableHead>{t('Material ID')}</TableHead>
              <TableHead className="text-right">{t('Quantity')}</TableHead>
              <TableHead>{t('Purpose')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Approved By')}</TableHead>
              {isAdmin && <TableHead className="w-24">{t('Actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.requestedByUser?.fullName || r.requestedBy}</TableCell>
                <TableCell className="font-mono text-xs">{r.materialId}</TableCell>
                <TableCell className="text-right">{r.quantity}</TableCell>
                <TableCell className="text-muted-foreground">{r.purpose || '-'}</TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-muted-foreground">{r.approvedByUser?.fullName || '-'}</TableCell>
                {isAdmin && r.status === 'DRAFT' && (
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(r.id)} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => handleReject(r.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-8">{t('No material requests')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-4 border-t border-border text-sm text-muted-foreground">
          <span>{t('Page')} {page}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Prev')}</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
          </div>
        </div>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Create Material Request')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={materialId} onChange={(e) => setMaterialId(e.target.value)} placeholder={t('Material ID *')} />
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={t('Quantity *')} />
            <Input value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder={t('Unit ID *')} />
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t('Purpose')} />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Notes')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreate}>{t('Create Request')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
