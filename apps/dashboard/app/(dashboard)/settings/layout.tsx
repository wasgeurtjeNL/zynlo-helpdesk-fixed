import { SettingsSidebar } from '@/components/settings-sidebar'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full flex">
      <SettingsSidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
} 