import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '@/app/context';

export function ProtectedRoute() {
  const { user, loading, t } = useApp();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">{t('Loading...')}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
