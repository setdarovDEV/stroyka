import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { toast } from 'sonner';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, CheckCircle2, ClipboardCheck, FileSpreadsheet, Upload, Warehouse } from 'lucide-react';
import { errorMessage } from '@/services/api';
import type { EstimateLine, EstimateWorkbookImportStatus, Paginated } from '@/api/types';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export function EstimatePage() {
  const { currentProject, user, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('lines');
  const [stagedLines, setStagedLines] = useState<EstimateLine[]>([]);
  const [stagedTotal, setStagedTotal] = useState(0);
  const [activeImportJobId, setActiveImportJobId] = useState<string | null>(null);
  const [activeImportEstimateId, setActiveImportEstimateId] = useState<string | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const [estName, setEstName] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string>('');

  const isAdmin = user?.role === 'ADMIN';
  const projectId = currentProject?.id;
  const usingStagedLines = stagedLines.length > 0 && activeImportJobId !== null;

  const loadLines = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ projectId, page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await api.get<Paginated<EstimateLine>>(`/estimate-lines?${params}`);
      setLines(res.items || []);
      setTotal(res.total || 0);
    } catch { /* keep */ }
    setLoading(false);
  }, [projectId, page, search]);

  useEffect(() => { loadLines(); }, [loadLines]);

  const importStatusQuery = useQuery({
    queryKey: ['estimate-import-status', activeImportJobId],
    queryFn: () => api.get<EstimateWorkbookImportStatus>(`/estimates/import-status/${activeImportJobId!}`),
    enabled: Boolean(activeImportJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 1200;
    },
  });

  useEffect(() => {
    const status = importStatusQuery.data;
    if (!status || !activeImportJobId) return;

    if (status.status === 'QUEUED' || status.status === 'PARSING') {
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(t('Excel import in progress...'));
      } else {
        toast.loading(t('Excel import in progress...'), { id: toastIdRef.current });
      }
      return;
    }

    if (status.status === 'PARSED') {
      setStagedLines(status.stagedLines ?? []);
      setStagedTotal(status.stagedTotal ?? status.stagedLines?.length ?? 0);
      setActiveImportEstimateId(status.estimateId ?? null);
      setPage(1);
      setTab('lines');
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(t('Excel parsed. Importing lines into database...'));
      } else {
        toast.loading(t('Excel parsed. Importing lines into database...'), { id: toastIdRef.current });
      }
      return;
    }

    if (status.status === 'STORING') {
      if (status.stagedLines?.length) {
        setStagedLines(status.stagedLines);
        setStagedTotal(status.stagedTotal ?? status.stagedLines.length);
      }
      if (!toastIdRef.current) {
        toastIdRef.current = toast.loading(t('Excel parsed. Importing lines into database...'));
      } else {
        toast.loading(t('Excel parsed. Importing lines into database...'), { id: toastIdRef.current });
      }
      return;
    }

    if (status.status === 'COMPLETED') {
      setActiveImportJobId(null);
      setActiveImportEstimateId(null);
      setStagedLines([]);
      setStagedTotal(0);
      void loadLines();
      if (toastIdRef.current) {
        toast.success(t('Import successful'), { id: toastIdRef.current });
        toastIdRef.current = null;
      } else {
        toast.success(t('Import successful'));
      }
      setImportResult(`${t('Imported')} ${status.summary?.workRowsCount ?? 0} ${t('work rows')}, ${status.summary?.resourceRowsCount ?? 0} ${t('resource rows')}`);
      return;
    }

    setActiveImportJobId(null);
    setActiveImportEstimateId(null);
    setStagedLines([]);
    setStagedTotal(0);
    const message = `${t('Excel import failed')}: ${status.error || t('Unknown error')}`;
    setImportResult(message);
    if (toastIdRef.current) {
      toast.error(message, { id: toastIdRef.current });
      toastIdRef.current = null;
    } else {
      toast.error(message);
    }
  }, [activeImportJobId, importStatusQuery.data, loadLines, t]);

  async function handleImportExcel() {
    if (!excelFile || !estName || !projectId) return;
    setImportResult(t('Processing...'));
    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('name', estName);
      formData.set('file', excelFile);
      const result = await api.postForm<{ jobId: string; estimateId: string }>('/estimates/import-workbook', formData);
      setEstName('');
      setExcelFile(null);
      setStagedLines([]);
      setStagedTotal(0);
      setActiveImportEstimateId(result.estimateId);
      setActiveImportJobId(result.jobId);
      setImportResult(t('Excel import queued. Processing in background...'));
      setTab('lines');
    } catch (e: unknown) { setImportResult(`${t('Excel import failed')}: ${errorMessage(e, t('Unknown error'))}`); }
  }

  const visibleLines = usingStagedLines ? stagedLines : lines;

  const filtered = visibleLines.filter((l) =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.code?.toLowerCase().includes(search.toLowerCase())
  );

  const columnDefs = useMemo<ColDef<EstimateLine>[]>(() => {
    const columns: ColDef<EstimateLine>[] = [
      {
        field: 'code',
        headerName: t('Code'),
        minWidth: 140,
        cellClass: 'font-mono text-xs',
      },
      {
        field: 'name',
        headerName: t('Name'),
        minWidth: 320,
        flex: 1.4,
      },
      {
        field: 'category',
        headerName: t('Category'),
        minWidth: 160,
        valueGetter: (params) => params.data?.category || '-',
      },
      {
        field: 'plannedQuantity',
        headerName: t('Planned Qty'),
        minWidth: 140,
        type: 'numericColumn',
      },
      {
        field: 'usedQuantity',
        headerName: t('Used Qty'),
        minWidth: 140,
        type: 'numericColumn',
        valueGetter: (params) => params.data?.usedQuantity ?? 0,
      },
    ];

    if (isAdmin) {
      columns.push(
        {
          field: 'plannedUnitPrice',
          headerName: t('Unit Price'),
          minWidth: 140,
          type: 'numericColumn',
          valueFormatter: (params) => params.value?.toLocaleString?.() || '-',
        },
        {
          field: 'plannedTotalPrice',
          headerName: t('Total'),
          minWidth: 160,
          type: 'numericColumn',
          valueFormatter: (params) => params.value?.toLocaleString?.() || '-',
        },
      );
    }

    columns.push({
      colId: 'status',
      headerName: t('Status'),
      minWidth: 140,
      valueGetter: (params) => ((params.data?.usedQuantity ?? 0) > (params.data?.plannedQuantity ?? 0) ? t('Overused') : t('Normal')),
    });

    return columns;
  }, [isAdmin, t]);

  const defaultColDef = useMemo<ColDef<EstimateLine>>(
    () => ({
      resizable: true,
      sortable: true,
      minWidth: 120,
    }),
    [],
  );

  if (!projectId) {
    return (
      <div className="space-y-6">
        <Card className="border-border/70">
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="outline">Smeta workspace</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">Select a project to work with smeta</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The estimate flow is project-specific. Pick the active object first so imports, line items, warehouse control, and month-end reconciliation stay in one context.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/app/projects">
                Open projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Smeta workspace</Badge>
            <Badge variant="secondary">{currentProject?.name}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Planned work and source quantities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import cost-plan workbooks, review planned lines, and push the project toward warehouse execution and M-29 reconciliation.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Lines')}</p><p className="mt-2 text-2xl font-semibold">{total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Visible lines</p><p className="mt-2 text-2xl font-semibold">{filtered.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Current project</p><p className="mt-2 truncate text-sm font-semibold">{currentProject?.name}</p></CardContent></Card>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="lines" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Lines')}</TabsTrigger>
          <TabsTrigger value="import" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Import')}</TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="mt-4">
          <Card>
            <div className="p-4 border-b border-border">
              <Input placeholder={t('Search by code or name...')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
            </div>
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>Drag any column edge to resize.</span>
                <div className="flex items-center gap-2">
                  {usingStagedLines ? <Badge variant="warning">Pending import</Badge> : null}
                  {usingStagedLines ? <Badge variant="outline">Preview</Badge> : null}
                  <span>{filtered.length} visible rows</span>
                </div>
              </div>
              <div className="ag-theme-quartz-dark overflow-hidden rounded-lg border" style={{ height: 640 }}>
                <AgGridReact<EstimateLine>
                  theme={themeQuartz}
                  rowData={filtered}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  pagination={false}
                  headerHeight={44}
                  rowHeight={44}
                  animateRows
                  suppressCellFocus
                  suppressMovableColumns
                  overlayNoRowsTemplate={`<span class="text-muted-foreground">${t('No estimate lines found')}</span>`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-border text-sm text-muted-foreground">
              <span>{t('Page')} {page} {t('of')} {Math.ceil((usingStagedLines ? stagedTotal : total) / 20) || 1}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={usingStagedLines || page <= 1} onClick={() => setPage(p => p - 1)}>{t('Prev')}</Button>
                <Button variant="outline" size="sm" disabled={usingStagedLines || page * 20 >= total} onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
              </div>
            </div>
            {usingStagedLines ? (
              <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
                Previewing first {stagedLines.length} of {stagedTotal} parsed rows for estimate {activeImportEstimateId?.slice(0, 8) ?? '-'} while database insert finishes.
              </div>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-4 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle className="text-sm">Import smeta workbook</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={estName} onChange={(e) => setEstName(e.target.value)} placeholder={t('Estimate Name *')} />
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">{t('Upload Excel file (.xlsx, .xls)')}</p>
                <Input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                {excelFile && <p className="text-xs text-muted-foreground mt-2">{t('Selected')}: {excelFile.name}</p>}
                <Button variant="secondary" className="mt-3" onClick={handleImportExcel} disabled={!excelFile || !estName}>
                  {t('Import Excel File')}
                </Button>
              </div>
              {importResult && (
                <div className={`p-3 rounded-md text-sm ${importResult.includes('failed') || importResult.includes('Invalid') ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-400'}`}>
                  {importResult}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">What happens next</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-medium">1. Import and validate the workbook</p>
                    <p className="mt-1 text-sm text-muted-foreground">Bring the approved smeta into one active project context.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Warehouse className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">2. Issue materials against planned lines</p>
                    <p className="mt-1 text-sm text-muted-foreground">Warehouse control should follow planned scope, not raw ad hoc requests.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <ClipboardCheck className="mt-0.5 h-5 w-5 text-amber-400" />
                  <div>
                    <p className="font-medium">3. Reconcile month-end into M-29</p>
                    <p className="mt-1 text-sm text-muted-foreground">Close the period by comparing planned scope, actual movement, and write-off readiness.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/app/warehouse">Open warehouse</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link to="/app/reports">Open reports</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
