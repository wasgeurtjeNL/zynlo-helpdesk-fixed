declare global {
  interface Window {
    fetchUserRole?: () => Promise<any>;
  }
}

export {};
