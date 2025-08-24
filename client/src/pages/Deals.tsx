import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Copy, ExternalLink, Calendar, Store } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';

interface Deal {
  id: string;
  title: string;
  merchant: string;
  blurb: string;
  code?: string | null;
  link_url?: string | null;
  image_desktop_url: string;
  image_mobile_url: string;
  badge?: string | null;
  terms_md?: string | null;
  start_at: string;
  end_at?: string | null;
}

interface DealSlot {
  slot: number;
  deal: Deal | null;
}

export default function Deals() {
  const { data, isLoading } = useQuery<{ ok: boolean; slots: DealSlot[] }>({
    queryKey: ['/api/deals/active?slots=12'],
  });

  const [trackedImpressions, setTrackedImpressions] = useState<Set<string>>(new Set());
  const observerRefs = useRef<Map<string, IntersectionObserver>>(new Map());

  // Track impressions
  useEffect(() => {
    if (!data?.slots) return;

    data.slots.forEach((slot) => {
      if (!slot.deal) return;

      const dealKey = `${slot.deal.id}:${slot.slot}`;
      const elementId = `deal-slot-${slot.slot}`;
      const element = document.getElementById(elementId);

      if (!element || trackedImpressions.has(dealKey)) return;

      // Check localStorage for debouncing
      const lastImpressionKey = `dealImpression:${dealKey}`;
      const lastImpression = parseInt(localStorage.getItem(lastImpressionKey) || '0', 10);
      const now = Date.now();

      if (now - lastImpression < 10000) {
        setTrackedImpressions(prev => new Set(prev).add(dealKey));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Track impression
            localStorage.setItem(lastImpressionKey, String(now));
            setTrackedImpressions(prev => new Set(prev).add(dealKey));

            fetch('/api/deals/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dealId: slot.deal!.id,
                slot: slot.slot,
                type: 'impression',
              }),
            }).catch(console.error);

            observer.disconnect();
            observerRefs.current.delete(dealKey);
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(element);
      observerRefs.current.set(dealKey, observer);
    });

    return () => {
      observerRefs.current.forEach(observer => observer.disconnect());
      observerRefs.current.clear();
    };
  }, [data, trackedImpressions]);

  const handleCopyCode = (code: string, merchant: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: `${merchant} code copied to clipboard`,
    });
  };

  const handleDealClick = async (deal: Deal, slot: number) => {
    if (!deal.link_url) return;

    // Track click
    try {
      await fetch('/api/deals/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal.id,
          slot,
          type: 'click',
        }),
      });
    } catch (error) {
      console.error('Failed to track click:', error);
    }

    // Redirect via redirector
    window.location.href = `/r/deal/${deal.id}?slot=${slot}&to=${encodeURIComponent(deal.link_url)}`;
  };

  const formatDateRange = (startAt: string, endAt?: string | null) => {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : null;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

    if (!end) {
      return `From ${start.toLocaleDateString('en-US', options)}`;
    }

    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const renderDealCard = (slot: DealSlot) => {
    const { deal } = slot;

    if (!deal) {
      return (
        <div
          id={`deal-slot-${slot.slot}`}
          className={`deal-slot slot-${slot.slot} relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center`}
          data-testid={`deal-placeholder-${slot.slot}`}
        >
          <div className="text-center p-6">
            <p className="text-zinc-500 dark:text-zinc-400 text-lg font-medium">More deals soon</p>
            <span className="text-2xl mt-2 block">✨</span>
          </div>
        </div>
      );
    }

    const isMobile = window.innerWidth < 768;
    const imageUrl = isMobile ? deal.image_mobile_url : deal.image_desktop_url;
    const hasLink = !!deal.link_url;

    const cardContent = (
      <>
        <img
          src={imageUrl}
          alt={`${deal.merchant} — ${deal.title}`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        <div className="relative h-full flex flex-col justify-end p-4 md:p-6">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-4 space-y-3 border border-white/10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                  {deal.merchant}
                </span>
                {deal.badge && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-500/30 to-pink-500/30 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                    {deal.badge}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg md:text-xl mb-1">{deal.title}</h3>
              <p className="text-white/90 text-sm line-clamp-2">{deal.blurb}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {deal.code && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopyCode(deal.code!, deal.merchant);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
                  data-testid={`copy-code-${deal.id}`}
                >
                  <Copy className="w-4 h-4" />
                  {deal.code}
                </button>
              )}

              {hasLink ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium text-sm">
                  <ExternalLink className="w-4 h-4" />
                  Get deal
                </span>
              ) : (
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  <Store className="w-4 h-4" />
                  <span>Show this in-store</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-white/70 text-xs">
              <Calendar className="w-3 h-3" />
              <span>{formatDateRange(deal.start_at, deal.end_at)}</span>
              {deal.terms_md && (
                <>
                  <span className="text-white/50">•</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // TODO: Open terms modal
                    }}
                    className="underline hover:text-white/90"
                  >
                    Terms
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    );

    if (hasLink) {
      return (
        <div
          id={`deal-slot-${slot.slot}`}
          className={`deal-slot slot-${slot.slot} relative rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl`}
          onClick={() => handleDealClick(deal, slot.slot)}
          data-testid={`deal-card-${deal.id}`}
        >
          {cardContent}
        </div>
      );
    }

    return (
      <div
        id={`deal-slot-${slot.slot}`}
        className={`deal-slot slot-${slot.slot} relative rounded-2xl overflow-hidden`}
        data-testid={`deal-card-${deal.id}`}
      >
        {cardContent}
      </div>
    );
  };

  // Generate JSON-LD for SEO
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Vancouver Deals & Offers",
    "description": "Exclusive deals and offers from Vancouver's best merchants",
    "numberOfItems": data?.slots?.filter(s => s.deal)?.length || 0,
    "itemListElement": data?.slots?.filter(s => s.deal).map((slot, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": slot.deal!.link_url ? "Offer" : "CreativeWork",
        "name": `${slot.deal!.merchant} - ${slot.deal!.title}`,
        "description": slot.deal!.blurb,
        "url": slot.deal!.link_url ? `/r/deal/${slot.deal!.id}` : undefined,
        "validFrom": slot.deal!.start_at,
        "validThrough": slot.deal!.end_at,
        "seller": {
          "@type": "Organization",
          "name": slot.deal!.merchant
        }
      }
    })) || []
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading deals...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Exclusive Deals & Offers - Vancouver | Jugnu</title>
        <meta name="description" content="Discover exclusive deals and special offers from Vancouver's best merchants. Save on dining, shopping, events, and more with Jugnu's curated deals." />
        <link rel="canonical" href="https://jugnu.ca/deals" />
        <script type="application/ld+json">{JSON.stringify(jsonLdData)}</script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Exclusive Deals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Curated offers from Vancouver's best merchants
            </p>
          </div>

          <div className="deals-grid">
            {data?.slots?.map((slot) => (
              <div key={`slot-${slot.slot}`}>
                {renderDealCard(slot)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .deals-grid {
          display: grid;
          gap: 1rem;
          min-height: 80vh;
        }

        /* Desktop layout (≥1024px) - 6 columns, varied sizes */
        @media (min-width: 1024px) {
          .deals-grid {
            grid-template-columns: repeat(6, 1fr);
            grid-auto-rows: minmax(100px, 1fr);
          }
          
          .slot-1 { grid-area: span 4 / span 3; } /* Hero */
          .slot-2 { grid-area: span 4 / span 2; } /* Tall */
          .slot-3 { grid-area: span 2 / span 3; } /* Wide */
          .slot-4 { grid-area: span 2 / span 2; } /* Square */
          .slot-5 { grid-area: span 2 / span 2; } /* Square */
          .slot-6 { grid-area: span 2 / span 2; } /* Square */
          .slot-7 { grid-area: span 4 / span 2; } /* Tall */
          .slot-8 { grid-area: span 2 / span 3; } /* Wide */
          .slot-9 { grid-area: span 2 / span 2; } /* Square */
          .slot-10 { grid-area: span 2 / span 2; } /* Square */
          .slot-11 { grid-area: span 2 / span 2; } /* Square */
          .slot-12 { grid-area: span 2 / span 2; } /* Square */
        }

        /* Tablet layout (≥768px & <1024px) - 4 columns */
        @media (min-width: 768px) and (max-width: 1023px) {
          .deals-grid {
            grid-template-columns: repeat(4, 1fr);
            grid-auto-rows: minmax(100px, 1fr);
          }
          
          .slot-1 { grid-area: span 3 / span 3; } /* Hero */
          .slot-2 { grid-area: span 3 / span 2; } /* Tall */
          .slot-3 { grid-area: span 2 / span 3; } /* Wide */
          .slot-4, .slot-5, .slot-6 { grid-area: span 2 / span 2; } /* Squares */
          .slot-7 { grid-area: span 3 / span 2; } /* Tall */
          .slot-8 { grid-area: span 2 / span 3; } /* Wide */
          .slot-9, .slot-10, .slot-11, .slot-12 { grid-area: span 2 / span 2; } /* Squares */
        }

        /* Mobile layout (<768px) - 2 columns, stacked cards */
        @media (max-width: 767px) {
          .deals-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: minmax(150px, auto);
          }
          
          .slot-1 { grid-area: span 2 / span 2; } /* Full width */
          .slot-2 { grid-area: span 2 / span 1; } /* Tall */
          .slot-3 { grid-area: span 1 / span 2; } /* Wide */
          .slot-4, .slot-5 { grid-area: span 1 / span 1; } /* Squares */
          .slot-6 { grid-area: span 1 / span 2; } /* Wide */
          .slot-7 { grid-area: span 2 / span 1; } /* Tall */
          .slot-8 { grid-area: span 1 / span 2; } /* Wide */
          .slot-9, .slot-10, .slot-11, .slot-12 { grid-area: span 1 / span 1; } /* Squares */
        }
      `}</style>
    </>
  );
}