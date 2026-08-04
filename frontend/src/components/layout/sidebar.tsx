import { NavLink, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/app/context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar as SidebarPanel,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Box,
  Building2,
  Users,
  BarChart3,
  FolderKanban,
  FolderPlus,
  ShieldCheck,
  Bell,
  Settings,
  LogOut,
  Layers,
  PackageCheck,
} from 'lucide-react';
import { roleLabel } from '@/lib/i18n';
import { api, errorMessage } from '@/services/api';
import type { Paginated, Project } from '@/api/types';

const workflowNavItems = [
  { to: '/app/dashboard', label: 'Workbench', icon: LayoutDashboard },
  { to: '/app/estimate', label: 'Smeta', icon: FileText },
  { to: '/app/warehouse', label: 'Warehouse', icon: Box },
  { to: '/app/material-requests', label: 'Material Requests', icon: PackageCheck },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
];

const oversightNavItems = [
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/brigades', label: 'Brigades', icon: Users },
  { to: '/app/zones', label: 'Zones', icon: Layers },
  { to: '/app/alerts', label: 'Alerts', icon: Bell },
];

const adminNavItems = [
  { to: '/app/users', label: 'Users', icon: ShieldCheck },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout, language, t, currentProject, setCurrentProject } = useApp();
  const { state } = useSidebar();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const collapsed = state === 'collapsed';
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      const res = await api.get<Paginated<Project>>('/projects?page=1&limit=100');
      const items = res.items || [];
      setProjects(items);
      if (!currentProject && items.length > 0) {
        setCurrentProject(items[0]);
      }
    } catch {
      setProjects([]);
    }
  }, [currentProject, setCurrentProject]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function handleCreateProject() {
    if (!name || creating) return;
    setCreating(true);
    setCreateError('');

    try {
      const project = await api.post<Project>('/projects', {
        name,
        address: address || undefined,
        clientName: clientName || undefined,
        startDate: startDate || undefined,
        plannedEndDate: plannedEndDate || undefined,
      });
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      setCurrentProject(project);
      setShowCreate(false);
      setName('');
      setAddress('');
      setClientName('');
      setStartDate('');
      setPlannedEndDate('');
    } catch (error: unknown) {
      setCreateError(errorMessage(error, t('Failed to create project')));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
    <SidebarPanel collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center px-3 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0">
          <div className="flex items-center gap-3" title="Stroyka">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted text-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            {!collapsed ? (
              <h1 className="truncate text-xl font-bold tracking-tight">
                STROYK<span className="text-primary">A</span>
              </h1>
            ) : null}
          </div>
        </div>
      </SidebarHeader>
      <SidebarTrigger className="absolute right-0 top-6 z-20 h-7 w-7 translate-x-1/2 border bg-card shadow-none" />
      <Separator />
      {!collapsed && (
        <div className="space-y-3 px-3 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Active project</p>
            <Select
              className="mt-2"
              value={currentProject?.id || ''}
              onChange={(event) => {
                const nextProject = projects.find((item) => item.id === event.target.value) || null;
                setCurrentProject(nextProject);
              }}
            >
              <option value="">{t('Select project')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>
          {isAdmin && (
            <Button className="w-full justify-start" variant="outline" onClick={() => setShowCreate(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              {t('New Project')}
            </Button>
          )}
        </div>
      )}
      {!collapsed && <Separator />}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to} title={t(item.label)}>
                    <NavLink to={item.to}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[state=collapsed]/sidebar:hidden">
                        {t(item.label)}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Oversight</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {oversightNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.to} title={t(item.label)}>
                    <NavLink to={item.to}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[state=collapsed]/sidebar:hidden">
                        {t(item.label)}
                      </span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('Admin')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={location.pathname === item.to} title={t(item.label)}>
                      <NavLink to={item.to}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="truncate group-data-[state=collapsed]/sidebar:hidden">
                          {t(item.label)}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="mb-3 px-1 group-data-[state=collapsed]/sidebar:hidden">
          <span className="block text-sm font-medium">{user?.fullName || ''}</span>
          <span className="block text-xs text-muted-foreground uppercase">{roleLabel(user?.role, language)}</span>
        </div>
        <Button
          variant="secondary"
          size={collapsed ? 'icon' : 'default'}
          className="w-full hover:bg-destructive hover:text-destructive-foreground group-data-[state=collapsed]/sidebar:w-9"
          onClick={logout}
          title={t('Log out')}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[state=collapsed]/sidebar:hidden">{t('Log out')}</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </SidebarPanel>
    <Dialog open={showCreate} onOpenChange={setShowCreate}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Create Project')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Project Name *')} />
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('Address')} />
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder={t('Client / Investor Name')} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t('Start Date')}</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">{t('Planned End Date')}</label>
              <Input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
            </div>
          </div>
          {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreate(false)}>{t('Cancel')}</Button>
          <Button onClick={handleCreateProject} disabled={!name || creating}>
            {creating ? t('Creating...') : t('Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
