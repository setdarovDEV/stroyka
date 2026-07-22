import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/context';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload } from 'lucide-react';
import { errorMessage } from '@/services/api';
import type { EstimateLine, Paginated } from '@/api/types';

type ExcelCell = string | number | boolean | null | undefined;
type ExcelRow = ExcelCell[];
type XlsxModule = {
  default: {
    read: (buffer: ArrayBuffer, options: { type: 'array' }) => { Sheets: Record<string, unknown>; SheetNames: string[] };
    utils: { sheet_to_json: (sheet: unknown, options: { header: 1 }) => ExcelRow[] };
  };
};

export function EstimatePage() {
  const { currentProject, user, t } = useApp();
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<EstimateLine[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('lines');

  const [estName, setEstName] = useState('');
  const [estLines, setEstLines] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<string>('');

  const isAdmin = user?.role === 'ADMIN';
  const projectId = currentProject?.id;

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

  async function handleImportJson() {
    if (!estName || !estLines || !projectId) return;
    try {
      const parsedLines = JSON.parse(estLines) as unknown;
      await api.post('/estimates/import', { projectId, name: estName, lines: parsedLines });
      setEstName('');
      setEstLines('');
      setImportResult(t('Import successful'));
      loadLines();
    } catch { setImportResult(t('Invalid JSON or import failed')); }
  }

  async function handleImportExcel() {
    if (!excelFile || !estName || !projectId) return;
    setImportResult(t('Processing...'));
    try {
      const buffer = await excelFile.arrayBuffer();
      const xlsxModuleUrl = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
      const XLSX = (await import(/* @vite-ignore */ xlsxModuleUrl)) as XlsxModule;
      const wb = XLSX.default.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.default.utils.sheet_to_json(sheet, { header: 1 });

      if (data.length < 2) { setImportResult(t('Empty or invalid Excel file')); return; }

      const headers = data[0].map((h) => String(h).toLowerCase().trim());
      const codeIdx = headers.findIndex((h: string) => h.includes('code') || h.includes('kod'));
      const nameIdx = headers.findIndex((h: string) => h.includes('name') || h.includes('nom') || h.includes('nomi'));
      const qtyIdx = headers.findIndex((h: string) => h.includes('qty') || h.includes('quantity') || h.includes('miqdor'));
      const unitIdx = headers.findIndex((h: string) => h.includes('unit') || h.includes('birlik'));
      const priceIdx = headers.findIndex((h: string) => h.includes('price') || h.includes('narx') || h.includes('sum'));

      if (nameIdx === -1) { setImportResult(t('Could not find name column in Excel')); return; }

      const categoryIdx = headers.findIndex((h: string) => h.includes('category') || h.includes('kategoriya'));
      const importedLines = data.slice(1).filter((row) => row.some(cell => cell != null && cell !== '')).map((row, i) => ({
        code: codeIdx >= 0 ? String(row[codeIdx] || `E2E-${i + 1}`) : `E2E-${i + 1}`,
        name: String(row[nameIdx] || `Item ${i + 1}`),
        plannedQuantity: qtyIdx >= 0 ? Number(row[qtyIdx]) || 0 : 1,
        plannedUnitPrice: priceIdx >= 0 ? Number(row[priceIdx]) || undefined : undefined,
        category: String(categoryIdx >= 0 ? row[categoryIdx] || 'Imported' : 'Imported'),
      }));

      await api.post('/estimates/import', { projectId, name: estName, lines: importedLines });
      setEstName('');
      setExcelFile(null);
      setImportResult(`${t('Imported')} ${importedLines.length} ${t('lines')}`);
      loadLines();
    } catch (e: unknown) { setImportResult(`${t('Excel import failed')}: ${errorMessage(e, t('Unknown error'))}`); }
  }

  const filtered = lines.filter((l) =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Estimate')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('Construction estimate items and import')} ({total} {t('lines')})</p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Code')}</TableHead>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Category')}</TableHead>
                  <TableHead className="text-right">{t('Planned Qty')}</TableHead>
                  <TableHead className="text-right">{t('Used Qty')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('Unit Price')}</TableHead>}
                  {isAdmin && <TableHead className="text-right">{t('Total')}</TableHead>}
                  <TableHead>{t('Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((line) => {
                  const usedQuantity = line.usedQuantity ?? 0;
                  const overused = usedQuantity > line.plannedQuantity;
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-xs">{line.code}</TableCell>
                      <TableCell>{line.name}</TableCell>
                      <TableCell className="text-muted-foreground">{line.category || '-'}</TableCell>
                      <TableCell className="text-right">{line.plannedQuantity}</TableCell>
                      <TableCell className="text-right">{usedQuantity}</TableCell>
                      {isAdmin && <TableCell className="text-right">{line.plannedUnitPrice?.toLocaleString() || '-'}</TableCell>}
                      {isAdmin && <TableCell className="text-right">{line.plannedTotalPrice?.toLocaleString() || '-'}</TableCell>}
                      <TableCell>
                        <Badge variant={overused ? 'danger' : 'success'}>
                          {overused ? t('Overused') : t('Normal')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 6} className="text-center text-muted-foreground py-8">{t('No estimate lines found')}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between p-4 border-t border-border text-sm text-muted-foreground">
              <span>{t('Page')} {page} {t('of')} {Math.ceil(total / 20) || 1}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('Prev')}</Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>{t('Next')}</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">{t('Import Estimate')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input value={estName} onChange={(e) => setEstName(e.target.value)} placeholder={t('Estimate Name *')} />
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">{t('Upload Excel file (.xlsx, .xls')}</p>
                <Input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                {excelFile && <p className="text-xs text-muted-foreground mt-2">{t('Selected')}: {excelFile.name}</p>}
                <Button variant="secondary" className="mt-3" onClick={handleImportExcel} disabled={!excelFile || !estName}>
                  Upload Excel
                </Button>
              </div>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">{t('OR paste JSON')}</span></div>
              </div>
              <Textarea value={estLines} onChange={(e) => setEstLines(e.target.value)} rows={4}
                placeholder='[{"code":"P.1.1","name":"Concrete C300","plannedQuantity":100,"plannedUnitPrice":50000}]' />
              <Button onClick={handleImportJson} disabled={!estName || !estLines}>{t('Import from JSON')}</Button>
              {importResult && (
                <div className={`p-3 rounded-md text-sm ${importResult.includes('failed') || importResult.includes('Invalid') ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-400'}`}>
                  {importResult}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
