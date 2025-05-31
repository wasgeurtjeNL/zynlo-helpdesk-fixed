import { OrganizationSettings } from '@/components/settings/organization-settings'

export default function OrganizationSettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Instellingen</h1>
        <OrganizationSettings />
      </div>
    </div>
  )
} 