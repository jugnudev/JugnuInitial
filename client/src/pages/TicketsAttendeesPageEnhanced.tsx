import { useState } from "react";
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
  ArrowUpDown, Copy, FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
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
  
  // Fetch event details
  const { data: event } = useQuery({
    queryKey: ['/api/tickets/events', eventId],
    enabled: !!eventId
  });
  
  // Fetch attendees list
  const { data: attendeesData, isLoading, refetch } = useQuery<{ attendees: Attendee[] }>({
    queryKey: ['/api/tickets/events', eventId, 'attendees', filterStatus, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/tickets/events/${eventId}/attendees?${params}`);
      if (!response.ok) throw new Error('Failed to fetch attendees');
      return response.json();
    },
    enabled: !!eventId
  });
  
  // Process refund mutation
  const refundMutation = useMutation({
    mutationFn: async ({ ticketId, refundType, refundAmount, reason }: any) => {
      return apiRequest(`/api/tickets/${ticketId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ refundType, refundAmount, reason })
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Refund Processed",
          description: "The refund has been successfully processed"
        });
        setRefundDialogOpen(false);
        refetch();
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
      return apiRequest(`/api/tickets/attendees/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Attendee Updated",
          description: "Attendee information has been updated"
        });
        setEditDialogOpen(false);
        setNotesDialogOpen(false);
        refetch();
      }
    }
  });
  
  // Transfer ticket mutation
  const transferMutation = useMutation({
    mutationFn: async ({ ticketId, newEmail, newName }: any) => {
      return apiRequest(`/api/tickets/${ticketId}/transfer`, {
        method: 'PATCH',
        body: JSON.stringify({ newEmail, newName })
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Ticket Transferred",
          description: `Ticket transferred to ${transferEmail}`
        });
        setTransferDialogOpen(false);
        setTransferEmail("");
        setTransferName("");
        refetch();
      }
    }
  });
  
  // Resend ticket mutation
  const resendMutation = useMutation({
    mutationFn: async ({ ticketId, email }: any) => {
      return apiRequest(`/api/tickets/${ticketId}/resend`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Ticket Resent",
          description: data.message
        });
      }
    }
  });
  
  // Send bulk email mutation
  const sendBulkEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/tickets/attendees/bulk-email', {
        method: 'POST',
        body: JSON.stringify({ ...data, eventId })
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Emails Sent",
          description: `Email sent to ${data.communication?.recipientCount || 0} recipients`
        });
        setMessageDialogOpen(false);
        setMessageContent("");
        setMessageSubject("");
        setSelectedAttendees(new Set());
      }
    }
  });
  
  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      return apiRequest('/api/tickets/check-in', {
        method: 'POST',
        body: JSON.stringify({ qrToken, eventId, checkInBy: 'manual' })
      });
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Check-in Successful",
          description: "Attendee has been checked in"
        });
        refetch();
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
  const handleExport = (format: 'csv' | 'excel') => {
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-fraunces mb-2">Attendee Management</h1>
            <p className="text-muted-foreground">{event?.event?.title}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/tickets/organizer/events/${eventId}/analytics`)}
              data-testid="button-analytics"
            >
              <FileText className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/tickets/organizer/events/${eventId}/checkin`)}
              data-testid="button-checkin-mode"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Check-in Mode
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttendees}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{checkedInCount}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {checkedInPercentage.toFixed(0)}% complete
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Not Checked In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAttendees - checkedInCount - refundedCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Refunded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{refundedCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">VIP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{vipCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{blockedCount}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list">Attendee List</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendees</CardTitle>
                <CardDescription>
                  Manage individual attendees and their tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or ticket ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]" data-testid="select-status">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="used">Checked In</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterTier} onValueChange={setFilterTier}>
                    <SelectTrigger className="w-[180px]" data-testid="select-tier">
                      <SelectValue placeholder="Filter by tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {tiers.map(tier => (
                        <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('csv')}>
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('excel')}>
                        Export for Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Table */}
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0}
                            onCheckedChange={() => {
                              if (selectedAttendees.size === filteredAttendees.length) {
                                setSelectedAttendees(new Set());
                              } else {
                                setSelectedAttendees(new Set(filteredAttendees.map(a => a.ticketId)));
                              }
                            }}
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            Loading attendees...
                          </TableCell>
                        </TableRow>
                      ) : filteredAttendees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No attendees found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAttendees.map((attendee) => (
                          <TableRow key={attendee.ticketId}>
                            <TableCell>
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
                                data-testid={`checkbox-select-${attendee.ticketId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {attendee.buyerName || "N/A"}
                                {attendee.isVip && <Star className="h-4 w-4 text-purple-600" />}
                                {attendee.isBlocked && <ShieldOff className="h-4 w-4 text-red-600" />}
                              </div>
                            </TableCell>
                            <TableCell>{attendee.buyerEmail}</TableCell>
                            <TableCell>{attendee.tierName}</TableCell>
                            <TableCell className="font-mono text-sm">{attendee.serial}</TableCell>
                            <TableCell>
                              {attendee.status === 'used' && (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Checked In
                                </Badge>
                              )}
                              {attendee.status === 'valid' && (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Not Checked In
                                </Badge>
                              )}
                              {attendee.status === 'refunded' && (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Refunded
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {attendee.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="mr-1">
                                  {tag}
                                </Badge>
                              ))}
                            </TableCell>
                            <TableCell>
                              {attendee.checkedInAt ? format(new Date(attendee.checkedInAt), 'HH:mm:ss') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {attendee.status === 'valid' && (
                                    <DropdownMenuItem onClick={() => checkinMutation.mutate(attendee.qrToken)}>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Check In
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleEdit(attendee)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Info
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleNotes(attendee)}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Notes & Tags
                                  </DropdownMenuItem>
                                  {attendee.status !== 'refunded' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleRefund(attendee)}>
                                        <DollarSign className="h-4 w-4 mr-2" />
                                        Process Refund
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleTransfer(attendee)}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Transfer Ticket
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => resendMutation.mutate({ ticketId: attendee.ticketId, email: attendee.buyerEmail })}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Resend Ticket
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleToggleVIP(attendee)}>
                                    <Star className="h-4 w-4 mr-2" />
                                    {attendee.isVip ? 'Remove VIP' : 'Mark as VIP'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleBlock(attendee)}>
                                    {attendee.isBlocked ? (
                                      <>
                                        <Shield className="h-4 w-4 mr-2" />
                                        Unblock
                                      </>
                                    ) : (
                                      <>
                                        <ShieldOff className="h-4 w-4 mr-2" />
                                        Block
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="communication" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Email Communication</CardTitle>
                <CardDescription>
                  Send emails to selected attendees or filter by criteria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label>Recipients</Label>
                    <RadioGroup defaultValue="selected">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="selected" id="r1" />
                        <label htmlFor="r1">Selected attendees ({selectedAttendees.size})</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="r2" />
                        <label htmlFor="r2">All attendees ({totalAttendees})</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="checkedin" id="r3" />
                        <label htmlFor="r3">Checked-in attendees ({checkedInCount})</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="notcheckedin" id="r4" />
                        <label htmlFor="r4">Not checked-in ({totalAttendees - checkedInCount})</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vip" id="r5" />
                        <label htmlFor="r5">VIP attendees ({vipCount})</label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject..."
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Enter your message..."
                      className="min-h-[200px]"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        sendBulkEmailMutation.mutate({
                          subject: messageSubject,
                          message: messageContent,
                          recipientFilter: { status: 'valid' },
                          testMode: true
                        });
                      }}
                    >
                      Send Test Email
                    </Button>
                    <Button
                      onClick={() => {
                        sendBulkEmailMutation.mutate({
                          subject: messageSubject,
                          message: messageContent,
                          recipientFilter: { status: 'valid' }
                        });
                      }}
                      disabled={!messageSubject || !messageContent}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="bulk" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bulk Actions</CardTitle>
                <CardDescription>
                  Perform actions on multiple attendees at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      You have {selectedAttendees.size} attendees selected
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="justify-start"
                      disabled={selectedAttendees.size === 0}
                      onClick={() => {
                        // Mark selected as VIP
                        selectedAttendees.forEach(ticketId => {
                          updateAttendeeMutation.mutate({ ticketId, isVip: true });
                        });
                      }}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Mark as VIP
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      disabled={selectedAttendees.size === 0}
                      onClick={() => {
                        // Remove VIP from selected
                        selectedAttendees.forEach(ticketId => {
                          updateAttendeeMutation.mutate({ ticketId, isVip: false });
                        });
                      }}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Remove VIP Status
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      disabled={selectedAttendees.size === 0}
                      onClick={() => {
                        // Add tag to selected
                        const tag = prompt("Enter tag to add:");
                        if (tag) {
                          selectedAttendees.forEach(ticketId => {
                            const attendee = filteredAttendees.find(a => a.ticketId === ticketId);
                            if (attendee) {
                              const tags = [...(attendee.tags || []), tag];
                              updateAttendeeMutation.mutate({ ticketId, tags });
                            }
                          });
                        }
                      }}
                    >
                      <Tag className="h-4 w-4 mr-2" />
                      Add Tag
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="justify-start"
                      disabled={selectedAttendees.size === 0}
                      onClick={() => setMessageDialogOpen(true)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email to Selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Dialogs */}
        
        {/* Refund Dialog */}
        <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Refund</DialogTitle>
              <DialogDescription>
                Refund ticket {selectedTicket?.serial}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Refund Type</Label>
                <RadioGroup value={refundType} onValueChange={(v: any) => setRefundType(v)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="full" />
                    <label htmlFor="full">Full Refund</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="partial" id="partial" />
                    <label htmlFor="partial">Partial Refund</label>
                  </div>
                </RadioGroup>
              </div>
              
              {refundType === 'partial' && (
                <div>
                  <Label htmlFor="amount">Refund Amount (cents)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount in cents..."
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter refund reason..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  refundMutation.mutate({
                    ticketId: selectedTicket?.ticketId,
                    refundType,
                    refundAmount: refundType === 'partial' ? parseInt(refundAmount) : undefined,
                    reason: refundReason
                  });
                }}
              >
                Process Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Attendee Information</DialogTitle>
              <DialogDescription>
                Update attendee details for ticket {selectedTicket?.serial}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.buyerName}
                  onChange={(e) => setEditFormData({ ...editFormData, buyerName: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.buyerEmail}
                  onChange={(e) => setEditFormData({ ...editFormData, buyerEmail: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.buyerPhone}
                  onChange={(e) => setEditFormData({ ...editFormData, buyerPhone: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateAttendeeMutation.mutate({
                    ticketId: selectedTicket?.ticketId,
                    ...editFormData
                  });
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Ticket</DialogTitle>
              <DialogDescription>
                Transfer ticket {selectedTicket?.serial} to a new attendee
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="transfer-email">New Attendee Email</Label>
                <Input
                  id="transfer-email"
                  type="email"
                  placeholder="Enter email..."
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="transfer-name">New Attendee Name</Label>
                <Input
                  id="transfer-name"
                  placeholder="Enter name..."
                  value={transferName}
                  onChange={(e) => setTransferName(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
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
              >
                Transfer Ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notes & Tags</DialogTitle>
              <DialogDescription>
                Add notes and tags for ticket {selectedTicket?.serial}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes..."
                  className="min-h-[100px]"
                  value={attendeeNotes}
                  onChange={(e) => setAttendeeNotes(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., speaker, sponsor, press"
                  value={attendeeTags}
                  onChange={(e) => setAttendeeTags(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
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
              >
                Save Notes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}