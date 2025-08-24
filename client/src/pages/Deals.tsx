import { useQuery } from '@tanstack/react-query';
import { DealTile } from '@/components/deals/DealTile';

interface Deal {
  id: string;
  title: string;
  subtitle: string;
  brand: string;
  code?: string;
  click_url?: string;
  slot: number;
  tile_kind: 'wide' | 'half' | 'square' | 'tall';
  image?: {
    url: string;
    alt: string;
  };
}

interface DealsResponse {
  ok: boolean;
  slots: (Deal | null)[];
}

// Fixed 12-slot template configuration
const slotConfigs: Array<{ slot: number; tileKind: 'wide' | 'half' | 'square' | 'tall' }> = [
  { slot: 1, tileKind: 'wide' },      // Row 1: full width
  { slot: 2, tileKind: 'square' },    // Row 2: square
  { slot: 3, tileKind: 'tall' },      // Row 2: tall
  { slot: 4, tileKind: 'tall' },      // Row 2: tall
  { slot: 5, tileKind: 'half' },      // Row 3: half
  { slot: 6, tileKind: 'half' },      // Row 3: half
  { slot: 7, tileKind: 'tall' },      // Row 4: tall
  { slot: 8, tileKind: 'square' },    // Row 4: square
  { slot: 9, tileKind: 'tall' },      // Row 4: tall
  { slot: 10, tileKind: 'half' },     // Row 5: half
  { slot: 11, tileKind: 'half' },     // Row 5: half
  { slot: 12, tileKind: 'wide' },     // Row 6: full width
];

export default function Deals() {
  const { data, isLoading } = useQuery<DealsResponse>({
    queryKey: ['/api/deals/list'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-12 gap-6">
            {slotConfigs.map(config => (
              <div 
                key={config.slot}
                className={`bg-gray-200 rounded-2xl ${
                  config.tileKind === 'wide' ? 'col-span-12 aspect-[4/1]' :
                  config.tileKind === 'half' ? 'col-span-12 md:col-span-6 aspect-[2/1]' :
                  config.tileKind === 'square' ? 'col-span-12 md:col-span-6 aspect-[1/1]' :
                  'col-span-12 md:col-span-4 aspect-[2/3]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const slots = data?.slots || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Exclusive Deals
        </h1>
        <p className="text-gray-600">
          Curated perks and discounts from our partners
        </p>
      </div>

      {/* Deals Grid */}
      <div className="grid grid-cols-12 gap-6">
        {slotConfigs.map((config) => {
          const deal = slots[config.slot - 1];
          
          if (deal) {
            // Render actual deal
            return (
              <DealTile
                key={config.slot}
                title={deal.title}
                subtitle={deal.subtitle}
                brand={deal.brand}
                code={deal.code}
                imgUrl={deal.image?.url}
                alt={deal.image?.alt}
                href={deal.click_url}
                tileKind={config.tileKind}
                slot={config.slot}
              />
            );
          } else {
            // Render placeholder
            return (
              <DealTile
                key={config.slot}
                title="More deals coming soon"
                subtitle="New perks drop regularly—check back shortly."
                brand="Jugnu"
                tileKind={config.tileKind}
                slot={config.slot}
                isPlaceholder={true}
              />
            );
          }
        })}
      </div>

      {/* Mobile spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
}