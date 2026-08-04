import { enumLabel } from '@/lib/i18n';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Box, Clock3, Layers3, Plus, ScanSearch, TimerReset } from 'lucide-react';
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
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<Paginated<Zone>>(`/zones?projectId=${projectId}&page=1&limit=50`);
      setZones(res.items || []);
    } catch {
      setZones([]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  async function handleCreate() {
    if (!name || !projectId) return;
    try {
      await api.post('/zones', { projectId, name, floor: floor || undefined, section: section || undefined, status });
      setShowCreate(false);
      setName('');
      setFloor('');
      setSection('');
      setStatus('NOT_STARTED');
      void loadZones();
    } catch {
      alert(t('Failed to create zone'));
    }
  }

  async function handleUpdateProgress(id: string, progress: number) {
    try {
      await api.put(`/zones/${id}`, {
        progressPercent: progress,
        status: progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      });
      void loadZones();
    } catch {
      alert(t('Failed to update zone'));
    }
  }

  const statusBadge = (value: string) => {
    const map: Record<string, BadgeVariant> = {
      NOT_STARTED: 'secondary',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      DELAYED: 'warning',
      OVER_BUDGET: 'danger',
    };

    return <Badge variant={map[value] || 'secondary'}>{enumLabel(value, language)}</Badge>;
  };

  const stats = useMemo(() => {
    const total = zones.length;
    const completed = zones.filter((zone) => zone.status === 'COMPLETED').length;
    const inProgress = zones.filter((zone) => zone.status === 'IN_PROGRESS').length;
    const delayed = zones.filter((zone) => zone.status === 'DELAYED' || zone.status === 'OVER_BUDGET').length;
    const avgProgress = total ? Math.round(zones.reduce((sum, zone) => sum + (zone.progressPercent ?? 0), 0) / total) : 0;

    return { total, completed, inProgress, delayed, avgProgress };
  }, [zones]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Zones</Badge>
              {currentProject?.name ? <Badge variant="secondary">{currentProject.name}</Badge> : null}
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl">Construction zone control</CardTitle>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Organize floors and sections into clear execution zones so progress, sequencing, and later 3D visualization stay aligned.
                </p>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('Add Zone')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Total zones</p>
                <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Average progress</p>
                <p className="mt-2 text-3xl font-semibold">{stats.avgProgress}%</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Active zones</p>
                <p className="mt-2 text-3xl font-semibold">{stats.inProgress}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Delayed zones</p>
                <p className="mt-2 text-3xl font-semibold">{stats.delayed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zone health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <Layers3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{stats.completed} completed</p>
                  <p className="text-sm text-muted-foreground">Ready for downstream visualization and progress reporting.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{stats.inProgress} in progress</p>
                  <p className="text-sm text-muted-foreground">Zones currently moving through active execution.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <TimerReset className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{stats.delayed} need attention</p>
                  <p className="text-sm text-muted-foreground">Delayed or over-budget zones should be corrected early.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zone workspace</CardTitle>
          <p className="text-sm text-muted-foreground">Adjust execution progress zone by zone, then review the full list below.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {zones.map((zone) => (
              <Card key={zone.id} className="border-border/70">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium">{zone.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {[
                          zone.floor ? `${t('Floor')}: ${zone.floor}` : null,
                          zone.section ? `${t('Section')}: ${zone.section}` : null,
                        ]
                          .filter(Boolean)
                          .join(' • ') || t('No location details')}
                      </p>
                    </div>
                    {statusBadge(zone.status)}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('Progress')}</span>
                      <span className="font-medium">{zone.progressPercent || 0}%</span>
                    </div>
                    <Progress value={zone.progressPercent || 0} />
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('Set progress')}</span>
                      <span className="font-mono">{zone.progressPercent || 0}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={zone.progressPercent || 0}
                      onChange={(event) => handleUpdateProgress(zone.id, parseInt(event.target.value))}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {zones.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                <Box className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>{t('No zones created yet')}</p>
                <p className="mt-1 text-sm">{t('Add zones to visualize in the 3D building prototype')}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Zone register</CardTitle>
            <p className="text-sm text-muted-foreground">A compact operational list for handoff, checking, and reporting.</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScanSearch className="h-4 w-4" />
            {loading ? t('Loading...') : `${zones.length} ${t('zones')}`}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Zone')}</TableHead>
                <TableHead>{t('Floor')}</TableHead>
                <TableHead>{t('Section')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Progress')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell>{zone.floor || '-'}</TableCell>
                  <TableCell>{zone.section || '-'}</TableCell>
                  <TableCell>{statusBadge(zone.status)}</TableCell>
                  <TableCell className="w-[240px]">
                    <div className="flex items-center gap-3">
                      <Progress value={zone.progressPercent || 0} className="flex-1" />
                      <span className="w-10 text-right text-sm text-muted-foreground">{zone.progressPercent || 0}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t('No zones created yet')}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Create Zone')}</DialogTitle>
          </DialogHeader>
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
