import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Ticket, 
  Search,
  Mail,
  Hash,
  AlertCircle,
  CalendarDays,
  MapPin,
  Download,
  QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import type { TicketsTicket, TicketsOrder, TicketsEvent, TicketsTier } from '@shared/schema';

// Form validation schema
const lookupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  orderId: z.string().min(1, 'Order ID is required')
});

type LookupFormValues = z.infer<typeof lookupSchema>;

interface TicketWithDetails extends TicketsTicket {
  order: TicketsOrder;
  event: TicketsEvent;
  tier: TicketsTier;
}

export default function TicketsLookup() {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const form = useForm<LookupFormValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      email: '',
      orderId: ''
    }
  });

  // Lookup mutation
  const lookupMutation = useMutation({
    mutationFn: async (values: LookupFormValues) => {
      return apiRequest('/api/tickets/lookup', {
        method: 'POST',
        body: JSON.stringify(values)
      });
    },
    onSuccess: (data) => {
      if (data.tickets && data.tickets.length > 0) {
        setTickets(data.tickets);
        setLookupError(null);
      } else {
        setTickets([]);
        setLookupError('No tickets found for this email and order ID combination.');
      }
    },
    onError: (error: any) => {
      setTickets([]);
      setLookupError(error.message || 'Failed to lookup tickets. Please check your information and try again.');
    }
  });

  const onSubmit = (values: LookupFormValues) => {
    lookupMutation.mutate(values);
  };

  const handleDownloadTicket = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticketId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading ticket:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      valid: { variant: "default", label: "Valid" },
      used: { variant: "secondary", label: "Used" },
      refunded: { variant: "destructive", label: "Refunded" },
      cancelled: { variant: "outline", label: "Cancelled" }
    };
    
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <Ticket className="h-12 w-12 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">Find Your Tickets</h1>
        <p className="text-muted-foreground">
          Enter your email and order ID to retrieve your tickets
        </p>
      </div>

      {/* Lookup Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ticket Lookup</CardTitle>
          <CardDescription>
            Your order ID was included in your confirmation email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="john@example.com"
                          className="pl-10"
                          data-testid="input-email"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The email address used when purchasing tickets
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          {...field}
                          placeholder="e.g., ord_abc123xyz"
                          className="pl-10"
                          data-testid="input-order-id"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Found in your confirmation email (starts with "ord_")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={lookupMutation.isPending}
                data-testid="button-lookup"
              >
                {lookupMutation.isPending ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-pulse" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find My Tickets
                  </>
                )}
              </Button>
            </form>
          </Form>

          {/* Error Message */}
          {lookupError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Lookup Failed</AlertTitle>
              <AlertDescription>{lookupError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tickets Results */}
      {tickets.length > 0 && (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">Your Tickets</h2>
            <p className="text-muted-foreground">Found {tickets.length} ticket{tickets.length > 1 ? 's' : ''}</p>
          </div>

          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                  {/* Event Image */}
                  {ticket.event.coverImage && (
                    <div className="lg:w-48 h-48 lg:h-auto">
                      <img
                        src={ticket.event.coverImage}
                        alt={ticket.event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{ticket.event.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDays className="h-4 w-4" />
                              {format(new Date(ticket.event.startDate), 'PPP')} at{' '}
                              {format(new Date(ticket.event.startDate), 'p')}
                            </div>
                            {ticket.event.venue && (
                              <div className="flex items-center gap-2 text-sm mt-1">
                                <MapPin className="h-4 w-4" />
                                {ticket.event.venue}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Ticket Type</p>
                          <p className="font-medium">{ticket.tier.name}</p>
                        </div>
                        {ticket.seatNumber && (
                          <div>
                            <p className="text-xs text-muted-foreground">Seat</p>
                            <p className="font-medium">{ticket.seatNumber}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Ticket Code</p>
                          <p className="font-mono text-sm">{ticket.ticketCode}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/tickets/view/${ticket.id}`}>
                          <Button variant="default" size="sm" data-testid={`button-view-${ticket.id}`}>
                            <QrCode className="h-4 w-4 mr-2" />
                            View Ticket
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadTicket(ticket.id)}
                          data-testid={`button-download-${ticket.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Help Section */}
      <Card className="mt-8 bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Need Help?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Your order ID was sent to your email after purchase</li>
            <li>• Check your spam folder if you can't find the confirmation email</li>
            <li>• Order IDs typically start with "ord_" followed by letters and numbers</li>
            <li>• Make sure to use the same email address you used during checkout</li>
          </ul>
          
          <Separator className="my-4" />
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Have an account? Sign in to view all your tickets
            </p>
            <Link href="/my-tickets">
              <Button variant="link" data-testid="link-my-tickets">
                Go to My Tickets
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}