// Shared fetch wrapper for admin API calls
// This ensures all admin requests use the same x-admin-key header

import { getAdminKey } from './adminAuth';

export async function fetchAdmin(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const key = getAdminKey();
  const headers = new Headers(init.headers || {});
  
  // Always add the admin key if present
  if (key) {
    headers.set('x-admin-key', key);
  }
  
  // Ensure Content-Type is set for JSON requests
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(input, { ...init, headers });
}