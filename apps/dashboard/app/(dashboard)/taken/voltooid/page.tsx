import { TaskList } from '@/components/task-list'

export default function VoltooideeTakenPage() {
  return (
    <div className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Voltooide taken</h1>
          <p className="text-sm text-gray-600 mt-1">
            Alle afgeronde taken
          </p>
        </div>
        <TaskList 
          filter={{ status: 'done', include_completed: true }}
          title="Voltooide taken"
          emptyMessage="Er zijn nog geen voltooide taken."
        />
      </div>
    </div>
  )
} 