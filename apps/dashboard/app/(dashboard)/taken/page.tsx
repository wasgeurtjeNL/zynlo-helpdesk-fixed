import { TaskList } from '@/components/task-list'

export default function TakenPage() {
  return (
    <div className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Alle taken</h1>
          <p className="text-sm text-gray-600 mt-1">
            Beheer al je taken en to-do's op één plek
          </p>
        </div>
        <TaskList 
          title="Alle taken"
          emptyMessage="Nog geen taken aangemaakt. Begin met het maken van je eerste taak!"
        />
      </div>
    </div>
  )
} 