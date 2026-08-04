import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useApp } from '@/app/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Building2, ArrowLeft } from 'lucide-react';
import { register } from '@/services/auth';
import { roleLabel } from '@/lib/i18n';
import { errorMessage } from '@/services/api';
import type { Role } from '@/api/types';

export function RegisterPage() {
  const { user, language, t } = useApp();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PROAB');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (user) return <Navigate to="/app/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ fullName, username, password, role, email: email || undefined, phone: phone || undefined });
      setSuccess(true);
      window.location.href = '/app/dashboard';
    } catch (err: unknown) {
      setError(errorMessage(err, t('Registration failed')));
    }
    setSubmitting(false);
  }

  if (success) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center border-r bg-muted/40 p-12">
        <div className="max-w-md space-y-8 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-lg border bg-card">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">
              STROYK<span className="text-primary">A</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Create an account for smeta control, warehouse operations, and M-29 closeout.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t pt-6 text-left">
            <div>
              <p className="text-xs text-muted-foreground">{t('Director')}</p>
              <p className="text-sm font-medium">Portfolio and approvals</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Prorab')}</p>
              <p className="text-sm font-medium">Site execution and requests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/40 shadow-none">
          <CardHeader className="space-y-1 text-center pb-4">
            <Link to="/login" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> {t('Back to login')}
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight">{t('Create account')}</CardTitle>
          <CardDescription className="text-sm">Start with one role and join the active project workflow</CardDescription>
        </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs text-muted-foreground">{t('Full Name')}</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-username" className="text-xs text-muted-foreground">{t('Username')}</Label>
                <Input id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="johndoe" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-xs text-muted-foreground">{t('Password')}</Label>
                  <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('Min 6 chars')} required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-xs text-muted-foreground">{t('Role')}</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    <option value="PROAB">{roleLabel('PROAB', language)}</option>
                    <option value="ADMIN">{roleLabel('ADMIN', language)}</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">{t('Email (optional)')}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@site.uz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">{t('Phone (optional)')}</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998" />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting} size="lg">
                {submitting ? t('Creating account...') : t('Create account')}
              </Button>
            </form>
          </CardContent>

          <Separator className="my-1" />
          <CardFooter className="flex-col gap-1 pb-6">
            <p className="text-xs text-muted-foreground">
              {t('Already have an account?')}{' '}
              <Link to="/login" className="text-primary hover:underline">{t('Sign in')}</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
