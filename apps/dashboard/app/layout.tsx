import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { OAuthRedirectHandler } from '@/components/oauth-redirect-handler';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zynlo Helpdesk',
  description: 'Modern ticketing system for customer support',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script src="/oauth-redirect.js" />
      </head>
      <body className={inter.className}>
        <OAuthRedirectHandler />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
