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

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      console.log('[Checkout] Starting checkout mutation');
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
      
      console.log('[Checkout] API response:', response);
      return response;
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
    // Platform fee: 2.5% + $0.50 per ticket
    const ticketCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return Math.round(subtotal * 0.025 + ticketCount * 50);
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const fees = calculateFees(subtotal);
  const total = subtotal + tax + fees;

  const handleCheckout = () => {
    console.log('[Checkout] handleCheckout called, cart:', cart);
    setIsCheckingOut(true);
    checkoutMutation.mutate();
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
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-fraunces text-white font-bold leading-tight mb-4 drop-shadow-lg">
                  {event.title}
                </h1>
                
                {event.summary && (
                  <p className="text-lg md:text-xl text-white/90 mb-6 drop-shadow-sm max-w-2xl leading-relaxed">
                    {event.summary}
                  </p>
                )}
                
                {/* Key Event Details */}
                <div className="flex flex-wrap gap-4 md:gap-6 text-white/90">
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

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Event Description - Premium Card */}
          {event.description && (
            <div className="premium-surface-elevated mb-8 p-6 lg:p-8 premium-slide-up">
              <h2 className="text-2xl font-fraunces mb-4 text-white">About This Event</h2>
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          )}

          <Separator className="mb-8" />

          {/* Ticket Selection */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-fraunces mb-4">Select Tickets</h2>
              
              {event.tiers.map(tier => {
                const { available, remaining } = getTierAvailability(tier);
                const quantity = getTierQuantity(tier.id);
                
                return (
                  <Card 
                    key={tier.id}
                    className={!available ? "opacity-60" : ""}
                    data-testid={`card-tier-${tier.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{tier.name}</CardTitle>
                          {tier.description && (
                            <CardDescription className="mt-1">
                              {tier.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${(tier.priceCents / 100).toFixed(2)}
                          </div>
                          {remaining !== null && (
                            <Badge variant={remaining < 10 ? "destructive" : "secondary"}>
                              {remaining} left
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {available ? (
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateTierQuantity(tier.id, Math.max(0, quantity - 1))}
                            disabled={quantity === 0}
                            data-testid={`button-minus-${tier.id}`}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => updateTierQuantity(tier.id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                            min={0}
                            max={tier.maxPerOrder}
                            data-testid={`input-quantity-${tier.id}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateTierQuantity(tier.id, quantity + 1)}
                            disabled={remaining !== null && quantity >= remaining}
                            data-testid={`button-plus-${tier.id}`}
                          >
                            +
                          </Button>
                          {quantity > 0 && (
                            <span className="text-sm text-muted-foreground">
                              = ${((tier.priceCents * quantity) / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="destructive" className="w-full justify-center py-2">
                          SOLD OUT
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              
              {/* Premium Discount Code */}
              <div className="premium-surface-elevated p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Discount Code</h3>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter discount code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                    data-testid="input-discount-code"
                  />
                  <Button 
                    variant="outline" 
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    data-testid="button-apply-discount"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            {/* Premium Order Summary */}
            <div className="space-y-4">
              <div className="premium-surface-glass sticky top-4 p-6">
                <h3 className="text-2xl font-fraunces mb-6 text-white">Order Summary</h3>
                
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No tickets selected</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Selected Tickets */}
                    <div className="space-y-3">
                      {cart.map(item => {
                        const tier = event.tiers.find(t => t.id === item.tierId);
                        if (!tier) return null;
                        
                        return (
                          <div key={item.tierId} className="flex justify-between items-center py-2">
                            <div>
                              <div className="text-white font-medium">{tier.name}</div>
                              <div className="text-gray-400 text-sm">{item.quantity} ticket{item.quantity !== 1 ? 's' : ''}</div>
                            </div>
                            <div className="text-white font-semibold">
                              ${((tier.priceCents * item.quantity) / 100).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="border-t border-gray-700 pt-4 space-y-3">
                      <div className="flex justify-between text-gray-300">
                        <span>Subtotal</span>
                        <span>${(subtotal / 100).toFixed(2)}</span>
                      </div>
                      {(event.hasGST || event.hasPST) && (
                        <div className="flex justify-between text-gray-300">
                          <span>Tax {event.hasGST && event.hasPST ? '(GST + PST)' : event.hasGST ? '(GST)' : '(PST)'}</span>
                          <span>${(tax / 100).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-300">
                        <span>Service Fee</span>
                        <span>${(fees / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center text-xl font-bold text-white">
                        <span>Total</span>
                        <span>${(total / 100).toFixed(2)} CAD</span>
                      </div>
                    </div>
                    
                    {/* Premium Buyer Information */}
                    <div className="border-t border-gray-700 pt-6 space-y-4">
                      <h4 className="text-lg font-semibold text-white mb-4">Your Details</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="buyerName" className="text-gray-300 mb-2 block">Full Name *</Label>
                          <Input
                            id="buyerName"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="John Doe"
                            required
                            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                            data-testid="input-buyer-name"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="buyerEmail" className="text-gray-300 mb-2 block">Email Address *</Label>
                          <Input
                            id="buyerEmail"
                            type="email"
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            placeholder="john@example.com"
                            required
                            className={`bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 ${buyerEmail && !isValidEmail(buyerEmail) ? "border-red-500 ring-red-500" : ""}`}
                            data-testid="input-buyer-email"
                          />
                          {buyerEmail && !isValidEmail(buyerEmail) && (
                            <p className="text-sm text-red-400 mt-2">Please enter a valid email address</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="buyerPhone" className="text-gray-300 mb-2 block">Phone Number (optional)</Label>
                          <Input
                            id="buyerPhone"
                            type="tel"
                            value={buyerPhone}
                            onChange={(e) => setBuyerPhone(e.target.value)}
                            placeholder="+1 (604) 123-4567"
                            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                            data-testid="input-buyer-phone"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Checkout Button */}
                    <Button 
                      className="premium-button w-full text-lg py-6 mt-6"
                      onClick={handleCheckout}
                      disabled={isCheckingOut || cart.length === 0 || !buyerName || !isValidEmail(buyerEmail)}
                      data-testid="button-checkout"
                    >
                      {isCheckingOut ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 font-semibold">
                          <ShoppingCart className="w-5 h-5" />
                          Proceed to Checkout • ${(total / 100).toFixed(2)} CAD
                        </div>
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="border-t border-gray-700 pt-4 mt-6">
                  <p className="text-xs text-gray-400 text-center">
                    Powered by Stripe. Your payment info is secure.
                  </p>
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
    </div>
  );
}