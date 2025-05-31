'use client'

import { TaskList } from '@/components/task-list'
import { useAuth } from '@zynlo/supabase'

export default function MijnTakenPage() {
  const { user } = useAuth()

  return (
    <div className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Mijn taken</h1>
          <p className="text-sm text-gray-600 mt-1">
            Taken die aan jou zijn toegewezen
          </p>
        </div>
        <TaskList 
          filter={{ user_id: user?.id }}
          title="Mijn taken"
          emptyMessage="Je hebt nog geen taken toegewezen gekregen."
        />
      </div>
    </div>
  )
} 