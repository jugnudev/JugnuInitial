import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { 
  QrCode, Users, CheckCircle2, XCircle, Clock, Search, 
  Download, RefreshCw, Camera, Volume2, VolumeX,
  UserCheck, AlertCircle, TrendingUp, X, Square
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
  
  // Fetch attendees list
  const { data: attendeesData, refetch: refetchAttendees } = useQuery<{ attendees: Attendee[] }>({
    queryKey: ['/api/tickets/events', eventId, 'attendees', filterStatus, manualSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (manualSearch) params.append('search', manualSearch);
      
      const response = await fetch(`/api/tickets/events/${eventId}/attendees?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!eventId
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
  
  // QR Scanner setup with Html5Qrcode (manual control)
  useEffect(() => {
    console.log('[Scanner] useEffect triggered, scannerEnabled:', scannerEnabled);
    
    if (!scannerEnabled) {
      console.log('[Scanner] Scanner not enabled, returning');
      return;
    }
    
    console.log('[Scanner] Setting up Html5Qrcode scanner...');
    
    let html5QrCode: Html5Qrcode | null = null;
    
    const startScanner = async () => {
      try {
        const element = document.getElementById('qr-reader');
        console.log('[Scanner] qr-reader element:', element);
        
        if (!element) {
          console.error('[Scanner] ERROR: qr-reader element not found!');
          return;
        }
        
        console.log('[Scanner] Creating Html5Qrcode instance...');
        html5QrCode = new Html5Qrcode("qr-reader");
        
        console.log('[Scanner] Starting camera...');
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            console.log('[Scanner] QR code scanned:', decodedText);
            validateMutation.mutate(decodedText, {
              onSuccess: (data) => {
                console.log('[Scanner] Validation response:', data);
              }
            });
          },
          (error) => {
            // Ignore scan errors silently
          }
        );
        
        console.log('[Scanner] Camera started successfully!');
      } catch (error) {
        console.error('[Scanner] Error starting scanner:', error);
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please check permissions.",
          variant: "destructive"
        });
      }
    };
    
    startScanner();
    
    return () => {
      console.log('[Scanner] Cleanup - stopping scanner');
      if (html5QrCode) {
        html5QrCode.stop().then(() => {
          console.log('[Scanner] Scanner stopped');
        }).catch((err) => {
          console.error('[Scanner] Error stopping scanner:', err);
        });
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
  
  return (
    <div className="min-h-screen bg-background">
      <div className={`container mx-auto px-4 py-8 ${scannerEnabled ? 'md:block hidden' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-fraunces mb-1 md:mb-2">Check-in Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">{(event as any)?.event?.title}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setSoundEnabled(!soundEnabled)}
              size="icon"
              className="h-9 w-9 md:h-10 md:w-10"
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
              className="hidden md:flex"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                refetchStats();
                refetchAttendees();
              }}
              size="icon"
              className="md:hidden h-9 w-9"
              data-testid="button-refresh-mobile"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Compact Stats for Mobile */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
          <Card className="border-[#c0580f]/20 bg-[#0B0B0F]/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Checked In</div>
              <div className="text-2xl font-bold text-[#17C0A9]">
                {stats?.stats?.checkedIn || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                of {stats?.stats?.totalTickets || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-[#c0580f]/20 bg-[#0B0B0F]/50">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Progress</div>
              <div className="text-2xl font-bold text-[#c0580f]">
                {progressPercentage.toFixed(0)}%
              </div>
              <Progress value={progressPercentage} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </div>
        
        {/* Desktop Stats Cards */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  <div className="relative min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center p-8">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#c0580f]/5 via-transparent to-[#17C0A9]/5 animate-pulse" />
                    
                    {/* Content */}
                    <div className="relative z-10 text-center space-y-6 max-w-md mx-auto">
                      {/* Animated camera icon */}
                      <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#c0580f] to-[#d3541e] rounded-full blur-2xl opacity-30 animate-pulse" />
                        <div className="relative bg-gradient-to-br from-[#c0580f]/20 to-[#d3541e]/20 p-8 rounded-full border-2 border-[#c0580f]/30 backdrop-blur-sm">
                          <Camera className="h-16 w-16 md:h-20 md:w-20 text-[#c0580f]" />
                        </div>
                      </div>
                      
                      {/* Title and description */}
                      <div className="space-y-2">
                        <h3 className="text-2xl md:text-3xl font-fraunces text-white">
                          QR Code Scanner
                        </h3>
                        <p className="text-white/60 text-sm md:text-base">
                          Scan attendee tickets for instant check-in
                        </p>
                      </div>
                      
                      {/* Start button */}
                      <Button
                        onClick={() => setScannerEnabled(true)}
                        size="lg"
                        data-testid="button-start-scanner"
                        className="w-full h-14 md:h-16 text-base md:text-lg font-medium bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white shadow-lg shadow-[#c0580f]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#c0580f]/40 hover:scale-[1.02]"
                      >
                        <Camera className="h-6 w-6 mr-2" />
                        Start Scanner
                      </Button>
                      
                      {/* Instructions */}
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm text-left">
                        <AlertCircle className="h-5 w-5 text-[#17C0A9] flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-white/70 space-y-1">
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
              <div className="space-y-4">
                <Card className="border-[#c0580f]/30 bg-[#0B0B0F] overflow-hidden">
                  <CardContent className="p-0">
                    {/* Top controls bar */}
                    <div className="flex items-center justify-between p-4 border-b border-[#c0580f]/20">
                      <Button
                        onClick={() => setScannerEnabled(false)}
                        variant="ghost"
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                        data-testid="button-close-scanner"
                      >
                        <X className="h-5 w-5 mr-2" />
                        Close
                      </Button>
                      <div className="text-sm font-medium text-[#17C0A9]">
                        Scanning...
                      </div>
                      <Button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        variant="ghost"
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-white/10"
                      >
                        {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                      </Button>
                    </div>
                    
                    {/* Scanner viewport - SINGLE element for both mobile and desktop */}
                    <div className="relative bg-black p-4">
                      <div id="qr-reader" className="w-full max-w-2xl mx-auto" style={{ minHeight: '400px' }} />
                    </div>
                    
                    {/* Bottom info */}
                    <div className="p-4 bg-gradient-to-t from-[#c0580f]/10 to-transparent">
                      {lastScannedTicket && (
                        <div className="mb-3 max-w-2xl mx-auto">
                          <div className="bg-[#17C0A9] text-[#0B0B0F] rounded-xl p-3 shadow-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">Valid Ticket</p>
                                <p className="text-xs opacity-90 truncate">
                                  {lastScannedTicket.tierName} • {lastScannedTicket.serial}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <p className="text-center text-white/60 text-sm">
                        Point camera at QR code to scan
                      </p>
                    </div>
                  </CardContent>
                </Card>
                  
                {/* Last Scanned Ticket - Premium Design */}
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
          </TabsContent>
          
          {/* Manual Check-in Tab */}
          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Check-in</CardTitle>
                <CardDescription>
                  Search and check in attendees by name, email, or ticket ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name, email, or ticket ID..."
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      data-testid="input-manual-search"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tickets</SelectItem>
                      <SelectItem value="valid">Not Checked In</SelectItem>
                      <SelectItem value="used">Checked In</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleExport} variant="outline" data-testid="button-export">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendeesData?.attendees?.map((attendee) => (
                        <TableRow key={attendee.ticketId}>
                          <TableCell>{attendee.buyerName || 'N/A'}</TableCell>
                          <TableCell>{attendee.buyerEmail}</TableCell>
                          <TableCell>{attendee.tierName}</TableCell>
                          <TableCell>
                            <Badge variant={attendee.status === 'used' ? 'default' : 'outline'}>
                              {attendee.status === 'used' ? 'Checked In' : 'Not Checked In'}
                            </Badge>
                          </TableCell>
                          <TableCell>
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
  );
}