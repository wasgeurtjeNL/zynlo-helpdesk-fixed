'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AuthProvider } from './auth-provider';

// Dynamically import ReactQueryDevtools to prevent SSR and webpack issues
const ReactQueryDevtools = dynamic(
  () =>
    import('@tanstack/react-query-devtools')
      .then((mod) => {
        // Ensure module and ReactQueryDevtools exist
        if (!mod || !mod.ReactQueryDevtools) {
          throw new Error('ReactQueryDevtools not found in module');
        }
        return {
          default: mod.ReactQueryDevtools,
        };
      })
      .catch((error) => {
        console.warn('Failed to load ReactQueryDevtools:', error);
        // Return a fallback component that renders nothing
        return {
          default: () => null,
        };
      }),
  {
    ssr: false,
    loading: () => null,
  }
);

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
  }

  // Browser: use singleton
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </AuthProvider>
    </QueryClientProvider>
  );
}
