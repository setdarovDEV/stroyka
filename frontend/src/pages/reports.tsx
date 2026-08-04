import { enumLabel } from '@/lib/i18n';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { buildApiUrl } from '@/services/api';
import { Clock3, Download, FileSpreadsheet, LayoutGrid, Settings2 } from 'lucide-react';
import type { Paginated, ReportExport, ReportPeriod, ReportResult, ReportType } from '@/api/types';

const reportTypes: { value: ReportType; label: string }[] = [
  { value: 'GENERAL_SUMMARY', label: 'General Summary' },
  { value: 'ESTIMATE_VS_ACTUAL', label: 'Estimate vs Actual' },
  { value: 'MATERIALS_USAGE', label: 'Materials Usage' },
  { value: 'WAREHOUSE_STATE', label: 'Warehouse State' },
  { value: 'STOCK_MOVEMENT', label: 'Stock Movement' },
  { value: 'BRIGADE_WORKERS', label: 'Brigade Workers' },
  { value: 'MACHINE_HOURS', label: 'Machine Hours' },
  { value: 'CONSTRUCTION_PHASE', label: 'Construction Phase' },
  { value: 'FINANCIAL', label: 'Financial (Admin)' },
  { value: 'ALERT_RISK', label: 'Alert Risk' },
];

const periods: { value: ReportPeriod; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-Yearly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'FULL_PROJECT', label: 'Full Project' },
];

export function ReportsPage() {
  const { currentProject, user, language, t } = useApp();
  const [tab, setTab] = useState('generate');
  const [selectedType, setSelectedType] = useState<ReportType>('GENERAL_SUMMARY');
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('MONTHLY');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<ReportExport[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const projectId = currentProject?.id;

  const loadHistory = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api.get<Paginated<ReportExport>>(`/reports?page=1&limit=50`);
      setHistory(res.items || []);
    } catch { /* keep */ }
  }, [projectId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleGenerate() {
    if (!projectId) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await api.post<ReportResult>('/reports/export', { projectId, reportType: selectedType, period: selectedPeriod, format: 'xlsx' });
      setResult(res);
      loadHistory();
    } catch { alert(t('Failed to generate report')); }
    setGenerating(false);
  }

  async function handleDownload(filePath: string) {
    try {
      const res = await fetch(buildApiUrl(`/reports/download?filePath=${encodeURIComponent(filePath)}`), {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error(t('Download failed'));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert(t('Failed to download report')); }
  }

  const visibleTypes = reportTypes.filter((r) => isAdmin || r.value !== 'FINANCIAL');
  const recentExports = history.slice(0, 5);
  const selectedLabel = useMemo(
    () => visibleTypes.find((item) => item.value === selectedType)?.label ?? 'Report',
    [selectedType, visibleTypes],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Reports</Badge>
              {currentProject?.name ? <Badge variant="secondary">{currentProject.name}</Badge> : null}
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">Generate and download project reports</CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Use predefined report packages for monthly closeout, estimate control, warehouse oversight, and risk review.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Available reports</p>
                <p className="mt-2 text-3xl font-semibold">{visibleTypes.length}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Generated exports</p>
                <p className="mt-2 text-3xl font-semibold">{history.length}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Current default</p>
                <p className="mt-2 text-base font-semibold">{selectedLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent exports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentExports.length > 0 ? recentExports.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{enumLabel(item.reportType, language)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {enumLabel(item.period, language)} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline">{item.format}</Badge>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                No reports generated yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="generate" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Generate')}</TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('History')}</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-4">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Report catalog</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleTypes.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setSelectedType(r.value)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/20',
                        selectedType === r.value ? 'border-primary bg-muted/20 ring-1 ring-primary/40' : 'border-border'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{enumLabel(r.value, language)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{t('Excel export')}</p>
                        </div>
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{t('Report Settings')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('Report Type')}</label>
                  <div className="rounded-md bg-muted px-3 py-2 text-sm">{enumLabel(selectedType, language)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('Period')}</label>
                  <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}>
                    {periods.map((p) => <option key={p.value} value={p.value}>{enumLabel(p.value, language)}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('Format')}</label>
                  <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{t('Excel (.xlsx)')}</div>
                </div>
                <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                  {generating ? t('Generating...') : t('Generate Report')}
                </Button>
                {result ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('Report ready!')}</p>
                    <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => handleDownload(result.filePath)}>
                      <Download className="mr-2 h-3 w-3" />
                      {t('Download')}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Export history</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead>{t('Period')}</TableHead>
                  <TableHead>{t('Format')}</TableHead>
                  <TableHead>{t('Generated')}</TableHead>
                  <TableHead>{t('By')}</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="secondary">{enumLabel(r.reportType, language)}</Badge></TableCell>
                    <TableCell>{enumLabel(r.period, language)}</TableCell>
                    <TableCell>{r.format}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">{r.generatedByUser?.fullName || '-'}</TableCell>
                    <TableCell>
                      {r.filePath && (
                        <button onClick={() => handleDownload(r.filePath ?? '')} className="text-primary hover:text-primary/80">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('No reports generated yet')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
