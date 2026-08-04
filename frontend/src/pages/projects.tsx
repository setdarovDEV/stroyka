import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FolderPlus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Paginated, Project } from '@/api/types';

export function ProjectsPage() {
  const { user, currentProject, setCurrentProject, language, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Project>>(`/projects?page=${page}&limit=20`);
      setProjects(res.items || []);
      setTotal(res.total || 0);
    } catch { /* keep */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleCreate() {
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await api.post<Project>('/projects', { name, address: address || undefined, clientName: clientName || undefined, startDate: startDate || undefined, plannedEndDate: plannedEndDate || undefined });
      setShowCreate(false);
      setName(''); setAddress(''); setClientName(''); setStartDate(''); setPlannedEndDate('');
      setCurrentProject(res);
      loadProjects();
    } catch { alert(t('Failed to create project')); }
    setCreating(false);
  }

  function selectProject(project: Project) {
    setCurrentProject(project);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {currentProject ? `${t('Current')}: ${currentProject.name}` : t('No project selected')}
        </p>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <FolderPlus className="w-4 h-4 mr-2" /> {t('New Project')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => selectProject(p)}
            className={cn(
              'p-5 rounded-lg border text-left transition-all hover:border-primary/50 bg-card',
              currentProject?.id === p.id ? 'border-primary ring-1 ring-primary' : 'border-border'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="font-medium">{p.name}</p>
              {currentProject?.id === p.id && <Check className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {p.address && <p>{p.address}</p>}
              {p.clientName && <p>{t('Client')}: {p.clientName}</p>}
              {p.startDate && <p>{t('Start')}: {new Date(p.startDate).toLocaleDateString()}</p>}
              {p.plannedEndDate && <p>{t('End')}: {new Date(p.plannedEndDate).toLocaleDateString()}</p>}
            </div>
            <div className="mt-3">
              <Badge variant={p.status === 'ACTIVE' ? 'success' : p.status === 'PLANNING' ? 'info' : 'default'}>{p.status}</Badge>
            </div>
            {p._count && (
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>{p._count.estimates} {t('estimates')}</span>
                <span>{p._count.alerts} {t('alerts')}</span>
              </div>
            )}
          </button>
        ))}
        {projects.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p className="text-lg">{t('No projects yet')}</p>
            {isAdmin && <p className="text-sm mt-1">{t('Create your first project to get started')}</p>}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('Create Project')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Project Name *')} />
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('Address')} />
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={t('Client / Investor Name')} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t('Start Date')}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t('Planned End Date')}</label>
                <Input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreate} disabled={!name || creating}>{creating ? t('Creating...') : t('Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
