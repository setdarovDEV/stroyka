import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import type { Brigade, Machine, MachineLog, Paginated, WorkLog } from '@/api/types';

export function BrigadesPage() {
  const { currentProject, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineLogs, setMachineLogs] = useState<MachineLog[]>([]);
  const [tab, setTab] = useState('brigades');

  const [showBrigadeForm, setShowBrigadeForm] = useState(false);
  const [showWorkLogForm, setShowWorkLogForm] = useState(false);
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [showMachineLogForm, setShowMachineLogForm] = useState(false);

  const [brName, setBrName] = useState(''); const [brType, setBrType] = useState('');
  const [brResponsible, setBrResponsible] = useState(''); const [brWorkers, setBrWorkers] = useState('');

  const [wlBrigadeId, setWlBrigadeId] = useState(''); const [wlDate, setWlDate] = useState('');
  const [wlDesc, setWlDesc] = useState(''); const [wlWorkers, setWlWorkers] = useState('');
  const [wlHours, setWlHours] = useState(''); const [wlOutput, setWlOutput] = useState('');

  const [mName, setMName] = useState(''); const [mType, setMType] = useState('');
  const [mModel, setMModel] = useState('');

  const [mlMachineId, setMlMachineId] = useState(''); const [mlDate, setMlDate] = useState('');
  const [mlHours, setMlHours] = useState(''); const [mlDesc, setMlDesc] = useState('');
  const [mlOperator, setMlOperator] = useState('');

  const projectId = currentProject?.id;

  const loadData = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [b, w, m, ml] = await Promise.all([
        api.get<Paginated<Brigade>>(`/brigades?projectId=${projectId}`),
        api.get<Paginated<WorkLog>>(`/work-logs?projectId=${projectId}`),
        api.get<Paginated<Machine>>(`/machines?projectId=${projectId}`),
        api.get<Paginated<MachineLog>>(`/machine-logs?projectId=${projectId}`),
      ]);
      setBrigades(b.items || []);
      setWorkLogs(w.items || []);
      setMachines(m.items || []);
      setMachineLogs(ml.items || []);
    } catch { /* keep */ }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateBrigade() {
    if (!brName || !projectId) return;
    await api.post('/brigades', { projectId, name: brName, type: brType || undefined, responsiblePerson: brResponsible || undefined, numberOfWorkers: brWorkers ? parseInt(brWorkers) : undefined });
    setShowBrigadeForm(false); setBrName(''); setBrType(''); setBrResponsible(''); setBrWorkers('');
    loadData();
  }

  async function handleCreateWorkLog() {
    if (!wlBrigadeId || !projectId) return;
    await api.post('/work-logs', { brigadeId: wlBrigadeId, projectId, workDate: wlDate || undefined, workDescription: wlDesc || undefined, workerCount: wlWorkers ? parseInt(wlWorkers) : undefined, hoursWorked: wlHours ? parseFloat(wlHours) : undefined, outputProgress: wlOutput ? parseFloat(wlOutput) : undefined });
    setShowWorkLogForm(false); setWlBrigadeId(''); setWlDate(''); setWlDesc(''); setWlWorkers(''); setWlHours(''); setWlOutput('');
    loadData();
  }

  async function handleCreateMachine() {
    if (!mName || !projectId) return;
    await api.post('/machines', { projectId, name: mName, type: mType || undefined, model: mModel || undefined });
    setShowMachineForm(false); setMName(''); setMType(''); setMModel('');
    loadData();
  }

  async function handleCreateMachineLog() {
    if (!mlMachineId || !projectId) return;
    await api.post('/machine-logs', { machineId: mlMachineId, projectId, workDate: mlDate || undefined, hoursWorked: mlHours ? parseFloat(mlHours) : undefined, description: mlDesc || undefined, operatorName: mlOperator || undefined });
    setShowMachineLogForm(false); setMlMachineId(''); setMlDate(''); setMlHours(''); setMlDesc(''); setMlOperator('');
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('Worker teams, work logs, machines, and machine logs')}</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowBrigadeForm(true)}><Plus className="w-4 h-4 mr-1" /> {t('Brigade')}</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowWorkLogForm(true)}><Plus className="w-4 h-4 mr-1" /> {t('Work Log')}</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowMachineForm(true)}><Plus className="w-4 h-4 mr-1" /> {t('Machine')}</Button>
          <Button variant="secondary" size="sm" onClick={() => setShowMachineLogForm(true)}><Plus className="w-4 h-4 mr-1" /> {t('Machine Log')}</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="brigades" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Brigades')}</TabsTrigger>
          <TabsTrigger value="worklogs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Work Logs')}</TabsTrigger>
          <TabsTrigger value="machines" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Machines')}</TabsTrigger>
          <TabsTrigger value="machinelogs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Machine Logs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="brigades" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brigades.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{b.name}</h3>
                    <Badge variant={b.status === 'ACTIVE' ? 'success' : 'secondary'}>{b.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>{t('Type')}: {b.type || '-'}</p>
                    <p>{t('Responsible')}: {b.responsiblePerson || '-'}</p>
                    <p>{t('Workers')}: {b.numberOfWorkers || 0}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{t('Progress')}</span><span>{b.actualProgress || 0}%</span></div>
                    <Progress value={b.actualProgress || 0} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="worklogs" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Brigade')}</TableHead>
                  <TableHead className="text-right">{t('Workers')}</TableHead>
                  <TableHead className="text-right">{t('Hours')}</TableHead>
                  <TableHead className="text-right">{t('Output %')}</TableHead>
                  <TableHead>{t('Description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(l.workDate).toLocaleDateString()}</TableCell>
                    <TableCell>{l.brigade?.name || l.brigadeId}</TableCell>
                    <TableCell className="text-right">{l.workerCount}</TableCell>
                    <TableCell className="text-right">{l.hoursWorked}</TableCell>
                    <TableCell className="text-right">{l.outputProgress || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.workDescription || '-'}</TableCell>
                  </TableRow>
                ))}
                {workLogs.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('No work logs')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="machines" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{m.name}</h3>
                    <Badge variant={m.status === 'IN_USE' ? 'info' : 'secondary'}>{m.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('Type')}: {m.type || '-'} | {t('Model')}: {m.model || '-'}</p>
                  {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="machinelogs" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Date')}</TableHead>
                  <TableHead>{t('Machine')}</TableHead>
                  <TableHead className="text-right">{t('Hours')}</TableHead>
                  <TableHead>{t('Operator')}</TableHead>
                  <TableHead>{t('Description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(l.workDate).toLocaleDateString()}</TableCell>
                    <TableCell>{l.machine?.name || l.machineId}</TableCell>
                    <TableCell className="text-right">{l.hoursWorked}</TableCell>
                    <TableCell>{l.operatorName || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{l.description || '-'}</TableCell>
                  </TableRow>
                ))}
                {machineLogs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t('No machine logs')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showBrigadeForm} onOpenChange={setShowBrigadeForm}>
        <DialogContent><DialogHeader><DialogTitle>{t('Create Brigade')}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <Input value={brName} onChange={(e) => setBrName(e.target.value)} placeholder={t('Brigade Name *')} />
          <Input value={brType} onChange={(e) => setBrType(e.target.value)} placeholder={t('Type (concrete, rebar...)')} />
          <Input value={brResponsible} onChange={(e) => setBrResponsible(e.target.value)} placeholder={t('Responsible Person')} />
          <Input type="number" value={brWorkers} onChange={(e) => setBrWorkers(e.target.value)} placeholder={t('Number of Workers')} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowBrigadeForm(false)}>{t('Cancel')}</Button><Button onClick={handleCreateBrigade}>{t('Create')}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showWorkLogForm} onOpenChange={setShowWorkLogForm}>
        <DialogContent><DialogHeader><DialogTitle>{t('Create Work Log')}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <Select value={wlBrigadeId} onChange={(e) => setWlBrigadeId(e.target.value)}>
            <option value="">{t('Select Brigade *')}</option>
            {brigades.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
          <Input type="date" value={wlDate} onChange={(e) => setWlDate(e.target.value)} />
          <Input value={wlDesc} onChange={(e) => setWlDesc(e.target.value)} placeholder={t('Work Description')} />
          <div className="grid grid-cols-3 gap-3">
            <Input type="number" value={wlWorkers} onChange={(e) => setWlWorkers(e.target.value)} placeholder={t('Workers')} />
            <Input type="number" value={wlHours} onChange={(e) => setWlHours(e.target.value)} placeholder={t('Hours')} />
            <Input type="number" value={wlOutput} onChange={(e) => setWlOutput(e.target.value)} placeholder={t('Output %')} />
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowWorkLogForm(false)}>{t('Cancel')}</Button><Button onClick={handleCreateWorkLog}>{t('Create')}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showMachineForm} onOpenChange={setShowMachineForm}>
        <DialogContent><DialogHeader><DialogTitle>{t('Create Machine')}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder={t('Machine Name *')} />
          <Input value={mType} onChange={(e) => setMType(e.target.value)} placeholder={t('Type (Crane, Excavator...)')} />
          <Input value={mModel} onChange={(e) => setMModel(e.target.value)} placeholder={t('Model')} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowMachineForm(false)}>{t('Cancel')}</Button><Button onClick={handleCreateMachine}>{t('Create')}</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showMachineLogForm} onOpenChange={setShowMachineLogForm}>
        <DialogContent><DialogHeader><DialogTitle>{t('Create Machine Log')}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-4">
          <Select value={mlMachineId} onChange={(e) => setMlMachineId(e.target.value)}>
            <option value="">{t('Select Machine *')}</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Input type="date" value={mlDate} onChange={(e) => setMlDate(e.target.value)} />
          <Input type="number" value={mlHours} onChange={(e) => setMlHours(e.target.value)} placeholder={t('Hours Worked')} />
          <Input value={mlOperator} onChange={(e) => setMlOperator(e.target.value)} placeholder={t('Operator Name')} />
          <Input value={mlDesc} onChange={(e) => setMlDesc(e.target.value)} placeholder={t('Description')} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowMachineLogForm(false)}>{t('Cancel')}</Button><Button onClick={handleCreateMachineLog}>{t('Create')}</Button></DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}
