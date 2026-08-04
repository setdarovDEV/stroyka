import { enumLabel } from '@/lib/i18n';
import { useState, useEffect, useCallback } from 'react';
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
import { Download } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('Reports')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('Generate and download project reports')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="generate" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('Generate')}</TabsTrigger>
          <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{t('History')}</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {visibleTypes.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedType(r.value)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all hover:border-primary/50 bg-card',
                  selectedType === r.value ? 'border-primary ring-1 ring-primary' : 'border-border'
                )}
              >
                <p className="text-sm font-medium">{enumLabel(r.value, language)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('Excel export')}</p>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t('Report Settings')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('Report Type')}</label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm">{enumLabel(selectedType, language)}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('Period')}</label>
                  <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as ReportPeriod)}>
                    {periods.map((p) => <option key={p.value} value={p.value}>{enumLabel(p.value, language)}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t('Format')}</label>
                  <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">{t('Excel (.xlsx)')}</div>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? t('Generating...') : t('Generate Report')}
              </Button>
              {result && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm text-green-400">{t('Report ready!')}</p>
                  <Button variant="secondary" size="sm" onClick={() => handleDownload(result.filePath)}>
                    <Download className="w-3 h-3 mr-1" /> {t('Download')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
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
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
