'use client';

import { useEffect } from 'react';

export function ClientInitializer() {
  useEffect(() => {
    // Fix for fetchUserRole error
    if (typeof window !== 'undefined' && !window.fetchUserRole) {
      window.fetchUserRole = async function () {
        console.warn('fetchUserRole was called but is not implemented. This is a temporary fix.');
        return null;
      };
    }
  }, []);

  return null;
}
