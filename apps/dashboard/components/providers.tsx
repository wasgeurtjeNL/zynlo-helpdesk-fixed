'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth-provider';

// Create a client outside of the component to ensure singleton
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return new QueryClient({
      defaultOptions: {
        queries: {
          // Default settings voor alle queries
          staleTime: 5 * 60 * 1000, // 5 minuten - data blijft vers
          gcTime: 10 * 60 * 1000, // 10 minuten - data blijft in cache
          refetchOnWindowFocus: false,
          refetchOnReconnect: 'always',
          retry: 1,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
          retry: 1,
        },
      },
    });
  } else {
    // Browser: use singleton
    if (!browserQueryClient) {
      browserQueryClient = new QueryClient({
        defaultOptions: {
          queries: {
            // Default settings voor alle queries
            staleTime: 5 * 60 * 1000, // 5 minuten - data blijft vers
            gcTime: 10 * 60 * 1000, // 10 minuten - data blijft in cache
            refetchOnWindowFocus: false,
            refetchOnReconnect: 'always',
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      });
    }
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster position="bottom-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
