// Pricing configuration and calculation logic

export type PackageType = 'events_spotlight' | 'homepage_feature' | 'full_feature';
export type AddOnType = 'ig_story' | 'email_feature';
export type DurationType = 'daily' | 'weekly';

// Base pricing in CAD
// Global perks shown on ALL cards (identical wording)
const GLOBAL_PERKS = [
  'Real-time impressions & clicks with UTM tracking',
  'Custom headline, subline, and CTA', 
  'Frequency capping to prevent ad fatigue',
  'Viewable impression tracking (billable)',
  'Sponsor portal + CSV export'
];

export const PRICING_CONFIG = {
  packages: {
    events_spotlight: {
      name: 'Events Spotlight Banner',
      description: 'Prime inline placement after the first row of events',
      daily: 10,
      weekly: 60,
      base: 60,
      supportsDailyBooking: true,
      globalPerks: GLOBAL_PERKS,
      features: [
        'Prime inline placement after the first row of events',
        'Book daily or weekly'
      ],
      sizeSpecs: {
        desktop: '1600×400',
        mobile: '400×300'
      },
      cta: 'Choose Events Spotlight'
    },
    homepage_feature: {
      name: 'Homepage Feature Banner',
      description: 'High-visibility placement in the homepage feed',
      daily: 25,
      weekly: 140,
      base: 140,
      supportsDailyBooking: true,
      globalPerks: GLOBAL_PERKS,
      features: [
        'High-visibility placement in the homepage feed',
        'Book daily or weekly'
      ],
      sizeSpecs: {
        desktop: '1080×600',
        mobile: '600×400'
      },
      cta: 'Choose Homepage Feature'
    },
    full_feature: {
      name: 'Full Feature (Both Placements + Email + IG Story)',
      description: 'Both placements for the same 7 days + Email Feature + Instagram Story',
      daily: 350, // Not applicable - weekly only
      weekly: 350,
      base: 350,
      supportsDailyBooking: false,
      globalPerks: GLOBAL_PERKS,
      features: [
        'Both placements for the same 7 days',
        '1 Email Feature to our community list (100+ subscribers) during your week',
        '1 Instagram Story during your week (creative provided or simple template)',
        'Delivery guarantee: We guarantee at least 4,500 viewable impressions and 225 clicks during your week. If we deliver less, we continue at no cost until the target is met.'
      ],
      sizeSpecs: {
        desktop: '1600×400 + 1080×600',
        mobile: '400×300 + 600×400'
      },
      cta: 'Choose Full Feature',
      isWeeklyOnly: true
    }
  },
  addOns: {
    ig_story: {
      name: 'IG Story Boost',
      description: 'Instagram story on @thehouseofjugnu during your run',
      price: 10
    },
    email_feature: {
      name: 'Email Feature (100+ subscribers)',
      description: 'Sponsor mention in our community email during your week',
      price: 90
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
      enabled: false // Disabled for v4
    }
  },
  
  // September Launch Promo
  promos: {
    septemberFreeWeek: {
      code: 'SEPTEMBER_FREE_WEEK_2025',
      description: 'First 7-day booking free (September)',
      isActive: () => {
        const now = new Date();
        return now.getMonth() === 8 && now.getFullYear() === 2025; // September is month 8
      },
      applies: (durationType: DurationType) => durationType === 'weekly',
      badge: '🎉 Launch Offer: First 7-day booking free (September)'
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
  weeklySavingsPercent: number; // Savings percentage vs daily×7
  breakdown: {
    package: string;
    duration: string;
    addOns: { name: string; price: number }[];
    discounts: { name: string; amount: number }[];
  };
}

// Enhanced function to handle both daily and weekly booking with smart conversion
export function calculatePricing(
  packageType: PackageType,
  durationType: DurationType,
  weekDuration: number,
  dayDuration: number = 1,
  addOns: AddOnType[]
): PricingCalculation {
  const pkg = PRICING_CONFIG.packages[packageType];
  
  // Smart daily to weekly conversion logic
  let basePrice: number;
  let actualWeeks: number;
  let remainingDays: number;
  let breakdown: { package: string; duration: string };
  
  if (durationType === 'daily') {
    actualWeeks = Math.floor(dayDuration / 7);
    remainingDays = dayDuration % 7;
    
    // Calculate optimized pricing: full weeks at weekly rate, remaining days at daily rate
    basePrice = (actualWeeks * pkg.weekly) + (remainingDays * pkg.daily);
    
    breakdown = {
      package: pkg.name,
      duration: actualWeeks > 0 
        ? `${actualWeeks} week${actualWeeks > 1 ? 's' : ''} + ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
        : `${dayDuration} day${dayDuration > 1 ? 's' : ''}`
    };
  } else {
    // Weekly booking
    actualWeeks = weekDuration;
    remainingDays = 0;
    basePrice = pkg.weekly * weekDuration;
    
    breakdown = {
      package: pkg.name,
      duration: `${weekDuration} week${weekDuration > 1 ? 's' : ''}`
    };
  }
  
  // Calculate weekly savings percentage vs daily
  const dailyEquivalent = pkg.daily * 7;
  const weeklySavingsPercent = dailyEquivalent > 0 
    ? Math.round(((dailyEquivalent - pkg.weekly) / dailyEquivalent) * 100)
    : 0;
  
  // Calculate discounts on base price only (before add-ons)
  let multiWeekDiscount = 0;
  if (actualWeeks >= PRICING_CONFIG.discounts.multiWeek.threshold) {
    multiWeekDiscount = basePrice * PRICING_CONFIG.discounts.multiWeek.rate;
  }
  
  let earlyPartnerDiscount = 0;
  if (PRICING_CONFIG.discounts.earlyPartner.enabled) {
    earlyPartnerDiscount = (basePrice - multiWeekDiscount) * PRICING_CONFIG.discounts.earlyPartner.rate;
  }
  
  const discountedBasePrice = basePrice - multiWeekDiscount - earlyPartnerDiscount;
  
  // Add-ons are added after discounts (no discounts apply to add-ons)
  const addOnsTotal = addOns.reduce((sum, addOn) => {
    return sum + PRICING_CONFIG.addOns[addOn].price;
  }, 0);
  
  const subtotal = basePrice + addOnsTotal;
  const total = discountedBasePrice + addOnsTotal;
  const savings = multiWeekDiscount + earlyPartnerDiscount;
  
  return {
    basePrice,
    weeklyPrice: pkg.weekly,
    addOnsTotal,
    subtotal,
    multiWeekDiscount,
    earlyPartnerDiscount,
    total,
    savings,
    weeklySavingsPercent,
    breakdown: {
      ...breakdown,
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