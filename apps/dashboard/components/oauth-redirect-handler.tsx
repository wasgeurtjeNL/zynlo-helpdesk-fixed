'use client';

import { useEffect } from 'react';

export function OAuthRedirectHandler() {
  useEffect(() => {
    // Immediate execution - no delays
    const handleOAuthRedirect = () => {
      if (typeof window === 'undefined') return;

      const hash = window.location.hash;
      const search = window.location.search;
      const isLocalhost = window.location.hostname === 'localhost';
      const hasAuthTokens = hash.includes('access_token=') || search.includes('code=');

      // If we're on localhost with any auth-related parameters, redirect immediately
      if (isLocalhost && hasAuthTokens) {
        const productionUrl = 'https://zynlo.io'; // Hardcoded to ensure it works
        const pathname =
          window.location.pathname === '/' ? '/inbox/nieuw' : window.location.pathname;
        const newUrl = `${productionUrl}${pathname}${hash}${search}`;

        console.log('🚨 EMERGENCY OAuth redirect from localhost to production:', newUrl);
        console.log('🚨 Current URL:', window.location.href);

        // Use the most aggressive redirect method
        window.location.href = newUrl;
        return;
      }

      // Additional safety check - if we detect VideoList or other non-Zynlo content
      if (
        isLocalhost &&
        (document.body.innerHTML.includes('VideoList') ||
          document.body.innerHTML.includes('Service Worker'))
      ) {
        console.log('🚨 Detected wrong app on localhost, redirecting to production');
        window.location.href = 'https://zynlo.io';
      }
    };

    // Execute immediately
    handleOAuthRedirect();

    // Also execute after a short delay in case of dynamic content
    const timeoutId = setTimeout(handleOAuthRedirect, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return null; // This component doesn't render anything
}
