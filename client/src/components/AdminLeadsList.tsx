import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Download, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  package_code: string;
  duration: string;
  total_cents: number;
  status: 'new' | 'reviewing' | 'approved' | 'rejected';
  created_at: string;
  promo_applied: boolean;
  promo_code: string | null;
}

interface AdminLeadsListProps {
  sessionBased?: boolean;
}

export default function AdminLeadsList({ sessionBased = false }: AdminLeadsListProps) {
  const [filters, setFilters] = useState({
    status: '',
    package_code: '',
    search: '',
    date_from: '',
    date_to: ''
  });
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch leads with filters
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['admin-leads', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await fetch(`/admin/leads/api?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const result = await response.json();
      return result.leads || [];
    },
    enabled: true,
    retry: false
  });
  
  // Update lead status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, adminNotes }: { 
      leadId: string; 
      status: string; 
      adminNotes?: string;
    }) => {
      const response = await fetch(sessionBased ? `/admin/leads/api/${leadId}/status` : `/admin/leads/${leadId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionBased ? {} : { 'x-admin-key': '' })
        },
        ...(sessionBased ? { credentials: 'include' } : {}),
        body: JSON.stringify({ status, adminNotes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update lead status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      setSelectedLead(null);
    }
  });
  
  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    reviewing: 'bg-yellow-100 text-yellow-800', 
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };
  
  const packageNames = {
    events_spotlight: 'Events Spotlight',
    homepage_feature: 'Homepage Feature',
    full_feature: 'Full Feature'
  };
  
  return (
    <div className="space-y-6" data-testid="admin-leads-list">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger data-testid="filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.package_code}
              onValueChange={(value) => setFilters(prev => ({ ...prev, package_code: value }))}
            >
              <SelectTrigger data-testid="filter-package">
                <SelectValue placeholder="All Packages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Packages</SelectItem>
                <SelectItem value="events_spotlight">Events Spotlight</SelectItem>
                <SelectItem value="homepage_feature">Homepage Feature</SelectItem>
                <SelectItem value="full_feature">Full Feature</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Search business, contact, email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              data-testid="filter-search"
            />
            
            <Input
              type="date"
              placeholder="From date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              data-testid="filter-date-from"
            />
            
            <Input
              type="date"
              placeholder="To date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              data-testid="filter-date-to"
            />
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={() => setFilters({ status: '', package_code: '', search: '', date_from: '', date_to: '' })}
              variant="outline"
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
            <Button
              onClick={() => {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                  if (value) params.append(key, value);
                });
                params.append('export', 'csv');
                
                const url = `/admin/leads?${params}`;
                const link = document.createElement('a');
                link.href = url;
                link.download = `sponsor-leads-${new Date().toISOString().split('T')[0]}.csv`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              variant="outline"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sponsor Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No leads found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead: Lead) => (
                    <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                      <TableCell className="text-sm">
                        {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.business_name}</div>
                          <div className="text-sm text-gray-500">{lead.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{lead.contact_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {packageNames[lead.package_code as keyof typeof packageNames]}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {lead.duration}
                            {lead.promo_applied && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                PROMO
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        CA${(lead.total_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={statusColors[lead.status]}
                          data-testid={`status-${lead.status}`}
                        >
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                          data-testid={`button-view-${lead.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Lead Detail Dialog */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Lead Details: {selectedLead.business_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Business Name</label>
                    <div className="font-medium">{selectedLead.business_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Contact Person</label>
                    <div className="font-medium">{selectedLead.contact_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <div className="font-medium">{selectedLead.email}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Package Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Package</label>
                    <div className="font-medium">
                      {packageNames[selectedLead.package_code as keyof typeof packageNames]}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Duration</label>
                    <div className="font-medium capitalize">{selectedLead.duration}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <div className="font-medium text-lg">
                      CA${(selectedLead.total_cents / 100).toFixed(2)}
                      {selectedLead.promo_applied && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedLead.promo_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6 flex gap-2">
              <Select 
                onValueChange={(status) => {
                  updateStatusMutation.mutate({
                    leadId: selectedLead.id,
                    status,
                    adminNotes: `Status updated to ${status}`
                  });
                }}
              >
                <SelectTrigger className="w-48" data-testid="update-status-select">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewing">Reviewing</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={() => {
                  const url = `/admin/leads/${selectedLead.id}?export=csv`;
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `lead-${selectedLead.id}-${new Date().toISOString().split('T')[0]}.csv`;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                data-testid="button-export-lead"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}