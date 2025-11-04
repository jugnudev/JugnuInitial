import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail,
  Ticket,
  Download,
  Share2,
  ArrowRight,
  Loader2,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import QRCode from "qrcode";
import { queryClient } from "@/lib/queryClient";
import confetti from 'canvas-confetti';

interface TicketDetails {
  id: string;
  tierId: string;
  tierName: string;
  serial: string;
  qrToken: string;
  status: string;
}

interface OrderDetails {
  id: string;
  eventId: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone: string;
  status: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  placedAt: Date;
  tickets: TicketDetails[];
  event: {
    id: string;
    title: string;
    startAt: Date;
    venue: string;
    address: string | null;
    city: string;
    province: string;
    coverUrl: string | null;
  };
  organizer: {
    businessName: string;
  };
}

export function TicketsOrderSuccessPage() {
  const [location, setLocation] = useLocation();
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [downloadingTickets, setDownloadingTickets] = useState(false);
  
  // Parse query params
  const params = new URLSearchParams(location.split('?')[1] || '');
  const orderId = params.get('order_id');
  const sessionId = params.get('session_id');
  const success = params.get('success') === 'true';
  const cancelled = params.get('cancelled') === 'true';
  
  // Fetch order details
  const { data: orderData, isLoading, error } = useQuery<{
    ok: boolean;
    order: OrderDetails;
  }>({
    queryKey: [`/api/tickets/orders/${orderId || sessionId}`],
    enabled: !!(orderId || sessionId) && !cancelled,
    retry: 3,
    retryDelay: 1000
  });

  // Fire confetti on success
  useEffect(() => {
    if (success && orderData?.order) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 500);
    }
  }, [success, orderData]);

  // Generate QR codes for tickets
  useEffect(() => {
    if (orderData?.order?.tickets) {
      generateQRCodes(orderData.order.tickets);
    }
  }, [orderData]);

  const generateQRCodes = async (tickets: TicketDetails[]) => {
    const codes: Record<string, string> = {};
    
    for (const ticket of tickets) {
      try {
        const qrDataUrl = await QRCode.toDataURL(ticket.qrToken, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        codes[ticket.id] = qrDataUrl;
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    }
    
    setQrCodes(codes);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const downloadTickets = async () => {
    if (!orderData?.order) return;
    
    setDownloadingTickets(true);
    
    try {
      // Create a simple HTML document with all tickets
      const ticketsHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tickets - ${orderData.order.event.title}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .ticket { page-break-inside: avoid; border: 2px dashed #ccc; padding: 20px; margin: 20px 0; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: -20px -20px 20px; }
            .qr-code { text-align: center; margin: 20px 0; }
            .details { margin: 10px 0; }
            .details strong { display: inline-block; width: 120px; }
          </style>
        </head>
        <body>
          <h1>${orderData.order.event.title}</h1>
          <p><strong>Order #:</strong> ${orderData.order.id}</p>
          <p><strong>Purchaser:</strong> ${orderData.order.buyerName} (${orderData.order.buyerEmail})</p>
          <hr>
          ${orderData.order.tickets.map((ticket, index) => `
            <div class="ticket">
              <div class="header">
                <h2>Ticket ${index + 1} - ${ticket.tierName}</h2>
              </div>
              <div class="qr-code">
                <img src="${qrCodes[ticket.id]}" alt="QR Code" />
                <p><small>${ticket.qrToken}</small></p>
              </div>
              <div class="details">
                <p><strong>Event:</strong> ${orderData.order.event.title}</p>
                <p><strong>Date:</strong> ${format(new Date(orderData.order.event.startAt), 'EEEE, MMMM d, yyyy')}</p>
                <p><strong>Time:</strong> ${format(new Date(orderData.order.event.startAt), 'h:mm a')}</p>
                <p><strong>Venue:</strong> ${orderData.order.event.venue}</p>
                <p><strong>Location:</strong> ${orderData.order.event.city}, ${orderData.order.event.province}</p>
                <p><strong>Ticket ID:</strong> ${ticket.serial}</p>
              </div>
            </div>
          `).join('')}
        </body>
        </html>
      `;
      
      // Create a blob and download
      const blob = new Blob([ticketsHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${orderData.order.id}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading tickets:', err);
    } finally {
      setDownloadingTickets(false);
    }
  };

  const shareOrder = async () => {
    if (!orderData?.order) return;
    
    const shareData = {
      title: `Tickets for ${orderData.order.event.title}`,
      text: `I just got tickets for ${orderData.order.event.title}!`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Handle cancelled checkout
  if (cancelled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-fraunces mb-2">Checkout Cancelled</h2>
              <p className="text-muted-foreground mb-6">
                Your order was cancelled. No payment was processed.
              </p>
              <Button onClick={() => setLocation('/events')}>
                Back to Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your tickets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !orderData?.order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-fraunces mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-6">
                We couldn't find your order. Please check your email for confirmation.
              </p>
              <Button onClick={() => setLocation('/events')}>
                Back to Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = orderData.order;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Success Hero */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-fraunces mb-2">
              Order Confirmed!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your tickets have been emailed to {order.buyerEmail}
            </p>
          </div>

          {/* Order Summary Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>Order #{order.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Event Details */}
              <div className="flex gap-4">
                {order.event.coverUrl && (
                  <img 
                    src={order.event.coverUrl} 
                    alt={order.event.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{order.event.title}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(order.event.startAt), 'EEEE, MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(order.event.startAt), 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{order.event.venue}, {order.event.city}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Buyer Information */}
              <div>
                <h4 className="font-medium mb-3">Purchaser Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{order.buyerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.buyerEmail}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Details */}
              <div>
                <h4 className="font-medium mb-3">Payment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotalCents)}</span>
                  </div>
                  {order.taxCents > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatPrice(order.taxCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(order.totalCents)}</span>
                  </div>
                </div>
                <Badge className="mt-2" variant="outline">
                  Paid on {format(new Date(order.placedAt), 'MMM d, yyyy h:mm a')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Tickets</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={shareOrder}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button 
                    size="sm"
                    onClick={downloadTickets}
                    disabled={downloadingTickets}
                  >
                    {downloadingTickets ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download All
                  </Button>
                </div>
              </div>
              <CardDescription>
                {order.tickets.length} {order.tickets.length === 1 ? 'ticket' : 'tickets'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {order.tickets.map((ticket, index) => (
                  <Card key={ticket.id} className="overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          <Ticket className="inline-block mr-2 h-4 w-4" />
                          Ticket {index + 1}
                        </h4>
                        <Badge>{ticket.tierName}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ID: {ticket.serial}
                      </p>
                    </div>
                    <div className="p-4">
                      {qrCodes[ticket.id] ? (
                        <div className="text-center">
                          <img 
                            src={qrCodes[ticket.id]} 
                            alt="Ticket QR Code"
                            className="mx-auto mb-2"
                            style={{ width: 200, height: 200 }}
                          />
                          <p className="text-xs text-muted-foreground break-all">
                            {ticket.qrToken}
                          </p>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              
              <Alert className="mt-6">
                <AlertDescription>
                  <strong>Important:</strong> Please bring these tickets (printed or on your phone) 
                  to the event. Each QR code can only be scanned once at entry.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Button 
              className="flex-1"
              onClick={() => setLocation('/events')}
            >
              Browse More Events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => setLocation('/tickets/my-orders')}
            >
              View My Orders
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}