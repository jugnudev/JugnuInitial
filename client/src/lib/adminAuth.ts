// Single source of truth for admin authentication
export const ADMIN_LOCAL_KEY = 'jugnu-admin-dev-2025';

export function getStoredAdminKey(): string {
  try { 
    return localStorage.getItem(ADMIN_LOCAL_KEY) || ''; 
  } catch { 
    return ''; 
  }
}

export function storeAdminKey(value: string): void {
  localStorage.setItem(ADMIN_LOCAL_KEY, value);
  // Dispatch custom event so same-tab listeners update immediately
  window.dispatchEvent(new CustomEvent('jugnu-admin-key-changed'));
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_LOCAL_KEY);
  window.dispatchEvent(new CustomEvent('jugnu-admin-key-changed'));
}