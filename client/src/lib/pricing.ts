// Pricing configuration and calculation logic

export type PackageType = 'spotlight_banner' | 'homepage_hero' | 'full_feature';
export type AddOnType = 'ig_story' | 'mid_run_repost';
export type DurationType = 'daily' | 'weekly';

// Base pricing in CAD
export const PRICING_CONFIG = {
  packages: {
    spotlight_banner: {
      name: 'Spotlight Banner',
      description: 'Featured banner placement on Events page',
      daily: 12,
      weekly: 60,
      base: 60,
      features: [
        '1,500+ weekly impressions',
        'Events page banner placement',
        'Click-through tracking',
        'Real-time analytics portal'
      ],
      sizeSpecs: {
        desktop: '1600×400px',
        mobile: '400×300px'
      }
    },
    homepage_hero: {
      name: 'Homepage Hero',
      description: 'Premium hero placement on homepage',
      daily: 28,
      weekly: 140,
      base: 140,
      features: [
        '3,000+ weekly impressions',
        'Homepage hero banner',
        'Priority visibility',
        'Enhanced analytics',
        'Logo co-branding'
      ],
      sizeSpecs: {
        desktop: '1080×600px',
        mobile: '600×400px'
      }
    },
    full_feature: {
      name: 'Full Feature',
      description: 'Complete campaign with multiple placements',
      daily: 60,
      weekly: 240,
      base: 240,
      features: [
        '5,000+ weekly impressions',
        'All placement options',
        'Multi-placement strategy',
        'Dedicated campaign manager',
        'Custom creative development',
        'Performance optimization'
      ],
      sizeSpecs: {
        desktop: 'Multiple formats',
        mobile: 'Multiple formats'
      }
    }
  },
  addOns: {
    ig_story: {
      name: 'IG Story Boost',
      description: 'Instagram story feature on @jugnu.events',
      price: 10
    },
    mid_run_repost: {
      name: 'Mid-run Repost',
      description: 'Additional social media push during campaign',
      price: 10
    }
  },
  discounts: {
    multiWeek: {
      threshold: 2,
      rate: 0.10, // 10% discount for 2+ weeks
      label: 'Multi-week discount'
    },
    earlyPartner: {
      rate: 0.20, // 20% early partner discount
      label: 'Early partner discount',
      enabled: true
    }
  }
};

export interface PricingCalculation {
  basePrice: number;
  weeklyPrice: number;
  addOnsTotal: number;
  subtotal: number;
  multiWeekDiscount: number;
  earlyPartnerDiscount: number;
  total: number;
  savings: number;
  breakdown: {
    package: string;
    duration: string;
    addOns: { name: string; price: number }[];
    discounts: { name: string; amount: number }[];
  };
}

export function calculatePricing(
  packageType: PackageType,
  durationType: DurationType,
  weekDuration: number,
  addOns: AddOnType[]
): PricingCalculation {
  const pkg = PRICING_CONFIG.packages[packageType];
  
  // Calculate base price
  const basePrice = durationType === 'daily' 
    ? pkg.daily * 7 * weekDuration // Convert daily to weekly
    : pkg.weekly * weekDuration;
  
  // Calculate add-ons
  const addOnsTotal = addOns.reduce((sum, addOn) => {
    return sum + PRICING_CONFIG.addOns[addOn].price;
  }, 0);
  
  const subtotal = basePrice + addOnsTotal;
  
  // Calculate discounts
  let multiWeekDiscount = 0;
  if (weekDuration >= PRICING_CONFIG.discounts.multiWeek.threshold) {
    multiWeekDiscount = subtotal * PRICING_CONFIG.discounts.multiWeek.rate;
  }
  
  let earlyPartnerDiscount = 0;
  if (PRICING_CONFIG.discounts.earlyPartner.enabled) {
    earlyPartnerDiscount = (subtotal - multiWeekDiscount) * PRICING_CONFIG.discounts.earlyPartner.rate;
  }
  
  const totalDiscounts = multiWeekDiscount + earlyPartnerDiscount;
  const total = subtotal - totalDiscounts;
  const savings = totalDiscounts;
  
  return {
    basePrice,
    weeklyPrice: pkg.weekly,
    addOnsTotal,
    subtotal,
    multiWeekDiscount,
    earlyPartnerDiscount,
    total,
    savings,
    breakdown: {
      package: `${pkg.name} (${weekDuration} week${weekDuration > 1 ? 's' : ''})`,
      duration: durationType === 'daily' ? `${weekDuration * 7} days` : `${weekDuration} week${weekDuration > 1 ? 's' : ''}`,
      addOns: addOns.map(addOn => ({
        name: PRICING_CONFIG.addOns[addOn].name,
        price: PRICING_CONFIG.addOns[addOn].price
      })),
      discounts: [
        ...(multiWeekDiscount > 0 ? [{ name: PRICING_CONFIG.discounts.multiWeek.label, amount: multiWeekDiscount }] : []),
        ...(earlyPartnerDiscount > 0 ? [{ name: PRICING_CONFIG.discounts.earlyPartner.label, amount: earlyPartnerDiscount }] : [])
      ]
    }
  };
}

export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function getPricingText(packageType: PackageType, durationType: DurationType): string {
  const pkg = PRICING_CONFIG.packages[packageType];
  const price = durationType === 'daily' ? pkg.daily : pkg.weekly;
  const period = durationType === 'daily' ? 'day' : 'week';
  return `${formatCAD(price)}/${period}`;
}