import { Outlet, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from './sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useApp } from '@/app/context';

const titles: Record<string, string> = {
  '/app/dashboard': 'Project workbench',
  '/app/projects': 'Projects',
  '/app/estimate': 'Smeta workspace',
  '/app/warehouse': 'Warehouse control',
  '/app/material-requests': 'Material requests',
  '/app/brigades': 'Brigades',
  '/app/zones': 'Zones',
  '/app/reports': 'Reports and closeout',
  '/app/alerts': 'Alerts',
  '/app/users': 'Users',
  '/app/settings': 'Settings',
};

export function AppLayout() {
  const location = useLocation();
  const { currentProject } = useApp();
  const title = titles[location.pathname] || 'Stroyka';

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <div className="border-b border-border/70 bg-card/80 px-6 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentProject ? (
                <>
                  <Badge variant="outline">{currentProject.name}</Badge>
                  {currentProject.status ? <Badge variant="secondary">{currentProject.status}</Badge> : null}
                  {currentProject.plannedEndDate ? <Badge variant="outline">End {new Date(currentProject.plannedEndDate).toLocaleDateString()}</Badge> : null}
                </>
              ) : (
                <Badge variant="outline">No active project</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
