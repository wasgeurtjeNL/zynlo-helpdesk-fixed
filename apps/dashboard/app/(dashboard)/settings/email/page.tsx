'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@zynlo/ui'
import Link from 'next/link'

export default function EmailSettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Email Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Email settings are configured in the Email channel settings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-1">Email Configuration</h3>
          <p className="text-sm text-blue-700">
            To configure email settings, please go to{' '}
            <Link href="/settings/channels/email" className="font-medium underline">
              Channels → Email
            </Link>
            {' '}in the settings menu.
          </p>
        </div>
      </div>
    </div>
  )
} 