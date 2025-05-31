import * as React from 'react';
import { cn } from '../utils/cn';

const Header = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <header
    ref={ref}
    className={cn(
      'sticky top-0 z-40 flex h-16 items-center border-b bg-background px-4 shadow-sm',
      className
    )}
    {...props}
  />
));
Header.displayName = 'Header';

const HeaderContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex w-full items-center justify-between', className)}
    {...props}
  />
));
HeaderContent.displayName = 'HeaderContent';

const HeaderLeft = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-4', className)}
    {...props}
  />
));
HeaderLeft.displayName = 'HeaderLeft';

const HeaderCenter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-1 items-center justify-center', className)}
    {...props}
  />
));
HeaderCenter.displayName = 'HeaderCenter';

const HeaderRight = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-4', className)}
    {...props}
  />
));
HeaderRight.displayName = 'HeaderRight';

const HeaderTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn('text-xl font-semibold', className)}
    {...props}
  />
));
HeaderTitle.displayName = 'HeaderTitle';

const HeaderNav = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn('flex items-center gap-6', className)}
    {...props}
  />
));
HeaderNav.displayName = 'HeaderNav';

interface HeaderNavItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  href?: string;
}

const HeaderNavItem = React.forwardRef<HTMLAnchorElement, HeaderNavItemProps>(
  ({ className, active, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(
        'text-sm font-medium transition-colors hover:text-primary',
        active ? 'text-foreground' : 'text-muted-foreground',
        className
      )}
      {...props}
    />
  )
);
HeaderNavItem.displayName = 'HeaderNavItem';

export {
  Header,
  HeaderContent,
  HeaderLeft,
  HeaderCenter,
  HeaderRight,
  HeaderTitle,
  HeaderNav,
  HeaderNavItem,
}; 