import { enumLabel } from '@/lib/i18n';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Box } from 'lucide-react';
import type { BadgeVariant, Paginated, Zone } from '@/api/types';

export function ZonesPage() {
  const { currentProject, language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [floor, setFloor] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('NOT_STARTED');

  const projectId = currentProject?.id;

  const loadZones = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get<Paginated<Zone>>(`/zones?projectId=${projectId}&page=1&limit=50`);
      setZones(res.items || []);
    } catch { /* keep */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadZones(); }, [loadZones]);

  async function handleCreate() {
    if (!name || !projectId) return;
    try {
      await api.post('/zones', { projectId, name, floor: floor || undefined, section: section || undefined, status });
      setShowCreate(false);
      setName(''); setFloor(''); setSection(''); setStatus('NOT_STARTED');
      loadZones();
    } catch { alert(t('Failed to create zone')); }
  }

  async function handleUpdateProgress(id: string, progress: number) {
    try {
      await api.put(`/zones/${id}`, { progressPercent: progress, status: progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED' });
      loadZones();
    } catch { alert(t('Failed to update zone')); }
  }

  const statusBadge = (s: string) => {
    const map: Record<string, BadgeVariant> = { NOT_STARTED: 'secondary', IN_PROGRESS: 'info', COMPLETED: 'success', DELAYED: 'warning', OVER_BUDGET: 'danger' };
    return <Badge variant={map[s] || 'secondary'}>{enumLabel(s, language)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Zones')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Manage construction zones for 3D visualization')}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> {t('Add Zone')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((z) => (
          <Card key={z.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-sm">{z.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {z.floor && <span>{t('Floor')}: {z.floor}</span>}
                    {z.floor && z.section && ' | '}
                    {z.section && <span>{t('Section')}: {z.section}</span>}
                  </p>
                </div>
                {statusBadge(z.status)}
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{t('Progress')}</span>
                  <span>{z.progressPercent || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${Math.min(z.progressPercent || 0, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('Set progress:')}</span>
                <input
                  type="range" min="0" max="100" step="5"
                  value={z.progressPercent || 0}
                  onChange={(e) => handleUpdateProgress(z.id, parseInt(e.target.value))}
                  className="flex-1 h-1.5"
                />
                <span className="text-xs font-mono w-8 text-right">{z.progressPercent || 0}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {zones.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('No zones created yet')}</p>
            <p className="text-sm mt-1">{t('Add zones to visualize in the 3D building prototype')}</p>
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Create Zone')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Zone Name *')} />
            <Input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder={t('Floor (e.g. 1, 2, 3)')} />
            <Input value={section} onChange={(e) => setSection(e.target.value)} placeholder={t('Section (e.g. A, B, C)')} />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="NOT_STARTED">{t('Not Started')}</option>
              <option value="IN_PROGRESS">{t('In Progress')}</option>
              <option value="COMPLETED">{t('Completed')}</option>
              <option value="DELAYED">{t('Delayed')}</option>
              <option value="OVER_BUDGET">{t('Over Budget')}</option>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreate}>{t('Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
