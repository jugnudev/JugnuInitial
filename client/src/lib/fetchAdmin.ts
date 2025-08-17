// Hook-based fetch wrapper that automatically includes admin key
import { useAdminAuth } from './AdminAuthProvider';

export function useAdminFetch() {
  const { adminKey } = useAdminAuth();
  
  return (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers || {});
    
    // Always add the admin key if present
    if (adminKey) {
      headers.set('x-admin-key', adminKey);
    }
    
    // Ensure Content-Type is set for JSON requests
    if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    
    return fetch(input, { ...init, headers });
  };
}

// Static version for backwards compatibility
export async function fetchAdmin(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { getStoredAdminKey } = await import('./adminAuth');
  const key = getStoredAdminKey();
  const headers = new Headers(init.headers || {});
  
  if (key) {
    headers.set('x-admin-key', key);
  }
  
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(input, { ...init, headers });
}