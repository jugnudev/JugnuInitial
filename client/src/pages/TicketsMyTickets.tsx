import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
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
  Ticket,
  Clock,
  ChevronRight,
  Building2,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import { Helmet } from 'react-helmet-async';

interface TicketData {
  ticket: {
    id: string;
    serial: string;
    qrToken: string;
    status: string;
    usedAt?: string;
  };
  tier: {
    id: string;
    name: string;
    priceCents: number;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    venue?: string;
    city?: string;
    province?: string;
    coverUrl?: string;
  };
  organizer: {
    id: string;
    businessName: string;
    businessWebsite?: string;
  } | null;
  order: {
    id: string;
    buyerEmail: string;
    buyerName?: string;
    totalCents: number;
    currency: string;
    placedAt?: string;
  };
  isUpcoming: boolean;
}

interface GroupedTickets {
  [organizerId: string]: {
    organizer: {
      id: string;
      businessName: string;
      businessWebsite?: string;
    };
    tickets: TicketData[];
  };
}

export default function TicketsMyTickets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const { data: ticketsResponse, isLoading, error } = useQuery({
    queryKey: ['/api/tickets/my-tickets'],
  });

  const groupedByOrganizer = useMemo(() => {
    if (!ticketsResponse) return { upcoming: {}, past: {} };

    const upcoming: GroupedTickets = {};
    const past: GroupedTickets = {};

    const upcomingTickets = (ticketsResponse as any)?.tickets?.upcoming || [];
    const pastTickets = (ticketsResponse as any)?.tickets?.past || [];

    // Group upcoming tickets by organizer
    upcomingTickets.forEach((ticket: TicketData) => {
      const orgId = ticket.organizer?.id || 'unknown';

      if (!upcoming[orgId]) {
        upcoming[orgId] = {
          organizer: ticket.organizer || {
            id: 'unknown',
            businessName: 'Unknown Organizer'
          },
          tickets: []
        };
      }

      upcoming[orgId].tickets.push(ticket);
    });

    // Group past tickets by organizer
    pastTickets.forEach((ticket: TicketData) => {
      const orgId = ticket.organizer?.id || 'unknown';

      if (!past[orgId]) {
        past[orgId] = {
          organizer: ticket.organizer || {
            id: 'unknown',
            businessName: 'Unknown Organizer'
          },
          tickets: []
        };
      }

      past[orgId].tickets.push(ticket);
    });

    // Sort tickets within each organizer by date
    Object.values(upcoming).forEach(group => {
      group.tickets.sort((a, b) => 
        new Date(a.event.startAt).getTime() - new Date(b.event.startAt).getTime()
      );
    });

    Object.values(past).forEach(group => {
      group.tickets.sort((a, b) => 
        new Date(b.event.startAt).getTime() - new Date(a.event.startAt).getTime()
      );
    });

    return { upcoming, past };
  }, [ticketsResponse]);

  const filteredGroups = useMemo(() => {
    const target = activeTab === 'upcoming' ? groupedByOrganizer.upcoming : groupedByOrganizer.past;
    
    if (!searchTerm) return target;

    const search = searchTerm.toLowerCase();
    const filtered: GroupedTickets = {};

    Object.entries(target).forEach(([orgId, group]) => {
      const matchingTickets = group.tickets.filter(ticket =>
        ticket.event.title?.toLowerCase().includes(search) ||
        ticket.event.venue?.toLowerCase().includes(search) ||
        ticket.event.city?.toLowerCase().includes(search) ||
        ticket.tier.name.toLowerCase().includes(search) ||
        group.organizer.businessName.toLowerCase().includes(search)
      );

      if (matchingTickets.length > 0) {
        filtered[orgId] = {
          organizer: group.organizer,
          tickets: matchingTickets
        };
      }
    });

    return filtered;
  }, [groupedByOrganizer, activeTab, searchTerm]);

  const totalTickets = useMemo(() => {
    return Object.values(filteredGroups).reduce((sum, group) => sum + group.tickets.length, 0);
  }, [filteredGroups]);

  const getStatusBadge = (status: string) => {
    const config = {
      valid: { color: 'bg-green-500/10 text-green-500 border-green-500/20', label: 'Valid' },
      used: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', label: 'Used' },
      refunded: { color: 'bg-red-500/10 text-red-500 border-red-500/20', label: 'Refunded' },
      canceled: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: 'Canceled' }
    }[status] || { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: status };

    return (
      <Badge className={`${config.color} border`} data-testid={`badge-${status}`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-charcoal-gradient">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl">
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-3" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>My Orders - Error - Jugnu</title>
        </Helmet>
        <div className="min-h-screen bg-charcoal-gradient">
          <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl">
            <div className="glass-elevated rounded-xl p-8 md:p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                  <span className="text-3xl">⚠</span>
                </div>
              </div>
              <h2 className="text-2xl font-fraunces font-bold mb-3" style={{ color: 'var(--neutral-50)' }}>
                Error Loading Orders
              </h2>
              <p className="text-base mb-6" style={{ color: 'var(--neutral-300)' }}>
                We couldn't load your ticket orders. Please try again later.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target"
                data-testid="button-retry"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Orders - Jugnu</title>
        <meta name="description" content="View and manage all your event tickets and orders on Jugnu" />
      </Helmet>

      <div className="min-h-screen bg-charcoal-gradient">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-5xl">
          {/* Premium Header */}
          <div className="mb-8 md:mb-12 animate-fadeIn">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-8 bg-copper-gradient rounded-full" />
              <h1 className="text-3xl md:text-5xl font-fraunces font-bold" style={{ color: 'var(--neutral-50)' }}>
                My <span className="text-copper-gradient">Orders</span>
              </h1>
            </div>
            <p className="text-base md:text-lg ml-5" style={{ color: 'var(--neutral-300)' }}>
              All your event tickets, organized by community
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6 glass-elevated rounded-xl p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--neutral-400)' }} />
              <Input
                type="text"
                placeholder="Search tickets by event, venue, community..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-transparent border-white/20 text-white placeholder:text-neutral-400"
                data-testid="input-search-tickets"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'past')} className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2 md:w-auto md:inline-grid">
              <TabsTrigger value="upcoming" data-testid="tab-upcoming" className="touch-target">
                <CalendarDays className="w-4 h-4 mr-2" />
                Upcoming ({Object.values(groupedByOrganizer.upcoming).reduce((sum, g) => sum + g.tickets.length, 0)})
              </TabsTrigger>
              <TabsTrigger value="past" data-testid="tab-past" className="touch-target">
                <Clock className="w-4 h-4 mr-2" />
                Past ({Object.values(groupedByOrganizer.past).reduce((sum, g) => sum + g.tickets.length, 0)})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {Object.keys(filteredGroups).length === 0 ? (
                <div className="glass-elevated rounded-xl p-12 text-center">
                  <Ticket className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--neutral-400)' }} />
                  <h3 className="text-xl font-fraunces font-semibold mb-2" style={{ color: 'var(--neutral-50)' }}>
                    {searchTerm ? 'No tickets found' : 'No upcoming tickets'}
                  </h3>
                  <p className="text-base mb-6" style={{ color: 'var(--neutral-300)' }}>
                    {searchTerm ? 'Try a different search term' : 'Browse events and get tickets for upcoming shows'}
                  </p>
                  {!searchTerm && (
                    <Link href="/events">
                      <Button className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target" data-testid="button-browse-events">
                        Browse Events
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(filteredGroups).map(([orgId, group]) => (
                    <OrganizerSection key={orgId} group={group} getStatusBadge={getStatusBadge} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past">
              {Object.keys(filteredGroups).length === 0 ? (
                <div className="glass-elevated rounded-xl p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--neutral-400)' }} />
                  <h3 className="text-xl font-fraunces font-semibold mb-2" style={{ color: 'var(--neutral-50)' }}>
                    {searchTerm ? 'No tickets found' : 'No past tickets'}
                  </h3>
                  <p className="text-base" style={{ color: 'var(--neutral-300)' }}>
                    {searchTerm ? 'Try a different search term' : 'Your attended events will appear here'}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(filteredGroups).map(([orgId, group]) => (
                    <OrganizerSection key={orgId} group={group} getStatusBadge={getStatusBadge} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

function OrganizerSection({ 
  group, 
  getStatusBadge 
}: { 
  group: { organizer: { id: string; businessName: string; businessWebsite?: string }; tickets: TicketData[] };
  getStatusBadge: (status: string) => JSX.Element;
}) {
  return (
    <div className="glass-elevated rounded-xl p-4 md:p-6 animate-slideUp">
      {/* Organizer Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-copper-gradient flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-fraunces font-bold" style={{ color: 'var(--neutral-50)' }}>
              {group.organizer.businessName}
            </h2>
            {group.organizer.businessWebsite && (
              <a 
                href={group.organizer.businessWebsite} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm hover:text-copper-500 transition-colors inline-flex items-center gap-1"
                style={{ color: 'var(--neutral-400)' }}
                data-testid={`link-organizer-website-${group.organizer.id}`}
              >
                Visit website <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
        <Badge variant="outline" className="border-copper-500/30" style={{ color: 'var(--copper)' }}>
          {group.tickets.length} {group.tickets.length === 1 ? 'ticket' : 'tickets'}
        </Badge>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 gap-4">
        {group.tickets.map((ticket) => (
          <TicketCard key={ticket.ticket.id} ticket={ticket} getStatusBadge={getStatusBadge} />
        ))}
      </div>
    </div>
  );
}

function TicketCard({ 
  ticket, 
  getStatusBadge 
}: { 
  ticket: TicketData;
  getStatusBadge: (status: string) => JSX.Element;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticket.ticket.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${ticket.ticket.serial}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading ticket:', error);
    }
  };

  return (
    <Card className="overflow-hidden bg-charcoal-800/50 border-white/10 hover-lift group">
      <div className="flex flex-col sm:flex-row">
        {/* Event Image */}
        {ticket.event.coverUrl && (
          <div className="sm:w-48 h-32 sm:h-auto relative overflow-hidden">
            <img
              src={ticket.event.coverUrl}
              alt={ticket.event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        {/* Content */}
        <CardContent className="flex-1 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-fraunces font-bold mb-2" style={{ color: 'var(--neutral-50)' }}>
                {ticket.event.title}
              </h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-300)' }}>
                  <CalendarDays className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                  {format(new Date(ticket.event.startAt), 'EEEE, MMMM d, yyyy • h:mm a')}
                </div>
                {ticket.event.venue && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--neutral-300)' }}>
                    <MapPin className="w-4 h-4" style={{ color: 'var(--copper)' }} />
                    {ticket.event.venue}, {ticket.event.city}
                  </div>
                )}
              </div>
            </div>
            {getStatusBadge(ticket.ticket.status)}
          </div>

          {/* Ticket Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-black/20">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--neutral-400)' }}>Ticket Type</p>
              <p className="text-sm font-medium" style={{ color: 'var(--neutral-50)' }}>{ticket.tier.name}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--neutral-400)' }}>Serial</p>
              <p className="text-sm font-mono" style={{ color: 'var(--neutral-50)' }}>#{ticket.ticket.serial}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs mb-1" style={{ color: 'var(--neutral-400)' }}>Order ID</p>
              <p className="text-sm font-mono" style={{ color: 'var(--neutral-50)' }}>
                {ticket.order.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/tickets/event/${ticket.event.slug}`}>
              <Button 
                size="sm" 
                className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target"
                data-testid={`button-view-ticket-${ticket.ticket.id}`}
              >
                <QrCode className="w-4 h-4 mr-2" />
                View Ticket
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="border-white/20 text-white hover:bg-white/10 touch-target"
              data-testid={`button-download-ticket-${ticket.ticket.id}`}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Link href={`/tickets/event/${ticket.event.slug}`}>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10 touch-target"
                data-testid={`button-event-details-${ticket.ticket.id}`}
              >
                Event Details
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
