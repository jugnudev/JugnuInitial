import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SEOMetaTags } from '@/components/community/SEOMetaTags';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  Heart, 
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Upload,
  FileText,
  X,
  Loader2
} from 'lucide-react';

interface JobPosting {
  id: string;
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
}

export default function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isApplicationDialogOpen, setIsApplicationDialogOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    portfolio_url: '',
    linkedin_url: '',
    why_join: '',
    availability: ''
  });

  // Fetch active job postings
  const { data: postingsData, isLoading } = useQuery({
    queryKey: ['/api/careers/postings'],
    queryFn: async () => {
      const response = await fetch('/api/careers/postings');
      if (!response.ok) throw new Error('Failed to fetch job postings');
      return response.json();
    }
  });

  const postings: JobPosting[] = postingsData?.postings || [];
  const departments = ['all', ...Array.from(new Set(postings.map((p: JobPosting) => p.department)))];
  const filteredPostings = selectedDepartment === 'all' 
    ? postings 
    : postings.filter(p => p.department === selectedDepartment);

  // File selection handler with validation
  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only PDF, DOC, and DOCX files are allowed',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Resume must be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setResumeFile(file);
  };

  // Submit application mutation
  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!selectedJob) throw new Error('No job selected');

      const formPayload = new FormData();
      formPayload.append('data', JSON.stringify({
        job_posting_id: selectedJob.id,
        ...formData
      }));

      if (resumeFile) {
        formPayload.append('resume', resumeFile);
      }

      const response = await fetch('/api/careers/apply', {
        method: 'POST',
        body: formPayload
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit application');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Application Submitted!',
        description: 'We\'ll review your application and get back to you soon.'
      });
      setIsApplicationDialogOpen(false);
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        portfolio_url: '',
        linkedin_url: '',
        why_join: '',
        availability: ''
      });
      setResumeFile(null);
      setSelectedJob(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    submitApplication.mutate();
  };

  const openApplicationDialog = (job: JobPosting) => {
    setSelectedJob(job);
    setIsApplicationDialogOpen(true);
  };

  // Reset drag state when dialog closes
  useEffect(() => {
    if (!isApplicationDialogOpen) {
      setDragActive(false);
    }
  }, [isApplicationDialogOpen]);

  return (
    <>
      <SEOMetaTags
        title="Join the Team - Careers at Jugnu"
        description="Join Jugnu and help build Vancouver's premier South Asian cultural hub. Volunteer opportunities in marketing, events, community, tech, and more. Make an impact while growing your skills."
        url="https://thehouseofjugnu.com/careers"
        type="website"
      />

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-orange-50/10 dark:to-orange-950/10">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20 sm:py-32">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,140,50,0.3),transparent_50%)]"></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-300">Join Our Growing Team</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent">
                Build Vancouver's Cultural Future
              </h1>

              <p className="text-xl sm:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto">
                Help us create connections, celebrate culture, and empower Vancouver's South Asian community. 
                Join Jugnu and make a real impact.
              </p>

              {postings.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300"
                    onClick={() => document.getElementById('open-positions')?.scrollIntoView({ behavior: 'smooth' })}
                    data-testid="button-view-positions"
                  >
                    View Open Positions
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Why Join Section */}
        <section className="py-20 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Join Jugnu?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Be part of something bigger. Make connections, build skills, and shape Vancouver's cultural landscape.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Make an Impact</h3>
                  <p className="text-sm text-muted-foreground">
                    Help build Vancouver's premier South Asian cultural hub and connect thousands in our community
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Grow Your Skills</h3>
                  <p className="text-sm text-muted-foreground">
                    Gain hands-on experience in marketing, events, tech, and community building
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Build Your Network</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with talented professionals, artists, organizers, and community leaders
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Flexible & Remote</h3>
                  <p className="text-sm text-muted-foreground">
                    Most roles are remote-friendly with flexible hours to fit your schedule
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Open Positions */}
        <section id="open-positions" className="py-20 sm:py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Open Positions</h2>
              <p className="text-lg text-muted-foreground">
                Find the perfect role to match your skills and passion
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
              </div>
            ) : postings.length === 0 ? (
              <Card className="max-w-2xl mx-auto">
                <CardContent className="py-16 text-center">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Open Positions Right Now</h3>
                  <p className="text-muted-foreground mb-6">
                    We don't have any openings at the moment, but we're always looking for talented people!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Check back soon or reach out to <a href="mailto:relations@jugnucanada.com" className="text-orange-500 hover:underline">relations@jugnucanada.com</a> to express your interest.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="max-w-5xl mx-auto">
                {/* Department Filters */}
                {departments.length > 2 && (
                  <div className="mb-8 flex gap-2 flex-wrap justify-center">
                    {departments.map(dept => (
                      <Button
                        key={dept}
                        variant={selectedDepartment === dept ? 'default' : 'outline'}
                        onClick={() => setSelectedDepartment(dept)}
                        className={selectedDepartment === dept ? 'bg-orange-500 hover:bg-orange-600' : ''}
                        data-testid={`button-filter-${dept}`}
                      >
                        {dept === 'all' ? 'All Departments' : dept}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Job Listings */}
                <div className="space-y-4">
                  {filteredPostings.map((posting: JobPosting) => (
                    <Card 
                      key={posting.id} 
                      className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl group"
                      data-testid={`card-job-${posting.slug}`}
                    >
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
                                <Briefcase className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-xl sm:text-2xl font-bold mb-2 group-hover:text-orange-500 transition-colors">
                                  {posting.title}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {posting.featured && (
                                    <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Featured
                                    </Badge>
                                  )}
                                  <Badge variant="outline">{posting.department}</Badge>
                                  <Badge variant="secondary">{posting.type}</Badge>
                                </div>
                              </div>
                            </div>

                            {/* Description with See More */}
                            <div className="mb-4">
                              <p className={`text-muted-foreground ${!expandedJobs.has(posting.id) && posting.description.length > 200 ? 'line-clamp-2' : ''}`}>
                                {posting.description}
                              </p>
                              {posting.description.length > 200 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedJobs(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(posting.id)) {
                                        newSet.delete(posting.id);
                                      } else {
                                        newSet.add(posting.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="text-orange-500 hover:text-orange-600 text-sm font-medium mt-1 inline-flex items-center"
                                >
                                  {expandedJobs.has(posting.id) ? 'See less' : 'See more...'}
                                </button>
                              )}
                            </div>

                            {/* Responsibilities, Qualifications, Benefits */}
                            {expandedJobs.has(posting.id) && (
                              <div className="space-y-3 mb-4 border-t pt-4">
                                {posting.responsibilities?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                                      Responsibilities
                                    </h4>
                                    <ul className="space-y-1 ml-5">
                                      {posting.responsibilities.map((item, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground list-disc">
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {posting.qualifications?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                                      <TrendingUp className="w-4 h-4 text-orange-500" />
                                      Qualifications
                                    </h4>
                                    <ul className="space-y-1 ml-5">
                                      {posting.qualifications.map((item, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground list-disc">
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {posting.benefits?.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                                      <Heart className="w-4 h-4 text-orange-500" />
                                      Benefits
                                    </h4>
                                    <ul className="space-y-1 ml-5">
                                      {posting.benefits.map((item, idx) => (
                                        <li key={idx} className="text-sm text-muted-foreground list-disc">
                                          {item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                {posting.location}
                              </div>
                              {posting.time_commitment && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" />
                                  {posting.time_commitment}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2">
                            <Button 
                              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg group-hover:shadow-xl transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                openApplicationDialog(posting);
                              }}
                              data-testid={`button-apply-${posting.slug}`}
                            >
                              Apply Now
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
          <div className="container mx-auto px-4 sm:px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Ready to Make a Difference?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Don't see the perfect role? We're always open to meeting passionate people who want to contribute to our mission.
              </p>
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-white/20 hover:bg-white/10 text-white text-lg px-8 py-6"
                asChild
              >
                <a href="mailto:relations@jugnucanada.com" data-testid="button-contact-us">
                  Get in Touch
                </a>
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Application Dialog */}
      <Dialog open={isApplicationDialogOpen} onOpenChange={setIsApplicationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Apply for {selectedJob?.title}</DialogTitle>
            <DialogDescription>
              Fill out the form below to submit your application. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitApplication} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  data-testid="input-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                data-testid="input-phone"
              />
            </div>

            {/* Resume Upload */}
            <div className="space-y-2">
              <Label htmlFor="resume">Resume (Optional)</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
              >
                {resumeFile ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-6 h-6 text-orange-500" />
                      <span className="font-medium">{resumeFile.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({(resumeFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setResumeFile(null)}
                      data-testid="button-remove-resume"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium">Drag and drop your resume here</p>
                      <p className="text-sm text-muted-foreground">or</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => document.getElementById('resume-upload')?.click()}
                        data-testid="button-choose-file"
                      >
                        Choose File
                      </Button>
                      <Input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOC, or DOCX (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Links */}
            <div className="space-y-2">
              <Label htmlFor="portfolio_url">Portfolio URL</Label>
              <Input
                id="portfolio_url"
                type="url"
                value={formData.portfolio_url}
                onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                placeholder="https://..."
                data-testid="input-portfolio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/..."
                data-testid="input-linkedin"
              />
            </div>

            {/* Text Areas */}
            <div className="space-y-2">
              <Label htmlFor="why_join">Why do you want to join Jugnu? *</Label>
              <Textarea
                id="why_join"
                value={formData.why_join}
                onChange={(e) => setFormData({ ...formData, why_join: e.target.value })}
                placeholder="What excites you about this opportunity?"
                rows={3}
                required
                data-testid="textarea-why-join"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability">Availability *</Label>
              <Input
                id="availability"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                placeholder="e.g., 10-15 hours/week, Evenings and weekends"
                required
                data-testid="input-availability"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplicationDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                disabled={submitApplication.isPending}
                data-testid="button-submit-application"
              >
                {submitApplication.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
