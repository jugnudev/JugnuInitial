import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarDays, 
  MapPin, 
  Download, 
  Search,
  QrCode,
  Mail,
  Ticket,
  Clock,
  ChevronRight
} from 'lucide-react';
import { format, isFuture, isPast } from 'date-fns';
import { Link } from 'wouter';
import type { TicketsTicket, TicketsOrder, TicketsEvent, TicketsTier } from '@shared/schema';

interface TicketWithDetails extends TicketsTicket {
  order: TicketsOrder;
  event: TicketsEvent;
  tier: TicketsTier;
}

export default function TicketsMyTickets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  // Fetch user's tickets
  const { data: ticketsData, isLoading, error } = useQuery({
    queryKey: ['/api/tickets/my-tickets'],
  });

  // Group tickets by upcoming and past events
  const groupedTickets = useMemo(() => {
    if (!ticketsData?.tickets) return { upcoming: [], past: [] };
    
    const now = new Date();
    const upcoming: TicketWithDetails[] = [];
    const past: TicketWithDetails[] = [];
    
    ticketsData.tickets.forEach((ticket: TicketWithDetails) => {
      const eventDate = new Date(ticket.event.startDate);
      if (isFuture(eventDate) || format(eventDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
        upcoming.push(ticket);
      } else {
        past.push(ticket);
      }
    });
    
    // Sort by date
    upcoming.sort((a, b) => new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime());
    past.sort((a, b) => new Date(b.event.startDate).getTime() - new Date(a.event.startDate).getTime());
    
    return { upcoming, past };
  }, [ticketsData]);

  // Filter tickets based on search
  const filteredTickets = useMemo(() => {
    const tickets = activeTab === 'upcoming' ? groupedTickets.upcoming : groupedTickets.past;
    
    if (!searchTerm) return tickets;
    
    const search = searchTerm.toLowerCase();
    return tickets.filter((ticket) => 
      ticket.event.name.toLowerCase().includes(search) ||
      ticket.event.venue?.toLowerCase().includes(search) ||
      ticket.tier.name.toLowerCase().includes(search) ||
      ticket.ticketCode?.toLowerCase().includes(search)
    );
  }, [groupedTickets, activeTab, searchTerm]);

  const getTicketStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      valid: { variant: "default", label: "Valid" },
      used: { variant: "secondary", label: "Used" },
      refunded: { variant: "destructive", label: "Refunded" },
      cancelled: { variant: "outline", label: "Cancelled" }
    };
    
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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

  const handleResendEmail = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/email`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Show success message
        alert('Ticket email has been resent!');
      } else {
        throw new Error('Failed to resend email');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend ticket email. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">My Tickets</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">Error loading tickets. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
        <p className="text-muted-foreground">Manage and access all your event tickets</p>
      </div>

      {/* Stats */}
      {ticketsData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Ticket className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-bold">{ticketsData.stats.totalTickets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Events</p>
                  <p className="text-2xl font-bold">{ticketsData.stats.upcomingEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Past Events</p>
                  <p className="text-2xl font-bold">{ticketsData.stats.pastEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Tabs */}
      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tickets by event, venue, or ticket code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-tickets"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming ({groupedTickets.upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past ({groupedTickets.past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No upcoming tickets</p>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'No tickets match your search' : "You don't have any tickets for upcoming events"}
                  </p>
                  {!searchTerm && (
                    <Link href="/events">
                      <Button>Browse Events</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDownload={() => handleDownloadTicket(ticket.id)}
                    onResend={() => handleResendEmail(ticket.id)}
                    getStatusBadge={getTicketStatusBadge}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No past tickets</p>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No tickets match your search' : "You haven't attended any events yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onDownload={() => handleDownloadTicket(ticket.id)}
                    onResend={() => handleResendEmail(ticket.id)}
                    getStatusBadge={getTicketStatusBadge}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Guest Access Link */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Don't have an account? You can still access your tickets.
        </p>
        <Link href="/tickets/lookup">
          <Button variant="link" data-testid="link-guest-lookup">
            Guest Ticket Lookup
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Ticket Card Component
function TicketCard({ 
  ticket, 
  onDownload, 
  onResend, 
  getStatusBadge 
}: { 
  ticket: TicketWithDetails;
  onDownload: () => void;
  onResend: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm">{ticket.order.id.slice(0, 8)}</p>
              </div>
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
                onClick={onDownload}
                data-testid={`button-download-${ticket.id}`}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onResend}
                data-testid={`button-resend-${ticket.id}`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Email
              </Button>
              <Link href={`/events/${ticket.event.slug}`}>
                <Button variant="ghost" size="sm" data-testid={`button-event-${ticket.id}`}>
                  Event Details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}