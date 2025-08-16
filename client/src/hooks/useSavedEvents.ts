import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jugnu:savedEvents';

export function useSavedEventIds() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setIds(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load saved events from localStorage:', error);
      setIds([]);
    }
  }, []);

  const toggle = (id: string) => {
    setIds(prev => {
      const next = prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : [...prev, id];
      
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (error) {
          console.warn('Failed to save to localStorage:', error);
        }
      }
      
      // Optional analytics: track('save_toggle', { id, saved: next.includes(id) })
      return next;
    });
  };

  const isEventSaved = (id: string) => ids.includes(id);

  return { 
    ids, 
    toggle, 
    isEventSaved,
    count: ids.length 
  };
}