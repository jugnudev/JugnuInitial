// Shared admin authentication utilities
// This ensures both admin/promote and admin/leads use the exact same auth mechanism

export const ADMIN_LOCAL_KEY = 'jugnu-admin-dev-2025'; // must be the SAME one admin/promote uses

export function getAdminKey(): string {
  return localStorage.getItem(ADMIN_LOCAL_KEY) || '';
}

export function setAdminKey(value: string): void {
  localStorage.setItem(ADMIN_LOCAL_KEY, value);
}

export function clearAdminKey(): void {
  localStorage.removeItem(ADMIN_LOCAL_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminKey();
}