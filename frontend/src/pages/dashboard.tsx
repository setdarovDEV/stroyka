import { useEffect, useReducer } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
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
import type {
  Alert,
  Estimate,
  EstimateImportSummary,
  EstimateWorkbookImportStatus,
  EstimateWorkbookImportResult,
  MaterialRequest,
  Paginated,
  WarehouseItem,
  WorkbookPreview,
  WorkbookPreviewCellStyle,
} from '@/api/types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatNumber(value?: number | null) {
  return (value ?? 0).toLocaleString();
}

function argbToCssColor(value?: string | null, fallback = '#ffffff') {
  if (!value) return fallback;
  const normalized = value.trim();
  if (normalized.length === 8) return `#${normalized.slice(2)}`;
  if (normalized.length === 6) return `#${normalized}`;
  return fallback;
}

function previewCellStyle(style?: WorkbookPreviewCellStyle): React.CSSProperties {
  return {
    backgroundColor: argbToCssColor(style?.backgroundColor),
    color: argbToCssColor(style?.color, '#000000'),
    fontWeight: style?.bold ? 700 : 400,
    fontStyle: style?.italic ? 'italic' : 'normal',
    fontSize: style?.fontSize ? `${style.fontSize}px` : undefined,
    textAlign:
      style?.horizontalAlign === 'center'
        ? 'center'
        : style?.horizontalAlign === 'right'
          ? 'right'
          : 'left',
    verticalAlign:
      style?.verticalAlign === 'middle'
        ? 'middle'
        : style?.verticalAlign === 'bottom'
          ? 'bottom'
          : 'top',
    whiteSpace: style?.wrapText ? 'pre-wrap' : 'pre',
    borderTop: style?.borderTop ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(148, 163, 184, 0.12)',
    borderRight: style?.borderRight ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(148, 163, 184, 0.12)',
    borderBottom: style?.borderBottom ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(148, 163, 184, 0.12)',
    borderLeft: style?.borderLeft ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(148, 163, 184, 0.12)',
  };
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
    <div className="rounded-xl border p-5">
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
    </div>
  );
}

function WorkbookPreviewTable({ preview }: { preview: WorkbookPreview }) {
  return (
    <div className="overflow-auto rounded-xl border bg-[#0a1220]" style={{ contentVisibility: 'auto', containIntrinsicSize: '1000px' }}>
      <table className="w-max min-w-full border-collapse text-[12px] leading-5 text-slate-100">
        <colgroup>
          {preview.columns.map((column) => (
            <col
              key={column.column}
              style={{
                width: column.width ? `${Math.max(56, Math.round(column.width * 8))}px` : '96px',
              }}
            />
          ))}
        </colgroup>
        <tbody>
          {preview.rows.map((row) => (
            <tr key={row.rowNumber} style={{ height: row.height ? `${row.height}px` : undefined }}>
              {row.cells.map((cell) => (
                <td
                  key={`${row.rowNumber}-${cell.column}`}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className="px-2 py-1.5 align-top"
                  style={previewCellStyle(cell.style)}
                >
                  {cell.value || '\u00A0'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DashboardOverview {
  documents: Estimate[];
  warehouseItems: WarehouseItem[];
  requests: MaterialRequest[];
  alerts: Alert[];
}

interface DashboardUiState {
  documentName: string;
  excelFile: File | null;
  statusMessage: string;
  lastImportSummary: EstimateImportSummary | null;
  importJobId: string | null;
  previewMode: 'exact';
}

type DashboardUiAction =
  | { type: 'setDocumentName'; value: string }
  | { type: 'setExcelFile'; value: File | null }
  | { type: 'setStatusMessage'; value: string }
  | { type: 'setLastImportSummary'; value: EstimateImportSummary | null }
  | { type: 'setImportJob'; value: string | null }
  | { type: 'setPreviewMode'; value: 'exact' }
  | { type: 'resetImportForm' };

const initialDashboardUiState: DashboardUiState = {
  documentName: '',
  excelFile: null,
  statusMessage: '',
  lastImportSummary: null,
  importJobId: null,
  previewMode: 'exact',
};

function dashboardUiReducer(state: DashboardUiState, action: DashboardUiAction): DashboardUiState {
  switch (action.type) {
    case 'setDocumentName':
      return { ...state, documentName: action.value };
    case 'setExcelFile':
      return { ...state, excelFile: action.value };
    case 'setStatusMessage':
      return { ...state, statusMessage: action.value };
    case 'setLastImportSummary':
      return { ...state, lastImportSummary: action.value };
    case 'setImportJob':
      return { ...state, importJobId: action.value };
    case 'setPreviewMode':
      return { ...state, previewMode: action.value };
    case 'resetImportForm':
      return { ...state, documentName: '', excelFile: null };
    default:
      return state;
  }
}

async function fetchDashboardOverview(projectId: string): Promise<DashboardOverview> {
  const [documentsRes, warehouseRes, requestsRes, alertsRes] = await Promise.all([
    api.get<Paginated<Estimate>>(`/estimates?projectId=${projectId}&page=1&limit=8`),
    api.get<Paginated<WarehouseItem>>(`/warehouse?projectId=${projectId}&page=1&limit=100`),
    api.get<Paginated<MaterialRequest>>(`/material-requests?projectId=${projectId}&page=1&limit=20`),
    api.get<Paginated<Alert>>(`/alerts?projectId=${projectId}&page=1&limit=20`),
  ]);

  return {
    documents: documentsRes.items ?? [],
    warehouseItems: warehouseRes.items ?? [],
    requests: requestsRes.items ?? [],
    alerts: alertsRes.items ?? [],
  };
}

export function DashboardPage() {
  const { currentProject, t, language } = useApp();
  const projectId = currentProject?.id;
  const queryClient = useQueryClient();
  const [uiState, dispatch] = useReducer(dashboardUiReducer, initialDashboardUiState);

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', projectId],
    queryFn: () => fetchDashboardOverview(projectId!),
    enabled: Boolean(projectId),
  });

  const documents = overviewQuery.data?.documents ?? [];
  const warehouseItems = overviewQuery.data?.warehouseItems ?? [];
  const requests = overviewQuery.data?.requests ?? [];
  const alerts = overviewQuery.data?.alerts ?? [];
  const latestDocument = documents[0] ?? null;

  const latestEstimateQuery = useQuery({
    queryKey: ['estimate-preview', latestDocument?.id],
    queryFn: () => api.get<Estimate>(`/estimates/${latestDocument!.id}`),
    enabled: Boolean(latestDocument?.id),
  });

  const importStatusQuery = useQuery({
    queryKey: ['estimate-import-status', uiState.importJobId],
    queryFn: () => api.get<EstimateWorkbookImportStatus>(`/estimates/import-status/${uiState.importJobId!}`),
    enabled: Boolean(uiState.importJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 1500;
    },
  });

  useEffect(() => {
    const importStatus = importStatusQuery.data;
    if (!importStatus || !uiState.importJobId) return;

    if (importStatus.status === 'COMPLETED' && importStatus.estimateId) {
      dispatch({ type: 'setImportJob', value: null });
      dispatch({ type: 'setLastImportSummary', value: importStatus.summary ?? null });
      dispatch({ type: 'setStatusMessage', value: t('Excel import completed') });

      void (async () => {
        const estimate = await api.get<Estimate>(`/estimates/${importStatus.estimateId}`);
        queryClient.setQueryData(['estimate-preview', estimate.id], estimate);
        await queryClient.invalidateQueries({ queryKey: ['dashboard-overview', projectId] });
      })();
      return;
    }

    if (importStatus.status === 'FAILED') {
      dispatch({ type: 'setImportJob', value: null });
      dispatch({
        type: 'setStatusMessage',
        value: `${t('Excel import failed')}: ${importStatus.error || t('Unknown error')}`,
      });
      return;
    }

    if (importStatus.status === 'QUEUED') {
      dispatch({ type: 'setStatusMessage', value: t('Excel import queued. Processing in background...') });
      return;
    }

    if (importStatus.status === 'PARSED') {
      dispatch({ type: 'setStatusMessage', value: t('Excel parsed. Importing lines into database...') });
      return;
    }

    dispatch({ type: 'setStatusMessage', value: t('Excel import in progress...') });
  }, [importStatusQuery.data, projectId, queryClient, t, uiState.importJobId]);

  const downloadTemplateMutation = useMutation({
    mutationFn: () => api.download('/estimates/template'),
    onSuccess: ({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      dispatch({ type: 'setStatusMessage', value: errorMessage(error, t('Template download failed')) });
    },
  });

  const importExcelMutation = useMutation({
    mutationFn: async () => {
      if (!projectId || !uiState.documentName || !uiState.excelFile) {
        throw new Error(t('Upload Excel file (.xlsx, .xls)'));
      }

      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('name', uiState.documentName);
      formData.set('file', uiState.excelFile);
      return api.postForm<EstimateWorkbookImportResult>('/estimates/import-workbook', formData);
    },
    onMutate: () => {
      dispatch({ type: 'setStatusMessage', value: '' });
    },
    onSuccess: (created) => {
      dispatch({ type: 'resetImportForm' });
      dispatch({ type: 'setLastImportSummary', value: null });
      dispatch({ type: 'setImportJob', value: created.jobId });
      dispatch({ type: 'setStatusMessage', value: t('Excel import queued. Processing in background...') });
    },
    onError: (error) => {
      dispatch({
        type: 'setStatusMessage',
        value: `${t('Excel import failed')}: ${errorMessage(error, t('Unknown error'))}`,
      });
    },
  });

  const loading = overviewQuery.isLoading;
  const loadError = overviewQuery.error ? errorMessage(overviewQuery.error, 'Failed to load workbench data') : '';
  const latestEstimate = latestEstimateQuery.data ?? null;
  const latestWorkbookPreview = latestEstimate?.workbookPreview ?? null;
  const importedLines = documents.reduce((sum, item) => sum + (item._count?.lines ?? 0), 0);
  const lowStockItems = warehouseItems.filter((item) => item.status === 'LOW' || item.status === 'OUT');
  const unresolvedAlerts = alerts.filter((item) => item.status !== 'RESOLVED');
  const criticalAlerts = unresolvedAlerts.filter((item) => item.severity === 'CRITICAL');
  const openRequests = requests.filter((item) => item.status !== 'FULFILLED' && item.status !== 'REJECTED');
  const m29Ready = Boolean(latestDocument) && criticalAlerts.length === 0 && lowStockItems.length === 0;
  const workflowChecks = [Boolean(latestDocument), lowStockItems.length === 0, criticalAlerts.length === 0];
  const readinessScore = Math.round((workflowChecks.filter(Boolean).length / workflowChecks.length) * 100);

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
      <div className="grid gap-4">
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

      <div className="space-y-4">
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
                value={uiState.documentName}
                onChange={(event) => dispatch({ type: 'setDocumentName', value: event.target.value })}
                placeholder={t('Document Name *')}
              />
              <Button
                variant="outline"
                onClick={() => downloadTemplateMutation.mutate()}
                disabled={downloadTemplateMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadTemplateMutation.isPending ? t('Preparing template...') : t('Download Excel Template')}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => dispatch({ type: 'setExcelFile', value: event.target.files?.[0] || null })}
              />
              <Button
                onClick={() => importExcelMutation.mutate()}
                disabled={!uiState.documentName || !uiState.excelFile || importExcelMutation.isPending || Boolean(uiState.importJobId)}
              >
                <Upload className="mr-2 h-4 w-4" />
                {importExcelMutation.isPending || uiState.importJobId ? t('Processing...') : t('Import Excel File')}
              </Button>
            </div>
            {uiState.excelFile ? (
              <p className="text-xs text-muted-foreground">{t('Selected')}: {uiState.excelFile.name}</p>
            ) : null}
            {uiState.lastImportSummary ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{uiState.lastImportSummary.sectionsCount} {t('sections')}</Badge>
                <Badge variant="secondary">{uiState.lastImportSummary.workRowsCount} {t('work rows')}</Badge>
                <Badge variant="secondary">{uiState.lastImportSummary.resourceRowsCount} {t('resource rows')}</Badge>
                <Badge variant={uiState.lastImportSummary.warningsCount ? 'warning' : 'success'}>
                  {uiState.lastImportSummary.warningsCount} {t('warnings')}
                </Badge>
              </div>
            ) : null}

            {latestDocument ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('Exact Preview')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('Exact workbook preview with original Excel text and columns')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{latestDocument.name}</Badge>
                    {latestWorkbookPreview?.sheetName ? <Badge variant="secondary">{latestWorkbookPreview.sheetName}</Badge> : null}
                  </div>
                </div>

                {latestEstimateQuery.isLoading ? (
                  <div className="rounded-xl border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                    {t('Loading workbook preview...')}
                  </div>
                ) : latestEstimateQuery.error ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-sm text-destructive">
                    {t('Failed to load cost plan preview')}
                  </div>
                ) : latestWorkbookPreview ? (
                  <WorkbookPreviewTable preview={latestWorkbookPreview} />
                ) : (
                  <div className="rounded-xl border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                    {t('Workbook preview is not available for this document. Re-import the workbook to generate an exact 1:1 preview.')}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </WorkflowStage>

        {(uiState.statusMessage || loadError) ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">{loadError || uiState.statusMessage}</CardContent>
          </Card>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-xl border bg-muted/20 px-6 py-8 text-sm text-muted-foreground">
          {t('Loading dashboard...')}
        </div>
      ) : null}
    </div>
  );
}
