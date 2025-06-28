import { Sidebar } from '@/components/sidebar';
import { ToastContainer } from '@/components/toast';
import { NotificationProvider } from '@/components/notification-provider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        <ToastContainer />
      </div>
    </NotificationProvider>
  );
}
