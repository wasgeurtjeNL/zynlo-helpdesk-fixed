export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4">Welkom bij Zynlo Helpdesk</h1>
        <p className="text-gray-600 mb-6">Het moderne ticketsysteem voor jouw team</p>
        <div className="space-y-4">
          <a
            href="/inbox/nieuw"
            className="block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Ga naar Inbox
          </a>
          <a
            href="/login"
            className="block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Inloggen
          </a>
        </div>
      </div>
    </div>
  )
} 