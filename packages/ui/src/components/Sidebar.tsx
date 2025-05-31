'use client';

import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  collapsible?: boolean;
  width?: string;
  collapsedWidth?: string;
}

const SidebarContext = React.createContext<{
  collapsed: boolean;
  collapsible: boolean;
}>({
  collapsed: false,
  collapsible: true,
});

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      className,
      children,
      collapsed = false,
      onCollapse,
      collapsible = true,
      width = '16rem',
      collapsedWidth = '4rem',
      ...props
    },
    ref
  ) => {
    const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

    React.useEffect(() => {
      setIsCollapsed(collapsed);
    }, [collapsed]);

    const handleCollapse = () => {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      onCollapse?.(newState);
    };

    return (
      <SidebarContext.Provider value={{ collapsed: isCollapsed, collapsible }}>
        <aside
          ref={ref}
          className={cn(
            'relative flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out',
            className
          )}
          style={{
            width: isCollapsed ? collapsedWidth : width,
            minWidth: isCollapsed ? collapsedWidth : width,
          }}
          {...props}
        >
          {children}
          {collapsible && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute -right-4 top-6 z-10 h-8 w-8 rounded-full border bg-background shadow-md transition-transform hover:scale-110',
                isCollapsed && 'rotate-180'
              )}
              onClick={handleCollapse}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </span>
            </Button>
          )}
        </aside>
      </SidebarContext.Provider>
    );
  }
);
Sidebar.displayName = 'Sidebar';

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex h-16 items-center border-b px-4', className)}
    {...props}
  />
));
SidebarHeader.displayName = 'SidebarHeader';

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto px-3 py-4', className)}
    {...props}
  />
));
SidebarContent.displayName = 'SidebarContent';

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-t px-3 py-3', className)}
    {...props}
  />
));
SidebarFooter.displayName = 'SidebarFooter';

interface SidebarItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

const SidebarItem = React.forwardRef<HTMLDivElement, SidebarItemProps>(
  ({ className, children, active, icon, ...props }, ref) => {
    const { collapsed } = React.useContext(SidebarContext);

    return (
      <div
        ref={ref}
        className={cn(
          'group relative flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          active && 'bg-accent text-accent-foreground',
          className
        )}
        {...props}
      >
        {icon && (
          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center', !collapsed && 'mr-3')}>
            {icon}
          </span>
        )}
        {!collapsed && <span className="flex-1">{children}</span>}
        {collapsed && children && (
          <div className="absolute left-full ml-2 hidden min-w-max rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md group-hover:block">
            {children}
          </div>
        )}
      </div>
    );
  }
);
SidebarItem.displayName = 'SidebarItem';

const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('mb-4', className)}
      {...props}
    >
      {children}
    </div>
  );
});
SidebarSection.displayName = 'SidebarSection';

interface SidebarLabelProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const SidebarLabel = React.forwardRef<HTMLParagraphElement, SidebarLabelProps>(
  ({ className, children, ...props }, ref) => {
    const { collapsed } = React.useContext(SidebarContext);

    if (collapsed) {
      return <div className="mb-2 h-px bg-border" />;
    }

    return (
      <p
        ref={ref}
        className={cn(
          'mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground',
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);
SidebarLabel.displayName = 'SidebarLabel';

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarItem,
  SidebarSection,
  SidebarLabel,
}; 