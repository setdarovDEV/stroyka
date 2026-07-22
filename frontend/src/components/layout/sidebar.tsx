import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '@/app/context';
import { Button } from '@/components/ui/button';
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
  Users,
  BarChart3,
  FolderKanban,
  ShieldCheck,
  Bell,
  Settings,
  LogOut,
  Layers,
  PackageCheck,
} from 'lucide-react';
import { roleLabel } from '@/lib/i18n';

const mainNavItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/estimate', label: 'Estimate', icon: FileText },
  { to: '/app/warehouse', label: 'Warehouse', icon: Box },
  { to: '/app/material-requests', label: 'Material Requests', icon: PackageCheck },
  { to: '/app/brigades', label: 'Brigades', icon: Users },
  { to: '/app/zones', label: 'Zones', icon: Layers },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
  { to: '/app/alerts', label: 'Alerts', icon: Bell },
];

const adminNavItems = [
  { to: '/app/users', label: 'Users', icon: ShieldCheck },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { user, logout, language, t } = useApp();
  const { state } = useSidebar();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const collapsed = state === 'collapsed';

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
  );
}
