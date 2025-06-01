'use client'

import dynamic from 'next/dynamic'

// Dynamically import the login form to avoid SSR issues with useSearchParams
const LoginForm = dynamic(() => import('./LoginForm'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  )
})

export default function LoginPage() {
  return <LoginForm />
} 