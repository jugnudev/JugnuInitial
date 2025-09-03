import { useQuery } from "@tanstack/react-query";

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  dateISO: string | null;
  venue: string;
  city: string;
  img: string;
  buyUrl?: string;
  eventbriteId?: string;
  ticketTailorId?: string;
  soldOut?: boolean;
  waitlistUrl?: string;
  organizer?: string;
  source_url?: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export function useEvents() {
  return useQuery<EventItem[]>({
    queryKey: ['/src/data/events.json'],
    queryFn: async () => {
      try {
        const module = await import('@/data/events.json');
        return module.default || [];
      } catch (error) {
        console.error('Failed to load events:', error);
        return [];
      }
    },
  });
}

export function useGallery() {
  return useQuery<GalleryImage[]>({
    queryKey: ['/src/data/gallery.json'],
    queryFn: async () => {
      try {
        const module = await import('@/data/gallery.json');
        return module.default || [];
      } catch (error) {
        console.error('Failed to load gallery:', error);
        return [];
      }
    },
  });
}
