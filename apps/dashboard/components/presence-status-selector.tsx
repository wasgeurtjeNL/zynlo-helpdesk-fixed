'use client'

import { useState } from 'react'
import { usePresence } from '@zynlo/supabase'
import { PresenceIndicator, type PresenceStatus } from './presence-indicator'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusOptions: { value: PresenceStatus; label: string; description: string }[] = [
  { value: 'online', label: 'Online', description: 'Actief beschikbaar' },
  { value: 'away', label: 'Afwezig', description: 'Kort weg' },
  { value: 'busy', label: 'Bezet', description: 'Niet storen' },
  { value: 'offline', label: 'Offline', description: 'Niet beschikbaar' }
]

interface PresenceStatusSelectorProps {
  className?: string
  showLabel?: boolean
}

export function PresenceStatusSelector({ className, showLabel = true }: PresenceStatusSelectorProps) {
  const { status, setStatus } = usePresence()
  const [isOpen, setIsOpen] = useState(false)

  const currentStatus = statusOptions.find(option => option.value === status)

  const handleStatusChange = (newStatus: PresenceStatus) => {
    setStatus(newStatus)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      >
        <PresenceIndicator 
          status={status} 
          size="sm"
          showPulse={status === 'online'}
        />
        {showLabel && (
          <>
            <span className="text-gray-700">{currentStatus?.label}</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-20">
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <PresenceIndicator 
                      status={option.value} 
                      size="sm"
                      showPulse={option.value === 'online'}
                    />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </div>
                  {status === option.value && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for navigation or header
export function PresenceStatusSelectorCompact() {
  const { status, setStatus } = usePresence()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        title={`Status: ${statusOptions.find(s => s.value === status)?.label}`}
      >
        <PresenceIndicator 
          status={status} 
          size="md"
          showPulse={status === 'online'}
        />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-20">
            <div className="py-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatus(option.value)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  <PresenceIndicator 
                    status={option.value} 
                    size="sm"
                    showPulse={option.value === 'online'}
                  />
                  <span className="font-medium text-gray-900">{option.label}</span>
                  {status === option.value && (
                    <Check className="h-3 w-3 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 