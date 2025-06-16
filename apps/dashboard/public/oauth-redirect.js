// Emergency OAuth redirect script - executes before React loads
(function () {
  'use strict';

  // Only run in browser
  if (typeof window === 'undefined') return;

  const isLocalhost = window.location.hostname === 'localhost';
  const hash = window.location.hash;
  const search = window.location.search;
  const hasAuthTokens =
    hash.includes('access_token=') || search.includes('code=') || search.includes('error=');

  // If we're on localhost with OAuth tokens/errors, redirect immediately
  if (isLocalhost && hasAuthTokens) {
    const productionUrl = 'https://zynlo.io';
    const pathname = window.location.pathname === '/' ? '/inbox/nieuw' : window.location.pathname;
    const newUrl = productionUrl + pathname + hash + search;

    console.log('🚨 IMMEDIATE OAuth redirect script triggered');
    console.log('🚨 From:', window.location.href);
    console.log('🚨 To:', newUrl);

    // Immediate redirect - no delays
    window.location.replace(newUrl);
  }
})();
