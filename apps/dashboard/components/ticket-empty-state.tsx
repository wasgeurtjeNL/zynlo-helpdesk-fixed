'use client'

import { MessageSquare, PenSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TicketEmptyStateProps {
  className?: string
  onCreateNew?: () => void
}

export function TicketEmptyState({ className, onCreateNew }: TicketEmptyStateProps) {
  return (
    <div className={cn(
      "h-full flex items-center justify-center p-8 animate-fade-in",
      className
    )}>
      <div className="text-center max-w-md">
        {/* Icon/Illustration */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-12 h-12 text-gray-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <PenSquare className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Text */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Ga de dialoog met klanten aan
        </h3>
        <p className="text-gray-500 mb-6">
          Selecteer een gesprek en verstuur een reactie
        </p>

        {/* Button */}
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PenSquare className="w-4 h-4" />
            <span>Begin gesprek</span>
          </button>
        )}
      </div>
    </div>
  )
} 