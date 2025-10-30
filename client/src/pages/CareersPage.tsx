import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  Heart, 
  Sparkles,
  CheckCircle2,
  ArrowRight
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

  return (
    <>
      <Helmet>
        <title>Join the Team - Careers at Jugnu | Vancouver's South Asian Hub</title>
        <meta 
          name="description" 
          content="Join Jugnu and help build Vancouver's premier South Asian cultural hub. Volunteer opportunities in marketing, events, community, tech, and more. Make an impact while growing your skills." 
        />
        <meta property="og:title" content="Join the Team - Careers at Jugnu" />
        <meta property="og:description" content="Be part of Vancouver's South Asian cultural movement. Find volunteer opportunities and help build community connections." />
        <meta property="og:type" content="website" />
      </Helmet>

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
                      className="border-2 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl cursor-pointer group"
                      onClick={() => window.location.href = `/careers/${posting.slug}`}
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

                            <p className="text-muted-foreground mb-4 line-clamp-2">
                              {posting.description}
                            </p>

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
    </>
  );
}
