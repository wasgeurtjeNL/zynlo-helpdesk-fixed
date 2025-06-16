'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function OAuthRedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're on localhost with OAuth tokens in URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const isLocalhost = window.location.hostname === 'localhost';
      const hasAccessToken = hash.includes('access_token=');

      if (isLocalhost && hasAccessToken) {
        // Extract the hash fragment and redirect to production
        const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zynlo.io';
        const newUrl = `${productionUrl}${window.location.pathname}${hash}`;

        console.log('🔄 OAuth redirect detected on localhost, redirecting to:', newUrl);

        // Replace current location to avoid infinite redirects
        window.location.replace(newUrl);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}
