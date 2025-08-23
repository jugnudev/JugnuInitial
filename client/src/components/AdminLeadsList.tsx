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
import { Eye, Download, Search, Filter, Users, ExternalLink, Send, RotateCw, X, CheckCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Lead {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  instagram?: string;
  website?: string;
  package_code: string;
  duration: string;
  total_cents: number;
  status: 'new' | 'reviewing' | 'approved' | 'onboarding_sent' | 'onboarded' | 'rejected';
  created_at: string;
  promo_applied: boolean;
  promo_code: string | null;
  desktop_asset_url?: string;
  mobile_asset_url?: string;
  creative_links?: string;
  onboarding_token?: string;
  onboarding_expires_at?: string;
  onboarding_used_at?: string;
  source_campaign_id?: string;
}

interface AdminLeadsListProps {
  adminKey: string;
}

export default function AdminLeadsList({ adminKey }: AdminLeadsListProps) {
  const [filters, setFilters] = useState({
    status: 'all',
    package_code: 'all',
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
        if (value && value !== 'all') params.append(key, value);
      });
      
      const response = await fetch(`/api/admin/leads?${params}`, {
        headers: { 'x-admin-key': adminKey }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      
      const result = await response.json();
      return result.leads;
    }
  });
  
  // Update lead status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, adminNotes }: { 
      leadId: string; 
      status: string; 
      adminNotes?: string;
    }) => {
      const response = await fetch(`/api/admin/leads/${leadId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
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
  
  // Approve lead mutation
  const approveMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/admin/leads/${leadId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to approve lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
    }
  });
  
  // Resend onboarding mutation
  const resendOnboardingMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/admin/leads/${leadId}/resend-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to resend onboarding');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
    }
  });
  
  // Revoke onboarding mutation
  const revokeOnboardingMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/admin/leads/${leadId}/revoke-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke onboarding');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
    }
  });
  
  const statusColors = {
    new: 'bg-blue-600 text-blue-100',
    reviewing: 'bg-yellow-600 text-yellow-100', 
    approved: 'bg-green-600 text-green-100',
    onboarding_sent: 'bg-purple-600 text-purple-100',
    onboarded: 'bg-indigo-600 text-indigo-100',
    rejected: 'bg-red-600 text-red-100'
  };
  
  const packageNames = {
    events_spotlight: 'Events Spotlight',
    homepage_feature: 'Homepage Feature',
    full_feature: 'Full Feature'
  };
  
  return (
    <div className="space-y-6" data-testid="admin-leads-list">
      {/* Filters */}
      <Card className="border border-gray-800 bg-gray-900/50 backdrop-blur shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="h-5 w-5 text-orange-400" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="filter-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white focus:bg-gray-700">All Statuses</SelectItem>
                <SelectItem value="new" className="text-white focus:bg-gray-700">New</SelectItem>
                <SelectItem value="reviewing" className="text-white focus:bg-gray-700">Reviewing</SelectItem>
                <SelectItem value="approved" className="text-white focus:bg-gray-700">Approved</SelectItem>
                <SelectItem value="onboarding_sent" className="text-white focus:bg-gray-700">Onboarding Sent</SelectItem>
                <SelectItem value="onboarded" className="text-white focus:bg-gray-700">Onboarded</SelectItem>
                <SelectItem value="rejected" className="text-white focus:bg-gray-700">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.package_code}
              onValueChange={(value) => setFilters(prev => ({ ...prev, package_code: value }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white" data-testid="filter-package">
                <SelectValue placeholder="All Packages" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white focus:bg-gray-700">All Packages</SelectItem>
                <SelectItem value="events_spotlight" className="text-white focus:bg-gray-700">Events Spotlight</SelectItem>
                <SelectItem value="homepage_feature" className="text-white focus:bg-gray-700">Homepage Feature</SelectItem>
                <SelectItem value="full_feature" className="text-white focus:bg-gray-700">Full Feature</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              placeholder="Search business, contact, email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              data-testid="filter-search"
            />
            
            <Input
              type="date"
              placeholder="From date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
              data-testid="filter-date-from"
            />
            
            <Input
              type="date"
              placeholder="To date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
              data-testid="filter-date-to"
            />
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={() => setFilters({ status: 'all', package_code: 'all', search: '', date_from: '', date_to: '' })}
              variant="outline"
              className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
            <Button
              onClick={async () => {
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                  if (value && value !== 'all') params.append(key, value);
                });
                params.append('export', 'csv');
                
                try {
                  const response = await fetch(`/api/admin/leads?${params}`, {
                    headers: { 'x-admin-key': adminKey }
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to export CSV');
                  }
                  
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `sponsor-leads-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('CSV export failed:', error);
                  alert('Failed to export CSV. Please try again.');
                }
              }}
              variant="outline"
              className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Leads Table */}
      <Card className="border border-gray-800 bg-gray-900/50 backdrop-blur shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-orange-400" />
            Sponsor Leads ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-white">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No leads found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Created</TableHead>
                    <TableHead className="text-gray-300">Business</TableHead>
                    <TableHead className="text-gray-300">Contact</TableHead>
                    <TableHead className="text-gray-300">Package</TableHead>
                    <TableHead className="text-gray-300">Total</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead: Lead) => (
                    <TableRow key={lead.id} className="border-gray-700 hover:bg-gray-800/50" data-testid={`lead-row-${lead.id}`}>
                      <TableCell className="text-sm text-gray-300">
                        {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{lead.business_name}</div>
                          <div className="text-sm text-gray-400">{lead.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{lead.contact_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">
                            {packageNames[lead.package_code as keyof typeof packageNames]}
                          </div>
                          <div className="text-sm text-gray-400 capitalize">
                            {lead.duration}
                            {lead.promo_applied && (
                              <Badge variant="secondary" className="ml-2 text-xs bg-green-600 text-green-100">
                                PROMO
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        CA${(lead.total_cents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${statusColors[lead.status]} border-0`}
                          data-testid={`status-${lead.status}`}
                        >
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
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
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                Lead Details: {selectedLead.business_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-gray-700 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Business Name</label>
                    <div className="font-medium text-white">{selectedLead.business_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Contact Person</label>
                    <div className="font-medium text-white">{selectedLead.contact_name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <div className="font-medium text-white">{selectedLead.email}</div>
                  </div>
                  {selectedLead.website && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Website</label>
                      <div className="font-medium text-white">
                        <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {selectedLead.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedLead.instagram && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Instagram</label>
                      <div className="font-medium text-white">{selectedLead.instagram}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="border-gray-700 bg-gray-800/50">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Package Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Package</label>
                    <div className="font-medium text-white">
                      {packageNames[selectedLead.package_code as keyof typeof packageNames]}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Duration</label>
                    <div className="font-medium capitalize text-white">{selectedLead.duration}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Total Amount</label>
                    <div className="font-medium text-lg text-white">
                      CA${(selectedLead.total_cents / 100).toFixed(2)}
                      {selectedLead.promo_applied && (
                        <Badge variant="secondary" className="ml-2 bg-green-600 text-green-100">
                          {selectedLead.promo_code}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Creative Assets Section */}
            {(selectedLead.desktop_asset_url || selectedLead.mobile_asset_url) && (
              <Card className="border-gray-700 bg-gray-800/50 mt-6">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Creative Assets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLead.desktop_asset_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Desktop Creative</label>
                      <div className="mt-2">
                        <a 
                          href={selectedLead.desktop_asset_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Desktop Asset
                        </a>
                        {selectedLead.desktop_asset_url.includes('supabase') && (
                          <div className="mt-2">
                            <img 
                              src={selectedLead.desktop_asset_url} 
                              alt="Desktop Creative"
                              className="max-w-md rounded border border-gray-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedLead.mobile_asset_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Mobile Creative</label>
                      <div className="mt-2">
                        <a 
                          href={selectedLead.mobile_asset_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Mobile Asset
                        </a>
                        {selectedLead.mobile_asset_url.includes('supabase') && (
                          <div className="mt-2">
                            <img 
                              src={selectedLead.mobile_asset_url} 
                              alt="Mobile Creative"
                              className="max-w-xs rounded border border-gray-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedLead.creative_links && (
                    <div>
                      <label className="text-sm font-medium text-gray-400">Additional Creative Links</label>
                      <div className="mt-1">
                        <a 
                          href={`https://${selectedLead.creative_links}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {selectedLead.creative_links}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Action Buttons */}
            <div className="mt-6 space-y-4">
              {/* Approval Actions */}
              {['new', 'reviewing'].includes(selectedLead.status) && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      if (confirm('Approve this lead and send onboarding email?')) {
                        approveMutation.mutate(selectedLead.id);
                      }
                    }}
                    disabled={approveMutation.isPending}
                    data-testid="button-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Send Onboarding
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Reject this lead?')) {
                        updateStatusMutation.mutate({
                          leadId: selectedLead.id,
                          status: 'rejected',
                          adminNotes: 'Lead rejected'
                        });
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-reject"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
              
              {/* Onboarding Actions */}
              {['approved', 'onboarding_sent'].includes(selectedLead.status) && selectedLead.onboarding_token && (
                <div className="space-y-2">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <label className="text-sm font-medium text-gray-400">Onboarding Link</label>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-xs text-blue-400 break-all">
                        {process.env.APP_BASE_URL || window.location.origin}/onboard/{selectedLead.onboarding_token}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${process.env.APP_BASE_URL || window.location.origin}/onboard/${selectedLead.onboarding_token}`
                          );
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {selectedLead.onboarding_expires_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {format(new Date(selectedLead.onboarding_expires_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm('Resend onboarding email with new token?')) {
                          resendOnboardingMutation.mutate(selectedLead.id);
                        }
                      }}
                      disabled={resendOnboardingMutation.isPending}
                      data-testid="button-resend-onboarding"
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Resend Onboarding
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="text-red-500 hover:text-red-400"
                      onClick={() => {
                        if (confirm('Revoke onboarding token? The link will stop working.')) {
                          revokeOnboardingMutation.mutate(selectedLead.id);
                        }
                      }}
                      disabled={revokeOnboardingMutation.isPending}
                      data-testid="button-revoke-onboarding"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Revoke Token
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Campaign Links */}
              {selectedLead.source_campaign_id && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/admin/campaigns/${selectedLead.source_campaign_id}`, '_blank')}
                    data-testid="button-open-campaign"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Campaign
                  </Button>
                </div>
              )}
              
              {/* Other Actions */}
              <div className="flex gap-2">
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
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="onboarding_sent">Onboarding Sent</SelectItem>
                    <SelectItem value="onboarded">Onboarded</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = `/api/admin/leads/${selectedLead.id}?export=csv`;
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}