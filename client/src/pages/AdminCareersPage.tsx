import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, ExternalLink, Briefcase, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function AdminCareersPage() {
  const [editingPosting, setEditingPosting] = useState<JobPosting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingApplications, setViewingApplications] = useState<string | null>(null);
  
  const [adminKey] = useState(() => {
    try {
      return localStorage.getItem('adminKey') || '';
    } catch {
      return '';
    }
  });

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

  // Fetch job postings
  const { data: postingsData, isLoading } = useQuery({
    queryKey: ['/api/admin/careers/postings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/careers/postings', {
        headers: { 'x-admin-key': adminKey }
      });
      if (!response.ok) throw new Error('Failed to fetch job postings');
      return response.json();
    }
  });

  const postings = postingsData?.postings || [];

  // Fetch applications
  const { data: applicationsData } = useQuery({
    queryKey: ['/api/admin/careers/applications'],
    queryFn: async () => {
      const response = await fetch('/api/admin/careers/applications', {
        headers: { 'x-admin-key': adminKey }
      });
      if (!response.ok) throw new Error('Failed to fetch applications');
      return response.json();
    }
  });

  const applications = applicationsData?.applications || [];

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
    
    // Filter out empty strings from arrays
    const cleanedData = {
      ...formData,
      responsibilities: formData.responsibilities.filter(r => r.trim()),
      qualifications: formData.qualifications.filter(q => q.trim()),
      benefits: formData.benefits.filter(b => b.trim()),
      // Auto-generate slug from title if not provided
      slug: formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    };

    if (editingPosting?.id) {
      updateMutation.mutate({ id: editingPosting.id, ...cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this job posting?')) {
      deleteMutation.mutate(id);
    }
  };

  const addArrayItem = (field: 'responsibilities' | 'qualifications' | 'benefits') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const updateArrayItem = (field: 'responsibilities' | 'qualifications' | 'benefits', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const removeArrayItem = (field: 'responsibilities' | 'qualifications' | 'benefits', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (!adminKey) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>Please log in to access the careers admin panel.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Careers Admin</h1>
        <p className="text-muted-foreground">Manage job postings and applications</p>
      </div>

      <Tabs defaultValue="postings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="postings" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Job Postings ({postings.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Applications ({applications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="postings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Job Postings</h2>
            <Button onClick={() => openDialog()} className="flex items-center gap-2" data-testid="button-create-posting">
              <Plus className="w-4 h-4" />
              Create Posting
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : postings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No job postings yet. Create your first posting!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {postings.map((posting: JobPosting) => (
                <Card key={posting.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{posting.title}</h3>
                          {posting.featured && <Badge variant="secondary">Featured</Badge>}
                          <Badge variant={posting.is_active ? 'default' : 'outline'}>
                            {posting.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">{posting.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {posting.department} • {posting.location} • {posting.time_commitment || 'Flexible'}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {posting.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Slug: {posting.slug}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openDialog(posting)}
                          data-testid={`button-edit-${posting.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(posting.id!)}
                          data-testid={`button-delete-${posting.id}`}
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

        <TabsContent value="applications" className="space-y-6">
          <h2 className="text-2xl font-semibold">Applications</h2>

          {applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No applications yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {applications.map((app: Application) => {
                const posting = postings.find((p: JobPosting) => p.id === app.job_posting_id);
                return (
                  <Card key={app.id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {app.first_name} {app.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Applied for: {posting?.title || 'Unknown Position'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {app.email} {app.phone && `• ${app.phone}`}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Select
                              value={app.status}
                              onValueChange={(status) => updateApplicationMutation.mutate({ id: app.id, status, notes: app.notes })}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewing">Reviewing</SelectItem>
                                <SelectItem value="interviewed">Interviewed</SelectItem>
                                <SelectItem value="accepted">Accepted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground text-right">
                              {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {app.why_join && (
                          <div>
                            <p className="text-sm font-medium mb-1">Why Jugnu?</p>
                            <p className="text-sm text-muted-foreground">{app.why_join}</p>
                          </div>
                        )}

                        {app.cover_letter && (
                          <div>
                            <p className="text-sm font-medium mb-1">Cover Letter</p>
                            <p className="text-sm text-muted-foreground line-clamp-3">{app.cover_letter}</p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {app.resume_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={app.resume_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Resume
                              </a>
                            </Button>
                          )}
                          {app.portfolio_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Portfolio
                              </a>
                            </Button>
                          )}
                          {app.linkedin_url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                LinkedIn
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPosting ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  data-testid="input-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated-from-title"
                  data-testid="input-slug"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select value={formData.department} onValueChange={(department) => setFormData({ ...formData, department })}>
                  <SelectTrigger data-testid="select-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Events">Events</SelectItem>
                    <SelectItem value="Community">Community</SelectItem>
                    <SelectItem value="Tech">Tech</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Position Type *</Label>
                <Select value={formData.type} onValueChange={(type) => setFormData({ ...formData, type })}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="part-time">Part-Time</SelectItem>
                    <SelectItem value="full-time">Full-Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select value={formData.location} onValueChange={(location) => setFormData({ ...formData, location })}>
                  <SelectTrigger data-testid="select-location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Vancouver">Vancouver</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_commitment">Time Commitment</Label>
                <Input
                  id="time_commitment"
                  value={formData.time_commitment}
                  onChange={(e) => setFormData({ ...formData, time_commitment: e.target.value })}
                  placeholder="e.g., 5-10 hours/week"
                  data-testid="input-time-commitment"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Job Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
                data-testid="textarea-description"
              />
            </div>

            {/* Responsibilities */}
            <div className="space-y-2">
              <Label>Responsibilities *</Label>
              {formData.responsibilities.map((resp, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={resp}
                    onChange={(e) => updateArrayItem('responsibilities', index, e.target.value)}
                    placeholder="Enter a responsibility"
                    data-testid={`input-responsibility-${index}`}
                  />
                  {formData.responsibilities.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeArrayItem('responsibilities', index)}
                      data-testid={`button-remove-responsibility-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('responsibilities')}
                data-testid="button-add-responsibility"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Responsibility
              </Button>
            </div>

            {/* Qualifications */}
            <div className="space-y-2">
              <Label>Qualifications *</Label>
              {formData.qualifications.map((qual, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={qual}
                    onChange={(e) => updateArrayItem('qualifications', index, e.target.value)}
                    placeholder="Enter a qualification"
                    data-testid={`input-qualification-${index}`}
                  />
                  {formData.qualifications.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeArrayItem('qualifications', index)}
                      data-testid={`button-remove-qualification-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('qualifications')}
                data-testid="button-add-qualification"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Qualification
              </Button>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <Label>What You'll Get</Label>
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => updateArrayItem('benefits', index, e.target.value)}
                    placeholder="e.g., Professional development, Networking"
                    data-testid={`input-benefit-${index}`}
                  />
                  {formData.benefits.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeArrayItem('benefits', index)}
                      data-testid={`button-remove-benefit-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => addArrayItem('benefits')}
                data-testid="button-add-benefit"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Benefit
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(is_active) => setFormData({ ...formData, is_active })}
                    data-testid="switch-active"
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(featured) => setFormData({ ...formData, featured })}
                    data-testid="switch-featured"
                  />
                  <Label htmlFor="featured">Featured</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order" className="text-sm">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-20"
                    data-testid="input-sort-order"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPosting ? 'Update Posting' : 'Create Posting'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
