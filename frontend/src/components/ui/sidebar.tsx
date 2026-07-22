import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'stroyka-sidebar-open';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContextValue = {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider.');
  return context;
}

export function SidebarProvider({
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  style,
  children,
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored == null ? defaultOpen : stored === 'true';
  });

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (controlledOpen == null) {
        setUncontrolledOpen(value);
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(value));
      }
      onOpenChange?.(value);
    },
    [controlledOpen, onOpenChange],
  );
  const toggleSidebar = React.useCallback(() => setOpen(!open), [open, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT) return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      setOpen,
      toggleSidebar,
    }),
    [open, setOpen, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        data-state={value.state}
        className={cn(
          'group/sidebar flex h-screen w-full bg-background text-foreground [--sidebar-width:15rem] [--sidebar-width-icon:4.25rem]',
          className,
        )}
        style={style}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'icon',
  className,
  children,
  ...props
}: React.ComponentProps<'aside'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'icon' | 'none';
}) {
  const { state } = useSidebar();
  const isCollapsed = collapsible === 'icon' && state === 'collapsed';

  return (
    <aside
      data-slot="sidebar"
      data-side={side}
      data-variant={variant}
      data-collapsible={isCollapsed ? 'icon' : ''}
      className={cn(
        'relative flex h-screen shrink-0 flex-col border-border bg-card text-card-foreground transition-[width] duration-200 ease-linear',
        side === 'left' ? 'border-r' : 'border-l',
        isCollapsed ? 'w-[--sidebar-width-icon]' : 'w-[--sidebar-width]',
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('shrink-0 p-3', className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('min-h-0 flex-1 overflow-y-auto p-3', className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('shrink-0 border-t p-3', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('space-y-1 py-1', className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        'px-3 py-2 text-xs font-medium uppercase text-muted-foreground group-data-[state=collapsed]/sidebar:hidden',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('space-y-1', className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('space-y-1', className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('list-none', className)} {...props} />;
}

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  className,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
}) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        'flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium outline-none transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring',
        'group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0',
        isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarRail({ className, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      title="Toggle sidebar"
      onClick={toggleSidebar}
      className={cn(
        'absolute inset-y-0 -right-2 z-10 hidden w-4 cursor-col-resize items-center justify-center sm:flex',
        'after:h-full after:w-px after:bg-transparent hover:after:bg-border',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle Sidebar"
      title="Toggle sidebar"
      onClick={toggleSidebar}
      className={cn('h-8 w-8', className)}
      {...props}
    >
      <PanelLeft className="h-4 w-4 rtl:rotate-180" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return <main data-slot="sidebar-inset" className={cn('min-w-0 flex-1 overflow-y-auto p-6', className)} {...props} />;
}
