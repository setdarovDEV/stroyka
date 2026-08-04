import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useApp } from '@/app/context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select } from '@/components/ui/select';
import { api } from '@/services/api';
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
  FileText,
  Box,
  LogOut,
  ScrollText,
} from 'lucide-react';
import { roleLabel } from '@/lib/i18n';
import type { Paginated, Project } from '@/api/types';

const mainNavItems = [
  { to: '/app/smeta', label: 'Smeta Uploading', icon: FileText },
  { to: '/app/warehouse', label: 'Warehouse / Inventory', icon: Box },
  { to: '/app/m29', label: 'M29 Management', icon: ScrollText },
];

export function Sidebar() {
  const { user, logout, language, t, currentProject, setCurrentProject } = useApp();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;

    api.get<Paginated<Project>>('/projects?page=1&limit=100')
      .then((response) => {
        if (cancelled) return;
        const loadedProjects = response.items || [];
        setProjects(loadedProjects);

        if (!currentProject && loadedProjects.length > 0) {
          setCurrentProject(loadedProjects[0]);
        }
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProject, setCurrentProject]);

  return (
    <SidebarPanel collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center px-3 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0">
          <h1 className="truncate text-xl font-bold tracking-tight" title="Stroyka">
            {collapsed ? (
              <span className="text-primary">S</span>
            ) : (
              <>
                STROYK<span className="text-primary">A</span>
              </>
            )}
          </h1>
        </div>
      </SidebarHeader>
      <SidebarTrigger className="absolute right-0 top-6 z-20 h-7 w-7 translate-x-1/2 border bg-card shadow-none" />
      <Separator />
      {!collapsed && (
        <div className="px-3 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('Project')}</p>
          <Select
            value={currentProject?.id || ''}
            onChange={(event) => {
              const project = projects.find((item) => item.id === event.target.value) || null;
              setCurrentProject(project);
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
      )}
      {!collapsed && <Separator />}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('Application')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
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
  );
}
