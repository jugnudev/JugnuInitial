import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Calendar, MapPin, Clock, Users, ExternalLink, QrCode, BarChart3, Edit3, MoreVertical, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FeatureEventDialog } from './FeatureEventDialog';
import { useState } from 'react';

interface TicketTier {
  id: string;
  name: string;
  priceCents: number;
  capacity: number | null;
  soldCount?: number;
}

interface TicketedEvent {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  venue: string | null;
  city: string;
  province: string;
  startAt: string;
  endAt: string | null;
  coverUrl: string | null;
  tiers: TicketTier[];
}

interface CommunityManageEventsProps {
  organizerId: string;
  communityId?: string;
}

export default function CommunityManageEvents({ organizerId, communityId }: CommunityManageEventsProps) {
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [selectedEventForFeature, setSelectedEventForFeature] = useState<string | null>(null);
  const [selectedEventData, setSelectedEventData] = useState<{
    id: string;
    title: string;
    startAt: string;
    venue: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery<{
    ok: boolean;
    events: TicketedEvent[];
  }>({
    queryKey: ['/api/tickets/organizers', organizerId, 'published-events'],
  });

  // Fetch credit balance for featured event pricing
  const { data: creditsData, isLoading: creditsLoading } = useQuery<{
    ok: boolean;
    credits: {
      available: number;
      used: number;
      resetDate: string | null;
      isBeta?: boolean;
    };
    subscriptionStatus?: string;
  }>({
    queryKey: ['/api/billing/credits/balance'],
    enabled: !!organizerId,
  });

  const allEvents = data?.events || [];
  
  const handleFeatureEvent = (event: TicketedEvent) => {
    setSelectedEventForFeature(event.id);
    setSelectedEventData({
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      venue: event.venue || 'TBD',
    });
    setFeatureDialogOpen(true);
  };
  
  const getEventStatus = (event: TicketedEvent): 'upcoming' | 'ongoing' | 'ended' => {
    const now = new Date();
    const startTime = new Date(event.startAt);
    const endTime = event.endAt ? new Date(event.endAt) : null;
    
    if (now < startTime) return 'upcoming';
    if (endTime && now > endTime) return 'ended';
    return 'ongoing';
  };

  const getMinPrice = (event: TicketedEvent) => {
    if (event.tiers.length === 0) return null;
    return Math.min(...event.tiers.map(t => t.priceCents));
  };

  const getSoldPercentage = (event: TicketedEvent) => {
    const totalCapacity = event.tiers.reduce((sum, tier) => sum + (tier.capacity || 0), 0);
    const totalSold = event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
    if (totalCapacity === 0) return 0;
    return Math.round((totalSold / totalCapacity) * 100);
  };

  const getTotalAttendees = (event: TicketedEvent) => {
    return event.tiers.reduce((sum, tier) => sum + (tier.soldCount || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse glass-elevated rounded-xl h-96"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass-elevated border-red-500/30 bg-red-500/5">
        <div className="py-12 text-center px-4">
          <Ticket className="h-12 w-12 text-red-400/70 mx-auto mb-3" />
          <h3 className="font-fraunces text-xl font-bold text-white mb-2">
            Unable to Load Events
          </h3>
          <p className="text-neutral-400 text-sm">
            We couldn't fetch the event listings. Please try again later.
          </p>
        </div>
      </Card>
    );
  }

  if (allEvents.length === 0) {
    return (
      <Card className="glass-elevated border-copper-500/30">
        <div className="py-12 text-center px-4">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-copper-500/20 to-accent/20 mb-3">
            <Ticket className="h-10 w-10 text-copper-400" />
          </div>
          <h3 className="font-fraunces text-xl font-bold text-white mb-2">
            No Events Yet
          </h3>
          <p className="text-neutral-400 text-sm mb-5">
            Create your first ticketed event to start managing attendees.
          </p>
          <Link href="/tickets/organizer/events/new">
            <Button className="h-12 bg-gradient-to-r from-[hsl(27,78%,54%)] to-[hsl(18,84%,44%)] hover:from-[hsl(27,78%,58%)] hover:to-[hsl(18,84%,48%)] text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-[#c0580f]/30 border border-[#c0580f]/40 transition-all duration-300">
              <Ticket className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {allEvents.map((event) => {
        const minPrice = getMinPrice(event);
        const soldPercentage = getSoldPercentage(event);
        const totalAttendees = getTotalAttendees(event);
        const eventStatus = getEventStatus(event);
        const isOngoing = eventStatus === 'ongoing';
        const isEnded = eventStatus === 'ended';
        
        return (
          <Card 
            key={event.id}
            className={`glass-elevated overflow-hidden border ${
              isOngoing 
                ? 'border-copper-500/50 shadow-lg shadow-copper-500/10' 
                : isEnded
                ? 'border-neutral-600/30'
                : 'border-copper-500/20'
            } transition-all duration-300 hover:shadow-xl hover:shadow-copper-500/15 hover:border-copper-500/40`}
            data-testid={`manage-event-card-${event.slug}`}
          >
            {/* Mobile & Desktop: Compact Unified Layout */}
            <div className="flex flex-col md:grid md:grid-cols-5 md:gap-0">
              {/* 16:9 Cover Photo */}
              <div className="relative w-full md:col-span-2 aspect-[16/9] md:aspect-auto md:h-full md:min-h-[280px] overflow-hidden group">
                {event.coverUrl ? (
                  <>
                    <img 
                      src={event.coverUrl} 
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Minimal gradient only on bottom third */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 via-black/20 to-transparent md:hidden"></div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#c0580f]/30 via-[#d3541e]/20 to-black/60 flex items-center justify-center">
                    <Ticket className="h-16 w-16 md:h-20 md:w-20 text-copper-400/50" />
                  </div>
                )}
                {/* Status Badge */}
                {(isOngoing || isEnded) && (
                  <div className="absolute top-3 right-3">
                    {isOngoing && (
                      <Badge className="bg-gradient-to-r from-copper-500 to-copper-600 text-white shadow-lg shadow-copper-500/40 animate-pulse backdrop-blur-sm border border-copper-400/20 text-xs px-2.5 py-0.5">
                        ● LIVE
                      </Badge>
                    )}
                    {isEnded && (
                      <Badge className="bg-black/60 backdrop-blur-md border border-neutral-500/40 text-neutral-300 text-xs px-2.5 py-0.5">
                        ENDED
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Info Slab + Stats (Combined Column) */}
              <div className="md:col-span-2 p-4 space-y-3">
                {/* Title */}
                <h3 className="font-fraunces text-lg md:text-xl font-bold text-white leading-tight line-clamp-2">
                  {event.title}
                </h3>

                {/* Compact Metadata Grid */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-copper-500/20 border border-copper-500/20">
                      <Calendar className="h-3.5 w-3.5 text-copper-300" />
                    </div>
                    <span className="text-white/90 text-xs truncate">
                      {event.endAt && format(new Date(event.startAt), 'MMM d') !== format(new Date(event.endAt), 'MMM d')
                        ? `${format(new Date(event.startAt), 'MMM d')} – ${format(new Date(event.endAt), 'MMM d, yyyy')}`
                        : format(new Date(event.startAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-copper-500/20 border border-copper-500/20">
                      <Clock className="h-3.5 w-3.5 text-copper-300" />
                    </div>
                    <span className="text-white/90 text-xs truncate">
                      {format(new Date(event.startAt), 'h:mm a')}
                      {event.endAt && ` – ${format(new Date(event.endAt), 'h:mm a')}`}
                    </span>
                  </div>
                  {event.venue && (
                    <div className="col-span-full flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-copper-500/20 border border-copper-500/20">
                        <MapPin className="h-3.5 w-3.5 text-copper-300" />
                      </div>
                      <span className="text-white/90 text-xs truncate">
                        {event.venue}, {event.city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Compact Stats - Horizontal Scroll on Small Screens */}
                <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
                  <div className="flex-shrink-0 snap-start px-3 py-2 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20 min-w-[90px]">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-copper-300" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{totalAttendees}</span>
                        <span className="text-[10px] text-copper-300 uppercase tracking-wide">Attendees</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 snap-start px-3 py-2 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20 min-w-[90px]">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-copper-300" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{soldPercentage}%</span>
                        <span className="text-[10px] text-copper-300 uppercase tracking-wide">Sold</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 snap-start px-3 py-2 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20 min-w-[90px]">
                    <div className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5 text-copper-300" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">
                          {minPrice ? `$${(minPrice / 100).toFixed(0)}` : '-'}
                        </span>
                        <span className="text-[10px] text-copper-300 uppercase tracking-wide">From</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Column - Compact Mobile */}
              <div className="md:col-span-1 p-4 md:border-l md:border-copper-500/20 md:bg-gradient-to-br md:from-white/5 md:to-transparent space-y-2">
                {/* Primary Actions - Side by Side on Mobile >=360px */}
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-1 gap-2">
                  <Link href={`/tickets/organizer/events/${event.id}/attendees`}>
                    <Button 
                      className="w-full h-12 bg-gradient-to-r from-[hsl(27,78%,54%)] to-[hsl(18,84%,44%)] hover:from-[hsl(27,78%,58%)] hover:to-[hsl(18,84%,48%)] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#c0580f]/30 border border-[#c0580f]/30 transition-all duration-300 text-sm"
                      data-testid={`button-attendees-${event.slug}`}
                    >
                      <Users className="h-4 w-4 mr-1.5" />
                      <span className="hidden sm:inline">Manage Attendees</span>
                      <span className="sm:hidden">Attendees</span>
                    </Button>
                  </Link>

                  <Link href={`/tickets/organizer/events/${event.id}/checkin`}>
                    <Button 
                      className="w-full h-12 bg-gradient-to-r from-[hsl(168,68%,42%)] to-[hsl(168,74%,35%)] hover:from-[hsl(168,68%,46%)] hover:to-[hsl(168,74%,39%)] text-white font-semibold shadow-md hover:shadow-lg hover:shadow-[#17C0A9]/30 border border-[#17C0A9]/30 transition-all duration-300 text-sm"
                      data-testid={`button-checkin-${event.slug}`}
                    >
                      <QrCode className="h-4 w-4 mr-1.5" />
                      Check-in
                    </Button>
                  </Link>
                </div>

                {/* Secondary Actions - Compact Dropdown Menu */}
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline"
                        className="flex-1 h-10 border-copper-500/30 text-copper-200 hover:bg-copper-500/10 hover:text-white hover:border-copper-400/50 transition-all duration-300 text-xs"
                        data-testid={`button-more-actions-${event.slug}`}
                      >
                        <MoreVertical className="h-4 w-4 mr-1.5" />
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-elevated border-copper-500/30">
                      <DropdownMenuItem 
                        className="cursor-pointer text-white hover:bg-copper-500/10" 
                        data-testid={`menu-feature-${event.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          handleFeatureEvent(event);
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-2 text-copper-300" />
                        Feature Event
                      </DropdownMenuItem>
                      <Link href={`/tickets/organizer/events/${event.id}/analytics`}>
                        <DropdownMenuItem className="cursor-pointer text-white hover:bg-copper-500/10" data-testid={`menu-analytics-${event.slug}`}>
                          <BarChart3 className="h-4 w-4 mr-2 text-copper-300" />
                          Analytics
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/tickets/organizer/events/${event.id}/edit`}>
                        <DropdownMenuItem className="cursor-pointer text-white hover:bg-copper-500/10" data-testid={`menu-edit-${event.slug}`}>
                          <Edit3 className="h-4 w-4 mr-2 text-copper-300" />
                          Edit Event
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/tickets/event/${event.slug}`}>
                        <DropdownMenuItem className="cursor-pointer text-white hover:bg-copper-500/10" data-testid={`menu-view-${event.slug}`}>
                          <ExternalLink className="h-4 w-4 mr-2 text-copper-300" />
                          View Public Page
                        </DropdownMenuItem>
                      </Link>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
      
      {/* Feature Event Dialog */}
      <FeatureEventDialog
        open={featureDialogOpen}
        onOpenChange={setFeatureDialogOpen}
        organizerId={organizerId}
        communityId={communityId}
        subscriptionStatus={creditsData?.subscriptionStatus}
        selectedEventId={selectedEventForFeature}
        selectedEventData={selectedEventData}
        currentCredits={creditsData?.credits?.available || 0}
        creditsLoading={creditsLoading}
      />
    </div>
  );
}
