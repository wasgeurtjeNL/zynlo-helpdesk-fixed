'use client'

import { useState } from 'react'
import { AlertTriangle, RefreshCw, X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CollisionWarningProps {
  isVisible: boolean
  conflictDetails: {
    currentVersion: number
    expectedVersion: number
    lastUpdated?: string
    updatedBy?: string
  }
  onRetry: () => void
  onCancel: () => void
  onRefresh: () => void
  className?: string
}

export function CollisionWarning({
  isVisible,
  conflictDetails,
  onRetry,
  onCancel,
  onRefresh,
  className
}: CollisionWarningProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
      toast.success('Wijzigingen succesvol opgeslagen')
    } catch (error) {
      toast.error('Fout bij opslaan van wijzigingen')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleRefresh = () => {
    onRefresh()
    toast.info('Pagina ververst met laatste wijzigingen')
  }

  if (!isVisible) return null

  return (
    <div className={cn(
      'fixed inset-x-4 top-4 z-50 mx-auto max-w-2xl',
      'bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg',
      'animate-in slide-in-from-top duration-300',
      className
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-yellow-800">
              Conflict gedetecteerd
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              <p>
                Dit ticket is gewijzigd door een andere agent terwijl je aan het bewerken was.
              </p>
              {conflictDetails.updatedBy && (
                <p className="mt-1">
                  <span className="font-medium">Laatst gewijzigd door:</span> {conflictDetails.updatedBy}
                </p>
              )}
              <div className="mt-2 text-xs">
                <span className="font-medium">Jouw versie:</span> {conflictDetails.expectedVersion} → 
                <span className="font-medium ml-2">Huidige versie:</span> {conflictDetails.currentVersion}
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="flex-shrink-0 p-1 text-yellow-400 hover:text-yellow-600 rounded-md hover:bg-yellow-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Verversen</span>
          </button>

          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 text-sm bg-yellow-600 text-white rounded-md transition-colors',
              isRetrying 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-yellow-700'
            )}
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span>{isRetrying ? 'Bezig...' : 'Opnieuw proberen'}</span>
          </button>

          <button
            onClick={onCancel}
            className="text-sm text-yellow-600 hover:text-yellow-800 transition-colors"
          >
            Annuleren
          </button>
        </div>

        {/* Help text */}
        <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 rounded p-2">
          <p><span className="font-medium">Tip:</span> Klik op "Verversen" om de laatste wijzigingen te laden, of "Opnieuw proberen" om je wijzigingen te behouden.</p>
        </div>
      </div>
    </div>
  )
} 