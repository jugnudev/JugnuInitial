// Re-export the new EventModal component to maintain backward compatibility
// All existing imports of DetailsModal will now use the new premium design
export { default } from '@/components/events/EventModal';
export type { default as DetailsModal } from '@/components/events/EventModal';