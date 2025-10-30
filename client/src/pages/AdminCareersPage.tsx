import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import AdminNav from '@/components/AdminNav';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  Briefcase, 
  Users, 
  Mail, 
  Phone,
  Calendar,
  MapPin,
  Clock,
  Filter,
  Search,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Download
} from 'lucide-react';

interface JobPosting {
  id?: string;
  title: string;
  slug: string;
  department: string;
  type: string;
  location: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  time_commitment?: string;
  is_active: boolean;
  featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface Application {
  id: string;
  job_posting_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  cover_letter?: string;
  why_join?: string;
  availability?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'interviewed', label: 'Interviewed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

const DEPARTMENTS = ['Marketing', 'Events', 'Community', 'Tech', 'Operations', 'Design', 'Content'];

export default function AdminCareersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<JobPosting>({
    title: '',
    slug: '',
    department: 'Marketing',
    type: 'volunteer',
    location: 'Remote',
    description: '',
    responsibilities: [''],
    qualifications: [''],
    benefits: [''],
    time_commitment: '',
    is_active: true,
    featured: false,
    sort_order: 0
  });

  // Check if admin key is valid
  const { data: authCheck, error: authError, refetch: checkAuth } = useQuery({
    queryKey: ['admin-careers-auth', adminKey],
    queryFn: async () => {
      if (!adminKey.trim()) return null;
      
      const response = await fetch('/api/admin/careers/postings?limit=1', {
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

  // Fetch job postings
  const { data: postingsData, isLoading } = useQuery({
    queryKey: ['/api/admin/careers/postings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/careers/postings', {
        headers: { 'x-admin-key': adminKey }
      });
      if (!response.ok) throw new Error('Failed to fetch job postings');
      return response.json();
    },
    enabled: isAuthenticated
  });

  const postings: JobPosting[] = postingsData?.postings || [];

  // Fetch applications
  const { data: applicationsData } = useQuery({
    queryKey: ['/api/admin/careers/applications'],
    queryFn: async () => {
      const response = await fetch('/api/admin/careers/applications', {
        headers: { 'x-admin-key': adminKey }
      });
      if (!response.ok) throw new Error('Failed to fetch applications');
      return response.json();
    },
    enabled: isAuthenticated
  });

  const applications: Application[] = applicationsData?.applications || [];

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      `${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Create posting mutation
  const createMutation = useMutation({
    mutationFn: async (posting: JobPosting) => {
      const response = await fetch('/api/admin/careers/postings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(posting)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create posting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/careers/postings'] });
      toast({ title: 'Success', description: 'Job posting created successfully' });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update posting mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: JobPosting) => {
      const response = await fetch(`/api/admin/careers/postings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update posting');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/careers/postings'] });
      toast({ title: 'Success', description: 'Job posting updated successfully' });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete posting mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/careers/postings/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey }
      });
      if (!response.ok) throw new Error('Failed to delete posting');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/careers/postings'] });
      toast({ title: 'Success', description: 'Job posting deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Update application status mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/admin/careers/applications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ status, notes })
      });
      if (!response.ok) throw new Error('Failed to update application');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/careers/applications'] });
      toast({ title: 'Success', description: 'Application updated successfully' });
      setIsApplicationDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const openDialog = (posting?: JobPosting) => {
    if (posting) {
      setEditingPosting(posting);
      setFormData(posting);
    } else {
      setEditingPosting(null);
      setFormData({
        title: '',
        slug: '',
        department: 'Marketing',
        type: 'volunteer',
        location: 'Remote',
        description: '',
        responsibilities: [''],
        qualifications: [''],
        benefits: [''],
        time_commitment: '',
        is_active: true,
        featured: false,
        sort_order: 0
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPosting(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty array items
    const cleanedData = {
      ...formData,
      responsibilities: formData.responsibilities.filter(r => r.trim()),
      qualifications: formData.qualifications.filter(q => q.trim()),
      benefits: formData.benefits.filter(b => b.trim())
    };

    if (editingPosting?.id) {
      updateMutation.mutate({ ...cleanedData, id: editingPosting.id });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const addArrayItem = (field: 'responsibilities' | 'qualifications' | 'benefits') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'responsibilities' | 'qualifications' | 'benefits', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: 'responsibilities' | 'qualifications' | 'benefits', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return (
      <Badge className={statusOption?.color || 'bg-gray-500/20 text-gray-400'}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-md mx-auto mt-20">
          <Card className="border border-gray-800 bg-gray-900/50 backdrop-blur shadow-2xl">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                <Briefcase className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">Admin Access</CardTitle>
              <p className="text-gray-300 mt-2">Enter admin key to access careers management</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <Input
                type="password"
                placeholder="Admin key"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adminKey.trim() && checkAuth()}
                className="h-12 text-center text-lg border-2 border-gray-700 bg-gray-800 text-white placeholder:text-gray-400 focus:border-orange-500"
                autoComplete="new-password"
                data-testid="input-admin-key"
              />
              
              {authError && (
                <Alert variant="destructive" className="border-red-600 bg-red-900/50">
                  <AlertDescription className="text-red-200">
                    Invalid admin key. Please check and try again.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={async () => {
                  if (adminKey.trim()) {
                    checkAuth();
                  }
                }}
                className="w-full h-12 text-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg text-white"
                disabled={!adminKey.trim()}
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-copper-500" />
              Careers Management
            </h1>
            <p className="text-white/70 mt-2">Manage job postings and track applications</p>
          </div>
          <Button 
            onClick={() => openDialog()}
            className="bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-black font-semibold"
            data-testid="button-create-posting"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Posting
          </Button>
        </div>

        <Tabs defaultValue="postings" className="space-y-6">
          <TabsList className="bg-black/60 border border-copper-500/20">
            <TabsTrigger value="postings" className="data-[state=active]:bg-copper-500 data-[state=active]:text-black">
              <Briefcase className="w-4 h-4 mr-2" />
              Job Postings ({postings.length})
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-copper-500 data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-2" />
              Applications ({applications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="postings" className="space-y-4">
            {isLoading ? (
              <Card className="bg-black/60 border-copper-500/20">
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-copper-500 mx-auto mb-4" />
                  <p className="text-white/70">Loading job postings...</p>
                </CardContent>
              </Card>
            ) : postings.length === 0 ? (
              <Card className="bg-black/60 border-copper-500/20">
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Job Postings</h3>
                  <p className="text-white/70 mb-6">Create your first job posting to start accepting applications.</p>
                  <Button 
                    onClick={() => openDialog()}
                    className="bg-copper-500 hover:bg-copper-600 text-black font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Posting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {postings.map((posting) => (
                  <Card key={posting.id} className="bg-black/60 border-copper-500/20 hover:border-copper-500/40 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-semibold text-white">{posting.title}</h3>
                            {posting.featured && (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                Featured
                              </Badge>
                            )}
                            <Badge className={posting.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
                              {posting.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Briefcase className="w-4 h-4 text-copper-500" />
                              <span>{posting.department}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <MapPin className="w-4 h-4 text-copper-500" />
                              <span>{posting.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-white/70">
                              <Clock className="w-4 h-4 text-copper-500" />
                              <span>{posting.type}</span>
                            </div>
                            {posting.time_commitment && (
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Calendar className="w-4 h-4 text-copper-500" />
                                <span>{posting.time_commitment}</span>
                              </div>
                            )}
                          </div>

                          <p className="text-white/60 text-sm mb-4 line-clamp-2">{posting.description}</p>

                          <div className="flex flex-wrap gap-4 text-sm text-white/60">
                            <span>{posting.responsibilities.length} responsibilities</span>
                            <span>•</span>
                            <span>{posting.qualifications.length} qualifications</span>
                            <span>•</span>
                            <span>{posting.benefits.length} benefits</span>
                            <span>•</span>
                            <span>
                              {applications.filter(app => app.job_posting_id === posting.id).length} applications
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/careers#${posting.slug}`, '_blank')}
                            className="text-white border-white/20 hover:bg-white/10"
                            data-testid={`button-view-${posting.slug}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(posting)}
                            className="text-white border-white/20 hover:bg-white/10"
                            data-testid={`button-edit-${posting.slug}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this job posting?')) {
                                deleteMutation.mutate(posting.id!);
                              }
                            }}
                            className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                            data-testid={`button-delete-${posting.slug}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            <Card className="bg-black/60 border-copper-500/20">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white"
                        data-testid="input-search-applications"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px] bg-white/10 border-white/20 text-white">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {filteredApplications.length === 0 ? (
              <Card className="bg-black/60 border-copper-500/20">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No Applications Found</h3>
                  <p className="text-white/70">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your filters.'
                      : 'Applications will appear here once candidates start applying.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredApplications.map((application) => {
                  const posting = postings.find(p => p.id === application.job_posting_id);
                  return (
                    <Card key={application.id} className="bg-black/60 border-copper-500/20 hover:border-copper-500/40 transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold text-white">
                                {application.first_name} {application.last_name}
                              </h3>
                              {getStatusBadge(application.status)}
                            </div>

                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Mail className="w-4 h-4 text-copper-500" />
                                <a href={`mailto:${application.email}`} className="hover:text-copper-500 transition-colors">
                                  {application.email}
                                </a>
                              </div>
                              {application.phone && (
                                <div className="flex items-center gap-2 text-sm text-white/70">
                                  <Phone className="w-4 h-4 text-copper-500" />
                                  <span>{application.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Briefcase className="w-4 h-4 text-copper-500" />
                                <span>Applied for: {posting?.title || 'Unknown Position'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <Calendar className="w-4 h-4 text-copper-500" />
                                <span>{new Date(application.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {application.why_join && (
                              <div className="bg-white/5 rounded-lg p-3 mb-4">
                                <p className="text-sm text-white/80 italic">"{application.why_join}"</p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              {application.resume_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(application.resume_url, '_blank')}
                                  className="text-white border-white/20 hover:bg-white/10"
                                >
                                  <Download className="w-3 h-3 mr-1" />
                                  Resume
                                </Button>
                              )}
                              {application.portfolio_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(application.portfolio_url, '_blank')}
                                  className="text-white border-white/20 hover:bg-white/10"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Portfolio
                                </Button>
                              )}
                              {application.linkedin_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(application.linkedin_url, '_blank')}
                                  className="text-white border-white/20 hover:bg-white/10"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  LinkedIn
                                </Button>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              setIsApplicationDialogOpen(true);
                            }}
                            className="text-white border-white/20 hover:bg-white/10 ml-4"
                            data-testid={`button-manage-${application.id}`}
                          >
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Job Posting Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gray-900 border-copper-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">
              {editingPosting ? 'Edit Job Posting' : 'Create New Job Posting'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Community Manager - Volunteer"
                  required
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-white">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g., community-manager-volunteer"
                  required
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-slug"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-white">Department *</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-white">Employment Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Remote, Vancouver, Hybrid"
                  required
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_commitment" className="text-white">Time Commitment</Label>
                <Input
                  id="time_commitment"
                  value={formData.time_commitment || ''}
                  onChange={(e) => setFormData({ ...formData, time_commitment: e.target.value })}
                  placeholder="e.g., 5-10 hours/week"
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-time-commitment"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Job Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role and what the volunteer will be doing..."
                rows={4}
                required
                className="bg-white/10 border-white/20 text-white"
                data-testid="textarea-description"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-white">Responsibilities *</Label>
              {formData.responsibilities.map((responsibility, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={responsibility}
                    onChange={(e) => updateArrayItem('responsibilities', index, e.target.value)}
                    placeholder="e.g., Moderate community discussions"
                    className="bg-white/10 border-white/20 text-white"
                    data-testid={`input-responsibility-${index}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem('responsibilities', index)}
                    className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('responsibilities')}
                className="text-white border-white/20 hover:bg-white/10"
                data-testid="button-add-responsibility"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Responsibility
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-white">Qualifications *</Label>
              {formData.qualifications.map((qualification, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={qualification}
                    onChange={(e) => updateArrayItem('qualifications', index, e.target.value)}
                    placeholder="e.g., Strong communication skills"
                    className="bg-white/10 border-white/20 text-white"
                    data-testid={`input-qualification-${index}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem('qualifications', index)}
                    className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('qualifications')}
                className="text-white border-white/20 hover:bg-white/10"
                data-testid="button-add-qualification"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Qualification
              </Button>
            </div>

            <div className="space-y-3">
              <Label className="text-white">What You'll Get (Benefits)</Label>
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => updateArrayItem('benefits', index, e.target.value)}
                    placeholder="e.g., Free event tickets"
                    className="bg-white/10 border-white/20 text-white"
                    data-testid={`input-benefit-${index}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeArrayItem('benefits', index)}
                    className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem('benefits')}
                className="text-white border-white/20 hover:bg-white/10"
                data-testid="button-add-benefit"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Benefit
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="is_active" className="text-white font-semibold">Active</Label>
                <p className="text-sm text-white/60">Show this posting on the careers page</p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                data-testid="switch-active"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="featured" className="text-white font-semibold">Featured</Label>
                <p className="text-sm text-white/60">Highlight this posting at the top</p>
              </div>
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                data-testid="switch-featured"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order" className="text-white">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="bg-white/10 border-white/20 text-white"
                data-testid="input-sort-order"
              />
              <p className="text-sm text-white/60">Lower numbers appear first</p>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={closeDialog}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-black font-semibold"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-posting"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingPosting ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingPosting ? 'Update Posting' : 'Create Posting'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Application Management Dialog */}
      <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-copper-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">Application Details</DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {selectedApplication.first_name} {selectedApplication.last_name}
                  </h3>
                  <p className="text-white/60">{postings.find(p => p.id === selectedApplication.job_posting_id)?.title}</p>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-2 text-white/80">
                    <Mail className="w-4 h-4 text-copper-500" />
                    <a href={`mailto:${selectedApplication.email}`} className="hover:text-copper-500">
                      {selectedApplication.email}
                    </a>
                  </div>
                  {selectedApplication.phone && (
                    <div className="flex items-center gap-2 text-white/80">
                      <Phone className="w-4 h-4 text-copper-500" />
                      <span>{selectedApplication.phone}</span>
                    </div>
                  )}
                </div>

                {selectedApplication.why_join && (
                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Why Join Jugnu?</Label>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/80">{selectedApplication.why_join}</p>
                    </div>
                  </div>
                )}

                {selectedApplication.availability && (
                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Availability</Label>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/80">{selectedApplication.availability}</p>
                    </div>
                  </div>
                )}

                {selectedApplication.cover_letter && (
                  <div className="space-y-2">
                    <Label className="text-white font-semibold">Cover Letter</Label>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-white/80 whitespace-pre-wrap">{selectedApplication.cover_letter}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedApplication.resume_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedApplication.resume_url, '_blank')}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      View Resume
                    </Button>
                  )}
                  {selectedApplication.portfolio_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedApplication.portfolio_url, '_blank')}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Portfolio
                    </Button>
                  )}
                  {selectedApplication.linkedin_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedApplication.linkedin_url, '_blank')}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      LinkedIn
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-white font-semibold">Status</Label>
                  <Select 
                    value={selectedApplication.status} 
                    onValueChange={(value) => setSelectedApplication({ ...selectedApplication, status: value })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-white font-semibold">Admin Notes</Label>
                  <Textarea
                    id="notes"
                    value={selectedApplication.notes || ''}
                    onChange={(e) => setSelectedApplication({ ...selectedApplication, notes: e.target.value })}
                    placeholder="Add internal notes about this application..."
                    rows={4}
                    className="bg-white/10 border-white/20 text-white"
                    data-testid="textarea-admin-notes"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsApplicationDialogOpen(false)}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    updateApplicationMutation.mutate({
                      id: selectedApplication.id,
                      status: selectedApplication.status,
                      notes: selectedApplication.notes
                    });
                  }}
                  className="bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-black font-semibold"
                  disabled={updateApplicationMutation.isPending}
                  data-testid="button-update-application"
                >
                  {updateApplicationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Application'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
