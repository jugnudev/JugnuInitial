import { useQuery } from '@tanstack/react-query';
import { DealTile } from '@/components/deals/DealTile';
import { motion } from 'framer-motion';

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
    desktop: string;
    mobile: string;
    alt: string;
  };
}

interface DealsResponse {
  ok: boolean;
  slots: (Deal | null)[];
}

// Premium 7-slot configuration with beautiful layout
const slotConfigs: Array<{ 
  slot: number; 
  tileKind: 'wide' | 'half' | 'square' | 'tall';
  gridClass: string;
  aspectRatio: string;
  mobileAspectRatio?: string;
}> = [
  { slot: 1, tileKind: 'wide', gridClass: 'col-span-12', aspectRatio: 'aspect-[3/1] sm:aspect-[4/1] md:aspect-[5/1] lg:aspect-[6/1]' },
  { slot: 2, tileKind: 'half', gridClass: 'col-span-6 md:col-span-6', aspectRatio: 'aspect-square sm:aspect-[3/2] md:aspect-[2/1]' },
  { slot: 3, tileKind: 'half', gridClass: 'col-span-6 md:col-span-6', aspectRatio: 'aspect-square sm:aspect-[3/2] md:aspect-[2/1]' },
  { slot: 4, tileKind: 'square', gridClass: 'col-span-12 sm:col-span-6 md:col-span-4', aspectRatio: 'aspect-[3/2] sm:aspect-square' },
  { slot: 5, tileKind: 'square', gridClass: 'col-span-6 sm:col-span-6 md:col-span-4', aspectRatio: 'aspect-square' },
  { slot: 6, tileKind: 'square', gridClass: 'col-span-6 sm:col-span-6 md:col-span-4', aspectRatio: 'aspect-square' },
  { slot: 7, tileKind: 'wide', gridClass: 'col-span-12', aspectRatio: 'aspect-[3/1] sm:aspect-[4/1] md:aspect-[5/1] lg:aspect-[6/1]' },
];

export default function Deals() {
  const { data, isLoading } = useQuery<DealsResponse>({
    queryKey: ['/api/deals/list'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
          <div className="animate-pulse max-w-7xl mx-auto">
            <div className="h-12 bg-white/10 rounded w-64 mx-auto mb-12"></div>
            <div className="grid grid-cols-12 gap-6">
              {slotConfigs.map(config => (
                <div 
                  key={config.slot}
                  className={`${config.gridClass} ${config.aspectRatio} bg-white/5 rounded-2xl`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const slots = data?.slots || new Array(7).fill(null);

  return (
    <div className="min-h-screen bg-bg">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-7xl mx-auto"
        >
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-fraunces text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4"
            >
              Exclusive Deals
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto px-4"
            >
              Curated perks and premium discounts from our partners
            </motion.p>
          </div>

          {/* Premium Deals Grid - 7 Slots */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 md:gap-6">
            {slotConfigs.map((config, index) => {
              const deal = slots[config.slot - 1];
              
              return (
                <motion.div
                  key={config.slot}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: index * 0.08,
                    ease: [0.25, 0.1, 0.25, 1]
                  }}
                  className={config.gridClass}
                >
                  {deal ? (
                    <div className={`relative ${config.aspectRatio} w-full`}>
                      <DealTile
                        title={deal.title}
                        subtitle={deal.subtitle}
                        brand={deal.brand}
                        code={deal.code}
                        imgUrl={deal.image?.desktop || deal.image?.mobile}
                        alt={deal.image?.alt}
                        href={deal.click_url}
                        tileKind={config.tileKind}
                        slot={config.slot}
                      />
                    </div>
                  ) : (
                    <div className={`relative ${config.aspectRatio} rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 backdrop-blur-sm group hover:border-copper-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-copper-500/10`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-copper-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
                        <div className="text-white/20 mb-2 sm:mb-3 md:mb-4 group-hover:text-copper-500/40 transition-colors duration-300">
                          <i className="fas fa-tag text-2xl sm:text-3xl md:text-4xl lg:text-5xl"></i>
                        </div>
                        <p className="text-white/30 text-sm sm:text-base md:text-lg font-medium">Coming Soon</p>
                        <p className="text-white/20 text-xs sm:text-sm mt-1 sm:mt-2 text-center px-2">Stay tuned</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-8 sm:mt-12 md:mt-16 px-4"
          >
            <p className="text-white/40 text-xs sm:text-sm">
              Do you have some amazing deals for the community?
              <span className="block sm:inline">
                <a href="mailto:relations@thehouseofjugnu.com" className="text-copper-500 hover:text-copper-400 ml-0 sm:ml-2 font-medium transition-colors inline-block mt-1 sm:mt-0">
                  Email relations@thehouseofjugnu.com
                </a>
              </span>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Mobile spacing */}
      <div className="h-16 md:hidden" />
    </div>
  );
}