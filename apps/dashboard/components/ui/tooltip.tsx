'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProviderProps {
  children: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}

const TooltipContext = React.createContext<{
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>({})

const TooltipProvider = ({
  children,
  delayDuration = 700,
  skipDelayDuration = 300,
  ...props
}: TooltipProviderProps) => {
  return <>{children}</>
}

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <TooltipContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
  const { onOpenChange } = React.useContext(TooltipContext)
  
  const handleMouseEnter = () => onOpenChange?.(true)
  const handleMouseLeave = () => onOpenChange?.(false)
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      ...props
    })
  }
  
  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipTrigger.displayName = 'TooltipTrigger'

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    sideOffset?: number
  }
>(({ className, sideOffset = 4, ...props }, ref) => {
  const { open } = React.useContext(TooltipContext)
  
  if (!open) return null
  
  return (
    <div
      ref={ref}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95',
        className
      )}
      {...props}
    />
  )
})
TooltipContent.displayName = 'TooltipContent'

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} 