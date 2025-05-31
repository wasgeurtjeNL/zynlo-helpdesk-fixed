import { TaskList } from '@/components/task-list'

export default function TeamTakenPage() {
  return (
    <div className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Team taken</h1>
          <p className="text-sm text-gray-600 mt-1">
            Alle taken van jouw team
          </p>
        </div>
        <TaskList 
          title="Team taken"
          emptyMessage="Er zijn nog geen team taken aangemaakt."
        />
      </div>
    </div>
  )
} 