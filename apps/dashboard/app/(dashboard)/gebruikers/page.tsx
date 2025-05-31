import { UsersManager } from '@/components/users-manager'

export default function GebruikersPage() {
  return (
    <div className="h-full">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Gebruikers</h1>
            <p className="text-sm text-gray-600 mt-1">
              Beheer gebruikers en hun toegangsrechten
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
            Gebruiker uitnodigen
          </button>
        </div>
        <UsersManager />
      </div>
    </div>
  )
} 