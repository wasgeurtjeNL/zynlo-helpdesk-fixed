import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Status variants
        new: 'border-transparent bg-[hsl(var(--status-new))] text-white',
        open: 'border-transparent bg-[hsl(var(--status-open))] text-white',
        pending: 'border-transparent bg-[hsl(var(--status-pending))] text-white',
        resolved: 'border-transparent bg-[hsl(var(--status-resolved))] text-white',
        closed: 'border-transparent bg-[hsl(var(--status-closed))] text-white',
        // Priority variants
        low: 'border-transparent bg-[hsl(var(--priority-low))] text-white',
        normal: 'border-transparent bg-[hsl(var(--priority-normal))] text-white',
        high: 'border-transparent bg-[hsl(var(--priority-high))] text-white',
        urgent: 'border-transparent bg-[hsl(var(--priority-urgent))] text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }; 