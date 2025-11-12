import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { format } from "date-fns";
import { Helmet } from "react-helmet-async";

console.log('🚀 TicketsCheckinDashboard MODULE LOADED - Version 5.0 (ZXing)');
import { 
  QrCode, Users, CheckCircle2, XCircle, Clock, Search, 
  Download, RefreshCw, Camera, Volume2, VolumeX,
  UserCheck, AlertCircle, TrendingUp, X, Flashlight, CameraOff,
  List, ArrowLeft, Filter
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
import { 
  AttendeeCard,
  TimelineCard, 
  StatusBadge,
  TimestampPill,
  ActionPill,
  GlassCard
} from "@/components/ui/premium";

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
  console.log('🟢 COMPONENT RENDERING');
  
  const [, params] = useRoute("/tickets/organizer/events/:eventId/checkin");
  const [, navigate] = useLocation();
  const eventId = params?.eventId;
  const { toast } = useToast();
  
  const [scannerEnabled, setScannerEnabled] = useState(false);
  
  console.log('🟢 Component state - scannerEnabled:', scannerEnabled, 'eventId:', eventId);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualSearch, setManualSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [lastScannedTicket, setLastScannedTicket] = useState<any>(null);
  const [showManualSheet, setShowManualSheet] = useState(false);
  const [isMobileFullScreen, setIsMobileFullScreen] = useState(false);
  const [manualTicketCode, setManualTicketCode] = useState("");
  const [scannerStatus, setScannerStatus] = useState<{type: 'error' | 'success' | null, message: string | null}>({type: null, message: null});
  const [lastScannedToken, setLastScannedToken] = useState<{token: string, timestamp: number} | null>(null);
  const [manualValidationStatus, setManualValidationStatus] = useState<{type: 'error' | 'success' | null, message: string | null}>({type: null, message: null});
  
  // ZXing scanner refs
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const isProcessingRef = useRef(false);
  const isScannerRunningRef = useRef(false);
  const validateMutationRef = useRef<any>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sound effects - defined early so it can be used everywhere
  const playSound = (type: 'success' | 'error' | 'checkin') => {
    if (!soundEnabled) return;
    
    const audio = new Audio();
    switch (type) {
      case 'success':
        audio.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoMAAD/////';
        break;
      case 'error':
        audio.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoMAACA';
        break;
      case 'checkin':
        audio.src = 'data:audio/wav;base64,UklGRhwMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoMAAD/////';
        break;
    }
    audio.play().catch(() => {});
  };
  
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
      // Use fetch directly to handle 400 responses properly
      const response = await fetch('/api/tickets/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ qrToken, eventId })
      });
      const data = await response.json();
      // Add qrToken to the response for later use in check-in
      return { ...data, qrToken };
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        // Include qrToken in the stored ticket data
        setLastScannedTicket({ ...data.meta, qrToken: data.qrToken });
        // Use the message field from the response or fallback
        const successMessage = data.message || `✓ Valid ticket for ${data.meta?.buyerName || 'Guest'}`;
        
        // Set status for both scanner and manual modes
        setScannerStatus({ type: 'success', message: successMessage });
        setManualValidationStatus({ type: 'success', message: successMessage });
        playSound('success');
        
        // Clear status after 5 seconds
        setTimeout(() => {
          setScannerStatus({ type: null, message: null });
          setManualValidationStatus({ type: null, message: null });
        }, 5000);
      } else {
        playSound('error');
        
        // Use the message field from the response
        const errorMessage = data.message || data.error || 'Invalid ticket';
        
        // Set status for both scanner and manual modes
        setScannerStatus({ type: 'error', message: errorMessage });
        setManualValidationStatus({ type: 'error', message: errorMessage });
        
        // Vibrate for error
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        
        // Show additional context for specific statuses
        if (data.status === 'too_early' && data.meta) {
          const availableTime = new Date(data.meta.earliestCheckinAt).toLocaleTimeString();
          toast({
            title: "Check-in Not Open",
            description: `Check-in will be available at ${availableTime} (${data.meta.checkinWindowHours} hours before event)`,
            variant: "default"
          });
        } else if (data.status === 'wrong_event' && data.meta) {
          toast({
            title: "Wrong Event",
            description: `This ticket is for "${data.meta.actualEventTitle}"`,
            variant: "destructive"
          });
        } else if (data.status === 'used' && data.meta) {
          const checkedInTime = data.meta.checkedInAt ? new Date(data.meta.checkedInAt).toLocaleString() : 'previously';
          toast({
            title: "Already Checked In",
            description: `This ticket was checked in ${checkedInTime} by ${data.meta.checkedInBy}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Validation Failed",
            description: errorMessage,
            variant: "destructive"
          });
        }
        
        // Clear error status after 5 seconds
        setTimeout(() => {
          setScannerStatus({ type: null, message: null });
          setManualValidationStatus({ type: null, message: null });
        }, 5000);
      }
    },
    onError: (error: any) => {
      console.error('❌❌❌ Validation error:', error);
      playSound('error');
      
      // Handle network/server errors
      const errorMessage = '⚠️ Connection error - please try again';
      
      // Set status for both scanner and manual modes
      setScannerStatus({ type: 'error', message: errorMessage });
      setManualValidationStatus({ type: 'error', message: errorMessage });
      
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      toast({
        title: "Connection Error",
        description: "Unable to validate ticket. Please check your connection.",
        variant: "destructive"
      });
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setScannerStatus({ type: null, message: null });
        setManualValidationStatus({ type: null, message: null });
      }, 5000);
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
  
  // Update mutation ref when it changes
  useEffect(() => {
    validateMutationRef.current = validateMutation;
  }, [validateMutation]);

  // ZXing scanner start function
  const startScanner = useCallback(async () => {
    // Prevent duplicate starts
    if (isScannerRunningRef.current) {
      console.log('⚠️ Scanner already running');
      return;
    }
    
    console.log('🔴 START SCANNER BUTTON CLICKED!');
    console.log('🔴 Using ZXing BrowserMultiFormatReader');
    
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setIsMobileFullScreen(true);
    }
    
    // Set scannerEnabled=true FIRST to render the DOM element
    setScannerEnabled(true);
    
    // Wait for video element
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const videoElement = document.getElementById('qr-video') as HTMLVideoElement;
    if (!videoElement) {
      throw new Error('Video element not found');
    }
    
    videoElementRef.current = videoElement;
    
    try {
      // Create ZXing scanner instance
      if (!codeReaderRef.current) {
        console.log('🎬 Creating new BrowserMultiFormatReader...');
        codeReaderRef.current = new BrowserMultiFormatReader();
      }
      
      const codeReader = codeReaderRef.current;
      console.log('📷 Starting ZXing scanner...');
      
      // Get available cameras and start with environment camera
      const devices = await codeReader.listVideoInputDevices();
      console.log('📷 Available cameras:', devices);
      
      // Find environment camera or use first available
      const environmentCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
      console.log('📷 Using camera:', environmentCamera?.label);
      
      // Start continuous scanning with ZXing
      await codeReader.decodeFromVideoDevice(
        environmentCamera?.deviceId,
        videoElement,
        (result, error) => {
          if (result) {
            // Success! QR code detected
            if (isProcessingRef.current) return;
            
            const decodedText = result.getText();
            console.log('🎯🎯🎯 ZXing QR CODE DETECTED!!!', decodedText);
            console.log('🎯 Result object:', result);
            
            // Parse QR data - it might be JSON or plain text
            let ticketData = decodedText;
            try {
              const parsedData = JSON.parse(decodedText);
              // If it's JSON, extract the token field
              if (parsedData.token) {
                ticketData = parsedData.token;
                console.log('📋 Extracted token from JSON:', ticketData);
              } else if (parsedData.qrToken) {
                ticketData = parsedData.qrToken;
                console.log('📋 Extracted qrToken from JSON:', ticketData);
              }
            } catch (e) {
              // Not JSON, use as-is
              console.log('📋 Using raw QR data (not JSON):', ticketData);
            }
            
            // Check if we've recently scanned this token (prevent duplicates)
            const now = Date.now();
            if (lastScannedToken && lastScannedToken.token === ticketData && 
                (now - lastScannedToken.timestamp) < 3000) {
              console.log('⏭️ Skipping duplicate scan of same token');
              return;
            }
            
            isProcessingRef.current = true;
            setLastScannedToken({ token: ticketData, timestamp: now });
            
            // Haptic and audio feedback
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
            playSound('success');
            
            // Validate the ticket
            console.log('🔍 Validating ticket token:', ticketData);
            validateMutationRef.current.mutate(ticketData, {
              onSuccess: (data: any) => {
                console.log('✅✅✅ Validation successful:', data);
                setTimeout(() => {
                  isProcessingRef.current = false;
                }, 2000);
              },
              onError: (error: any) => {
                console.error('❌❌❌ Validation error:', error);
                isProcessingRef.current = false;
              }
            });
          } else if (error && !(error instanceof NotFoundException)) {
            console.error('📸 ZXing scanning error:', error);
          }
          // NotFoundException is expected when no QR code is in view
        }
      );
      
      isScannerRunningRef.current = true;
      console.log('✅✅✅ ZXing scanner started successfully!');
      console.log('✅ Point camera at QR code - using higher resolution scanning');
      
      toast({
        title: "Scanner Ready",
        description: "Point camera at QR code",
      });
      
    } catch (error) {
      console.error('❌ Scanner error:', error);
      setScannerEnabled(false);
      setIsMobileFullScreen(false);
      isScannerRunningRef.current = false;
      toast({
        title: "Scanner Error",
        description: String(error),
        variant: "destructive"
      });
    }
  }, [toast]);

  // Explicit scanner stop function
  const stopScanner = useCallback(() => {
    if (!isScannerRunningRef.current || !codeReaderRef.current) {
      console.log('⚠️ Scanner not running');
      setScannerEnabled(false);
      setIsMobileFullScreen(false);
      return;
    }
    
    try {
      codeReaderRef.current.reset();
      isScannerRunningRef.current = false;
      setScannerEnabled(false);
      setIsMobileFullScreen(false);
      console.log('✅ ZXing scanner stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping scanner:', error);
      isScannerRunningRef.current = false;
      setScannerEnabled(false);
      setIsMobileFullScreen(false);
    }
  }, []);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (codeReaderRef.current && isScannerRunningRef.current) {
        codeReaderRef.current.reset();
        isScannerRunningRef.current = false;
      }
    };
  }, []);
  
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
                        onClick={startScanner}
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
                    
                    {/* Top Control Bar - Premium Frosted Capsules */}
                    <div 
                      className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/90 via-black/70 to-transparent"
                      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}
                    >
                      <Button
                        onClick={stopScanner}
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
                        {/* ZXing Video Container */}
                        <div className="relative rounded-3xl overflow-hidden border-3 border-[#c0580f]/50 shadow-2xl w-full h-full flex items-center justify-center">
                          {/* Video Element for ZXing */}
                          <video 
                            id="qr-video" 
                            className="w-full h-full object-cover"
                            autoPlay
                            playsInline
                            muted
                          />
                          
                          {/* Corner brackets - Premium Copper Gradient - Properly positioned */}
                          <div className="absolute top-4 left-4 w-16 h-16 border-t-[4px] border-l-[4px] border-white rounded-tl-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s' }} />
                          <div className="absolute top-4 right-4 w-16 h-16 border-t-[4px] border-r-[4px] border-white rounded-tr-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                          <div className="absolute bottom-4 left-4 w-16 h-16 border-b-[4px] border-l-[4px] border-white rounded-bl-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                          <div className="absolute bottom-4 right-4 w-16 h-16 border-b-[4px] border-r-[4px] border-white rounded-br-2xl animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.6)]" style={{ animationDuration: '2s', animationDelay: '1.5s' }} />
                          
                          {/* Scanning status badge - Compact Design */}
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#c0580f]/40 to-[#d3541e]/40 backdrop-blur-2xl border-2 border-[#c0580f]/70 shadow-2xl shadow-[#c0580f]/30">
                              <div className="w-2 h-2 bg-gradient-to-br from-[#c0580f] to-[#d3541e] rounded-full animate-pulse shadow-lg shadow-[#c0580f]/50" />
                              <span className="text-xs font-fraunces font-semibold text-white tracking-wider uppercase">
                                Scanning...
                              </span>
                            </div>
                          </div>
                          
                          {/* Inline validation status - Premium Mobile Optimized */}
                          {scannerStatus.type && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-50 px-6 animate-in zoom-in-95 duration-300">
                              <div className={`relative overflow-hidden rounded-3xl backdrop-blur-3xl border-[3px] shadow-2xl ${
                                scannerStatus.type === 'error' 
                                  ? 'bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-400 shadow-red-500/50' 
                                  : 'bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-400 shadow-green-500/50'
                              }`}>
                                {/* Animated background pattern */}
                                <div className="absolute inset-0 opacity-20">
                                  <div className={`absolute -top-4 -right-4 w-32 h-32 rounded-full animate-pulse ${
                                    scannerStatus.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                                  }`} />
                                  <div className={`absolute -bottom-4 -left-4 w-24 h-24 rounded-full animate-pulse delay-500 ${
                                    scannerStatus.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                                  }`} />
                                </div>
                                
                                {/* Content */}
                                <div className="relative p-6">
                                  <div className="flex flex-col items-center text-center space-y-3">
                                    {/* Large Icon */}
                                    {scannerStatus.type === 'error' ? (
                                      <div className="relative">
                                        <div className="absolute inset-0 animate-ping">
                                          <AlertCircle className="w-16 h-16 text-red-400 opacity-75" />
                                        </div>
                                        <AlertCircle className="relative w-16 h-16 text-red-300" />
                                      </div>
                                    ) : (
                                      <div className="relative">
                                        <div className="absolute inset-0 animate-ping">
                                          <CheckCircle2 className="w-16 h-16 text-green-400 opacity-75" />
                                        </div>
                                        <CheckCircle2 className="relative w-16 h-16 text-green-300" />
                                      </div>
                                    )}
                                    
                                    {/* Message */}
                                    <div className="space-y-1">
                                      <p className="text-white font-bold text-lg leading-tight">
                                        {scannerStatus.message}
                                      </p>
                                      {scannerStatus.type === 'error' && (
                                        <p className="text-white/80 text-sm">
                                          Please try another ticket
                                        </p>
                                      )}
                                      {scannerStatus.type === 'success' && (
                                        <p className="text-white/80 text-sm">
                                          Tap "Check In" to confirm
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
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
                            onClick={() => {
                              console.log('🚨 Mobile Check-in button clicked!');
                              console.log('🚨 lastScannedTicket:', lastScannedTicket);
                              console.log('🚨 qrToken:', lastScannedTicket?.qrToken);
                              if (lastScannedTicket?.qrToken) {
                                checkinMutation.mutate(lastScannedTicket.qrToken);
                              } else {
                                console.error('🚨 No qrToken available!');
                              }
                            }}
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
                            <div className="relative min-h-[500px] flex items-center justify-center">
                              <video 
                                id="qr-video" 
                                className="w-full h-full object-cover"
                                autoPlay
                                playsInline
                                muted
                              />
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
                                <span className="text-sm font-semibold text-white">
                                  Scanning...
                                </span>
                              </div>
                            </div>
                            
                            {/* Inline validation status - Desktop Premium */}
                            {scannerStatus.type && (
                              <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 z-40 animate-in zoom-in-95 duration-300">
                                <div className={`relative overflow-hidden rounded-2xl backdrop-blur-3xl border-[3px] shadow-2xl ${
                                  scannerStatus.type === 'error' 
                                    ? 'bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-400 shadow-red-500/50' 
                                    : 'bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-400 shadow-green-500/50'
                                }`}>
                                  {/* Animated background */}
                                  <div className="absolute inset-0 opacity-20">
                                    <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full animate-pulse ${
                                      scannerStatus.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                                    }`} />
                                  </div>
                                  
                                  <div className="relative px-8 py-6">
                                    <div className="flex items-center gap-4">
                                      {scannerStatus.type === 'error' ? (
                                        <AlertCircle className="w-12 h-12 text-red-300 flex-shrink-0" />
                                      ) : (
                                        <CheckCircle2 className="w-12 h-12 text-green-300 flex-shrink-0" />
                                      )}
                                      <div>
                                        <p className="text-white font-bold text-xl">
                                          {scannerStatus.message}
                                        </p>
                                        {scannerStatus.type === 'error' && (
                                          <p className="text-white/70 text-sm mt-1">
                                            Scan a different ticket to continue
                                          </p>
                                        )}
                                        {scannerStatus.type === 'success' && (
                                          <p className="text-white/70 text-sm mt-1">
                                            Click "Check In" to confirm entry
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
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
                              onClick={stopScanner}
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
                    
                    {/* Manual Input Fallback - Desktop */}
                    <Card className="border-amber-500/30 bg-amber-500/5 animate-in fade-in duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 mb-4">
                          <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-amber-500 mb-1">Manual Check-in</h3>
                            <p className="text-sm text-white/70">
                              If the scanner isn't detecting QR codes, enter the ticket code directly:
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <Input
                            type="text"
                            placeholder="Enter ticket code or QR data"
                            value={manualTicketCode}
                            onChange={(e) => setManualTicketCode(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && manualTicketCode) {
                                console.log('🔍 Manual ticket validation:', manualTicketCode);
                                validateMutation.mutate(manualTicketCode);
                                setManualTicketCode('');
                                // Show status in manual mode
                                setManualValidationStatus({ type: null, message: null });
                              }
                            }}
                            className="bg-black/50 border-white/20 text-white placeholder:text-white/40"
                            data-testid="input-manual-ticket-code-desktop"
                          />
                          <Button
                            onClick={() => {
                              if (manualTicketCode) {
                                console.log('🔍 Manual ticket validation:', manualTicketCode);
                                validateMutation.mutate(manualTicketCode);
                                setManualTicketCode('');
                                // Show status in manual mode
                                setManualValidationStatus({ type: null, message: null });
                              }
                            }}
                            disabled={!manualTicketCode || validateMutation.isPending}
                            variant="outline"
                            className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                            data-testid="button-validate-manual-desktop"
                          >
                            {validateMutation.isPending ? 'Validating...' : 'Validate Ticket'}
                          </Button>
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
                              onClick={() => {
                                console.log('🚨 Desktop Check-in button clicked!');
                                console.log('🚨 lastScannedTicket:', lastScannedTicket);
                                console.log('🚨 qrToken:', lastScannedTicket?.qrToken);
                                if (lastScannedTicket?.qrToken) {
                                  checkinMutation.mutate(lastScannedTicket.qrToken);
                                } else {
                                  console.error('🚨 No qrToken available!');
                                }
                              }}
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
            {/* Ticket Validation Card */}
            <Card className="border-[#c0580f]/30 bg-gradient-to-br from-[#c0580f]/10 to-[#d3541e]/10">
              <CardHeader className="pb-4">
                <CardTitle className="text-white font-fraunces flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[#c0580f]" />
                  Validate Ticket
                </CardTitle>
                <CardDescription className="text-white/60">
                  Enter a ticket code or QR data to validate and check in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter ticket code (e.g., rU1OxHAGk98iFxVvElXK)"
                      value={manualTicketCode}
                      onChange={(e) => setManualTicketCode(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && manualTicketCode) {
                          console.log('🔍 Manual ticket validation:', manualTicketCode);
                          validateMutation.mutate(manualTicketCode);
                          setManualTicketCode('');
                        }
                      }}
                      className="h-12 bg-black/50 border-[#c0580f]/30 text-white placeholder:text-white/40 focus:border-[#c0580f]"
                      data-testid="input-manual-ticket-code"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (manualTicketCode) {
                        console.log('🔍 Manual ticket validation:', manualTicketCode);
                        validateMutation.mutate(manualTicketCode);
                        setManualTicketCode('');
                      }
                    }}
                    disabled={!manualTicketCode || validateMutation.isPending}
                    className="h-12 bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white font-semibold px-6"
                    data-testid="button-validate-manual"
                  >
                    {validateMutation.isPending ? 'Validating...' : 'Validate Ticket'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Attendees Card - Premium Mobile Design */}
            <GlassCard className="overflow-hidden">
              {/* Header Section with gradient */}
              <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-[#c0580f]/10 to-[#d3541e]/10">
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20">
                    <Search className="h-5 w-5 text-[#d3541e]" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white font-fraunces">Search Attendees</h2>
                    <p className="text-sm text-white/60 mt-0.5">
                      Find and manage checked-in attendees
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                {/* Search and Filters - Compact Mobile Layout */}
                <div className="space-y-2.5 md:space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-white/40 pointer-events-none" />
                    <Input
                      placeholder="Search by name or email..."
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      className="h-11 md:h-14 pl-10 md:pl-12 pr-3 md:pr-4 text-sm md:text-base bg-gradient-to-r from-white/5 to-white/[0.02] border-white/20 hover:border-[#c0580f]/30 focus:border-[#c0580f]/50 text-white placeholder:text-white/40 rounded-lg md:rounded-xl backdrop-blur-sm transition-all duration-200"
                      data-testid="input-manual-search"
                    />
                  </div>

                  {/* Filters Row */}
                  <div className="flex gap-2 md:gap-3">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger 
                        className="h-10 md:h-12 flex-1 bg-gradient-to-r from-white/5 to-white/[0.02] border-white/20 hover:border-[#c0580f]/30 text-white text-sm md:text-base rounded-lg md:rounded-xl backdrop-blur-sm transition-all duration-200" 
                        data-testid="select-filter-status"
                      >
                        <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 text-white/60" />
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 backdrop-blur-xl border-white/10">
                        <SelectItem value="all">All Tickets</SelectItem>
                        <SelectItem value="valid">Not Checked In</SelectItem>
                        <SelectItem value="used">Checked In</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Export Button */}
                    <Button 
                      onClick={handleExport} 
                      className="h-10 md:h-12 w-10 md:w-auto md:px-4 bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-[#c0580f]/20 hover:to-[#d3541e]/20 border border-white/20 hover:border-[#c0580f]/30 text-white rounded-lg md:rounded-xl backdrop-blur-sm transition-all duration-200" 
                      data-testid="button-export"
                    >
                      <Download className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2" />
                      <span className="hidden md:inline">Export</span>
                    </Button>
                  </div>
                </div>
                
                {/* Manual Validation Status Display - Compact Mobile */}
                {manualValidationStatus.type && (
                  <div className="relative animate-in zoom-in-95 duration-300">
                    <div className={`relative overflow-hidden rounded-lg md:rounded-2xl backdrop-blur-3xl border-2 md:border-[3px] shadow-lg md:shadow-2xl ${
                      manualValidationStatus.type === 'error' 
                        ? 'bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-400 shadow-red-500/50' 
                        : 'bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-400 shadow-green-500/50'
                    }`}>
                      {/* Animated background pattern */}
                      <div className="absolute inset-0 opacity-20">
                        <div className={`absolute -top-4 -right-4 w-16 md:w-24 h-16 md:h-24 rounded-full animate-pulse ${
                          manualValidationStatus.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                        }`} />
                        <div className={`absolute -bottom-4 -left-4 w-12 md:w-20 h-12 md:h-20 rounded-full animate-pulse delay-500 ${
                          manualValidationStatus.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                        }`} />
                      </div>
                      
                      {/* Content */}
                      <div className="relative px-3.5 py-3 md:px-6 md:py-5">
                        <div className="flex items-center gap-3 md:gap-4">
                          {/* Icon */}
                          {manualValidationStatus.type === 'error' ? (
                            <div className="relative flex-shrink-0">
                              <div className="absolute inset-0 animate-ping">
                                <AlertCircle className="w-8 h-8 md:w-12 md:h-12 text-red-400 opacity-75" />
                              </div>
                              <AlertCircle className="relative w-8 h-8 md:w-12 md:h-12 text-red-300" />
                            </div>
                          ) : (
                            <div className="relative flex-shrink-0">
                              <div className="absolute inset-0 animate-ping">
                                <CheckCircle2 className="w-8 h-8 md:w-12 md:h-12 text-green-400 opacity-75" />
                              </div>
                              <CheckCircle2 className="relative w-8 h-8 md:w-12 md:h-12 text-green-300" />
                            </div>
                          )}
                          
                          {/* Message */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm md:text-lg">
                              {manualValidationStatus.message}
                            </p>
                            {manualValidationStatus.type === 'error' && (
                              <p className="text-white/70 text-xs md:text-sm mt-0.5 md:mt-1">
                                Check ticket code
                              </p>
                            )}
                            {manualValidationStatus.type === 'success' && lastScannedTicket && (
                              <div className="mt-2">
                                <Button
                                  onClick={() => {
                                    checkinMutation.mutate(lastScannedTicket.qrToken);
                                    setManualValidationStatus({ type: null, message: null });
                                  }}
                                  size="sm"
                                  className="h-8 md:h-9 text-xs md:text-sm bg-green-600 hover:bg-green-700"
                                  disabled={checkinMutation.isPending}
                                >
                                  {checkinMutation.isPending ? 'Checking in...' : 'Confirm Check-in'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Mobile: Card Layout - No nested scrolling */}
                <div className="md:hidden space-y-3">
                  {attendeesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-white/60">Loading attendees...</div>
                    </div>
                  ) : !attendeesData?.attendees || attendeesData.attendees.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center text-white/60">
                        <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">{manualSearch ? 'No attendees found' : 'No attendees'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {attendeesData.attendees.map((attendee) => (
                        <div 
                          key={attendee.ticketId}
                          className="glass-card p-3.5 rounded-lg border border-[#c0580f]/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2.5">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-semibold text-sm mb-0.5 truncate">{attendee.buyerName || 'N/A'}</h3>
                              <p className="text-white/50 text-xs truncate">{attendee.buyerEmail}</p>
                            </div>
                            <Badge 
                              variant={attendee.status === 'used' ? 'default' : 'outline'}
                              className={`text-xs ml-2 flex-shrink-0 ${attendee.status === 'used' 
                                ? 'bg-[#17C0A9]/20 text-[#17C0A9] border-[#17C0A9]/30' 
                                : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                              }`}
                            >
                              {attendee.status === 'used' ? 'In' : 'Pending'}
                            </Badge>
                          </div>
                          
                          {/* Details - Compact row */}
                          <div className="flex items-center justify-between text-xs mb-2.5">
                            <div className="text-white/60">
                              {attendee.tierName}
                            </div>
                            <div className="text-white/60">
                              {attendee.checkedInAt 
                                ? format(new Date(attendee.checkedInAt), 'HH:mm')
                                : <span className="text-white/40">-</span>
                              }
                            </div>
                          </div>
                          
                          {/* Action */}
                          {attendee.status !== 'used' && (
                            <Button
                              onClick={() => checkinMutation.mutate(attendee.qrToken)}
                              disabled={checkinMutation.isPending}
                              className="w-full h-9 bg-gradient-to-r from-[#c0580f] to-[#d3541e] hover:from-[#d3541e] hover:to-[#c0580f] text-white text-sm font-medium"
                              data-testid={`button-checkin-${attendee.ticketId}`}
                            >
                              <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                              Check In
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
              </div> {/* Close p-6 content div */}
            </GlassCard>
          </TabsContent>
          
          {/* Recent Activity Tab - Compact Mobile Timeline */}
          <TabsContent value="recent" className="space-y-4">
            <GlassCard className="overflow-hidden">
              <div className="p-4 md:p-6 border-b border-white/10">
                <h2 className="text-lg md:text-xl font-bold text-white">Recent Check-ins</h2>
                <p className="text-xs md:text-sm text-white/60 mt-0.5 md:mt-1">
                  Last {stats?.stats?.recentCheckIns?.length || 0} attendees
                </p>
              </div>
              <div className="p-4 md:p-6">
                {/* No nested scrolling - content flows naturally */}
                {stats?.stats?.recentCheckIns?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 md:py-12">
                    <div className="p-3 md:p-4 rounded-full bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 mb-3 md:mb-4">
                      <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-[#d3541e]" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">No check-ins yet</h3>
                    <p className="text-xs md:text-sm text-white/60">
                      Check-ins will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-6">
                    {stats?.stats?.recentCheckIns?.map((checkin, index, arr) => (
                      <TimelineCard 
                        key={checkin.id} 
                        isLast={index === arr.length - 1}
                        className="animate-in fade-in slide-in-from-left-5 duration-300"
                      >
                        {/* Header with timestamp - Compact mobile */}
                        <div className="flex items-start justify-between mb-2 md:mb-3">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <div className="p-1.5 md:p-2 rounded-md md:rounded-lg bg-gradient-to-r from-green-600/20 to-green-500/20">
                              <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 text-green-400" />
                            </div>
                            <TimestampPill className="text-xs md:text-sm bg-green-500/10 text-green-300 border border-green-500/20">
                              {format(new Date(checkin.usedAt), 'HH:mm:ss')}
                            </TimestampPill>
                          </div>
                          <StatusBadge variant="success" className="text-xs">
                            In
                          </StatusBadge>
                        </div>
                        
                        {/* Attendee Details - Compact */}
                        <div className="space-y-1.5 md:space-y-2">
                          <div>
                            <h4 className="font-semibold text-white text-sm md:text-base">
                              {checkin.buyerName}
                            </h4>
                            <p className="text-xs md:text-sm text-white/60 truncate">
                              {checkin.buyerEmail}
                            </p>
                          </div>
                          
                          {/* Meta Info Grid - Compact */}
                          <div className="grid grid-cols-2 gap-2 md:gap-3 pt-1 md:pt-2 text-xs md:text-sm">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <div className="w-0.5 md:w-1 h-3 md:h-4 bg-gradient-to-b from-[#c0580f] to-[#d3541e] rounded-full" />
                              <div className="min-w-0">
                                <p className="text-white/50 text-xs">Tier</p>
                                <p className="text-white font-medium truncate">{checkin.tierName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <div className="w-0.5 md:w-1 h-3 md:h-4 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full" />
                              <div className="min-w-0">
                                <p className="text-white/50 text-xs">By</p>
                                <p className="text-white font-medium truncate">
                                  {checkin.scannedBy || 'Staff'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TimelineCard>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </>
  );
}