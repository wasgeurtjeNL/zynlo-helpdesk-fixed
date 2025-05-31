import { InboxLayout } from '@/components/inbox-layout'

export default function InboxToegewezenPage() {
  // This would need custom logic to filter assigned tickets
  // For now, we'll show all non-new tickets as a placeholder
  return <InboxLayout title="Toegewezen tickets" status="open" />
} 