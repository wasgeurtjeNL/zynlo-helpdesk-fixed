// This is a Server Component - no 'use client' directive
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-6 text-gray-900 sm:truncate">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="mt-4 flex sm:ml-4 sm:mt-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 