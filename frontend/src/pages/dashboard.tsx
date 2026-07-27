import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useApp } from '@/app/context';
import { api, errorMessage } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Estimate, EstimateImportSummary, EstimateLine, EstimateWorkbookImportResult, Paginated, WorkbookPreviewCell } from '@/api/types';

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatNumber(value?: number | null) {
  return (value ?? 0).toLocaleString();
}

function formatCurrency(value?: number | null) {
  return (value ?? 0).toLocaleString();
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { currentProject, t, user, language } = useApp();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [documents, setDocuments] = useState<Estimate[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedDocumentDetail, setSelectedDocumentDetail] = useState<Estimate | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [search, setSearch] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [lastImportSummary, setLastImportSummary] = useState<EstimateImportSummary | null>(null);
  const [previewMode, setPreviewMode] = useState<'exact' | 'structured'>('exact');

  const isAdmin = user?.role === 'ADMIN';
  const projectId = currentProject?.id;
  const selectedDocument = documents.find((item) => item.id === selectedDocumentId) ?? null;
  const exactPreview = selectedDocumentDetail?.workbookPreview ?? null;

  const loadDocuments = useCallback(async () => {
    if (!projectId) {
      setDocuments([]);
      setSelectedDocumentId('');
      setLines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<Paginated<Estimate>>(`/estimates?projectId=${projectId}&page=1&limit=100`);
      const items = res.items ?? [];
      setDocuments(items);
      setSelectedDocumentId((current) => {
        if (current && items.some((item) => item.id === current)) return current;
        return items[0]?.id ?? '';
      });
    } catch (error) {
      setStatusMessage(errorMessage(error, t('Failed to load cost plan documents')));
      setDocuments([]);
      setSelectedDocumentId('');
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  const loadSelectedDocumentDetail = useCallback(async () => {
    if (!selectedDocumentId) {
      setSelectedDocumentDetail(null);
      setLoadingPreview(false);
      return;
    }

    setLoadingPreview(true);
    try {
      const estimate = await api.get<Estimate>(`/estimates/${selectedDocumentId}`);
      setSelectedDocumentDetail(estimate);
    } catch (error) {
      setStatusMessage(errorMessage(error, t('Failed to load cost plan preview')));
      setSelectedDocumentDetail(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedDocumentId, t]);

  const loadLines = useCallback(async () => {
    if (!projectId || !selectedDocumentId) {
      setLines([]);
      return;
    }

    try {
      const pageSize = 500;
      const firstPage = await api.get<Paginated<EstimateLine>>(
        `/estimate-lines?projectId=${projectId}&estimateId=${selectedDocumentId}&page=1&limit=${pageSize}`,
      );

      const firstItems = firstPage.items ?? [];
      const totalPages = firstPage.pages ?? 1;
      if (totalPages <= 1) {
        setLines(firstItems);
        return;
      }

      const pageRequests: Array<Promise<Paginated<EstimateLine>>> = [];
      for (let page = 2; page <= totalPages; page += 1) {
        pageRequests.push(
          api.get<Paginated<EstimateLine>>(
            `/estimate-lines?projectId=${projectId}&estimateId=${selectedDocumentId}&page=${page}&limit=${pageSize}`,
          ),
        );
      }

      const remainingPages = await Promise.all(pageRequests);
      setLines([
        ...firstItems,
        ...remainingPages.flatMap((page) => page.items ?? []),
      ]);
    } catch (error) {
      setStatusMessage(errorMessage(error, t('Failed to load cost plan lines')));
      setLines([]);
    }
  }, [projectId, selectedDocumentId, t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    void loadLines();
  }, [loadLines]);

  useEffect(() => {
    void loadSelectedDocumentDetail();
  }, [loadSelectedDocumentDetail]);

  const filteredLines = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return lines;
    return lines.filter((line) =>
      [line.code, line.name, line.category, line.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [lines, search]);

  const totals = useMemo(() => {
    const sectionCount = lines.filter((line) => line.rowType === 'SECTION').length;
    const workCount = lines.filter((line) => line.rowType === 'WORK').length;
    const resourceCount = lines.filter((line) => line.rowType === 'RESOURCE').length;
    const totalValue = lines.reduce((sum, line) => sum + (line.plannedTotalPrice ?? 0), 0);
    return {
      lineCount: workCount,
      sectionCount,
      resourceCount,
      totalValue,
    };
  }, [lines]);

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
      setSelectedDocumentDetail(created.estimate);
      setLoadingPreview(false);
      setStatusMessage(
        `${t('Imported')}: ${created.summary.sectionsCount} ${t('sections')}, ${created.summary.workRowsCount} ${t('work rows')}, ${created.summary.resourceRowsCount} ${t('resource rows')}, ${created.summary.warningsCount} ${t('warnings')}`,
      );
      await loadDocuments();
      setSelectedDocumentId(created.estimate.id);
    } catch (error) {
      setStatusMessage(`${t('Excel import failed')}: ${errorMessage(error, t('Unknown error'))}`);
    } finally {
      setImporting(false);
    }
  }

  if (loading && !documents.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('Loading dashboard...')}</p>
      </div>
    );
  }

  function argbToCss(value?: string | null) {
    if (!value || value.length !== 8) return undefined;
    return `#${value.slice(2)}`;
  }

  function previewCellStyle(cell: WorkbookPreviewCell): React.CSSProperties {
    return {
      backgroundColor: argbToCss(cell.style?.backgroundColor),
      color: argbToCss(cell.style?.color) ?? '#000000',
      fontWeight: cell.style?.bold ? 700 : 400,
      fontStyle: cell.style?.italic ? 'italic' : 'normal',
      fontSize: cell.style?.fontSize ? `${cell.style.fontSize}px` : undefined,
      textAlign: (cell.style?.horizontalAlign as React.CSSProperties['textAlign']) ?? 'left',
      verticalAlign: (cell.style?.verticalAlign as React.CSSProperties['verticalAlign']) ?? 'middle',
      whiteSpace: cell.style?.wrapText ? 'pre-wrap' : 'pre-line',
      borderTop: cell.style?.borderTop ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--border))',
      borderRight: cell.style?.borderRight ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--border))',
      borderBottom: cell.style?.borderBottom ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--border))',
      borderLeft: cell.style?.borderLeft ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--border))',
      padding: '0.4rem 0.5rem',
      minWidth: '3rem',
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Project Cost Plan')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Upload a project cost plan file, download the template, and review imported line items')} - {currentProject?.name}
          </p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} disabled={downloadingTemplate}>
          <Download className="mr-2 h-4 w-4" />
          {downloadingTemplate ? t('Preparing template...') : t('Download Excel Template')}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('Import Cost Plan')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!projectId && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {t('Select a project before importing a cost plan')}
              </div>
            )}
            <Input
              value={documentName}
              onChange={(event) => setDocumentName(event.target.value)}
              placeholder={t('Document Name *')}
              disabled={!projectId}
            />
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('Upload Excel file (.xlsx, .xls)')}</p>
              <Input
                className="mt-3"
                type="file"
                accept=".xlsx,.xls"
                disabled={!projectId}
                onChange={(event) => setExcelFile(event.target.files?.[0] || null)}
              />
              {excelFile && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('Selected')}: {excelFile.name}
                </p>
              )}
              <Button className="mt-4" onClick={importExcel} disabled={!projectId || !documentName || !excelFile || importing}>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? t('Processing...') : t('Import Excel File')}
              </Button>
            </div>
            {statusMessage && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {statusMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('Imported Documents')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documents.length ? documents.map((item) => {
              const active = item.id === selectedDocumentId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedDocumentId(item.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('Imported on')}: {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <Badge variant={active ? 'info' : 'secondary'}>
                      {item._count?.lines ?? 0} {t('lines')}
                    </Badge>
                  </div>
                </button>
              );
            }) : (
              <p className="text-sm text-muted-foreground">
                {projectId ? t('No imported cost plan documents') : t('Select a project to view imported documents')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('Lines')} value={totals.lineCount} />
        <MetricCard label={t('Sections')} value={totals.sectionCount} />
        <MetricCard label={t('Resources')} value={totals.resourceCount} />
        <MetricCard
          label={isAdmin ? t('Planned Cost') : t('Document Status')}
          value={isAdmin ? formatCurrency(totals.totalValue) : selectedDocument ? t('Imported') : '-'}
        />
      </div>

      {lastImportSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('Last Import Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{lastImportSummary.sectionsCount} {t('sections')}</Badge>
            <Badge variant="secondary">{lastImportSummary.workRowsCount} {t('work rows')}</Badge>
            <Badge variant="secondary">{lastImportSummary.resourceRowsCount} {t('resource rows')}</Badge>
            <Badge variant="secondary">{lastImportSummary.subtotalRowsCount} {t('subtotal rows')}</Badge>
            <Badge variant="secondary">{lastImportSummary.totalRowsCount} {t('total rows')}</Badge>
            <Badge variant={lastImportSummary.warningsCount ? 'warning' : 'success'}>
              {lastImportSummary.warningsCount} {t('warnings')}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{selectedDocument?.name ?? t('Imported Line Items')}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {previewMode === 'exact'
                ? t('Exact workbook preview with original Excel text and columns')
                : selectedDocument?.description || t('Structured view of imported project cost plan rows')}
            </p>
          </div>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('Search by code, name, section, or notes...')}
            className="w-full lg:max-w-sm"
          />
        </CardHeader>
        <CardContent>
          <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'exact' | 'structured')}>
            <TabsList className="mb-4">
              <TabsTrigger value="exact">{t('Exact Preview')}</TabsTrigger>
              <TabsTrigger value="structured">{t('Structured View')}</TabsTrigger>
            </TabsList>

            <TabsContent value="exact" className="mt-0">
              {loadingPreview ? (
                <div className="py-10 text-center text-muted-foreground">
                  {t('Loading workbook preview...')}
                </div>
              ) : exactPreview ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{language.toUpperCase()} UI</Badge>
                    <Badge variant="outline">{t('Workbook text kept as imported')}</Badge>
                    <Badge variant="outline">{exactPreview?.rows.length ?? 0} {t('rows')}</Badge>
                  </div>
                  <div className="max-h-[720px] overflow-auto rounded-lg border border-border bg-white">
                    <table className="min-w-max border-collapse text-sm">
                      <colgroup>
                        {exactPreview.columns.map((column) => (
                          <col
                            key={column.column}
                            style={{ width: column.width ? `${Math.max(column.width * 8, 48)}px` : undefined }}
                          />
                        ))}
                      </colgroup>
                      <tbody>
                        {exactPreview.rows.map((row) => (
                          <tr key={row.rowNumber} style={{ height: row.height ? `${row.height}px` : undefined }}>
                            {row.cells.map((cell) => (
                              <td
                                key={`${row.rowNumber}-${cell.column}`}
                                colSpan={cell.colSpan}
                                rowSpan={cell.rowSpan}
                                style={previewCellStyle(cell)}
                              >
                                {cell.value || '\u00A0'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  {selectedDocument
                    ? t('Workbook preview is not available for this document. Re-import the workbook to generate an exact 1:1 preview.')
                    : projectId
                      ? t('Import a cost plan to see line items here')
                      : t('Select a project to view imported line items')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="structured" className="mt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Code')}</TableHead>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Category')}</TableHead>
                    <TableHead>{t('Row Type')}</TableHead>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Unit')}</TableHead>
                    <TableHead className="text-right">{t('Planned Qty')}</TableHead>
                    {isAdmin && <TableHead className="text-right">{t('Unit Price')}</TableHead>}
                    {isAdmin && <TableHead className="text-right">{t('Total')}</TableHead>}
                    <TableHead>{t('Notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLines.length ? filteredLines.map((line) => (
                    <TableRow
                      key={line.id}
                      className={cn(
                        line.rowType === 'SECTION' && 'bg-muted/40 font-semibold',
                        line.rowType === 'SUBTOTAL' && 'bg-muted/20',
                        line.rowType === 'TOTAL' && 'bg-primary/5 font-semibold',
                      )}
                    >
                      <TableCell className="font-mono text-xs">{line.code}</TableCell>
                      <TableCell className={cn(
                        'font-medium',
                        line.rowType === 'WORK' && 'pl-6',
                        line.rowType === 'RESOURCE' && 'pl-10',
                        (line.rowType === 'SUBTOTAL' || line.rowType === 'TOTAL') && 'pl-6',
                      )}>
                        {line.name}
                      </TableCell>
                      <TableCell>{line.category || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          line.rowType === 'SECTION' ? 'info' :
                          line.rowType === 'WORK' ? 'secondary' :
                          line.rowType === 'RESOURCE' ? 'outline' :
                          line.rowType === 'SUBTOTAL' ? 'warning' : 'success'
                        }>
                          {line.rowType || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{line.itemType || 'MATERIAL'}</TableCell>
                      <TableCell>{line.unitLabelRaw || '-'}</TableCell>
                      <TableCell className="text-right">{formatNumber(line.plannedQuantity)}</TableCell>
                      {isAdmin && <TableCell className="text-right">{formatCurrency(line.plannedUnitPrice)}</TableCell>}
                      {isAdmin && <TableCell className="text-right">{formatCurrency(line.plannedTotalPrice)}</TableCell>}
                      <TableCell className="max-w-72 truncate text-muted-foreground">{line.notes || '-'}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 10 : 8} className="py-10 text-center text-muted-foreground">
                        {selectedDocument
                          ? t('No matching line items found')
                          : projectId
                            ? t('Import a cost plan to see line items here')
                            : t('Select a project to view imported line items')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
