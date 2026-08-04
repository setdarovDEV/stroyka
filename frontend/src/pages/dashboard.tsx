import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FolderKanban,
  PackageCheck,
  Upload,
  Warehouse,
} from 'lucide-react';
import { useApp } from '@/app/context';
import { api, errorMessage } from '@/services/api';
import { enumLabel } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  Alert,
  Estimate,
  EstimateImportSummary,
  EstimateWorkbookImportResult,
  MaterialRequest,
  Paginated,
  WarehouseItem,
} from '@/api/types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatNumber(value?: number | null) {
  return (value ?? 0).toLocaleString();
}

function formatStatus(status?: string | null) {
  return status ? status.replace(/_/g, ' ') : '-';
}

function ActionTile({
  to,
  title,
  description,
  icon: Icon,
  badge,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-0">
        <Link className="flex h-full flex-col gap-4 p-5" to={to}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
              <Icon className="h-5 w-5" />
            </div>
            {badge ? (
              <Badge variant="outline">
                {badge}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-sm font-medium text-primary">
            <span>Open</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function SnapshotCard({
  label,
  value,
  tone = 'default',
  caption,
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'good' | 'warn';
  caption?: string;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</p>
        {caption ? <p className="mt-2 text-sm text-muted-foreground">{caption}</p> : null}
      </CardContent>
    </Card>
  );
}

function WorkflowStage({
  step,
  title,
  icon: Icon,
  status,
  hint,
  metrics,
  actionLabel,
  actionTo,
  children,
}: {
  step: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  hint: string;
  metrics: Array<{ label: string; value: string | number }>;
  actionLabel: string;
  actionTo: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{step}</p>
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{status}</Badge>
            <p className="text-sm text-muted-foreground">{hint}</p>
          </div>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to={actionTo}>
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>

      {children ? (
        <>
          <Separator className="my-5" />
          {children}
        </>
      ) : null}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { currentProject, t, language } = useApp();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [documents, setDocuments] = useState<Estimate[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [documentName, setDocumentName] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastImportSummary, setLastImportSummary] = useState<EstimateImportSummary | null>(null);

  const projectId = currentProject?.id;

  const loadOverview = useCallback(async () => {
    if (!projectId) {
      setDocuments([]);
      setWarehouseItems([]);
      setRequests([]);
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [documentsRes, warehouseRes, requestsRes, alertsRes] = await Promise.all([
        api.get<Paginated<Estimate>>(`/estimates?projectId=${projectId}&page=1&limit=8`),
        api.get<Paginated<WarehouseItem>>(`/warehouse?projectId=${projectId}&page=1&limit=100`),
        api.get<Paginated<MaterialRequest>>(`/material-requests?projectId=${projectId}&page=1&limit=20`),
        api.get<Paginated<Alert>>(`/alerts?projectId=${projectId}&page=1&limit=20`),
      ]);

      setDocuments(documentsRes.items ?? []);
      setWarehouseItems(warehouseRes.items ?? []);
      setRequests(requestsRes.items ?? []);
      setAlerts(alertsRes.items ?? []);
    } catch (error) {
      setStatusMessage(errorMessage(error, 'Failed to load workbench data'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    setStatusMessage('');

    try {
      const { blob, fileName } = await api.download('/estimates/template');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage(t('Template downloaded successfully'));
    } catch (error) {
      setStatusMessage(errorMessage(error, t('Template download failed')));
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function importExcel() {
    if (!projectId || !documentName || !excelFile) return;

    setImporting(true);
    setStatusMessage(t('Processing...'));

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('name', documentName);
      formData.set('file', excelFile);
      const created = await api.postForm<EstimateWorkbookImportResult>('/estimates/import-workbook', formData);

      setDocumentName('');
      setExcelFile(null);
      setLastImportSummary(created.summary);
      setStatusMessage(
        `${t('Imported')}: ${created.summary.sectionsCount} ${t('sections')}, ${created.summary.workRowsCount} ${t('work rows')}, ${created.summary.resourceRowsCount} ${t('resource rows')}`,
      );
      await loadOverview();
    } catch (error) {
      setStatusMessage(`${t('Excel import failed')}: ${errorMessage(error, t('Unknown error'))}`);
    } finally {
      setImporting(false);
    }
  }

  const latestDocument = documents[0] ?? null;
  const importedLines = documents.reduce((sum, item) => sum + (item._count?.lines ?? 0), 0);
  const lowStockItems = warehouseItems.filter((item) => item.status === 'LOW' || item.status === 'OUT');
  const unresolvedAlerts = alerts.filter((item) => item.status !== 'RESOLVED');
  const criticalAlerts = unresolvedAlerts.filter((item) => item.severity === 'CRITICAL');
  const openRequests = requests.filter((item) => item.status !== 'FULFILLED' && item.status !== 'REJECTED');
  const m29Ready = Boolean(latestDocument) && criticalAlerts.length === 0 && lowStockItems.length === 0;
  const workflowChecks = [Boolean(latestDocument), lowStockItems.length === 0, criticalAlerts.length === 0];
  const readinessScore = Math.round((workflowChecks.filter(Boolean).length / workflowChecks.length) * 100);

  const attentionItems = useMemo(() => {
    const items: Array<{
      title: string;
      detail: string;
      tone: 'good' | 'warn';
      to: string;
      action: string;
    }> = [];

    if (!latestDocument) {
      items.push({
        title: 'Import the current cost plan',
        detail: 'The workbench has no active smeta workbook for this project.',
        tone: 'warn',
        to: '/app/estimate',
        action: 'Open estimate',
      });
    }

    if (lowStockItems.length > 0) {
      items.push({
        title: `${lowStockItems.length} stock items need review`,
        detail: 'Inventory balance is low or out on materials linked to site execution.',
        tone: 'warn',
        to: '/app/warehouse',
        action: 'Open warehouse',
      });
    }

    if (openRequests.length > 0) {
      items.push({
        title: `${openRequests.length} material requests are still open`,
        detail: 'Field demand is waiting on warehouse confirmation or fulfillment.',
        tone: 'warn',
        to: '/app/material-requests',
        action: 'Review requests',
      });
    }

    if (criticalAlerts.length > 0) {
      items.push({
        title: `${criticalAlerts.length} critical alerts need action`,
        detail: 'Resolve blockers before closing the current reporting period.',
        tone: 'warn',
        to: '/app/alerts',
        action: 'Open alerts',
      });
    }

    if (items.length === 0) {
      items.push({
        title: 'Project flow looks healthy',
        detail: 'No critical blockers are visible across smeta, warehouse, and period control.',
        tone: 'good',
        to: '/app/reports',
        action: 'Open reports',
      });
    }

    return items.slice(0, 4);
  }, [criticalAlerts.length, latestDocument, lowStockItems.length, openRequests.length]);

  if (!projectId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col gap-6 p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="outline">Workbench</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">Choose a project before starting the workflow</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                This dashboard is designed to drive one active construction object through smeta import, warehouse control, and M-29 closeout.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/app/projects">
                <FolderKanban className="mr-2 h-4 w-4" />
                {t('Projects')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Dashboard</Badge>
                <Badge variant={m29Ready ? 'success' : 'warning'}>
                  {m29Ready ? 'Ready for M-29' : 'Action required'}
                </Badge>
                {currentProject?.status ? (
                  <Badge variant="secondary">{enumLabel(currentProject.status, language)}</Badge>
                ) : null}
              </div>
              <CardTitle className="text-2xl">{currentProject.name}</CardTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Manage one project through estimate import, warehouse control, and month-end M-29 preparation.
              </p>
              </div>
              <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-1">
                <Button asChild className="w-full sm:min-w-[9.75rem]">
                  <Link to="/app/projects">
                    <FolderKanban className="mr-2 h-4 w-4" />
                    New project
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:min-w-[9.75rem]">
                  <Link to="/app/reports">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Open closeout
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{t('Current')}</p>
                <p className="mt-2 font-medium">{currentProject.name}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{t('Start')}</p>
                <p className="mt-2 font-medium">{formatDate(currentProject.startDate)}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{t('End')}</p>
                <p className="mt-2 font-medium">{formatDate(currentProject.plannedEndDate)}</p>
              </div>
            </div>
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">M-29 readiness</p>
                  <p className="text-sm text-muted-foreground">Coverage across estimate, warehouse, and active blockers.</p>
                </div>
                <p className="text-2xl font-semibold">{readinessScore}%</p>
              </div>
              <Progress value={readinessScore} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attention queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {attentionItems.map((item) => (
              <div key={item.title} className="rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  {item.tone === 'good' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    <Button asChild variant="link" className="mt-2 h-auto px-0">
                      <Link to={item.to}>{item.action}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionTile
          to="/app/estimate"
          title="Smeta workspace"
          description="Import, review, and structure project cost-plan documents."
          icon={FileSpreadsheet}
          badge={`${documents.length} docs`}
        />
        <ActionTile
          to="/app/warehouse"
          title="Warehouse control"
          description="Track stock, receipts, issues, and balance pressure before site work stalls."
          icon={Warehouse}
          badge={`${warehouseItems.length} items`}
        />
        <ActionTile
          to="/app/material-requests"
          title="Field requests"
          description="Review material demand coming from site teams and move it through approval."
          icon={PackageCheck}
          badge={`${openRequests.length} open`}
        />
        <ActionTile
          to="/app/reports"
          title="Period close"
          description="Prepare exports, check variances, and move toward month-end M-29 reporting."
          icon={ClipboardCheck}
          badge={m29Ready ? 'ready' : 'blocked'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <SnapshotCard
          label={t('Imported Documents')}
          value={documents.length}
          tone={documents.length > 0 ? 'good' : 'warn'}
          caption={latestDocument ? `Latest: ${formatDate(latestDocument.createdAt)}` : 'Bring in the current workbook'}
        />
        <SnapshotCard
          label={t('Stock Items')}
          value={warehouseItems.length}
          caption={lowStockItems.length ? `${lowStockItems.length} flagged as low or out` : 'No stock pressure detected'}
        />
        <SnapshotCard
          label={t('Material Requests')}
          value={openRequests.length}
          tone={openRequests.length > 0 ? 'warn' : 'good'}
          caption={openRequests.length ? 'Open demand from the field' : 'No open requests'}
        />
        <SnapshotCard
          label={t('Alerts')}
          value={unresolvedAlerts.length}
          tone={criticalAlerts.length > 0 ? 'warn' : unresolvedAlerts.length ? 'default' : 'good'}
          caption={criticalAlerts.length ? `${criticalAlerts.length} critical` : 'No critical blockers'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Tabs defaultValue="smeta" className="h-full">
          <Card className="flex h-full flex-col">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="smeta">Smeta</TabsTrigger>
                  <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
                  <TabsTrigger value="m29">M-29</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
              <TabsContent value="smeta" className="mt-0">
                  <WorkflowStage
                    step="01"
                    title="Smeta ingestion"
                    icon={FileSpreadsheet}
                    status={latestDocument ? 'Document imported' : 'Waiting for workbook'}
                    hint={latestDocument ? `Latest file: ${latestDocument.name}` : 'Import the current cost plan to activate downstream workflow.'}
                    metrics={[
                      { label: t('Imported Documents'), value: documents.length },
                      { label: t('Lines'), value: formatNumber(importedLines) },
                      { label: 'Latest import', value: latestDocument ? formatDate(latestDocument.createdAt) : '-' },
                    ]}
                    actionLabel="Open smeta"
                    actionTo="/app/estimate"
                  >
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Input
                          value={documentName}
                          onChange={(event) => setDocumentName(event.target.value)}
                          placeholder={t('Document Name *')}
                        />
                        <Button variant="outline" onClick={downloadTemplate} disabled={downloadingTemplate}>
                          <Download className="mr-2 h-4 w-4" />
                          {downloadingTemplate ? t('Preparing template...') : t('Download Excel Template')}
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(event) => setExcelFile(event.target.files?.[0] || null)}
                        />
                        <Button onClick={importExcel} disabled={!documentName || !excelFile || importing}>
                          <Upload className="mr-2 h-4 w-4" />
                          {importing ? t('Processing...') : t('Import Excel File')}
                        </Button>
                      </div>
                      {excelFile ? (
                        <p className="text-xs text-muted-foreground">{t('Selected')}: {excelFile.name}</p>
                      ) : null}
                      {lastImportSummary ? (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{lastImportSummary.sectionsCount} {t('sections')}</Badge>
                          <Badge variant="secondary">{lastImportSummary.workRowsCount} {t('work rows')}</Badge>
                          <Badge variant="secondary">{lastImportSummary.resourceRowsCount} {t('resource rows')}</Badge>
                          <Badge variant={lastImportSummary.warningsCount ? 'warning' : 'success'}>
                            {lastImportSummary.warningsCount} {t('warnings')}
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                  </WorkflowStage>
              </TabsContent>
              <TabsContent value="warehouse" className="mt-0">
                  <WorkflowStage
                    step="02"
                    title="Warehouse control"
                    icon={Boxes}
                    status={lowStockItems.length ? 'Stock review required' : 'Warehouse ready'}
                    hint={lowStockItems.length ? 'Low or empty balances can break field progress and distort month-end write-off.' : 'Material movement looks stable for the current period.'}
                    metrics={[
                      { label: t('Stock Items'), value: warehouseItems.length },
                      { label: 'Low / Out', value: lowStockItems.length },
                      { label: t('Pending Confirmations'), value: openRequests.length },
                    ]}
                    actionLabel="Open warehouse"
                    actionTo="/app/warehouse"
                  >
                    <div className="space-y-3">
                      {lowStockItems.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.material?.name || item.materialId}</p>
                            <p className="text-sm text-muted-foreground">
                              Balance {formatNumber(item.currentBalance)} • Available {formatNumber(item.availableQuantity ?? item.currentBalance)}
                            </p>
                          </div>
                          <Badge variant={item.status === 'OUT' ? 'danger' : 'warning'}>
                            {enumLabel(item.status || 'NORMAL', language)}
                          </Badge>
                        </div>
                      ))}
                      {lowStockItems.length === 0 ? (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                          No low-stock materials are visible on the current warehouse snapshot.
                        </div>
                      ) : null}
                    </div>
                  </WorkflowStage>
              </TabsContent>
              <TabsContent value="m29" className="mt-0">
                  <WorkflowStage
                    step="03"
                    title="M-29 readiness"
                    icon={ClipboardCheck}
                    status={m29Ready ? 'Ready to reconcile' : 'Closeout blockers detected'}
                    hint={m29Ready ? 'The project is in a good state to reconcile planned quantities, stock movement, and month-end write-off.' : 'Clear the blockers below before turning this period into an M-29 package.'}
                    metrics={[
                      { label: 'Smeta', value: latestDocument ? 'ready' : 'missing' },
                      { label: t('Warehouse'), value: lowStockItems.length ? 'review' : 'ready' },
                      { label: t('Alerts'), value: criticalAlerts.length ? `${criticalAlerts.length} critical` : 'clear' },
                    ]}
                    actionLabel="Open reports"
                    actionTo="/app/reports"
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border p-4">
                        <p className="text-sm font-medium">What the month-end flow needs</p>
                        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Current smeta document imported</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Warehouse movements reviewed</li>
                          <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Variances and critical alerts resolved</li>
                        </ul>
                      </div>
                      <div className="rounded-xl border p-4">
                        <p className="text-sm font-medium">Current blockers</p>
                        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                          <p>{latestDocument ? `Latest workbook: ${latestDocument.name}` : 'No smeta workbook imported yet.'}</p>
                          <p>{lowStockItems.length ? `${lowStockItems.length} warehouse items are below safe balance.` : 'Warehouse balance checks are clean.'}</p>
                          <p>{criticalAlerts.length ? `${criticalAlerts.length} critical alerts are unresolved.` : 'No critical alert is blocking closeout.'}</p>
                        </div>
                      </div>
                    </div>
                  </WorkflowStage>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Recent signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestDocument ? (
                <div className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{latestDocument.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('Imported on')}: {formatDate(latestDocument.createdAt)}
                      </p>
                    </div>
                    <Badge variant="info">{latestDocument._count?.lines ?? 0} {t('lines')}</Badge>
                  </div>
                </div>
              ) : null}

              {alerts.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <Badge variant={item.severity === 'CRITICAL' ? 'danger' : item.severity === 'WARNING' ? 'warning' : 'info'}>
                          {enumLabel(item.severity, language)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                    </div>
                  </div>
                </div>
              ))}

              {!latestDocument && alerts.length === 0 ? (
                <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                  No recent project signals yet. Import smeta or start moving stock to activate the workbench.
                </div>
              ) : null}
            </CardContent>
          </Card>

          {statusMessage ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">{statusMessage}</CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">Operational overview</CardTitle>
            <p className="text-sm text-muted-foreground">Recent estimate imports, field demand, and warehouse pressure in one table.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/app/estimate">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Open estimate workspace
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestDocument ? (
                <TableRow>
                  <TableCell className="font-medium">Smeta</TableCell>
                  <TableCell>{latestDocument.name}</TableCell>
                  <TableCell>
                    <Badge variant="success">Imported</Badge>
                  </TableCell>
                  <TableCell>{latestDocument._count?.lines ?? 0} {t('lines')}</TableCell>
                  <TableCell className="text-right">{formatDate(latestDocument.createdAt)}</TableCell>
                </TableRow>
              ) : null}
              {openRequests.slice(0, 2).map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">Request</TableCell>
                  <TableCell>{request.purpose || request.materialId}</TableCell>
                  <TableCell>
                    <Badge variant="warning">{enumLabel(request.status, language)}</Badge>
                  </TableCell>
                  <TableCell>{formatNumber(request.quantity)} requested</TableCell>
                  <TableCell className="text-right">{request.requestedByUser?.fullName || request.requestedBy}</TableCell>
                </TableRow>
              ))}
              {lowStockItems.slice(0, 2).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">Warehouse</TableCell>
                  <TableCell>{item.material?.name || item.materialId}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'OUT' ? 'danger' : 'warning'}>
                      {enumLabel(item.status || 'NORMAL', language)}
                    </Badge>
                  </TableCell>
                  <TableCell>Balance {formatNumber(item.currentBalance)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              ))}
              {latestDocument === null && openRequests.length === 0 && lowStockItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No operational items yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {loading ? (
        <div className="rounded-xl border bg-muted/20 px-6 py-8 text-sm text-muted-foreground">
          {t('Loading dashboard...')}
        </div>
      ) : null}
    </div>
  );
}
