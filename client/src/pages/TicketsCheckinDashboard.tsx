import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Html5QrcodeScanner } from "html5-qrcode";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";
import { 
  QrCode, Users, CheckCircle2, XCircle, Clock, Search, 
  Download, RefreshCw, Camera, Volume2, VolumeX,
  UserCheck, AlertCircle, TrendingUp, X, Flashlight, CameraOff,
  List, ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CheckInStats {
  totalTickets: number;
  checkedIn: number;
  remaining: number;
  recentCheckIns: Array<{
    id: string;
    serial: string;
    usedAt: string;
    scannedBy: string;
    tierName: string;
    buyerName: string;
    buyerEmail: string;
  }>;
}

interface Attendee {
  ticketId: string;
  serial: string;
  qrToken: string;
  status: string;
  checkedInAt?: string;
  scannedBy?: string;
  tierName: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
  placedAt: string;
}

export function TicketsCheckinDashboard() {
  const [, params] = useRoute("/tickets/organizer/events/:eventId/checkin");
  const [, navigate] = useLocation();
  const eventId = params?.eventId;
  const { toast } = useToast();
  
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualSearch, setManualSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lastScannedTicket, setLastScannedTicket] = useState<any>(null);
  const [showManualSheet, setShowManualSheet] = useState(false);
  const [isMobileFullScreen, setIsMobileFullScreen] = useState(false);
  
  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ['/api/tickets/events', eventId],
    enabled: !!eventId
  });
  
  // Fetch check-in statistics
  const { data: stats, refetch: refetchStats } = useQuery<{ stats: CheckInStats }>({
    queryKey: ['/api/tickets/events', eventId, 'checkin-stats'],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/events/${eventId}/checkin-stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!eventId,
    refetchInterval: 5000 // Auto-refresh every 5 seconds
  });
  
  // Fetch attendees list - fetch when needed
  const { data: attendeesData, refetch: refetchAttendees, isLoading: attendeesLoading } = useQuery<{ attendees: Attendee[] }>({
    queryKey: ['/api/tickets/events', eventId, 'attendees', filterStatus, manualSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (manualSearch) params.append('search', manualSearch);
      
      const response = await fetch(`/api/tickets/events/${eventId}/attendees?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 10000 // Cache for 10 seconds
  });
  
  // Validate ticket mutation
  const validateMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      const response = await apiRequest('POST', '/api/tickets/validate-qr', { qrToken, eventId });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        setLastScannedTicket(data.ticket);
        playSound('success');
      } else {
        playSound('error');
        toast({
          title: "Validation Failed",
          description: data.error || "Invalid ticket",
          variant: "destructive"
        });
      }
    }
  });
  
  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      const response = await apiRequest('POST', '/api/tickets/check-in', { qrToken, eventId, checkInBy: 'staff' });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        playSound('checkin');
        toast({
          title: "Check-in Successful",
          description: "Attendee has been checked in"
        });
        refetchStats();
        refetchAttendees();
        setLastScannedTicket(null);
      } else {
        playSound('error');
        toast({
          title: "Check-in Failed",
          description: data.error || "Failed to check in ticket",
          variant: "destructive"
        });
      }
    }
  });
  
  // Body scroll lock effect for mobile full-screen
  useEffect(() => {
    if (isMobileFullScreen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      };
    }
  }, [isMobileFullScreen]);
  
  // QR Scanner setup
  useEffect(() => {
    if (!scannerEnabled) {
      setIsMobileFullScreen(false);
      return;
    }
    
    // Detect mobile and enable full-screen mode
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setIsMobileFullScreen(true);
    }
    
    let scanner: Html5QrcodeScanner | null = null;
    
    // Wait for DOM element to be ready
    const initScanner = () => {
      const element = document.getElementById("qr-reader");
      if (!element) {
        console.log('[Scanner] Element not found, retrying...');
        return false;
      }
      
      try {
        console.log('[Scanner] Initializing scanner...');
        
        // Calculate optimal QR box size based on screen width
        const qrboxSize = isMobile 
          ? Math.min(window.innerWidth * 0.75, 300) // 75% of screen width on mobile, max 300px
          : 280; // Fixed 280px on desktop
        
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: isMobile ? 5 : 10, // Reduced FPS on mobile for better performance
            qrbox: { width: qrboxSize, height: qrboxSize },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true,
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: isMobile ? 1280 : 1920 }, // Lower resolution on mobile
              height: { ideal: isMobile ? 720 : 1080 }
            }
          },
          false
        );
        
        scanner.render(
          (decodedText) => {
            console.log('[Scanner] QR code detected:', decodedText);
            // Only pause if we successfully validate
            validateMutation.mutate(decodedText, {
              onSuccess: (data) => {
                if (data.ok) {
                  scanner?.pause();
                  setTimeout(() => {
                    try {
                      scanner?.resume();
                    } catch (e) {
                      // Scanner might be cleared
                    }
                  }, 3000);
                }
              }
            });
          },
          (error) => {
            // Ignore scan errors (common when camera is moving)
          }
        );
        
        console.log('[Scanner] Scanner initialized successfully');
        return true;
      } catch (error) {
        console.error('[Scanner] Error initializing scanner:', error);
        toast({
          title: "Scanner Error",
          description: "Failed to initialize scanner. Please try again.",
          variant: "destructive"
        });
        return false;
      }
    };
    
    // Try to initialize with retries
    let attempts = 0;
    const maxAttempts = 10;
    const timer = setInterval(() => {
      attempts++;
      if (initScanner() || attempts >= maxAttempts) {
        clearInterval(timer);
        if (attempts >= maxAttempts) {
          console.error('[Scanner] Failed to initialize after', maxAttempts, 'attempts');
          toast({
            title: "Scanner Error",
            description: "Could not start scanner. Please refresh the page.",
            variant: "destructive"
          });
        }
      }
    }, 100); // Try every 100ms
    
    return () => {
      clearInterval(timer);
      if (scanner) {
        try {
          scanner.clear();
          console.log('[Scanner] Scanner cleared');
        } catch (e) {
          console.log('[Scanner] Error clearing scanner:', e);
        }
      }
    };
  }, [scannerEnabled, eventId]);
  
  // Sound effects
  const playSound = (type: 'success' | 'error' | 'checkin') => {
    if (!soundEnabled) return;
    
    const audio = new Audio();
    switch (type) {
      case 'success':
        // Simple success beep
        audio.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoMAAD/////';
        break;
      case 'error':
        // Error buzz
        audio.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoMAACA';
        break;
      case 'checkin':
        // Check-in chime
        audio.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoMAAD/////';
        break;
    }
    audio.play().catch(() => {});
  };
  
  // Export attendees
  const handleExport = () => {
    window.open(`/api/tickets/events/${eventId}/attendees/export`, '_blank');
  };
  
  const progressPercentage = stats?.stats ? (stats.stats.checkedIn / stats.stats.totalTickets) * 100 : 0;
  
  if (!eventId) return null;
  
  const eventTitle = (event as any)?.event?.title || 'Event';
  
  return (
    <>
      <Helmet>
        <title>Check-in Dashboard - {eventTitle} | Jugnu</title>
        <meta name="description" content={`QR code scanner and manual check-in dashboard for ${eventTitle}`} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-fraunces mb-2">Check-in Dashboard</h1>
              <p className="text-muted-foreground">{eventTitle}</p>
            </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSoundEnabled(!soundEnabled)}
              size="icon"
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetchStats();
                refetchAttendees();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stats?.totalTickets || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Checked In</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.stats?.checkedIn || 0}
              </div>
              <Progress value={progressPercentage} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stats?.remaining || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {progressPercentage.toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="scanner" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 bg-[#0B0B0F]/80 backdrop-blur-sm border border-white/10 rounded-xl gap-1.5">
            <TabsTrigger 
              value="scanner"
              className="h-12 md:h-14 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c0580f] data-[state=active]:to-[#d3541e] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#c0580f]/30 data-[state=inactive]:text-white/60 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-white/5 font-medium text-sm md:text-base"
            >
              QR Scanner
            </TabsTrigger>
            <TabsTrigger 
              value="manual"
              className="h-12 md:h-14 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c0580f] data-[state=active]:to-[#d3541e] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#c0580f]/30 data-[state=inactive]:text-white/60 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-white/5 font-medium text-sm md:text-base"
            >
              Manual Check-in
            </TabsTrigger>
            <TabsTrigger 
              value="recent"
              className="h-12 md:h-14 rounded-lg transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#c0580f] data-[state=active]:to-[#d3541e] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#c0580f]/30 data-[state=inactive]:text-white/60 data-[state=inactive]:hover:text-white/90 data-[state=inactive]:hover:bg-white/5 font-medium text-sm md:text-base"
            >
              Recent Activity
            </TabsTrigger>
          </TabsList>
          
          {/* QR Scanner Tab */}
          <TabsContent value="scanner" className="space-y-4">
            {!scannerEnabled ? (
              <Card className="border-[#c0580f]/20 bg-gradient-to-br from-[#0B0B0F] to-[#1a1a1f] overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative min-h-[500px] md:min-h-[500px] flex flex-col items-center justify-center p-8 md:p-12">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#c0580f]/5 via-transparent to-[#17C0A9]/5 animate-pulse" />
                    
                    {/* Content */}
                    <div className="relative z-10 text-center space-y-8 max-w-md mx-auto w-full">
                      {/* Animated camera icon */}
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#c0580f] to-[#d3541e] rounded-full blur-3xl opacity-40 animate-pulse" />
                        <div className="relative bg-gradient-to-br from-[#c0580f]/20 to-[#d3541e]/20 p-10 md:p-12 rounded-full border-2 border-[#c0580f]/30 backdrop-blur-sm">
                          <Camera className="h-20 w-20 md:h-24 md:w-24 text-[#c0580f]" />
                        </div>
                      </div>
                      
                      {/* Title and description */}
                      <div className="space-y-3">
                        <h3 className="text-3xl md:text-4xl font-fraunces text-white">
                          QR Code Scanner
                        </h3>
                        <p className="text-white/70 text-base md:text-lg">
                          Scan attendee tickets for instant check-in
                        </p>
                      </div>
                      
                      {/* Start button - Large touch target */}
                      <Button
                        onClick={() => {
                          // Detect mobile and set full-screen state immediately
                          const isMobile = window.innerWidth < 768;
                          setIsMobileFullScreen(isMobile);
                          setScannerEnabled(true);
                        }}
                        size="lg"
                        data-testid="button-start-scanner"
                        className="w-full h-16 md:h-18 text-lg md:text-xl font-medium bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white shadow-lg shadow-[#c0580f]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#c0580f]/40 hover:scale-[1.02] touch-target"
                      >
                        <Camera className="h-7 w-7 mr-3" />
                        Start Scanner
                      </Button>
                      
                      {/* Instructions */}
                      <div className="flex items-start gap-4 p-5 md:p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
                        <AlertCircle className="h-6 w-6 text-[#17C0A9] flex-shrink-0 mt-0.5" />
                        <div className="text-sm md:text-base text-white/70 space-y-2">
                          <p className="font-medium text-white/90">Before you start:</p>
                          <p>• Allow camera access when prompted</p>
                          <p>• Hold steady and point at the QR code</p>
                          <p>• Works best in good lighting</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Mobile Full-Screen Scanner Container */}
                {isMobileFullScreen ? (
                  <div 
                    className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-300"
                    style={{ 
                      height: '100dvh',
                      paddingTop: 'env(safe-area-inset-top, 0px)',
                      paddingBottom: 'env(safe-area-inset-bottom, 0px)'
                    }}
                  >
                    {/* Dimmed Backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/90 to-black/95" />
                    
                    {/* Top Control Bar - Premium Frosted Capsules */}
                    <div 
                      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent"
                      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
                    >
                      <Button
                        onClick={() => setScannerEnabled(false)}
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl text-white border-2 border-white/30 hover:border-white/50 shadow-2xl shadow-black/50 transition-all duration-300 hover:scale-105"
                        data-testid="button-close-scanner-mobile"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                      
                      <div className="flex-1 mx-4 text-center">
                        <p className="text-white font-fraunces font-semibold text-base line-clamp-1 drop-shadow-2xl">
                          {eventTitle}
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => {
                          setSoundEnabled(!soundEnabled);
                          toast({
                            title: soundEnabled ? "Sound Off" : "Sound On",
                            duration: 1000
                          });
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xl text-white border-2 border-white/30 hover:border-white/50 shadow-2xl shadow-black/50 transition-all duration-300 hover:scale-105"
                        data-testid="button-toggle-sound-mobile"
                      >
                        {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    {/* Bottom Manual Check-in Sheet Trigger - Compact Pill */}
                    <div 
                      className="fixed left-1/2 -translate-x-1/2 z-50 md:hidden animate-in slide-in-from-bottom-4 duration-500" 
                      style={{ 
                        bottom: 'max(env(safe-area-inset-bottom, 0px) + 16px, 24px)',
                        animationDelay: '0.3s' 
                      }}
                    >
                      <Sheet open={showManualSheet} onOpenChange={setShowManualSheet}>
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-11 px-5 rounded-full bg-gradient-to-r from-black/70 to-black/60 backdrop-blur-2xl hover:from-black/90 hover:to-black/80 text-white border-2 border-white/40 hover:border-[#c0580f]/60 shadow-2xl shadow-black/60 transition-all duration-300 hover:scale-105 font-inter font-medium text-sm touch-target"
                            data-testid="button-open-manual-mobile"
                          >
                            <List className="h-4 w-4 mr-2" />
                            Manual Check-in
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[90dvh] max-h-[90dvh] bg-[#0B0B0F] border-t-2 border-[#c0580f]/30 flex flex-col">
                          <SheetHeader className="text-left mb-4 flex-shrink-0">
                            <SheetTitle className="text-white font-fraunces text-2xl">Manual Check-in</SheetTitle>
                            <SheetDescription className="text-white/60">
                              Search for attendees by name, email, or serial number
                            </SheetDescription>
                          </SheetHeader>
                          
                          {/* Manual check-in content */}
                          <div className="flex-1 flex flex-col min-h-0 space-y-4">
                            <div className="flex gap-2 flex-shrink-0">
                              <div className="flex-1">
                                <Input
                                  placeholder="Search by name, email, or serial..."
                                  value={manualSearch}
                                  onChange={(e) => setManualSearch(e.target.value)}
                                  className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                                  data-testid="input-manual-search-mobile"
                                  autoFocus={false}
                                  inputMode="search"
                                />
                              </div>
                              <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-32 h-12 bg-white/5 border-white/20 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All</SelectItem>
                                  <SelectItem value="checked_in">Checked In</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
                              {attendeesLoading ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="text-white/60">Loading attendees...</div>
                                </div>
                              ) : !attendeesData?.attendees || attendeesData.attendees.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                  <div className="text-white/60">
                                    {manualSearch ? 'No attendees found matching your search' : 'No attendees found'}
                                  </div>
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                      <TableHead className="text-white/70">Name</TableHead>
                                      <TableHead className="text-white/70">Tier</TableHead>
                                      <TableHead className="text-white/70">Status</TableHead>
                                      <TableHead className="text-white/70">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {attendeesData.attendees.map((attendee) => (
                                      <TableRow key={attendee.ticketId} className="border-white/10">
                                        <TableCell>
                                          <div>
                                            <p className="font-medium text-white">{attendee.buyerName}</p>
                                            <p className="text-xs text-white/50">{attendee.buyerEmail}</p>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-white/80">{attendee.tierName}</TableCell>
                                        <TableCell>
                                          {attendee.status === 'used' ? (
                                            <Badge variant="outline" className="bg-[#17C0A9]/20 text-[#17C0A9] border-[#17C0A9]/30">
                                              Checked In
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                                              Pending
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {attendee.status !== 'used' && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                checkinMutation.mutate(attendee.qrToken);
                                                setShowManualSheet(false);
                                              }}
                                              disabled={checkinMutation.isPending}
                                              className="bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f]"
                                              data-testid={`button-checkin-mobile-${attendee.serial}`}
                                            >
                                              Check In
                                            </Button>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </ScrollArea>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                    
                    {/* Camera Viewport - Properly Centered with Premium Styling */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center z-10"
                      style={{
                        paddingTop: 'max(env(safe-area-inset-top, 0px) + 64px, 80px)',
                        paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 80px, 96px)',
                        paddingLeft: '20px',
                        paddingRight: '20px'
                      }}
                    >
                      <div 
                        className="relative w-full max-w-md mx-auto animate-in fade-in duration-500"
                        style={{ 
                          aspectRatio: '1',
                          maxHeight: '100%',
                          animation: 'scale-in 0.4s ease-out'
                        }}
                      >
                        {/* QR Reader Container with Glassmorphism & Copper Glow */}
                        <div className="relative bg-gradient-to-br from-black/70 via-black/60 to-black/70 rounded-3xl overflow-hidden border-3 border-[#c0580f]/50 shadow-2xl w-full h-full flex items-center justify-center scanner-viewport-glow backdrop-blur-xl">
                          {/* Animated Scanning Sweep Line */}
                          <div className="scanner-sweep-line" />
                          
                          {/* Camera Feed */}
                          <div id="qr-reader" className="w-full h-full" />
                          
                          {/* Corner brackets - Premium Copper Gradient - Properly positioned */}
                          <div className="absolute top-4 left-4 w-16 h-16 border-t-[4px] border-l-[4px] border-white rounded-tl-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s' }} />
                          <div className="absolute top-4 right-4 w-16 h-16 border-t-[4px] border-r-[4px] border-white rounded-tr-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-[4px] border-l-[4px] border-white rounded-bl-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-[4px] border-r-[4px] border-white rounded-br-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s', animationDelay: '1.5s' }} />
                          
                          {/* Scanning status badge - Compact Design */}
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#c0580f]/40 to-[#d3541e]/40 backdrop-blur-2xl border-2 border-[#c0580f]/70 shadow-2xl shadow-[#c0580f]/30">
                              <div className="w-2 h-2 bg-gradient-to-br from-[#c0580f] to-[#d3541e] rounded-full animate-pulse shadow-lg shadow-[#c0580f]/50" />
                              <span className="text-xs font-fraunces font-semibold text-white tracking-wider uppercase">Scanning...</span>
                            </div>
                          </div>
                          
                          {/* Scan instruction - Compact & Glassmorphism */}
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-3 max-w-[90%]">
                            <p className="text-white text-center text-xs font-medium bg-black/70 backdrop-blur-lg px-4 py-2 rounded-full border-2 border-white/30 shadow-xl">
                              <span className="font-inter">Position QR code within frame</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Last Scanned Ticket - Mobile Overlay */}
                    {lastScannedTicket && (
                      <div 
                        className="absolute left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300"
                        style={{ 
                          bottom: 'max(env(safe-area-inset-bottom, 0px) + 72px, 88px)' 
                        }}
                      >
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#17C0A9]/20 to-[#17C0A9]/10 backdrop-blur-2xl border-2 border-[#17C0A9]/60 shadow-2xl">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-[#17C0A9]/20 rounded-xl">
                              <CheckCircle2 className="h-6 w-6 text-[#17C0A9]" />
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-base text-white mb-0.5">{lastScannedTicket.buyerName}</p>
                              <p className="text-xs text-white/80">{lastScannedTicket.tierName} • {lastScannedTicket.serial}</p>
                            </div>
                          </div>
                          <Button
                            onClick={() => checkinMutation.mutate(lastScannedTicket.qrToken)}
                            disabled={checkinMutation.isPending}
                            className="w-full h-11 bg-gradient-to-r from-[#17C0A9] to-[#17C0A9]/90 hover:from-[#17C0A9]/95 hover:to-[#17C0A9]/85 text-white font-bold shadow-lg"
                            data-testid="button-confirm-checkin-mobile"
                          >
                            {checkinMutation.isPending ? 'Checking in...' : 'Confirm Check-in'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Desktop Scanner Card */}
                    <Card className="border-[#c0580f]/30 bg-[#0B0B0F] overflow-hidden">
                      <CardContent className="p-6">
                        <div className="relative">
                          <div className="relative rounded-2xl overflow-hidden border-2 border-[#c0580f]/50 shadow-lg shadow-[#c0580f]/20">
                            <div className="relative bg-black/90 min-h-[500px] flex items-center justify-center">
                              <div id="qr-reader" className="w-full h-full" />
                            </div>
                            
                            {/* Scanning animation overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#c0580f] to-transparent animate-pulse" />
                              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-[#17C0A9] to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </div>
                            
                            {/* Corner indicators */}
                            <div className="absolute top-6 left-6 w-10 h-10 border-t-4 border-l-4 border-[#c0580f] rounded-tl-xl" />
                            <div className="absolute top-6 right-6 w-10 h-10 border-t-4 border-r-4 border-[#c0580f] rounded-tr-xl" />
                            <div className="absolute bottom-6 left-6 w-10 h-10 border-b-4 border-l-4 border-[#c0580f] rounded-bl-xl" />
                            <div className="absolute bottom-6 right-6 w-10 h-10 border-b-4 border-r-4 border-[#c0580f] rounded-br-xl" />
                            
                            {/* Scanning status badge */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
                              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[#c0580f]/20 backdrop-blur-md border-2 border-[#c0580f]/50 shadow-lg">
                                <div className="w-2.5 h-2.5 bg-[#c0580f] rounded-full animate-pulse" />
                                <span className="text-sm font-semibold text-white">Scanning...</span>
                              </div>
                            </div>
                            
                            {/* Scan instruction */}
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 text-center px-4">
                              <p className="text-white/90 text-sm font-medium bg-black/50 backdrop-blur-sm px-6 py-3 rounded-lg">
                                Position QR code within frame
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Desktop Control buttons */}
                        <div className="mt-6">
                          <div className="flex gap-3 max-w-lg mx-auto">
                            <Button
                              onClick={() => setScannerEnabled(false)}
                              variant="outline"
                              className="flex-1 h-12 text-sm font-medium border-white/20 hover:bg-white/5 hover:border-white/30"
                              data-testid="button-stop-scanner"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Stop Scanner
                            </Button>
                            <Button
                              onClick={() => setSoundEnabled(!soundEnabled)}
                              variant="outline"
                              className="h-12 w-12 border-white/20 hover:bg-white/5 hover:border-white/30"
                              data-testid="button-toggle-sound-scanner"
                            >
                              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                
                    {/* Desktop: Last Scanned Ticket - Premium Design */}
                    {lastScannedTicket && (
                      <Card className="border-[#17C0A9]/30 bg-gradient-to-br from-[#17C0A9]/5 to-transparent animate-in slide-in-from-bottom-4 duration-300">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Success header */}
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#17C0A9]/20 rounded-full">
                                <CheckCircle2 className="h-6 w-6 text-[#17C0A9]" />
                              </div>
                              <div>
                                <p className="font-semibold text-lg text-white">Valid Ticket Detected</p>
                                <p className="text-sm text-white/60">Ready to check in</p>
                              </div>
                            </div>
                            
                            {/* Ticket details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                              <div>
                                <p className="text-xs text-white/50 mb-1">Name</p>
                                <p className="font-medium text-white">{lastScannedTicket.buyerName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-white/50 mb-1">Ticket Tier</p>
                                <p className="font-medium text-white">{lastScannedTicket.tierName}</p>
                              </div>
                              <div>
                                <p className="text-xs text-white/50 mb-1">Serial</p>
                                <p className="font-medium text-white font-mono text-sm">{lastScannedTicket.serial}</p>
                              </div>
                            </div>
                            
                            {/* Confirm button */}
                            <Button
                              onClick={() => checkinMutation.mutate(lastScannedTicket.qrToken)}
                              className="w-full h-14 text-base font-medium bg-gradient-to-r from-[#17C0A9] to-[#15a890] hover:from-[#15a890] hover:to-[#17C0A9] text-white shadow-lg shadow-[#17C0A9]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#17C0A9]/40"
                              disabled={checkinMutation.isPending}
                              data-testid="button-confirm-checkin"
                            >
                              <UserCheck className="h-5 w-5 mr-2" />
                              {checkinMutation.isPending ? "Checking in..." : "Confirm Check-in"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          {/* Manual Check-in Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card className="border-[#c0580f]/20 bg-[#0B0B0F]">
              <CardHeader className="pb-4">
                <CardTitle className="text-white font-fraunces">Manual Check-in</CardTitle>
                <CardDescription className="text-white/60">
                  Search and check in attendees by name, email, or ticket ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filters - Mobile Optimized */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, email, or ticket ID..."
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      className="h-12 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                      data-testid="input-manual-search"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="h-12 flex-1 md:w-[180px] bg-white/5 border-white/20 text-white" data-testid="select-filter-status">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tickets</SelectItem>
                        <SelectItem value="valid">Not Checked In</SelectItem>
                        <SelectItem value="used">Checked In</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleExport} variant="outline" className="h-12 hidden md:flex border-white/20 hover:bg-white/5" data-testid="button-export">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button onClick={handleExport} variant="outline" size="icon" className="h-12 w-12 md:hidden border-white/20 hover:bg-white/5" data-testid="button-export-mobile">
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                {/* Mobile: Card Layout */}
                <div className="md:hidden space-y-3">
                  <ScrollArea className="h-[calc(100vh-400px)]">
                    {attendeesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-white/60">Loading attendees...</div>
                      </div>
                    ) : !attendeesData?.attendees || attendeesData.attendees.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center text-white/60">
                          <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                          <p>{manualSearch ? 'No attendees found matching your search' : 'No attendees found'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 pb-4">
                        {attendeesData.attendees.map((attendee) => (
                          <div 
                            key={attendee.ticketId}
                            className="glass-card p-4 rounded-xl border border-[#c0580f]/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm"
                          >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold text-base mb-1 truncate">{attendee.buyerName || 'N/A'}</h3>
                                <p className="text-white/50 text-sm truncate">{attendee.buyerEmail}</p>
                              </div>
                              <Badge 
                                variant={attendee.status === 'used' ? 'default' : 'outline'}
                                className={attendee.status === 'used' 
                                  ? 'bg-[#17C0A9]/20 text-[#17C0A9] border-[#17C0A9]/30 ml-2' 
                                  : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 ml-2'
                                }
                              >
                                {attendee.status === 'used' ? 'Checked In' : 'Pending'}
                              </Badge>
                            </div>
                            
                            {/* Details */}
                            <div className="flex items-center justify-between text-sm mb-3">
                              <div className="text-white/70">
                                <span className="text-white/50">Tier:</span> {attendee.tierName}
                              </div>
                              <div className="text-white/70">
                                {attendee.checkedInAt 
                                  ? format(new Date(attendee.checkedInAt), 'MMM dd, HH:mm')
                                  : <span className="text-white/40">Not checked in</span>
                                }
                              </div>
                            </div>
                            
                            {/* Action */}
                            {attendee.status !== 'used' && (
                              <Button
                                onClick={() => checkinMutation.mutate(attendee.qrToken)}
                                disabled={checkinMutation.isPending}
                                className="w-full h-11 bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white font-medium shadow-lg"
                                data-testid={`button-checkin-${attendee.ticketId}`}
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Check In
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
                
                {/* Desktop: Table Layout */}
                <div className="hidden md:block">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-white/70">Name</TableHead>
                          <TableHead className="text-white/70">Email</TableHead>
                          <TableHead className="text-white/70">Tier</TableHead>
                          <TableHead className="text-white/70">Status</TableHead>
                          <TableHead className="text-white/70">Check-in Time</TableHead>
                          <TableHead className="text-white/70">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendeesData?.attendees?.map((attendee) => (
                          <TableRow key={attendee.ticketId} className="border-white/10">
                            <TableCell className="text-white">{attendee.buyerName || 'N/A'}</TableCell>
                            <TableCell className="text-white/80">{attendee.buyerEmail}</TableCell>
                            <TableCell className="text-white/80">{attendee.tierName}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={attendee.status === 'used' ? 'default' : 'outline'}
                                className={attendee.status === 'used' 
                                  ? 'bg-[#17C0A9]/20 text-[#17C0A9] border-[#17C0A9]/30' 
                                  : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                                }
                              >
                                {attendee.status === 'used' ? 'Checked In' : 'Not Checked In'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white/70">
                              {attendee.checkedInAt 
                                ? format(new Date(attendee.checkedInAt), 'MMM dd, HH:mm')
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              {attendee.status !== 'used' && (
                                <Button
                                  size="sm"
                                  onClick={() => checkinMutation.mutate(attendee.qrToken)}
                                  disabled={checkinMutation.isPending}
                                  className="bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f]"
                                  data-testid={`button-checkin-${attendee.ticketId}`}
                                >
                                  Check In
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Recent Activity Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
                <CardDescription>
                  Last 10 attendees checked in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {stats?.stats?.recentCheckIns?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No check-ins yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats?.stats?.recentCheckIns?.map((checkin, index) => (
                        <div key={checkin.id} className="flex items-center justify-between pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{checkin.buyerName}</p>
                              <p className="text-sm text-muted-foreground">
                                {checkin.tierName} • {checkin.buyerEmail}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground text-right">
                            {format(new Date(checkin.usedAt), 'HH:mm:ss')}
                            <br />
                            <span className="text-xs">by {checkin.scannedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}