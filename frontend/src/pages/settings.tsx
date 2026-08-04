import { useApp } from '@/app/context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { languages, roleLabel, type Language } from '@/lib/i18n';

export function SettingsPage() {
  const { user, currentProject, language, setLanguage, t } = useApp();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t('Application and profile settings')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Profile')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Name')}</span>
              <span className="text-sm font-medium">{user?.fullName || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Username')}</span>
              <span className="text-sm font-medium">{user?.username || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Role')}</span>
              <Badge variant={user?.role === 'ADMIN' ? 'info' : 'default'}>{roleLabel(user?.role, language)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('User ID')}</span>
              <span className="text-sm font-mono text-muted-foreground">{user?.id || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('Active Project')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Name')}</span>
              <span className="text-sm font-medium">{currentProject?.name || t('None selected')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ID</span>
              <span className="text-sm font-mono text-muted-foreground">{currentProject?.id || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t('ApplicationTitle')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Language')}</span>
              <Select
                className="w-40"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Version')}</span>
              <span className="text-sm font-medium">0.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Environment')}</span>
              <span className="text-sm font-medium">{t('Development')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Backend')}</span>
              <span className="text-sm font-medium">NestJS + PostgreSQL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('Frontend')}</span>
              <span className="text-sm font-medium">React + Tailwind</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
