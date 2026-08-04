import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/app/context';

export function M29Page() {
  const { currentProject, t } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('M29 Management')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentProject ? `${t('Current')}: ${currentProject.name}` : t('Select a project first')}
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-sm">{t('M29 Management')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('This page is intentionally empty for now.')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
