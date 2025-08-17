import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getStoredAdminKey, storeAdminKey, clearAdminKey } from './adminAuth';

type AdminAuthContext = { 
  adminKey: string; 
  isAuthed: boolean; 
  login: (key: string) => void; 
  logout: () => void; 
};

const AdminAuthCtx = createContext<AdminAuthContext | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminKey, setAdminKey] = useState<string>(() => getStoredAdminKey());
  
  useEffect(() => {
    const onChange = () => setAdminKey(getStoredAdminKey());
    
    // Listen for custom events (same-tab updates)
    window.addEventListener('jugnu-admin-key-changed', onChange as any);
    // Listen for storage events (cross-tab updates)
    window.addEventListener('storage', onChange);
    
    return () => {
      window.removeEventListener('jugnu-admin-key-changed', onChange as any);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  
  const value = useMemo<AdminAuthContext>(() => ({
    adminKey, 
    isAuthed: !!adminKey,
    login: (key) => { 
      storeAdminKey(key); 
      setAdminKey(key); 
    },
    logout: () => { 
      clearAdminKey(); 
      setAdminKey(''); 
    }
  }), [adminKey]);
  
  return <AdminAuthCtx.Provider value={value}>{children}</AdminAuthCtx.Provider>;
}

export function useAdminAuth(): AdminAuthContext {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return ctx;
}