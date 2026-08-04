import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useApp } from '@/app/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { errorMessage } from '@/services/api';

export function LoginPage() {
  const { user, login, t } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(errorMessage(err, t('Login failed')));
    }
    setSubmitting(false);
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
              Plan smeta, control warehouse movement, and close every month with M-29-ready reporting.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t pt-6 text-left">
            <div>
              <p className="text-xs text-muted-foreground">{t('Scope')}</p>
              <p className="text-sm font-medium">Smeta</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Control')}</p>
              <p className="text-sm font-medium">{t('Warehouse')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Output')}</p>
              <p className="text-sm font-medium">M-29</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border-border/40 shadow-none">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="flex justify-center mb-2 lg:hidden">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border bg-card">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {t('Welcome back')}
            </CardTitle>
            <CardDescription className="text-sm">
              Sign in to continue the project workflow
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs text-muted-foreground">
                  {t('Username')}
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={t('Enter your username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  {t('Password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('Enter your password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting} size="lg">
                {submitting ? t('Signing in...') : t('Sign in')}
              </Button>
            </form>
          </CardContent>

          <Separator className="my-1" />

          <CardFooter className="flex-col gap-1 pb-6">
            <p className="text-xs text-muted-foreground">
              {t("Don't have an account?")}{' '}
              <Link to="/register" className="text-primary hover:underline">{t('Create one')}</Link>
            </p>
            <p className="text-xs text-muted-foreground mt-2">

              {t('Stroyka Construction Control System')}
            </p>
            <p className="text-xs text-muted-foreground">
              v0.1.0
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
