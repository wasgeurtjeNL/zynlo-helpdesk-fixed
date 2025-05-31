'use client'

import { useState } from 'react'
import { ChannelsList } from '@/components'
import { Search, Filter, Plus } from 'lucide-react'
import { Button } from '@/lib/ui'
import Link from 'next/link'

export default function KanalenPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  return (
    <div className="h-full bg-gray-50">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Kanalen</h1>
              <p className="text-gray-600 mt-1">Beheer al je communicatiekanalen op één plek</p>
            </div>
            <Link href="/settings/channels/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nieuw kanaal
              </Button>
            </Link>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek kanalen..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle kanalen</option>
              <option value="email">E-mail</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="chat">Live Chat</option>
              <option value="phone">Telefoon</option>
              <option value="api">API</option>
            </select>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Meer filters
            </Button>
          </div>
        </div>

        {/* Pass search and filter props to ChannelsList */}
        <ChannelsList searchQuery={searchQuery} filterType={filterType} />
      </div>
    </div>
  )
} 