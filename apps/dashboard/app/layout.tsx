import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { ClientInitializer } from '@/components/client-initializer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zynlo Helpdesk',
  description: 'Modern ticketing system for customer support',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Immediate fix for fetchUserRole error
              if (typeof window !== 'undefined' && !window.fetchUserRole) {
                window.fetchUserRole = async function() {
                  console.warn('fetchUserRole was called but is not implemented. This is a temporary fix.');
                  return null;
                };
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ClientInitializer />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
