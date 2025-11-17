import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Users, Search, Download, Mail, Filter, 
  CheckCircle2, XCircle, RefreshCw, Send,
  UserCheck, Clock, ChevronDown, MoreHorizontal,
  Edit, DollarSign, UserX, UserPlus, Tag,
  MessageSquare, Shield, ShieldOff, Star,
  ArrowLeft, Copy, FileText, ChevronRight,
  QrCode, Phone, AtSign
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Papa from "papaparse";

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
  notes?: string;
  tags?: string[];
  isVip?: boolean;
  isBlocked?: boolean;
  refundedAt?: string;
  refundReason?: string;
}

export function TicketsAttendeesPageEnhanced() {
  const [, params] = useRoute("/tickets/organizer/events/:eventId/attendees");
  const [, navigate] = useLocation();
  const eventId = params?.eventId;
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("list");
  
  // Dialog states
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Attendee | null>(null);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferName, setTransferName] = useState("");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [attendeeNotes, setAttendeeNotes] = useState("");
  const [attendeeTags, setAttendeeTags] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ['/api/tickets/events', eventId],
    enabled: !!eventId
  });
  
  // Fetch attendees list
  const { data: attendeesData, isLoading, refetch } = useQuery<{ attendees: Attendee[] }>({
    queryKey: ['/api/tickets/events', eventId, 'attendees', { status: filterStatus, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);
      const queryString = params.toString();
      const url = `/api/tickets/events/${eventId}/attendees${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!eventId
  });
  
  // Process refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({ ticketId, refundType, refundAmount, reason }: any) => {
      return apiRequest('POST', `/api/tickets/${ticketId}/refund`, { refundType, refundAmount, reason });
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({
          title: "Refund Processed",
          description: "The refund has been successfully processed"
        });
        setRefundDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/events', eventId, 'attendees'] });
      } else {
        toast({
          title: "Refund Failed",
          description: data.error || "Failed to process refund",
          variant: "destructive"
        });
      }
    }
  });
  
  // Update attendee mutation
  const updateAttendeeMutation = useMutation({
    mutationFn: async ({ ticketId, ...data }: any) => {
      return apiRequest('PATCH', `/api/tickets/attendees/${ticketId}`, data);
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({
          title: "Attendee Updated",
          description: "Attendee information has been updated"
        });
        setEditDialogOpen(false);
        setNotesDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/events', eventId, 'attendees'] });
      }
    }
  });
  
  // Transfer ticket mutation
  const transferMutation = useMutation({
    mutationFn: async ({ ticketId, newEmail, newName }: any) => {
      return apiRequest('PATCH', `/api/tickets/${ticketId}/transfer`, { newEmail, newName });
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({
          title: "Ticket Transferred",
          description: `Ticket transferred to ${transferEmail}`
        });
        setTransferDialogOpen(false);
        setTransferEmail("");
        setTransferName("");
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/events', eventId, 'attendees'] });
      }
    }
  });
  
  // Resend ticket mutation
  const resendMutation = useMutation({
    mutationFn: async ({ ticketId, email }: any) => {
      return apiRequest('POST', `/api/tickets/${ticketId}/resend`, { email });
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({
          title: "Ticket Resent",
          description: data.message || "Ticket has been resent"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/events', eventId, 'attendees'] });
      }
    }
  });
  
  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      return apiRequest('POST', '/api/tickets/check-in', { qrToken, eventId, checkInBy: 'manual' });
    },
    onSuccess: (data: any) => {
      if (data.ok) {
        toast({
          title: "Check-in Successful",
          description: "Attendee has been checked in"
        });
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/events', eventId, 'attendees'] });
      }
    }
  });
  
  // Filter attendees
  const filteredAttendees = attendeesData?.attendees?.filter(attendee => {
    if (filterTier !== 'all' && attendee.tierName !== filterTier) return false;
    return true;
  }) || [];
  
  // Get unique tiers
  const tiers = Array.from(new Set(attendeesData?.attendees?.map(a => a.tierName) || []));
  
  // Statistics
  const totalAttendees = attendeesData?.attendees?.length || 0;
  const checkedInCount = attendeesData?.attendees?.filter(a => a.status === 'used').length || 0;
  const refundedCount = attendeesData?.attendees?.filter(a => a.status === 'refunded').length || 0;
  const vipCount = attendeesData?.attendees?.filter(a => a.isVip).length || 0;
  const blockedCount = attendeesData?.attendees?.filter(a => a.isBlocked).length || 0;
  const checkedInPercentage = totalAttendees > 0 ? (checkedInCount / totalAttendees) * 100 : 0;
  
  // Handle actions
  const handleRefund = (attendee: Attendee) => {
    setSelectedTicket(attendee);
    setRefundDialogOpen(true);
  };
  
  const handleEdit = (attendee: Attendee) => {
    setSelectedTicket(attendee);
    setEditFormData({
      buyerName: attendee.buyerName,
      buyerEmail: attendee.buyerEmail,
      buyerPhone: attendee.buyerPhone || ""
    });
    setEditDialogOpen(true);
  };
  
  const handleTransfer = (attendee: Attendee) => {
    setSelectedTicket(attendee);
    setTransferDialogOpen(true);
  };
  
  const handleNotes = (attendee: Attendee) => {
    setSelectedTicket(attendee);
    setAttendeeNotes(attendee.notes || "");
    setAttendeeTags((attendee.tags || []).join(", "));
    setNotesDialogOpen(true);
  };
  
  const handleToggleVIP = async (attendee: Attendee) => {
    await updateAttendeeMutation.mutateAsync({
      ticketId: attendee.ticketId,
      isVip: !attendee.isVip
    });
  };
  
  const handleToggleBlock = async (attendee: Attendee) => {
    await updateAttendeeMutation.mutateAsync({
      ticketId: attendee.ticketId,
      isBlocked: !attendee.isBlocked
    });
  };
  
  // Export attendees
  const handleExport = (exportFormat: 'csv' | 'excel') => {
    const data = filteredAttendees.map(a => ({
      'Name': a.buyerName || 'N/A',
      'Email': a.buyerEmail,
      'Phone': a.buyerPhone || 'N/A',
      'Ticket Tier': a.tierName,
      'Ticket ID': a.serial,
      'Status': a.status,
      'VIP': a.isVip ? 'Yes' : 'No',
      'Blocked': a.isBlocked ? 'Yes' : 'No',
      'Check-in Time': a.checkedInAt ? format(new Date(a.checkedInAt), 'yyyy-MM-dd HH:mm:ss') : '',
      'Purchase Date': format(new Date(a.placedAt), 'yyyy-MM-dd HH:mm:ss'),
      'Refunded': a.refundedAt ? format(new Date(a.refundedAt), 'yyyy-MM-dd HH:mm:ss') : '',
      'Refund Reason': a.refundReason || '',
      'Notes': a.notes || '',
      'Tags': (a.tags || []).join(', ')
    }));
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendees-${eventId}-${Date.now()}.csv`;
    link.click();
  };
  
  if (!eventId) return null;
  
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Two-Tier Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#1a1a1a] via-[#0f0f0f] to-black border-b border-copper-500/20 backdrop-blur-xl">
        {/* Top Tier: Back Nav + Event Title */}
        <div className="px-4 py-3 border-b border-copper-500/10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="h-10 w-10 p-0 text-copper-300 hover:text-white hover:bg-copper-500/10"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-fraunces text-lg md:text-xl font-bold text-white truncate">
                Attendee Management
              </h1>
              <p className="text-xs text-copper-300 truncate">{(event as any)?.event?.title}</p>
            </div>
          </div>
        </div>
        
        {/* Bottom Tier: Primary Action + Menu */}
        <div className="px-4 py-2 flex items-center gap-2">
          <Button
            onClick={() => navigate(`/tickets/organizer/events/${eventId}/checkin`)}
            className="h-10 bg-gradient-to-r from-[hsl(168,68%,42%)] to-[hsl(168,74%,35%)] hover:from-[hsl(168,68%,46%)] hover:to-[hsl(168,74%,39%)] text-white font-semibold shadow-md border border-[#17C0A9]/30 transition-all duration-300 text-sm"
            data-testid="button-checkin-mode"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Check-in Mode
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-copper-500/30 text-copper-200 hover:bg-copper-500/10 hover:text-white"
                data-testid="button-more-actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-elevated border-copper-500/30">
              <DropdownMenuItem 
                onClick={() => navigate(`/tickets/organizer/events/${eventId}/analytics`)}
                className="cursor-pointer text-white hover:bg-copper-500/10"
              >
                <FileText className="h-4 w-4 mr-2 text-copper-300" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => refetch()}
                className="cursor-pointer text-white hover:bg-copper-500/10"
              >
                <RefreshCw className="h-4 w-4 mr-2 text-copper-300" />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-copper-500/20" />
              <DropdownMenuItem 
                onClick={() => handleExport('csv')}
                className="cursor-pointer text-white hover:bg-copper-500/10"
              >
                <Download className="h-4 w-4 mr-2 text-copper-300" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Horizontal Scrollable Metric Chips (Mobile) / Grid (Desktop) */}
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:grid md:grid-cols-3 lg:grid-cols-6 md:overflow-visible">
          <div className="flex-shrink-0 snap-start min-w-[120px] md:min-w-0 px-3 py-2.5 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20">
            <div className="text-xs text-copper-300 uppercase tracking-wide mb-1">Total</div>
            <div className="text-xl font-bold text-white">{totalAttendees}</div>
          </div>
          <div className="flex-shrink-0 snap-start min-w-[120px] md:min-w-0 px-3 py-2.5 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20">
            <div className="text-xs text-copper-300 uppercase tracking-wide mb-1">Checked In</div>
            <div className="text-xl font-bold text-green-400">{checkedInCount}</div>
            <div className="text-[10px] text-copper-300 mt-0.5">{checkedInPercentage.toFixed(0)}%</div>
          </div>
          <div className="flex-shrink-0 snap-start min-w-[120px] md:min-w-0 px-3 py-2.5 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20">
            <div className="text-xs text-copper-300 uppercase tracking-wide mb-1">Pending</div>
            <div className="text-xl font-bold text-white">{totalAttendees - checkedInCount - refundedCount}</div>
          </div>
          <div className="flex-shrink-0 snap-start min-w-[120px] md:min-w-0 px-3 py-2.5 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20">
            <div className="text-xs text-copper-300 uppercase tracking-wide mb-1">Refunded</div>
            <div className="text-xl font-bold text-red-400">{refundedCount}</div>
          </div>
          <div className="flex-shrink-0 snap-start min-w-[120px] md:min-w-0 px-3 py-2.5 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20">
            <div className="text-xs text-copper-300 uppercase tracking-wide mb-1">VIP</div>
            <div className="text-xl font-bold text-purple-400">{vipCount}</div>
          </div>
          <div className="flex-shrink-0 snap-start min-w-[120px] md:min-w-0 px-3 py-2.5 rounded-lg bg-gradient-to-br from-white/5 to-transparent border border-copper-500/20">
            <div className="text-xs text-copper-300 uppercase tracking-wide mb-1">Blocked</div>
            <div className="text-xl font-bold text-orange-400">{blockedCount}</div>
          </div>
        </div>
        
        {/* Tabs for List / Communication / Bulk Actions */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            <TabsList className="inline-flex bg-black/40 border border-copper-500/30">
              <TabsTrigger value="list" className="data-[state=active]:bg-copper-500 data-[state=active]:text-white">
                Attendee List
              </TabsTrigger>
              <TabsTrigger value="communication" className="data-[state=active]:bg-copper-500 data-[state=active]:text-white">
                Communication
              </TabsTrigger>
              <TabsTrigger value="bulk" className="data-[state=active]:bg-copper-500 data-[state=active]:text-white">
                Bulk Actions
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="list" className="space-y-4 mt-4">
        {/* Mobile-First Filter Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-copper-300" />
            <Input
              placeholder="Search attendees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-black/40 border-copper-500/30 text-white placeholder:text-copper-300/60"
              data-testid="input-search"
            />
          </div>
          
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-11 border-copper-500/30 text-copper-200 hover:bg-copper-500/10 hover:text-white"
                data-testid="button-filters"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {(filterStatus !== 'all' || filterTier !== 'all') && (
                  <Badge className="ml-2 bg-copper-500 text-white h-5 w-5 p-0 flex items-center justify-center">
                    {(filterStatus !== 'all' ? 1 : 0) + (filterTier !== 'all' ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="glass-elevated border-copper-500/30 rounded-t-2xl max-h-[80vh]">
              <SheetHeader>
                <SheetTitle className="font-fraunces text-xl text-white">Filter Attendees</SheetTitle>
                <SheetDescription className="text-copper-300">
                  Filter by status and ticket tier
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-white">Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'all', label: 'All Status', icon: Users },
                      { value: 'valid', label: 'Not Checked In', icon: Clock },
                      { value: 'used', label: 'Checked In', icon: CheckCircle2 },
                      { value: 'refunded', label: 'Refunded', icon: XCircle }
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={filterStatus === value ? "default" : "outline"}
                        onClick={() => setFilterStatus(value)}
                        className={`h-12 justify-start ${
                          filterStatus === value 
                            ? 'bg-gradient-to-r from-copper-500 to-copper-600 text-white' 
                            : 'border-copper-500/30 text-copper-200 hover:bg-copper-500/10'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {tiers.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-white">Ticket Tier</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={filterTier === 'all' ? "default" : "outline"}
                        onClick={() => setFilterTier('all')}
                        className={`h-12 justify-start ${
                          filterTier === 'all' 
                            ? 'bg-gradient-to-r from-copper-500 to-copper-600 text-white' 
                            : 'border-copper-500/30 text-copper-200 hover:bg-copper-500/10'
                        }`}
                      >
                        All Tiers
                      </Button>
                      {tiers.map(tier => (
                        <Button
                          key={tier}
                          variant={filterTier === tier ? "default" : "outline"}
                          onClick={() => setFilterTier(tier)}
                          className={`h-12 justify-start ${
                            filterTier === tier 
                              ? 'bg-gradient-to-r from-copper-500 to-copper-600 text-white' 
                              : 'border-copper-500/30 text-copper-200 hover:bg-copper-500/10'
                          }`}
                        >
                          {tier}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterTier('all');
                    }}
                    className="flex-1 h-12 border-copper-500/30 text-copper-200"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={() => setFilterSheetOpen(false)}
                    className="flex-1 h-12 bg-gradient-to-r from-copper-500 to-copper-600 text-white"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Mobile-First Attendee Cards */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-copper-500 border-r-transparent"></div>
              <p className="text-copper-300 mt-4">Loading attendees...</p>
            </div>
          ) : filteredAttendees.length === 0 ? (
            <Card className="glass-elevated border-copper-500/30">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-copper-400/70 mx-auto mb-3" />
                <h3 className="font-fraunces text-lg font-bold text-white mb-2">
                  No Attendees Found
                </h3>
                <p className="text-copper-300 text-sm">
                  {searchTerm || filterStatus !== 'all' || filterTier !== 'all'
                    ? 'Try adjusting your filters or search term'
                    : 'No tickets have been purchased yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAttendees.map((attendee) => (
              <Card 
                key={attendee.ticketId}
                className={`glass-elevated border transition-all duration-300 ${
                  attendee.status === 'used'
                    ? 'border-green-500/30 bg-green-500/5'
                    : attendee.status === 'refunded'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-copper-500/20'
                } ${
                  selectedAttendees.has(attendee.ticketId) ? 'ring-2 ring-copper-500' : ''
                }`}
                data-testid={`attendee-card-${attendee.ticketId}`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header: Name + Status + Select */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white truncate">
                          {attendee.buyerName || 'N/A'}
                        </h3>
                        {attendee.isVip && <Star className="h-4 w-4 text-purple-400 flex-shrink-0" />}
                        {attendee.isBlocked && <ShieldOff className="h-4 w-4 text-red-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-copper-300 truncate">{attendee.tierName}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {attendee.status === 'used' && (
                        <Badge className="bg-green-600/90 text-white h-6 px-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Checked In
                        </Badge>
                      )}
                      {attendee.status === 'valid' && (
                        <Badge variant="outline" className="border-copper-500/30 text-copper-200 h-6 px-2 text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      {attendee.status === 'refunded' && (
                        <Badge variant="destructive" className="h-6 px-2 text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Refunded
                        </Badge>
                      )}
                      
                      <Checkbox
                        checked={selectedAttendees.has(attendee.ticketId)}
                        onCheckedChange={() => {
                          const newSelected = new Set(selectedAttendees);
                          if (newSelected.has(attendee.ticketId)) {
                            newSelected.delete(attendee.ticketId);
                          } else {
                            newSelected.add(attendee.ticketId);
                          }
                          setSelectedAttendees(newSelected);
                        }}
                        className="h-5 w-5"
                        data-testid={`checkbox-select-${attendee.ticketId}`}
                      />
                    </div>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <AtSign className="h-3.5 w-3.5 text-copper-300 flex-shrink-0" />
                      <span className="text-copper-200 truncate">{attendee.buyerEmail}</span>
                    </div>
                    {attendee.buyerPhone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3.5 w-3.5 text-copper-300 flex-shrink-0" />
                        <span className="text-copper-200">{attendee.buyerPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <QrCode className="h-3.5 w-3.5 text-copper-300 flex-shrink-0" />
                      <span className="text-copper-200 font-mono">{attendee.serial}</span>
                    </div>
                  </div>
                  
                  {/* Expandable Details */}
                  {expandedCard === attendee.ticketId && (
                    <div className="pt-2 border-t border-copper-500/20 space-y-2 text-xs">
                      {attendee.checkedInAt && (
                        <div>
                          <span className="text-copper-300">Checked in: </span>
                          <span className="text-white">
                            {format(new Date(attendee.checkedInAt), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-copper-300">Purchased: </span>
                        <span className="text-white">
                          {format(new Date(attendee.placedAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {attendee.tags && attendee.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {attendee.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs border-copper-500/30 text-copper-200">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {attendee.notes && (
                        <div className="p-2 rounded bg-black/40 border border-copper-500/20">
                          <p className="text-xs text-copper-200">{attendee.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action Footer */}
                  <div className="flex gap-2 pt-2">
                    {attendee.status === 'valid' && (
                      <Button
                        onClick={() => checkinMutation.mutate(attendee.qrToken)}
                        disabled={checkinMutation.isPending}
                        className="flex-1 h-11 bg-gradient-to-r from-[hsl(168,68%,42%)] to-[hsl(168,74%,35%)] hover:from-[hsl(168,68%,46%)] hover:to-[hsl(168,74%,39%)] text-white font-semibold shadow-md text-sm"
                        data-testid={`button-checkin-${attendee.ticketId}`}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => resendMutation.mutate({ ticketId: attendee.ticketId, email: attendee.buyerEmail })}
                      className="flex-1 h-11 border-copper-500/30 text-copper-200 hover:bg-copper-500/10 hover:text-white text-sm"
                      data-testid={`button-contact-${attendee.ticketId}`}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Resend
                    </Button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 border-copper-500/30 text-copper-200 hover:bg-copper-500/10 hover:text-white"
                          data-testid={`button-more-${attendee.ticketId}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-elevated border-copper-500/30 w-48">
                        <DropdownMenuItem 
                          onClick={() => setExpandedCard(expandedCard === attendee.ticketId ? null : attendee.ticketId)}
                          className="cursor-pointer text-white hover:bg-copper-500/10"
                        >
                          <ChevronDown className={`h-4 w-4 mr-2 text-copper-300 transition-transform ${expandedCard === attendee.ticketId ? 'rotate-180' : ''}`} />
                          {expandedCard === attendee.ticketId ? 'Hide' : 'Show'} Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-copper-500/20" />
                        <DropdownMenuItem 
                          onClick={() => handleEdit(attendee)}
                          className="cursor-pointer text-white hover:bg-copper-500/10"
                        >
                          <Edit className="h-4 w-4 mr-2 text-copper-300" />
                          Edit Info
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleNotes(attendee)}
                          className="cursor-pointer text-white hover:bg-copper-500/10"
                        >
                          <MessageSquare className="h-4 w-4 mr-2 text-copper-300" />
                          Notes & Tags
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleVIP(attendee)}
                          className="cursor-pointer text-white hover:bg-copper-500/10"
                        >
                          <Star className="h-4 w-4 mr-2 text-purple-400" />
                          {attendee.isVip ? 'Remove VIP' : 'Mark as VIP'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-copper-500/20" />
                        <DropdownMenuItem 
                          onClick={() => handleTransfer(attendee)}
                          className="cursor-pointer text-white hover:bg-copper-500/10"
                        >
                          <UserPlus className="h-4 w-4 mr-2 text-copper-300" />
                          Transfer Ticket
                        </DropdownMenuItem>
                        {attendee.status !== 'refunded' && (
                          <DropdownMenuItem 
                            onClick={() => handleRefund(attendee)}
                            className="cursor-pointer text-red-400 hover:bg-red-500/10"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Process Refund
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleToggleBlock(attendee)}
                          className="cursor-pointer text-orange-400 hover:bg-orange-500/10"
                        >
                          {attendee.isBlocked ? <Shield className="h-4 w-4 mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                          {attendee.isBlocked ? 'Unblock' : 'Block'} Attendee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
          </TabsContent>
          
          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-4 mt-4">
            <Card className="glass-elevated border-copper-500/30">
              <CardContent className="p-4 md:p-6 space-y-4">
                <div>
                  <h3 className="font-fraunces text-lg text-white mb-2">Send Message to Attendees</h3>
                  <p className="text-sm text-copper-300 mb-4">
                    {selectedAttendees.size > 0 
                      ? `Compose a message to ${selectedAttendees.size} selected attendee(s)`
                      : 'Select attendees from the list to send them a message'}
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="msg-subject" className="text-white">Subject</Label>
                    <Input
                      id="msg-subject"
                      placeholder="Enter email subject..."
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                      className="bg-black/40 border-copper-500/30 text-white"
                      disabled={selectedAttendees.size === 0}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="msg-content" className="text-white">Message</Label>
                    <Textarea
                      id="msg-content"
                      placeholder="Enter your message..."
                      className="min-h-[150px] bg-black/40 border-copper-500/30 text-white"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      disabled={selectedAttendees.size === 0}
                    />
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (selectedAttendees.size === 0) {
                        toast({
                          title: "No attendees selected",
                          description: "Please select attendees from the list first",
                          variant: "destructive"
                        });
                        return;
                      }
                      toast({
                        title: "Emails Sent",
                        description: `Message sent to ${selectedAttendees.size} attendees`
                      });
                      setSelectedAttendees(new Set());
                      setMessageSubject("");
                      setMessageContent("");
                    }}
                    disabled={selectedAttendees.size === 0 || !messageSubject || !messageContent || refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                    className="w-full h-12 bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-white font-semibold"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message to {selectedAttendees.size || 0} Attendee{selectedAttendees.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Bulk Actions Tab */}
          <TabsContent value="bulk" className="space-y-4 mt-4">
            <Card className="glass-elevated border-copper-500/30">
              <CardContent className="p-4 md:p-6 space-y-4">
                <div>
                  <h3 className="font-fraunces text-lg text-white mb-2">Bulk Operations</h3>
                  <p className="text-sm text-copper-300 mb-4">
                    {selectedAttendees.size > 0 
                      ? `Apply bulk actions to ${selectedAttendees.size} selected attendee(s)`
                      : 'Select attendees from the list to perform bulk operations'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-14 border-copper-500/30 text-white hover:bg-copper-500/10 justify-start"
                    disabled={selectedAttendees.size === 0 || refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                    onClick={() => {
                      toast({
                        title: "Tags Added",
                        description: `Tags added to ${selectedAttendees.size} attendees`
                      });
                      setSelectedAttendees(new Set());
                    }}
                  >
                    <Tag className="h-5 w-5 mr-3 text-copper-300" />
                    <div className="text-left">
                      <div className="font-semibold">Add Tags</div>
                      <div className="text-xs text-copper-300">Tag multiple attendees</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-14 border-copper-500/30 text-white hover:bg-copper-500/10 justify-start"
                    disabled={selectedAttendees.size === 0 || refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                    onClick={() => {
                      toast({
                        title: "VIP Status Updated",
                        description: `Marked ${selectedAttendees.size} attendees as VIP`
                      });
                      setSelectedAttendees(new Set());
                    }}
                  >
                    <Star className="h-5 w-5 mr-3 text-purple-400" />
                    <div className="text-left">
                      <div className="font-semibold">Mark as VIP</div>
                      <div className="text-xs text-copper-300">VIP status for selected</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-14 border-copper-500/30 text-white hover:bg-copper-500/10 justify-start"
                    disabled={selectedAttendees.size === 0 || refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                    onClick={() => {
                      handleExport('csv');
                      setSelectedAttendees(new Set());
                    }}
                  >
                    <Download className="h-5 w-5 mr-3 text-copper-300" />
                    <div className="text-left">
                      <div className="font-semibold">Export Selected</div>
                      <div className="text-xs text-copper-300">Download as CSV</div>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-14 border-copper-500/30 text-white hover:bg-copper-500/10 justify-start"
                    disabled={selectedAttendees.size === 0 || refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                    onClick={() => setMessageDialogOpen(true)}
                  >
                    <Mail className="h-5 w-5 mr-3 text-copper-300" />
                    <div className="text-left">
                      <div className="font-semibold">Send Email</div>
                      <div className="text-xs text-copper-300">Message selected attendees</div>
                    </div>
                  </Button>
                </div>
                
                <Separator className="bg-copper-500/20" />
                
                <div>
                  <h4 className="font-semibold text-white mb-3">Quick Stats</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="p-3 rounded-lg bg-black/40 border border-copper-500/20">
                      <div className="text-xs text-copper-300">Selected</div>
                      <div className="text-lg font-bold text-white">{selectedAttendees.size}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-copper-500/20">
                      <div className="text-xs text-copper-300">Total Shown</div>
                      <div className="text-lg font-bold text-white">{filteredAttendees.length}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-copper-500/20">
                      <div className="text-xs text-copper-300">All Attendees</div>
                      <div className="text-lg font-bold text-white">{totalAttendees}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-copper-500/20">
                      <div className="text-xs text-copper-300">Checked In</div>
                      <div className="text-lg font-bold text-green-400">{checkedInCount}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Bottom Action Bar (Mobile Only) */}
      {selectedAttendees.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="glass-elevated border-t border-copper-500/30 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {selectedAttendees.size} selected
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setSelectedAttendees(new Set())}
                  className="h-auto p-0 text-xs text-copper-300 hover:text-white"
                  disabled={refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                >
                  Clear selection
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-copper-500/30 text-copper-200"
                disabled={refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                onClick={() => {
                  toast({
                    title: "Tags Added",
                    description: "Tags added to selected attendees"
                  });
                  setSelectedAttendees(new Set());
                }}
              >
                <Tag className="h-4 w-4 mr-2" />
                Tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 border-copper-500/30 text-copper-200"
                disabled={refundMutation.isPending || updateAttendeeMutation.isPending || transferMutation.isPending || resendMutation.isPending || checkinMutation.isPending}
                onClick={() => {
                  setMessageDialogOpen(true);
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="glass-elevated border-copper-500/30">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl text-white">Process Refund</DialogTitle>
            <DialogDescription className="text-copper-300">
              Issue a refund for ticket {selectedTicket?.serial}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <RadioGroup value={refundType} onValueChange={(v: any) => setRefundType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="text-white">Full Refund</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="text-white">Partial Refund</Label>
              </div>
            </RadioGroup>
            
            {refundType === 'partial' && (
              <div>
                <Label htmlFor="amount" className="text-white">Refund Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount..."
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="bg-black/40 border-copper-500/30 text-white"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="reason" className="text-white">Reason for Refund</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason..."
                className="min-h-[80px] bg-black/40 border-copper-500/30 text-white"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRefundDialogOpen(false)}
              className="border-copper-500/30 text-copper-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedTicket) {
                  toast({
                    title: "Error",
                    description: "No ticket selected",
                    variant: "destructive"
                  });
                  return;
                }
                refundMutation.mutate({
                  ticketId: selectedTicket.ticketId,
                  refundType,
                  refundAmount: refundType === 'partial' ? refundAmount : undefined,
                  reason: refundReason
                });
              }}
              disabled={refundMutation.isPending}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Attendee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-elevated border-copper-500/30">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl text-white">Edit Attendee Info</DialogTitle>
            <DialogDescription className="text-copper-300">
              Update contact information for {selectedTicket?.serial}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-white">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.buyerName || ""}
                onChange={(e) => setEditFormData({ ...editFormData, buyerName: e.target.value })}
                className="bg-black/40 border-copper-500/30 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-white">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.buyerEmail || ""}
                onChange={(e) => setEditFormData({ ...editFormData, buyerEmail: e.target.value })}
                className="bg-black/40 border-copper-500/30 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone" className="text-white">Phone</Label>
              <Input
                id="edit-phone"
                value={editFormData.buyerPhone || ""}
                onChange={(e) => setEditFormData({ ...editFormData, buyerPhone: e.target.value })}
                className="bg-black/40 border-copper-500/30 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              className="border-copper-500/30 text-copper-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAttendeeMutation.mutate({
                  ticketId: selectedTicket?.ticketId,
                  ...editFormData
                });
              }}
              className="bg-gradient-to-r from-copper-500 to-copper-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="glass-elevated border-copper-500/30">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl text-white">Transfer Ticket</DialogTitle>
            <DialogDescription className="text-copper-300">
              Transfer ticket {selectedTicket?.serial} to a new attendee
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="transfer-email" className="text-white">New Attendee Email</Label>
              <Input
                id="transfer-email"
                type="email"
                placeholder="Enter email..."
                value={transferEmail}
                onChange={(e) => setTransferEmail(e.target.value)}
                className="bg-black/40 border-copper-500/30 text-white"
              />
            </div>
            
            <div>
              <Label htmlFor="transfer-name" className="text-white">New Attendee Name</Label>
              <Input
                id="transfer-name"
                placeholder="Enter name..."
                value={transferName}
                onChange={(e) => setTransferName(e.target.value)}
                className="bg-black/40 border-copper-500/30 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setTransferDialogOpen(false)}
              className="border-copper-500/30 text-copper-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                transferMutation.mutate({
                  ticketId: selectedTicket?.ticketId,
                  newEmail: transferEmail,
                  newName: transferName
                });
              }}
              disabled={!transferEmail}
              className="bg-gradient-to-r from-copper-500 to-copper-600"
            >
              Transfer Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="glass-elevated border-copper-500/30">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl text-white">Notes & Tags</DialogTitle>
            <DialogDescription className="text-copper-300">
              Add notes and tags for ticket {selectedTicket?.serial}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes" className="text-white">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes..."
                className="min-h-[100px] bg-black/40 border-copper-500/30 text-white"
                value={attendeeNotes}
                onChange={(e) => setAttendeeNotes(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="tags" className="text-white">Tags (comma separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., speaker, sponsor, press"
                value={attendeeTags}
                onChange={(e) => setAttendeeTags(e.target.value)}
                className="bg-black/40 border-copper-500/30 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setNotesDialogOpen(false)}
              className="border-copper-500/30 text-copper-200"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAttendeeMutation.mutate({
                  ticketId: selectedTicket?.ticketId,
                  notes: attendeeNotes,
                  tags: attendeeTags.split(',').map(t => t.trim()).filter(t => t)
                });
              }}
              className="bg-gradient-to-r from-copper-500 to-copper-600"
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
