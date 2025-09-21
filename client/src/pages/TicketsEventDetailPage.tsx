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
      
      return response;
    },
    onSuccess: (result: any) => {
      if (result?.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = result.checkoutUrl;
      } else {
        toast({
          title: "Checkout started",
          description: "Redirecting to payment..."
        });
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
    setIsCheckingOut(true);
    checkoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Event Header */}
          {event.coverUrl && (
            <div className="aspect-video relative mb-8 rounded-lg overflow-hidden">
              <img 
                src={event.coverUrl} 
                alt={event.title}
                className="w-full h-full object-cover"
                data-testid="img-event-header"
              />
            </div>
          )}
          
          <div className="mb-8">
            <h1 className="text-4xl font-fraunces mb-2">{event.title}</h1>
            {event.summary && (
              <p className="text-xl text-muted-foreground mb-4">{event.summary}</p>
            )}
            
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format(eventDate, 'h:mm a')}</span>
                {event.endAt && (
                  <span> - {format(new Date(event.endAt), 'h:mm a')}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{event.venue}, {event.city}, {event.province}</span>
              </div>
            </div>
            
            {event.description && (
              <div className="mt-6 prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            
            <div className="mt-4 text-sm text-muted-foreground">
              Organized by {organizer.businessName}
            </div>
          </div>

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
              
              {/* Discount Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Discount Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      data-testid="input-discount-code"
                    />
                    <Button variant="outline" data-testid="button-apply-discount">
                      Apply
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No tickets selected
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {cart.map(item => {
                          const tier = event.tiers.find(t => t.id === item.tierId);
                          if (!tier) return null;
                          
                          return (
                            <div key={item.tierId} className="flex justify-between text-sm">
                              <span>{tier.name} × {item.quantity}</span>
                              <span>${((tier.priceCents * item.quantity) / 100).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${(subtotal / 100).toFixed(2)}</span>
                        </div>
                        {(event.hasGST || event.hasPST) && (
                          <div className="flex justify-between">
                            <span>Tax {event.hasGST && event.hasPST ? '(GST + PST)' : event.hasGST ? '(GST)' : '(PST)'}</span>
                            <span>${(tax / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Service Fee</span>
                          <span>${(fees / 100).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>${(total / 100).toFixed(2)} CAD</span>
                      </div>
                      
                      {/* Buyer Information */}
                      <div className="space-y-3">
                        <Label htmlFor="buyerName">Your Name *</Label>
                        <Input
                          id="buyerName"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder="John Doe"
                          required
                          data-testid="input-buyer-name"
                        />
                        
                        <Label htmlFor="buyerEmail">Email *</Label>
                        <Input
                          id="buyerEmail"
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="john@example.com"
                          required
                          data-testid="input-buyer-email"
                        />
                        
                        <Label htmlFor="buyerPhone">Phone (optional)</Label>
                        <Input
                          id="buyerPhone"
                          type="tel"
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder="+1 (604) 123-4567"
                          data-testid="input-buyer-phone"
                        />
                      </div>
                      
                      <Button 
                        className="w-full"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={isCheckingOut || cart.length === 0 || !buyerName || !buyerEmail}
                        data-testid="button-checkout"
                      >
                        {isCheckingOut ? (
                          "Processing..."
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Proceed to Checkout
                          </>
                        )}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Powered by Stripe. Your payment info is secure.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Event Policies */}
              {event.refundPolicy && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Refund Policy:</strong> {event.refundPolicy}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}