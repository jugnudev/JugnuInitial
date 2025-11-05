import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import AdminNav from '@/components/AdminNav';
import { 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface OrganizerApplication {
  id: string;
  userId: string;
  businessName: string;
  businessWebsite?: string;
  businessDescription: string;
  businessType: 'event_organizer' | 'venue' | 'artist' | 'promoter' | 'other';
  yearsExperience?: number;
  sampleEvents?: string;
  socialMediaHandles?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  businessEmail: string;
  businessPhone?: string;
  businessAddress?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  user?: {
    email: string;
    fullName?: string;
  } | null;
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  event_organizer: 'Event Organizer',
  venue: 'Venue',
  artist: 'Artist/Performer',
  promoter: 'Promoter',
  other: 'Other'
};

export default function AdminOrganizers() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });
  const [selectedApplication, setSelectedApplication] = useState<OrganizerApplication | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Check authentication
  const { data: authCheck, refetch: checkAuth } = useQuery({
    queryKey: ['admin-organizer-auth', adminKey],
    queryFn: async () => {
      if (!adminKey.trim()) return null;
      
      const response = await fetch('/api/admin/organizers/pending', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Invalid admin key');
      }
      
      return true;
    },
    enabled: false,
    retry: false
  });

  useEffect(() => {
    if (authCheck) {
      try {
        localStorage.setItem('adminKey', adminKey);
      } catch (e) {
        console.warn('Failed to save admin key to localStorage:', e);
      }
      setIsAuthenticated(true);
    }
  }, [authCheck, adminKey]);

  // Fetch pending applications
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['/api/admin/organizers/pending'],
    queryFn: async () => {
      const response = await fetch('/api/admin/organizers/pending', {
        headers: { 'x-admin-key': adminKey.trim() }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      return response.json();
    },
    enabled: isAuthenticated
  });

  const applications = applicationsData?.applications || [];

  // Approve application mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(`/api/admin/organizers/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim()
        },
        body: JSON.stringify({ adminNotes: notes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve application');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizers/pending'] });
      toast({
        title: 'Application Approved',
        description: 'The business account application has been approved successfully.',
      });
      setIsApproveDialogOpen(false);
      setAdminNotes('');
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve application.',
        variant: 'destructive',
      });
    }
  });

  // Reject application mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const response = await fetch(`/api/admin/organizers/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey.trim()
        },
        body: JSON.stringify({ adminNotes: notes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject application');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizers/pending'] });
      toast({
        title: 'Application Rejected',
        description: 'The business account application has been rejected.',
      });
      setIsRejectDialogOpen(false);
      setAdminNotes('');
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject application.',
        variant: 'destructive',
      });
    }
  });

  const handleApprove = (application: OrganizerApplication) => {
    setSelectedApplication(application);
    setAdminNotes('');
    setIsApproveDialogOpen(true);
  };

  const handleReject = (application: OrganizerApplication) => {
    setSelectedApplication(application);
    setAdminNotes('');
    setIsRejectDialogOpen(true);
  };

  const handleViewDetails = (application: OrganizerApplication) => {
    setSelectedApplication(application);
    setIsDetailsDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedApplication) {
      approveMutation.mutate({
        id: selectedApplication.id,
        notes: adminNotes
      });
    }
  };

  const confirmReject = () => {
    if (selectedApplication) {
      rejectMutation.mutate({
        id: selectedApplication.id,
        notes: adminNotes
      });
    }
  };

  // Admin key entry form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border border-copper-500/30 shadow-2xl shadow-copper-500/20">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 rounded-full bg-copper-500/20 ring-4 ring-copper-500/10">
                  <Shield className="w-8 h-8 text-copper-500" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-white">
                Admin Access
              </CardTitle>
              <p className="text-center text-gray-400 text-sm">
                Business Account Management
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="space-y-2">
                <Label htmlFor="adminKey" className="text-sm font-medium text-gray-300">
                  Admin Key
                </Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && adminKey.trim() && checkAuth()}
                  placeholder="Enter your admin key"
                  className="h-12 bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20"
                  data-testid="input-admin-key"
                  autoComplete="off"
                />
              </div>
              <Button 
                onClick={() => checkAuth()} 
                disabled={!adminKey.trim()}
                className="w-full h-12 bg-gradient-to-r from-copper-500 to-orange-600 hover:from-copper-600 hover:to-orange-700 !text-white font-bold text-base shadow-xl shadow-copper-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-login"
              >
                Access Admin Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6 text-copper-500" />
          <h1 className="text-2xl font-bold text-white">Business Account Applications</h1>
          <Badge variant="secondary" className="bg-copper-500/20 text-copper-500">
            {applications.length} Pending
          </Badge>
        </div>

        {isLoading ? (
          <Card className="bg-black/60 border-copper-500/20">
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-copper-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white/80">Loading applications...</p>
            </CardContent>
          </Card>
        ) : applications.length === 0 ? (
          <Card className="bg-black/60 border-copper-500/20">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Pending Applications</h3>
              <p className="text-white/70">All business account applications have been processed.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((application: OrganizerApplication) => (
              <Card key={application.id} className="bg-black/60 border-copper-500/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Building2 className="w-5 h-5 text-copper-500" />
                        <h3 className="text-lg font-semibold text-white">
                          {application.businessName}
                        </h3>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                          {BUSINESS_TYPE_LABELS[application.businessType]}
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Mail className="w-4 h-4" />
                            <span>{application.businessEmail}</span>
                          </div>
                          {application.businessPhone && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Phone className="w-4 h-4" />
                              <span>{application.businessPhone}</span>
                            </div>
                          )}
                          {application.businessWebsite && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Globe className="w-4 h-4" />
                              <a
                                href={application.businessWebsite}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-copper-500 hover:text-copper-400 flex items-center gap-1"
                              >
                                {application.businessWebsite}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-white/70">
                            <Clock className="w-4 h-4" />
                            <span>Applied {(() => {
                              try {
                                if (!application.createdAt) return 'Unknown date';
                                const date = new Date(application.createdAt);
                                if (isNaN(date.getTime())) return 'Unknown date';
                                return format(date, 'MMM d, yyyy');
                              } catch (error) {
                                return 'Unknown date';
                              }
                            })()}</span>
                          </div>
                          {application.yearsExperience && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Briefcase className="w-4 h-4" />
                              <span>{application.yearsExperience} years experience</span>
                            </div>
                          )}
                          {application.businessAddress && (
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <MapPin className="w-4 h-4" />
                              <span>{application.businessAddress}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-white/80 line-clamp-2">
                          {application.businessDescription}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(application)}
                        className="border-white/20 text-white/80 hover:bg-white/10"
                        data-testid={`button-view-${application.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(application)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        data-testid={`button-approve-${application.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(application)}
                        data-testid={`button-reject-${application.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Application Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl bg-black border-copper-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-copper-500">Application Details</DialogTitle>
              <DialogDescription className="text-white/70">
                Full information for {selectedApplication?.businessName}
              </DialogDescription>
            </DialogHeader>
            
            {selectedApplication && (
              <div className="space-y-6 max-h-96 overflow-y-auto">
                <div>
                  <h4 className="font-semibold text-white mb-2">Business Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Business Name:</span>
                      <p className="text-white">{selectedApplication.businessName}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Business Type:</span>
                      <p className="text-white">{BUSINESS_TYPE_LABELS[selectedApplication.businessType]}</p>
                    </div>
                    <div>
                      <span className="text-white/60">Email:</span>
                      <p className="text-white">{selectedApplication.businessEmail}</p>
                    </div>
                    {selectedApplication.businessPhone && (
                      <div>
                        <span className="text-white/60">Phone:</span>
                        <p className="text-white">{selectedApplication.businessPhone}</p>
                      </div>
                    )}
                    {selectedApplication.businessWebsite && (
                      <div className="col-span-2">
                        <span className="text-white/60">Website:</span>
                        <p className="text-white break-all">{selectedApplication.businessWebsite}</p>
                      </div>
                    )}
                    {selectedApplication.businessAddress && (
                      <div className="col-span-2">
                        <span className="text-white/60">Address:</span>
                        <p className="text-white">{selectedApplication.businessAddress}</p>
                      </div>
                    )}
                    {selectedApplication.yearsExperience && (
                      <div>
                        <span className="text-white/60">Years Experience:</span>
                        <p className="text-white">{selectedApplication.yearsExperience}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Description</h4>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">
                    {selectedApplication.businessDescription}
                  </p>
                </div>

                {selectedApplication.sampleEvents && (
                  <div>
                    <h4 className="font-semibold text-white mb-2">Sample Events</h4>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">
                      {selectedApplication.sampleEvents}
                    </p>
                  </div>
                )}

                {selectedApplication.socialMediaHandles && Object.keys(selectedApplication.socialMediaHandles).some(key => selectedApplication.socialMediaHandles![key as keyof typeof selectedApplication.socialMediaHandles]) && (
                  <div>
                    <h4 className="font-semibold text-white mb-2">Social Media</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedApplication.socialMediaHandles.instagram && (
                        <div>
                          <span className="text-white/60">Instagram:</span>
                          <p className="text-white break-all">{selectedApplication.socialMediaHandles.instagram}</p>
                        </div>
                      )}
                      {selectedApplication.socialMediaHandles.facebook && (
                        <div>
                          <span className="text-white/60">Facebook:</span>
                          <p className="text-white break-all">{selectedApplication.socialMediaHandles.facebook}</p>
                        </div>
                      )}
                      {selectedApplication.socialMediaHandles.twitter && (
                        <div>
                          <span className="text-white/60">Twitter:</span>
                          <p className="text-white break-all">{selectedApplication.socialMediaHandles.twitter}</p>
                        </div>
                      )}
                      {selectedApplication.socialMediaHandles.linkedin && (
                        <div>
                          <span className="text-white/60">LinkedIn:</span>
                          <p className="text-white break-all">{selectedApplication.socialMediaHandles.linkedin}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="bg-black border-copper-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-green-500">Approve Application</DialogTitle>
              <DialogDescription className="text-white/70">
                Approve {selectedApplication?.businessName} for a business account. This will grant them business account permissions.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="approve-notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="approve-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  rows={3}
                  data-testid="textarea-approve-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsApproveDialogOpen(false)}
                className="border-white/20 text-white/80 hover:bg-white/10"
                data-testid="button-cancel-approve"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmApprove}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-confirm-approve"
              >
                {approveMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Application
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="bg-black border-copper-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-500">Reject Application</DialogTitle>
              <DialogDescription className="text-white/70">
                Reject {selectedApplication?.businessName}'s business account application. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="reject-notes">Reason for Rejection (Required)</Label>
                <Textarea
                  id="reject-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  required
                  data-testid="textarea-reject-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsRejectDialogOpen(false)}
                className="border-white/20 text-white/80 hover:bg-white/10"
                data-testid="button-cancel-reject"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReject}
                disabled={rejectMutation.isPending || !adminNotes.trim()}
                data-testid="button-confirm-reject"
              >
                {rejectMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Application
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}