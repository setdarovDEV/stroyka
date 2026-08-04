import { useState } from 'react';
import { useApp } from '@/app/context';
import { api, errorMessage } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export function SmetaPage() {
  const { currentProject, t } = useApp();
  const [name, setName] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState('');

  async function handleImport() {
    if (!currentProject?.id || !name || !excelFile || importing) return;

    setImporting(true);
    setResult(t('Processing...'));

    try {
      const formData = new FormData();
      formData.set('projectId', currentProject.id);
      formData.set('name', name);
      formData.set('file', excelFile);

      const response = await api.postForm<{ summary?: { workRowsCount?: number; resourceRowsCount?: number } }>(
        '/estimates/import-workbook',
        formData,
      );

      setName('');
      setExcelFile(null);
      setResult(
        `${t('Imported')} ${response.summary?.workRowsCount ?? 0} ${t('work rows')}, ${response.summary?.resourceRowsCount ?? 0} ${t('resource rows')}`,
      );
    } catch (error: unknown) {
      setResult(`${t('Excel import failed')}: ${errorMessage(error, t('Unknown error'))}`);
    } finally {
      setImporting(false);
    }
  }

  const isError = result.includes('failed') || result.includes('Failed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('Smeta Uploading')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentProject ? `${t('Current')}: ${currentProject.name}` : t('Select a project first')}
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-sm">{t('Upload Smeta Workbook')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('Estimate Name *')}
            disabled={!currentProject}
          />

          <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-3 text-sm text-muted-foreground">{t('Upload Excel file (.xlsx, .xls)')}</p>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setExcelFile(event.target.files?.[0] || null)}
              disabled={!currentProject}
            />
            {excelFile && <p className="mt-2 text-xs text-muted-foreground">{t('Selected')}: {excelFile.name}</p>}
            <Button
              variant="secondary"
              className="mt-3"
              onClick={handleImport}
              disabled={!currentProject || !name || !excelFile || importing}
            >
              {importing ? t('Processing...') : t('Import Excel File')}
            </Button>
          </div>

          {result && (
            <div className={`rounded-md p-3 text-sm ${isError ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-400'}`}>
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
