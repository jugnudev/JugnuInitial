import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, MapPin, Clock, Users, Tag, ShoppingCart, Info, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import EmbeddedCheckout from "@/components/EmbeddedCheckout";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  capacity: number | null;
  soldCount: number;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  maxPerOrder: number;
  minPerOrder: number;
  showRemaining: boolean;
}

interface FeeStructure {
  type: 'buyer_pays' | 'organizer_absorbs';
  mode?: 'percent' | 'flat';
  percent?: number;
  amountCents?: number;
  serviceFeePercent?: number; // Legacy field for backwards compatibility
}

interface Event {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  coverUrl: string | null;
  startAt: Date;
  endAt: Date | null;
  venue: string;
  address: string | null;
  city: string;
  province: string;
  tiers: Tier[];
  organizerId: string;
  refundPolicy: string | null;
  hasGST: boolean;
  hasPST: boolean;
  feeStructure: FeeStructure | null;
}

interface Organizer {
  id: string;
  businessName: string;
}

interface CartItem {
  tierId: string;
  quantity: number;
}

export function TicketsEventDetailPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showEmbeddedCheckout, setShowEmbeddedCheckout] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [tierErrors, setTierErrors] = useState<Record<string, string>>({});

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email.length > 0 && emailRegex.test(email);
  };

  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  const { data, isLoading, error } = useQuery<{ 
    ok: boolean; 
    event: Event; 
    organizer: Organizer 
  }>({
    queryKey: [`/api/tickets/events/${slug}`],
    enabled: isEnabled && !!slug
  });

  // Embedded Payment Intent mutation
  const paymentIntentMutation = useMutation({
    mutationFn: async () => {
      console.log('[EmbeddedCheckout] Starting Payment Intent creation');
      if (cart.length === 0) throw new Error("Your cart is empty");
      if (!buyerName || !buyerEmail) throw new Error("Please fill in your details");
      
      const response = await apiRequest('POST', '/api/tickets/checkout/payment-intent', {
        eventId: data?.event.id,
        items: cart,
        buyerEmail,
        buyerName,
        buyerPhone,
        discountCode: discountCode || undefined
      });
      
      const result = await response.json();
      console.log('[EmbeddedCheckout] Payment Intent response:', result);
      return result;
    },
    onSuccess: (result: any) => {
      console.log('[EmbeddedCheckout] Payment Intent created successfully');
      
      // Handle FREE tickets (no payment required)
      if (result?.isFree === true) {
        console.log('[EmbeddedCheckout] FREE tickets confirmed');
        toast({
          title: "FREE Tickets Confirmed! 🎉",
          description: result.message || "Check your email for your tickets.",
          duration: 5000
        });
        setIsCheckingOut(false);
        setCart([]);
        // Redirect to order success page
        if (result.orderId) {
          setTimeout(() => {
            window.location.href = `/tickets/order/success?orderId=${result.orderId}`;
          }, 1500);
        }
      }
      // Handle paid tickets (Stripe Payment Intent)
      else if (result?.clientSecret && result?.orderId) {
        setPaymentClientSecret(result.clientSecret);
        setCurrentOrderId(result.orderId);
        setShowEmbeddedCheckout(true);
        setIsCheckingOut(false);
      } else {
        console.error('[EmbeddedCheckout] Invalid response:', result);
        toast({
          title: "Checkout failed",
          description: "Unable to create payment session",
          variant: "destructive"
        });
        setIsCheckingOut(false);
      }
    },
    onError: (error: any) => {
      console.error('[EmbeddedCheckout] Payment Intent error:', error);
      setIsCheckingOut(false);
      
      // Extract user-friendly error message
      let errorMessage = "We couldn't complete your checkout. Please try again.";
      const tierErrorsFromBackend: Record<string, string> = {};
      
      try {
        const rawMessage = error.message || "";
        
        // Remove status code prefix (e.g., "500: " or "400: ")
        const cleanedMessage = rawMessage.replace(/^\d+:\s*/, '');
        
        // Try to parse as JSON
        if (cleanedMessage.startsWith('{')) {
          try {
            const errorData = JSON.parse(cleanedMessage);
            // Extract error message from various structures
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (errorData.error?.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // Not valid JSON, use cleaned message
            if (cleanedMessage.length > 0 && !cleanedMessage.includes('[object')) {
              errorMessage = cleanedMessage;
            }
          }
        } else if (cleanedMessage.length > 0 && !cleanedMessage.includes('[object')) {
          // Plain text error (already cleaned of status code)
          errorMessage = cleanedMessage;
        }
      } catch (e) {
        console.warn('Error parsing error message:', e);
      }
      
      // Handle "Not enough tickets" errors with inline display
      if (errorMessage.includes("Not enough tickets available for")) {
        const tierNameMatch = errorMessage.match(/for '([^']+)'/);
        if (tierNameMatch && tierNameMatch[1]) {
          const tierName = tierNameMatch[1];
          const tier = event.tiers.find(t => t.name === tierName);
          if (tier) {
            const { remaining } = getTierAvailability(tier);
            tierErrorsFromBackend[tier.id] = `Only ${remaining || 0} ticket${remaining !== 1 ? 's' : ''} available. Please lower your quantity.`;
            setTierErrors(tierErrorsFromBackend);
          }
        }
        
        toast({
          title: "Not enough tickets available",
          description: "Please review your ticket quantities below.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Checkout failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  });

  // Legacy hosted checkout mutation (fallback)
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Checkout] Starting hosted checkout mutation');
      if (cart.length === 0) throw new Error("Your cart is empty");
      if (!buyerName || !buyerEmail) throw new Error("Please fill in your details");
      
      const response = await apiRequest('POST', '/api/tickets/checkout/session', {
        eventId: data?.event.id,
        items: cart,
        buyerEmail,
        buyerName,
        buyerPhone,
        discountCode: discountCode || undefined,
        returnUrl: window.location.origin + `/tickets/order/success`
      });
      
      const result = await response.json();
      console.log('[Checkout] API response:', result);
      return result;
    },
    onSuccess: (result: any) => {
      console.log('[Checkout] onSuccess called with:', result);
      if (result?.checkoutUrl) {
        console.log('[Checkout] checkoutUrl found:', result.checkoutUrl, 'testMode:', result.testMode);
        if (result.testMode) {
          // Test mode - show success message instead of redirect
          console.log('[Checkout] Showing test mode success message');
          toast({
            title: "Test Mode Checkout",
            description: `Order created successfully! Order ID: ${result.orderId}`,
            variant: "default"
          });
          setIsCheckingOut(false);
          // Clear the cart after successful test checkout
          setCart([]);
          console.log('[Checkout] Cart cleared, checkout state reset');
        } else {
          // Live Stripe checkout - redirect
          console.log('[Checkout] Redirecting to Stripe checkout');
          window.location.href = result.checkoutUrl;
        }
      } else {
        console.log('[Checkout] No checkoutUrl in response');
        toast({
          title: "Checkout failed",
          description: "Unable to create checkout session",
          variant: "destructive"
        });
        setIsCheckingOut(false);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsCheckingOut(false);
    }
  });

  if (!isEnabled) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Coming Soon</h1>
        <p className="text-lg text-muted-foreground">
          Event details will be available soon.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.event) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Event not found</h1>
        <p className="text-muted-foreground">This event may no longer be available.</p>
      </div>
    );
  }

  const event = data.event;
  const organizer = data.organizer;
  const eventDate = new Date(event.startAt);

  // Helper functions
  const getTierQuantity = (tierId: string) => {
    const item = cart.find(i => i.tierId === tierId);
    return item?.quantity || 0;
  };

  const updateTierQuantity = (tierId: string, quantity: number) => {
    // Clear any existing error for this tier
    if (tierErrors[tierId]) {
      setTierErrors(prev => {
        const updated = { ...prev };
        delete updated[tierId];
        return updated;
      });
    }
    
    if (quantity <= 0) {
      setCart(cart.filter(i => i.tierId !== tierId));
    } else {
      const existing = cart.find(i => i.tierId === tierId);
      if (existing) {
        setCart(cart.map(i => i.tierId === tierId ? { ...i, quantity } : i));
      } else {
        setCart([...cart, { tierId, quantity }]);
      }
    }
  };

  const getTierAvailability = (tier: Tier) => {
    if (!tier.capacity) return { available: true, remaining: null };
    const remaining = tier.capacity - tier.soldCount;
    return { available: remaining > 0, remaining };
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const tier = event.tiers.find(t => t.id === item.tierId);
      return sum + (tier ? tier.priceCents * item.quantity : 0);
    }, 0);
  };

  const calculateTax = (subtotal: number) => {
    let tax = 0;
    if (event.hasGST) tax += subtotal * 0.05;
    if (event.hasPST) tax += subtotal * 0.07;
    return Math.round(tax);
  };

  const calculateFees = (subtotal: number) => {
    // Check if organizer has set up buyer-pays fee structure
    if (!event.feeStructure || event.feeStructure.type !== 'buyer_pays') {
      return 0;
    }
    
    const fee = event.feeStructure;
    
    // Handle new mode-based fee structure
    if (fee.mode === 'flat' && fee.amountCents !== undefined) {
      // Flat fee: fixed amount per order in cents
      return fee.amountCents;
    } else if (fee.mode === 'percent' && fee.percent !== undefined) {
      // Percentage fee: calculate based on subtotal
      return Math.round(subtotal * (fee.percent / 100));
    } else if (fee.serviceFeePercent !== undefined) {
      // Legacy fallback for old feeStructure format
      return Math.round(subtotal * (fee.serviceFeePercent / 100));
    }
    
    return 0;
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const fees = calculateFees(subtotal);
  const total = subtotal + tax + fees;

  const handleCheckout = () => {
    console.log('[EmbeddedCheckout] handleCheckout called, cart:', cart);
    
    // Clear all previous errors
    setTierErrors({});
    
    // Client-side validation: Check available quantities
    const errors: Record<string, string> = {};
    for (const item of cart) {
      const tier = event.tiers.find(t => t.id === item.tierId);
      if (!tier) continue;
      
      const { available, remaining } = getTierAvailability(tier);
      
      if (!available) {
        errors[item.tierId] = `Sorry, ${tier.name} is sold out.`;
      } else if (remaining !== null && item.quantity > remaining) {
        errors[item.tierId] = `Only ${remaining} ticket${remaining !== 1 ? 's' : ''} available for ${tier.name}. Please lower your quantity.`;
      } else if (tier.maxPerOrder && item.quantity > tier.maxPerOrder) {
        errors[item.tierId] = `Maximum ${tier.maxPerOrder} ticket${tier.maxPerOrder !== 1 ? 's' : ''} per order for ${tier.name}.`;
      }
    }
    
    // If there are validation errors, show them and don't proceed
    if (Object.keys(errors).length > 0) {
      setTierErrors(errors);
      toast({
        title: "Please review your ticket selection",
        description: "Some quantities exceed available tickets.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCheckingOut(true);
    
    // Use embedded checkout by default, fallback to hosted checkout if needed
    paymentIntentMutation.mutate();
  };

  // Handle embedded checkout success
  const handlePaymentSuccess = () => {
    console.log('[EmbeddedCheckout] Payment successful!');
    
    // Clear cart and reset state
    setCart([]);
    setBuyerName("");
    setBuyerEmail("");
    setBuyerPhone("");
    setDiscountCode("");
    setShowEmbeddedCheckout(false);
    
    // Redirect to order success page
    if (currentOrderId) {
      window.location.href = `/tickets/order/success?order_id=${currentOrderId}&success=true`;
    } else {
      // Fallback: Show success message if no order ID
      toast({
        title: "Payment Successful!",
        description: "Your tickets have been purchased successfully. Check your email for confirmation.",
        variant: "default"
      });
    }
    
    setPaymentClientSecret(null);
    setCurrentOrderId(null);
  };

  // Handle embedded checkout error
  const handlePaymentError = (error: string) => {
    console.error('[EmbeddedCheckout] Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  // Get the lowest tier price for hero display
  const getStartingPrice = () => {
    const prices = event.tiers.map(tier => tier.priceCents);
    return Math.min(...prices);
  };

  const startingPrice = getStartingPrice();
  const availableTiers = event.tiers.filter(tier => {
    const { available } = getTierAvailability(tier);
    return available;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Premium Cinematic Hero */}
      {event.coverUrl && (
        <div className="relative aspect-[16/9] lg:aspect-[21/9] overflow-hidden premium-fade-in">
          {/* Hero Image */}
          <img 
            src={event.coverUrl} 
            alt={event.title}
            className="w-full h-full object-cover"
            data-testid="img-event-hero"
          />
          
          {/* Premium Gradient Overlays */}
          <div className="absolute inset-0 premium-hero-gradient" />
          <div className="absolute inset-0 premium-hero-vignette" />
          
          {/* Hero Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8 lg:p-12">
            {/* Top Row - Badges */}
            <div className="flex flex-wrap gap-2 justify-start">
              {availableTiers.length > 0 ? (
                <div className="premium-price-pill">
                  From ${(startingPrice / 100).toFixed(0)}
                </div>
              ) : (
                <div className="premium-badge-sold-out">
                  Sold Out
                </div>
              )}
              
              {organizer.businessName && (
                <div className="bg-black/40 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                  {organizer.businessName}
                </div>
              )}
            </div>
            
            {/* Bottom Row - Event Info */}
            <div className="space-y-4">
              <div className="max-w-4xl">
                <h1 className="text-2xl md:text-5xl lg:text-6xl font-fraunces text-white font-bold leading-tight mb-3 md:mb-4 drop-shadow-lg mobile-event-title">
                  {event.title}
                </h1>
                
                {event.summary && (
                  <p className="text-base md:text-xl text-white/90 mb-4 md:mb-6 drop-shadow-sm max-w-2xl leading-relaxed">
                    {event.summary}
                  </p>
                )}
                
                {/* Key Event Details */}
                <div className="flex flex-wrap gap-2 md:gap-6 text-white/90">
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full text-sm font-medium border border-white/20">
                    <Calendar className="w-4 h-4" />
                    <span>{format(eventDate, 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full text-sm font-medium border border-white/20">
                    <Clock className="w-4 h-4" />
                    <span>{format(eventDate, 'h:mm a')}</span>
                    {event.endAt && (
                      <span> - {format(new Date(event.endAt), 'h:mm a')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-full text-sm font-medium border border-white/20">
                    <MapPin className="w-4 h-4" />
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 mobile-container">
        <div className="max-w-6xl mx-auto">
          {/* Mobile-Optimized Event Description */}
          {event.description && (
            <div className="mb-6 md:mb-8 premium-slide-up">
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="premium-section-icon">
                    <Info className="w-5 h-5 text-orange-400" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-fraunces font-bold text-white">About This Event</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="text-orange-400 hover:text-orange-300 hover:bg-gray-800/50 md:hidden"
                  data-testid="button-expand-description"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isDescriptionExpanded ? 'rotate-90' : ''}`} />
                  {isDescriptionExpanded ? 'Less' : 'More'}
                </Button>
              </div>
              
              {/* Mobile-Optimized Content */}
              <div className="premium-surface-elevated p-4 md:p-6 rounded-lg border border-gray-700">
                {/* Parse and filter paragraphs */}
                {(() => {
                  const allParagraphs = event.description.split('\n').filter(p => p.trim() !== '');
                  const previewParagraphs = allParagraphs.slice(0, 2);
                  const remainingParagraphs = allParagraphs.slice(2);
                  
                  return (
                    <>
                      {/* Always visible summary (first 2 non-empty paragraphs) */}
                      <div className="space-y-3">
                        {previewParagraphs.map((paragraph, index) => {
                          if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                            return (
                              <h3 key={index} className="text-lg font-fraunces font-bold text-white flex items-center gap-2">
                                <div className="w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full" />
                                {paragraph.replace(/\*\*/g, '')}
                              </h3>
                            );
                          }
                          
                          if (paragraph.startsWith('- ')) {
                            return (
                              <div key={index} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                                <p className="text-gray-300 leading-relaxed text-sm">
                                  {paragraph.substring(2)}
                                </p>
                              </div>
                            );
                          }
                          
                          return (
                            <p key={index} className="text-gray-300 leading-relaxed text-base">
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>
                      
                      {/* Expandable content on mobile, always visible on desktop */}
                      {remainingParagraphs.length > 0 && (
                        <div className={`${isDescriptionExpanded ? 'block' : 'hidden'} md:block mt-4 space-y-3`}>
                          {remainingParagraphs.map((paragraph, index) => {
                            if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                              return (
                                <h3 key={index + 100} className="text-lg font-fraunces font-bold text-white mt-4 mb-2 flex items-center gap-2">
                                  <div className="w-1 h-4 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full" />
                                  {paragraph.replace(/\*\*/g, '')}
                                </h3>
                              );
                            }
                            
                            if (paragraph.startsWith('- ')) {
                              return (
                                <div key={index + 100} className="flex items-start gap-3 mb-2">
                                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                                  <p className="text-gray-300 leading-relaxed text-sm">
                                    {paragraph.substring(2)}
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                              <p key={index + 100} className="text-gray-300 leading-relaxed text-base">
                                {paragraph}
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
                
                {/* Compact Event Highlights */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        <h4 className="font-semibold text-white text-sm">When & Where</h4>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>
                          {event.endAt ? (() => {
                            const endDate = new Date(event.endAt);
                            const isSameDay = format(eventDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
                            if (isSameDay) {
                              return `${format(eventDate, 'MMM d, yyyy')} ${format(eventDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
                            } else {
                              return `${format(eventDate, 'MMM d, yyyy h:mm a')} - ${format(endDate, 'MMM d, yyyy h:mm a')}`;
                            }
                          })() : format(eventDate, 'MMM d, yyyy • h:mm a')}
                        </p>
                        <p>{event.venue}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-orange-400" />
                        <h4 className="font-semibold text-white text-sm">Tickets</h4>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>From ${Math.min(...event.tiers.map(t => t.priceCents)) / 100}</p>
                        <p>{event.tiers.length} tier{event.tiers.length > 1 ? 's' : ''} available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator className="mb-8" />

          {/* Premium Ticket Selection */}
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8 mobile-single-col">
            <div className="lg:col-span-2 space-y-6">
              <div className="premium-fade-in">
                <h2 className="text-2xl md:text-3xl font-fraunces font-bold text-white mb-2">Select Your Tickets</h2>
                <p className="text-gray-400 text-base md:text-lg">Choose from our premium ticket tiers</p>
              </div>
              
              <div className="space-y-4">
                {event.tiers.map((tier, index) => {
                  const { available, remaining } = getTierAvailability(tier);
                  const quantity = getTierQuantity(tier.id);
                  
                  return (
                    <div 
                      key={tier.id}
                      className={`premium-tier-card ${!available ? "premium-tier-sold-out" : ""} premium-slide-up`}
                      style={{ animationDelay: `${index * 100}ms` }}
                      data-testid={`card-tier-${tier.id}`}
                    >
                      {/* Tier Header */}
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg md:text-xl font-fraunces font-bold text-white">{tier.name}</h3>
                            {tier.showRemaining !== false && remaining !== null && remaining < 10 && remaining > 0 && (
                              <div className="premium-badge-low">
                                Only {remaining} left!
                              </div>
                            )}
                            {tier.showRemaining !== false && remaining !== null && remaining >= 10 && (
                              <div className="premium-badge-available">
                                {remaining} available
                              </div>
                            )}
                          </div>
                          {tier.description && (
                            <p className="text-gray-400 leading-relaxed">
                              {tier.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-center md:text-right md:ml-6 mobile-price-display">
                          <div className="text-xl md:text-2xl font-bold text-white mb-1">
                            ${(tier.priceCents / 100).toFixed(0)}
                            <span className="text-sm md:text-base text-gray-400">.{String(tier.priceCents % 100).padStart(2, '0')}</span>
                          </div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">per ticket</div>
                        </div>
                      </div>
                      
                      {/* Tier Controls */}
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mobile-tier-card">
                        {available ? (
                          <>
                            {/* Premium Quantity Controls */}
                            <div className="flex items-center gap-3 mobile-quantity-controls">
                              <div className="flex items-center bg-gray-800/50 rounded-full border border-gray-600">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateTierQuantity(tier.id, Math.max(0, quantity - 1))}
                                  disabled={quantity === 0}
                                  className="h-10 w-10 rounded-full text-gray-300 hover:text-white hover:bg-gray-700 premium-touch-target mobile-touch-target"
                                  data-testid={`button-minus-${tier.id}`}
                                >
                                  -
                                </Button>
                                <div className="px-4 py-2 min-w-[3rem] text-center">
                                  <span className="text-lg font-semibold text-white">{quantity}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateTierQuantity(tier.id, quantity + 1)}
                                  disabled={remaining !== null && quantity >= remaining}
                                  className="h-10 w-10 rounded-full text-gray-300 hover:text-white hover:bg-gray-700 premium-touch-target mobile-touch-target"
                                  data-testid={`button-plus-${tier.id}`}
                                >
                                  +
                                </Button>
                              </div>
                              
                              {quantity > 0 && (
                                <div className="premium-total-badge">
                                  Total: ${((tier.priceCents * quantity) / 100).toFixed(2)}
                                </div>
                              )}
                            </div>
                            
                          </>
                        ) : (
                          <div className="premium-badge-sold-out flex-1 text-center py-3">
                            SOLD OUT
                          </div>
                        )}
                      </div>
                      
                      {/* Inline Error Message */}
                      {tierErrors[tier.id] && (
                        <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                          <p className="text-red-400 text-sm font-medium" data-testid={`error-${tier.id}`}>
                            ⚠️ {tierErrors[tier.id]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Premium Discount Code Section */}
              <div className="premium-surface-elevated p-6 premium-slide-up" style={{ animationDelay: `${event.tiers.length * 100 + 200}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <Tag className="w-5 h-5 text-orange-400" />
                  <h3 className="text-xl font-semibold text-white">Have a Discount Code?</h3>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter your discount code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"
                    data-testid="input-discount-code"
                  />
                  <Button 
                    variant="outline" 
                    className="premium-button-secondary"
                    data-testid="button-apply-discount"
                  >
                    Apply
                  </Button>
                </div>
                {discountCode && (
                  <p className="text-sm text-gray-400 mt-2">
                    Discount will be applied at checkout
                  </p>
                )}
              </div>
            </div>

            {/* Premium Order Summary */}
            <div className="space-y-4 md:space-y-6">
              <div className="premium-order-summary sticky top-4 premium-slide-up mobile-order-summary" style={{ animationDelay: "300ms" }}>
                {/* Header */}
                <div className="premium-summary-header">
                  <h3 className="text-2xl font-fraunces font-bold text-white">Order Summary</h3>
                  {cart.length > 0 && (
                    <div className="premium-cart-count">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} item{cart.reduce((sum, item) => sum + item.quantity, 0) !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                
                {cart.length === 0 ? (
                  <div className="premium-empty-cart">
                    <div className="premium-empty-cart-icon">
                      <ShoppingCart className="w-8 h-8 text-gray-500" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-300 mb-2">Your cart is empty</h4>
                    <p className="text-gray-500">Select tickets to get started</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Selected Tickets with Premium Design */}
                    <div className="space-y-3">
                      {cart.map((item, index) => {
                        const tier = event.tiers.find(t => t.id === item.tierId);
                        if (!tier) return null;
                        
                        return (
                          <div key={item.tierId} className="premium-cart-item mobile-cart-spacing" style={{ animationDelay: `${400 + index * 50}ms` }}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-white font-semibold text-base">{tier.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-gray-400 text-sm">{item.quantity} ticket{item.quantity !== 1 ? 's' : ''}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-400 text-sm">${(tier.priceCents / 100).toFixed(2)} each</span>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-lg font-bold text-white">
                                  ${((tier.priceCents * item.quantity) / 100).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Premium Pricing Breakdown */}
                    <div className="premium-pricing-section">
                      <div className="space-y-3">
                        <div className="flex justify-between text-gray-300">
                          <span>Subtotal</span>
                          <span className="font-semibold">${(subtotal / 100).toFixed(2)}</span>
                        </div>
                        {(event.hasGST || event.hasPST) && (
                          <div className="flex justify-between text-gray-300">
                            <span>Tax {event.hasGST && event.hasPST ? '(GST + PST)' : event.hasGST ? '(GST)' : '(PST)'}</span>
                            <span className="font-semibold">${(tax / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-300">
                          <span>Service Fee</span>
                          <span className="font-semibold">${(fees / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Total */}
                    <div className="premium-total-section">
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-white">Total</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">
                            ${(total / 100).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-400">CAD</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Buyer Information */}
                    <div className="premium-buyer-section">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                        Your Information
                      </h4>
                      
                      <div className="space-y-3 md:space-y-4">
                        <div>
                          <Label htmlFor="buyerName" className="text-gray-300 mb-2 block font-medium text-sm md:text-base">Full Name *</Label>
                          <Input
                            id="buyerName"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                            className="premium-input mobile-form-input"
                            data-testid="input-buyer-name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="buyerEmail" className="text-gray-300 mb-2 block font-medium text-sm md:text-base">Email Address *</Label>
                          <Input
                            id="buyerEmail"
                            type="email"
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className={`premium-input mobile-form-input ${buyerEmail && !isValidEmail(buyerEmail) ? "border-red-500 ring-red-500/20 focus:border-red-500" : ""}`}
                            data-testid="input-buyer-email"
                          />
                          {buyerEmail && !isValidEmail(buyerEmail) && (
                            <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                              <span className="w-1 h-1 bg-red-400 rounded-full" />
                              Please enter a valid email address
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="buyerPhone" className="text-gray-300 mb-2 block font-medium text-sm md:text-base">Phone Number <span className="text-gray-500">(optional)</span></Label>
                          <Input
                            id="buyerPhone"
                            type="tel"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            placeholder="+1 (604) 123-4567"
                            className="premium-input mobile-form-input"
                            data-testid="input-buyer-phone"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Checkout Button */}
                    <Button 
                      className="premium-checkout-button w-full mobile-checkout-btn premium-touch-target"
                      onClick={handleCheckout}
                      disabled={isCheckingOut || cart.length === 0 || !buyerName || !isValidEmail(buyerEmail)}
                      data-testid="button-checkout"
                    >
                      {isCheckingOut ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span className="font-semibold">Processing your order...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-3">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="font-bold text-lg">Secure Checkout</span>
                          </div>
                          <div className="text-lg font-bold whitespace-nowrap">
                            ${(total / 100).toFixed(2)} CAD
                          </div>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Security Footer */}
                <div className="premium-security-footer">
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    </div>
                    <p className="text-xs">Secured by Stripe • Your payment info is protected</p>
                  </div>
                </div>
              </div>
              
              {/* Event Policies */}
              {event.refundPolicy && (
                <div className="premium-surface-elevated p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-300">
                        <span className="font-semibold text-white">Refund Policy:</span> {event.refundPolicy}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Checkout Modal */}
      {showEmbeddedCheckout && paymentClientSecret && currentOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-fraunces text-white">Complete Your Purchase</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowEmbeddedCheckout(false);
                      setPaymentClientSecret(null);
                      setCurrentOrderId(null);
                    }}
                    className="text-gray-400 hover:text-white"
                    data-testid="button-close-checkout"
                  >
                    ✕
                  </Button>
                </div>
                <p className="text-gray-400 mt-2">Secure payment powered by Stripe</p>
              </div>
              
              <div className="p-6">
                <EmbeddedCheckout
                  clientSecret={paymentClientSecret}
                  orderId={currentOrderId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}