import { useAdminAuth } from './AdminAuthProvider';

export function useAdminFetch() {
  const { adminKey } = useAdminAuth();
  
  return (input: RequestInfo, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    if (adminKey) {
      headers.set('x-admin-key', adminKey);
    }
    return fetch(input, { ...init, headers });
  };
}