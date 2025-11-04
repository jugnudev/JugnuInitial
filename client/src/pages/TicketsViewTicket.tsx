import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  CalendarDays, 
  MapPin, 
  Download, 
  QrCode,
  Mail,
  Share2,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  RefreshCw,
  ExternalLink,
  Navigation,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import type { TicketsTicket, TicketsOrder, TicketsEvent, TicketsTier } from '@shared/schema';

interface TicketDetails extends TicketsTicket {
  order: TicketsOrder;
  event: TicketsEvent;
  tier: TicketsTier;
}

export default function TicketsViewTicket() {
  const [match, params] = useRoute('/tickets/view/:ticketId');
  const [, setLocation] = useLocation();
  const ticketId = params?.ticketId;
  
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showFullQr, setShowFullQr] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Fetch ticket details
  const { data: ticket, isLoading, error } = useQuery<TicketDetails>({
    queryKey: ['/api/tickets', ticketId],
    enabled: !!ticketId,
  });

  // Generate QR code
  useEffect(() => {
    if (ticket?.ticketCode) {
      QRCode.toDataURL(ticket.ticketCode, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('Error generating QR code:', err);
      });
    }
  }, [ticket?.ticketCode]);

  // Resend email mutation
  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/tickets/${ticketId}/email`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    }
  });

  // Download ticket
  const handleDownloadTicket = async () => {
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

  // Share ticket
  const handleShare = async () => {
    const shareData = {
      title: `Ticket for ${ticket?.event.name}`,
      text: `Check out my ticket for ${ticket?.event.name} on ${format(new Date(ticket?.event.startDate || ''), 'PPP')}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying URL
        await navigator.clipboard.writeText(window.location.href);
        alert('Ticket link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Add to calendar
  const handleAddToCalendar = () => {
    if (!ticket) return;
    
    const startDate = new Date(ticket.event.startDate);
    const endDate = ticket.event.endDate ? new Date(ticket.event.endDate) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Default 3 hours
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Jugnu//Event Ticket//EN',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace('.000', '')}`,
      `SUMMARY:${ticket.event.name}`,
      `DESCRIPTION:${ticket.event.description?.replace(/\n/g, '\\n') || ''}`,
      `LOCATION:${ticket.event.venue || ''}`,
      `UID:${ticket.id}@jugnu.app`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticket.event.slug}.ics`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Get directions
  const handleGetDirections = () => {
    if (ticket?.event.venue) {
      const query = encodeURIComponent(ticket.event.venue);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
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
    return <Badge variant={config.variant} className="text-lg px-3 py-1">{config.label}</Badge>;
  };

  if (!match) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-red-600 mb-4">Error loading ticket. Please try again.</p>
            <Button onClick={() => setLocation('/my-tickets')}>
              Back to My Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setLocation('/my-tickets')}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to My Tickets
      </Button>

      {/* Main Ticket Card */}
      <Card className="overflow-hidden">
        {/* Event Header with Image */}
        {ticket.event.coverImage && (
          <div className="h-48 md:h-64 w-full">
            <img
              src={ticket.event.coverImage}
              alt={ticket.event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{ticket.event.name}</CardTitle>
              <CardDescription className="mt-2 text-base">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  {format(new Date(ticket.event.startDate), 'PPPP')}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-5 w-5" />
                  {format(new Date(ticket.event.startDate), 'p')}
                  {ticket.event.endDate && ` - ${format(new Date(ticket.event.endDate), 'p')}`}
                </div>
                {ticket.event.venue && (
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-5 w-5" />
                    {ticket.event.venue}
                  </div>
                )}
              </CardDescription>
            </div>
            {getStatusBadge(ticket.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* QR Code Section */}
          <div className="text-center">
            <div className="bg-white p-6 rounded-lg border-2 border-dashed inline-block">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="Ticket QR Code"
                  className="w-48 h-48 cursor-pointer"
                  onClick={() => setShowFullQr(true)}
                  data-testid="qr-code"
                />
              )}
              <p className="font-mono text-lg mt-3">{ticket.ticketCode}</p>
              <p className="text-sm text-muted-foreground mt-1">Click to enlarge</p>
            </div>
          </div>

          <Separator />

          {/* Ticket Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Type</p>
              <p className="text-lg font-medium">{ticket.tier.name}</p>
            </div>
            {ticket.seatNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Seat Number</p>
                <p className="text-lg font-medium">{ticket.seatNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono">{ticket.order.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Purchase Date</p>
              <p>{format(new Date(ticket.order.createdAt), 'PP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Buyer Email</p>
              <p>{ticket.order.buyerEmail}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-lg font-medium">
                ${((ticket.order.totalAmountCents || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownloadTicket}
              variant="default"
              data-testid="button-download"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Ticket
            </Button>
            
            <Button
              onClick={() => resendEmailMutation.mutate()}
              variant="outline"
              disabled={resendEmailMutation.isPending}
              data-testid="button-resend"
            >
              {emailSent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Email Sent!
                </>
              ) : resendEmailMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Email
                </>
              )}
            </Button>

            <Button
              onClick={handleAddToCalendar}
              variant="outline"
              data-testid="button-calendar"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              data-testid="button-share"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>

            {ticket.event.venue && (
              <Button
                onClick={handleGetDirections}
                variant="outline"
                data-testid="button-directions"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
            )}

            <Button
              onClick={() => setLocation(`/events/${ticket.event.slug}`)}
              variant="ghost"
              data-testid="button-event-details"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Event Details
            </Button>
          </div>

          {/* Important Information */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Important Information
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Present this ticket at the venue entrance for scanning</li>
                <li>• Each ticket can only be scanned once</li>
                <li>• Screenshot or photo of this ticket is valid for entry</li>
                {ticket.tier.description && (
                  <li>• {ticket.tier.description}</li>
                )}
                {ticket.event.venue && (
                  <li>• Venue: {ticket.event.venue}</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Full Screen QR Code Dialog */}
      <Dialog open={showFullQr} onOpenChange={setShowFullQr}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket QR Code</DialogTitle>
            <DialogDescription>
              Show this code at the venue entrance
            </DialogDescription>
          </DialogHeader>
          <div className="text-center p-6">
            {qrCodeUrl && (
              <img
                src={qrCodeUrl}
                alt="Ticket QR Code"
                className="w-full max-w-sm mx-auto"
              />
            )}
            <p className="font-mono text-xl mt-4">{ticket.ticketCode}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Ticket for {ticket.tier.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}