import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Html5QrcodeScanner } from "html5-qrcode";
import { format } from "date-fns";
import { 
  QrCode, Users, CheckCircle2, XCircle, Clock, Search, 
  Download, RefreshCw, Camera, Volume2, VolumeX,
  UserCheck, AlertCircle, TrendingUp
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
    onSuccess: (data) => {
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
    onSuccess: (data) => {
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
  
  // QR Scanner setup
  useEffect(() => {
    if (!scannerEnabled) return;
    
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    );
    
    scanner.render(
      (decodedText) => {
        validateMutation.mutate(decodedText);
        scanner.pause();
        setTimeout(() => scanner.resume(), 2000); // Prevent rapid re-scans
      },
      (error) => {
        // Ignore scan errors (common when camera is moving)
      }
    );
    
    return () => {
      scanner.clear();
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-fraunces mb-2">Check-in Dashboard</h1>
            <p className="text-muted-foreground">{event?.event?.title}</p>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>
                  Scan attendee QR codes for quick check-in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!scannerEnabled ? (
                  <div className="text-center py-12">
                    <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <Button
                      onClick={() => setScannerEnabled(true)}
                      size="lg"
                      data-testid="button-start-scanner"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Start Scanner
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Make sure to allow camera access when prompted
                    </p>
                  </div>
                ) : (
                  <>
                    <div id="qr-reader" className="mx-auto max-w-md" />
                    <Button
                      onClick={() => setScannerEnabled(false)}
                      variant="outline"
                      className="w-full"
                      data-testid="button-stop-scanner"
                    >
                      Stop Scanner
                    </Button>
                  </>
                )}
                
                {/* Last Scanned Ticket */}
                {lastScannedTicket && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Valid Ticket Detected</p>
                        <div className="text-sm space-y-1">
                          <p>Name: {lastScannedTicket.buyerName}</p>
                          <p>Tier: {lastScannedTicket.tierName}</p>
                          <p>Serial: {lastScannedTicket.serial}</p>
                        </div>
                        <Button
                          onClick={() => checkinMutation.mutate(lastScannedTicket.qrToken)}
                          className="w-full"
                          disabled={checkinMutation.isPending}
                          data-testid="button-confirm-checkin"
                        >
                          {checkinMutation.isPending ? "Checking in..." : "Confirm Check-in"}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
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