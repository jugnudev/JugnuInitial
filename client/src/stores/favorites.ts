import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritesState {
  events: Set<string>;
  places: Set<string>;
  toggleEvent: (id: string) => void;
  togglePlace: (id: string) => void;
  isEventFavorited: (id: string) => boolean;
  isPlaceFavorited: (id: string) => boolean;
  getFavoriteEvents: () => string[];
  getFavoritePlaces: () => string[];
  clearAll: () => void;
}

// Custom storage for Set serialization
const setStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      const parsed = JSON.parse(str);
      return {
        ...parsed,
        state: {
          ...parsed.state,
          events: new Set(parsed.state.events || []),
          places: new Set(parsed.state.places || [])
        }
      };
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: any) => {
    const serialized = {
      ...value,
      state: {
        ...value.state,
        events: Array.from(value.state.events),
        places: Array.from(value.state.places)
      }
    };
    localStorage.setItem(name, JSON.stringify(serialized));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      events: new Set<string>(),
      places: new Set<string>(),
      
      toggleEvent: (id: string) => {
        set((state) => {
          const newEvents = new Set(state.events);
          if (newEvents.has(id)) {
            newEvents.delete(id);
          } else {
            newEvents.add(id);
          }
          return { events: newEvents };
        });
      },
      
      togglePlace: (id: string) => {
        set((state) => {
          const newPlaces = new Set(state.places);
          if (newPlaces.has(id)) {
            newPlaces.delete(id);
          } else {
            newPlaces.add(id);
          }
          return { places: newPlaces };
        });
      },
      
      isEventFavorited: (id: string) => get().events.has(id),
      isPlaceFavorited: (id: string) => get().places.has(id),
      
      getFavoriteEvents: () => Array.from(get().events),
      getFavoritePlaces: () => Array.from(get().places),
      
      clearAll: () => set({ events: new Set(), places: new Set() }),
    }),
    {
      name: 'jugnu-favorites',
      storage: setStorage,
    }
  )
);

// Utility hook for announcements
export const useFavoriteAnnouncement = () => {
  const announce = (message: string) => {
    // Create a temporary aria-live region for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
};