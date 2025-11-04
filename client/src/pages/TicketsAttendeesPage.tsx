import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Users, Search, Download, Mail, Filter, 
  CheckCircle2, XCircle, RefreshCw, Send,
  UserCheck, Clock, ChevronDown
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}

export function TicketsAttendeesPage() {
  const [, params] = useRoute("/tickets/organizer/events/:eventId/attendees");
  const [, navigate] = useLocation();
  const eventId = params?.eventId;
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  
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
  
  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (qrToken: string) => {
      const response = await apiRequest('/api/tickets/check-in', {
        method: 'POST',
        body: JSON.stringify({ qrToken, eventId, checkInBy: 'manual' })
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Check-in Successful",
          description: "Attendee has been checked in"
        });
        refetch();
      } else {
        toast({
          title: "Check-in Failed",
          description: data.error || "Failed to check in ticket",
          variant: "destructive"
        });
      }
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ recipients, subject, message }: { recipients: string[]; subject: string; message: string }) => {
      const response = await apiRequest('/api/tickets/attendees/message', {
        method: 'POST',
        body: JSON.stringify({ eventId, recipients, subject, message })
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Message Sent",
          description: `Message sent to ${selectedAttendees.size} attendee(s)`
        });
        setMessageDialogOpen(false);
        setSelectedAttendees(new Set());
        setMessageContent("");
        setMessageSubject("");
      } else {
        toast({
          title: "Failed to Send",
          description: data.error || "Failed to send message",
          variant: "destructive"
        });
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
  const checkedInPercentage = totalAttendees > 0 ? (checkedInCount / totalAttendees) * 100 : 0;
  
  // Handle select all
  const handleSelectAll = () => {
    if (selectedAttendees.size === filteredAttendees.length) {
      setSelectedAttendees(new Set());
    } else {
      setSelectedAttendees(new Set(filteredAttendees.map(a => a.ticketId)));
    }
  };
  
  // Handle individual selection
  const handleSelectAttendee = (ticketId: string) => {
    const newSelected = new Set(selectedAttendees);
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId);
    } else {
      newSelected.add(ticketId);
    }
    setSelectedAttendees(newSelected);
  };
  
  // Handle send message
  const handleSendMessage = () => {
    const recipients = filteredAttendees
      .filter(a => selectedAttendees.has(a.ticketId))
      .map(a => a.buyerEmail);
    
    sendMessageMutation.mutate({
      recipients,
      subject: messageSubject,
      message: messageContent
    });
  };
  
  // Export attendees
  const handleExport = (format: 'csv' | 'excel') => {
    if (format === 'csv') {
      // Use CSV export endpoint
      window.open(`/api/tickets/events/${eventId}/attendees/export`, '_blank');
    } else {
      // Generate Excel-compatible CSV locally
      const data = filteredAttendees.map(a => ({
        'Name': a.buyerName || 'N/A',
        'Email': a.buyerEmail,
        'Phone': a.buyerPhone || 'N/A',
        'Ticket Tier': a.tierName,
        'Ticket ID': a.serial,
        'Status': a.status === 'used' ? 'Checked In' : 'Not Checked In',
        'Check-in Time': a.checkedInAt ? format(new Date(a.checkedInAt), 'yyyy-MM-dd HH:mm:ss') : '',
        'Checked in By': a.scannedBy || '',
        'Purchase Date': format(new Date(a.placedAt), 'yyyy-MM-dd HH:mm:ss')
      }));
      
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `attendees-${eventId}-${Date.now()}.csv`;
      link.click();
    }
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              <div className="text-2xl font-bold">{totalAttendees - checkedInCount}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Ticket Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tiers.length}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Attendee List</CardTitle>
            <CardDescription>
              Manage and communicate with event attendees
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <SelectItem value="valid">Not Checked In</SelectItem>
                  <SelectItem value="used">Checked In</SelectItem>
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
                  <Button variant="outline" data-testid="button-export-menu">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-2" />
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
              
              {selectedAttendees.size > 0 && (
                <Button
                  onClick={() => setMessageDialogOpen(true)}
                  data-testid="button-send-message"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Message ({selectedAttendees.size})
                </Button>
              )}
            </div>
            
            {/* Attendees Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Actions</TableHead>
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
                            onCheckedChange={() => handleSelectAttendee(attendee.ticketId)}
                            data-testid={`checkbox-${attendee.ticketId}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {attendee.buyerName || 'N/A'}
                        </TableCell>
                        <TableCell>{attendee.buyerEmail}</TableCell>
                        <TableCell>{attendee.buyerPhone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{attendee.tierName}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {attendee.serial}
                        </TableCell>
                        <TableCell>
                          {attendee.status === 'used' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Not Checked In
                            </Badge>
                          )}
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
                              variant="outline"
                              onClick={() => checkinMutation.mutate(attendee.qrToken)}
                              disabled={checkinMutation.isPending}
                              data-testid={`button-checkin-${attendee.ticketId}`}
                            >
                              Check In
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Send Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Send Message to Attendees</DialogTitle>
            <DialogDescription>
              Send an email message to {selectedAttendees.size} selected attendee(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Enter message subject..."
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                data-testid="input-message-subject"
              />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="h-32"
                data-testid="textarea-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageDialogOpen(false)}
              data-testid="button-cancel-message"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageSubject || !messageContent || sendMessageMutation.isPending}
              data-testid="button-send-message-confirm"
            >
              {sendMessageMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}