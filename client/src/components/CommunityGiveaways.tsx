import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Gift, 
  Trophy, 
  Users,
  Calendar,
  Crown,
  Shield,
  Sparkles,
  CheckCircle,
  Clock,
  Award,
  Trash2
} from 'lucide-react';

interface Giveaway {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  giveaway_type: 'random_draw' | 'first_come' | 'task_based' | 'points_based';
  prize_title: string;
  prize_description?: string;
  prize_value?: string;
  number_of_winners: number;
  ends_at: string;
  starts_at?: string;
  draw_at?: string;
  status: 'draft' | 'active' | 'ended' | 'drawn' | 'completed' | 'cancelled';
  total_entries: number;
  unique_participants: number;
  created_at: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  userEntry?: {
    id: string;
    entry_count: number;
    created_at: string;
  };
  winners?: Array<{
    id: string;
    position: number;
    user: {
      id: string;
      first_name: string;
      last_name: string;
      profile_image_url?: string;
    };
  }>;
}

interface CommunityGiveawaysProps {
  communityId: string;
  currentMember?: {
    role: 'owner' | 'moderator' | 'member';
    userId: string;
  };
}

export default function CommunityGiveaways({ communityId, currentMember }: CommunityGiveawaysProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'ended'>('active');
  
  // Giveaway creation form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [giveawayType, setGiveawayType] = useState<'random_draw' | 'first_come' | 'task_based' | 'points_based'>('random_draw');
  const [prizeTitle, setPrizeTitle] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [prizeValue, setPrizeValue] = useState('');
  const [numberOfWinners, setNumberOfWinners] = useState(1);
  const [endsAt, setEndsAt] = useState('');
  
  const { toast } = useToast();
  
  // Load giveaways based on selected tab
  const { data: giveawaysData, isLoading } = useQuery<{ giveaways: Giveaway[] }>({
    queryKey: ['/api/communities', communityId, 'giveaways', activeTab],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/communities/${communityId}/giveaways?status=${activeTab}`);
      return response.json();
    },
    enabled: !!currentMember,
  });
  
  // Get counts for all giveaways to show in tabs
  const { data: allGiveawaysData } = useQuery<{ giveaways: Giveaway[] }>({
    queryKey: ['/api/communities', communityId, 'giveaways', 'all'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/communities/${communityId}/giveaways?status=all`);
      return response.json();
    },
    enabled: !!currentMember,
  });
  
  // Create giveaway mutation
  const createGiveawayMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/communities/${communityId}/giveaways`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/communities', communityId, 'giveaways'],
        exact: false
      });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Giveaway created",
        description: "Your giveaway has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create giveaway",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  // Enter giveaway mutation
  const enterGiveawayMutation = useMutation({
    mutationFn: async (giveawayId: string) => {
      return apiRequest('POST', `/api/communities/${communityId}/giveaways/${giveawayId}/enter`, {});
    },
    onSuccess: (_, giveawayId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways', giveawayId] });
      toast({
        title: "Entry submitted",
        description: "You've successfully entered the giveaway!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to enter giveaway",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  // Remove entry mutation
  const removeEntryMutation = useMutation({
    mutationFn: async (giveawayId: string) => {
      return apiRequest('DELETE', `/api/communities/${communityId}/giveaways/${giveawayId}/entry`);
    },
    onSuccess: (_, giveawayId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways', giveawayId] });
      toast({
        title: "Entry removed",
        description: "Your entry has been removed."
      });
    }
  });
  
  // Draw winners mutation
  const drawWinnersMutation = useMutation({
    mutationFn: async (giveawayId: string) => {
      return apiRequest('POST', `/api/communities/${communityId}/giveaways/${giveawayId}/draw`, {});
    },
    onSuccess: () => {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Switch to ended tab to show winners
      setActiveTab('ended');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways'] });
      
      toast({
        title: "Winners drawn! 🎉",
        description: "Giveaway winners have been selected! Check the Ended tab to see them."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to draw winners",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Delete giveaway mutation
  const deleteGiveawayMutation = useMutation({
    mutationFn: async (giveawayId: string) => {
      return apiRequest('DELETE', `/api/communities/${communityId}/giveaways/${giveawayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways'] });
      toast({
        title: "Giveaway deleted",
        description: "The giveaway has been permanently deleted."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete giveaway",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGiveawayType('random_draw');
    setPrizeTitle('');
    setPrizeDescription('');
    setPrizeValue('');
    setNumberOfWinners(1);
    setEndsAt('');
  };
  
  const handleCreateGiveaway = () => {
    if (!title.trim() || !prizeTitle.trim() || !endsAt) {
      toast({
        title: "Invalid giveaway",
        description: "Please provide a title, prize, and end date.",
        variant: "destructive"
      });
      return;
    }
    
    // Strip non-numeric characters from prize value (e.g., "$50" -> "50")
    const cleanedPrizeValue = prizeValue ? prizeValue.replace(/[^0-9.]/g, '') : undefined;
    
    createGiveawayMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      giveawayType,
      prizeTitle: prizeTitle.trim(),
      prizeDescription: prizeDescription.trim() || undefined,
      prizeValue: cleanedPrizeValue || undefined,
      numberOfWinners,
      endsAt
    });
  };
  
  const canCreateGiveaway = currentMember && ['owner', 'moderator'].includes(currentMember.role);
  
  const giveaways = giveawaysData?.giveaways || [];
  const activeCount = allGiveawaysData?.giveaways.filter(g => g.status === 'active').length || 0;
  const endedCount = allGiveawaysData?.giveaways.filter(g => ['ended', 'drawn', 'completed'].includes(g.status)).length || 0;
  
  const getGiveawayTypeLabel = (type: string) => {
    const labels = {
      random_draw: 'Random Draw',
      first_come: 'First Come',
      task_based: 'Task Based',
      points_based: 'Points Based'
    };
    return labels[type as keyof typeof labels] || type;
  };
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      active: { variant: 'default', label: 'Active' },
      ended: { variant: 'outline', label: 'Ended' },
      drawn: { variant: 'outline', label: 'Winners Drawn' },
      completed: { variant: 'outline', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };
  
  if (!currentMember) {
    return (
      <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
        <CardHeader>
          <CardTitle className="text-premium-text flex items-center gap-2">
            <Gift className="h-5 w-5 text-premium-primary" />
            Giveaways
          </CardTitle>
          <CardDescription className="text-premium-text-muted">
            Join this community to participate in giveaways
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Action Bar */}
      {canCreateGiveaway && (
        <div className="flex justify-end">
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-premium-primary to-purple-600 hover:from-premium-primary/90 hover:to-purple-600/90 shadow-lg shadow-premium-primary/20 text-sm md:text-base"
            data-testid="button-create-giveaway"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            <span className="hidden sm:inline">Create Giveaway</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      )}
      
      {/* Premium Status Tabs with Glassmorphism */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'ended')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 md:h-16 p-1.5 bg-gradient-to-br from-copper-900/50 via-primary-700/40 to-copper-900/50 backdrop-blur-xl border border-copper-500/20 rounded-2xl shadow-2xl shadow-copper-500/10 mb-6 md:mb-8">
          <TabsTrigger 
            value="active" 
            className="h-full rounded-xl text-sm md:text-base font-bold transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-copper-500 data-[state=active]:to-accent data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-glow/50 data-[state=active]:scale-[1.02] data-[state=inactive]:text-muted hover:text-text hover:bg-copper-500/10 flex items-center justify-center group" 
            data-testid="tab-active-giveaways"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 transition-transform group-data-[state=active]:animate-pulse" />
              <span>Active</span>
              <Badge className="ml-1.5 md:ml-2 text-xs px-2 py-0.5 bg-copper-500/20 text-text border-copper-500/30 group-data-[state=active]:bg-black/20 group-data-[state=active]:text-black group-data-[state=active]:border-black/30 transition-colors font-semibold">{activeCount}</Badge>
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="ended" 
            className="h-full rounded-xl text-sm md:text-base font-bold transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-copper-600 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-copper-500/40 data-[state=active]:scale-[1.02] data-[state=inactive]:text-muted hover:text-text hover:bg-copper-500/10 flex items-center justify-center group" 
            data-testid="tab-ended-giveaways"
          >
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4 md:w-5 md:h-5" />
              <span>Ended</span>
              <Badge className="ml-1.5 md:ml-2 text-xs px-2 py-0.5 bg-copper-500/20 text-text border-copper-500/30 group-data-[state=active]:bg-black/20 group-data-[state=active]:text-black group-data-[state=active]:border-black/30 transition-colors font-semibold">{endedCount}</Badge>
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4 md:space-y-6 mt-6">
          {isLoading ? (
            <Card className="p-12 text-center bg-gradient-to-br from-copper-900/40 via-primary-700/30 to-copper-900/40 backdrop-blur-xl border-copper-500/20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-copper-500/30 border-t-copper-500 rounded-full animate-spin" />
                <p className="text-text font-medium">Loading giveaways...</p>
              </div>
            </Card>
          ) : giveaways.length === 0 ? (
            <Card className="p-12 text-center bg-gradient-to-br from-copper-900/40 via-primary-700/30 to-copper-900/40 backdrop-blur-xl border-copper-500/20">
              <Gift className="w-16 h-16 mx-auto mb-4 text-copper-500/50" />
              <p className="text-text font-medium text-lg" data-testid="text-no-active-giveaways">No active giveaways</p>
              <p className="text-muted text-sm mt-2">Create exciting giveaways to engage your community</p>
              {canCreateGiveaway && (
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-6 bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-primary text-black font-bold shadow-lg shadow-glow/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Giveaway
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {giveaways.map((giveaway) => (
                <Card 
                  key={giveaway.id} 
                  className="bg-gradient-to-br from-copper-900/50 via-primary-700/30 to-copper-900/50 backdrop-blur-xl border-copper-500/20 hover:border-copper-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-copper-500/20 hover:scale-[1.01]"
                  data-testid={`card-giveaway-${giveaway.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl md:text-2xl bg-gradient-to-r from-accent via-glow to-copper-500 bg-clip-text text-transparent font-bold flex items-center gap-2">
                          <Trophy className="h-5 w-5 md:h-6 md:w-6 text-glow" />
                          {giveaway.title}
                        </CardTitle>
                        {giveaway.description && (
                          <CardDescription className="text-text/90 mt-2">
                            {giveaway.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(giveaway.status)}
                        <Badge className="bg-accent/20 text-accent border-accent/30 font-semibold" data-testid={`badge-type-${giveaway.id}`}>
                          {getGiveawayTypeLabel(giveaway.giveaway_type)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-r from-copper-500/20 via-accent/20 to-glow/20 rounded-xl p-4 md:p-5 border border-copper-500/30 backdrop-blur-sm">
                      <div className="flex items-start gap-3">
                        <Award className="h-6 w-6 md:h-7 md:w-7 text-glow mt-1" />
                        <div className="flex-1">
                          <h4 className="font-bold text-text text-lg">{giveaway.prize_title}</h4>
                          {giveaway.prize_description && (
                            <p className="text-sm text-text/80 mt-1.5">{giveaway.prize_description}</p>
                          )}
                          {giveaway.prize_value && (
                            <p className="text-sm font-semibold text-glow mt-2">Value: ${giveaway.prize_value}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
                      <div className="flex items-center gap-1.5 bg-copper-500/10 px-3 py-1.5 rounded-lg border border-copper-500/20">
                        <Users className="h-4 w-4 text-copper-500" />
                        <span className="text-text font-medium" data-testid={`text-participants-${giveaway.id}`}>{giveaway.unique_participants} participants</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-glow/10 px-3 py-1.5 rounded-lg border border-glow/20">
                        <Trophy className="h-4 w-4 text-glow" />
                        <span className="text-text font-medium" data-testid={`text-winners-${giveaway.id}`}>{giveaway.number_of_winners} winner{giveaway.number_of_winners > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                        <Calendar className="h-4 w-4 text-accent" />
                        <span className="text-text font-medium">Ends {format(new Date(giveaway.ends_at), 'MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-copper-500/10 px-3 py-1.5 rounded-lg border border-copper-500/20">
                        <Sparkles className="h-4 w-4 text-copper-500" />
                        <span className="text-text font-medium">{giveaway.total_entries} entries</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                      {giveaway.userEntry ? (
                        <>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-premium-border hover:bg-premium-surface-elevated"
                            disabled
                            data-testid={`button-entered-${giveaway.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            Entered
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => removeEntryMutation.mutate(giveaway.id)}
                            disabled={removeEntryMutation.isPending}
                            className="border-premium-border hover:bg-premium-surface-elevated"
                            data-testid={`button-remove-entry-${giveaway.id}`}
                          >
                            Remove Entry
                          </Button>
                        </>
                      ) : currentMember && giveaway.author.id === currentMember.userId ? (
                        <Button 
                          variant="outline"
                          className="flex-1 border-premium-border cursor-not-allowed opacity-60"
                          disabled
                          data-testid={`button-author-${giveaway.id}`}
                        >
                          <Crown className="h-4 w-4 mr-2" />
                          You created this
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => enterGiveawayMutation.mutate(giveaway.id)}
                          disabled={enterGiveawayMutation.isPending || giveaway.status !== 'active'}
                          className="flex-1 bg-gradient-to-r from-premium-primary to-purple-600 hover:from-premium-primary/90 hover:to-purple-600/90"
                          data-testid={`button-enter-${giveaway.id}`}
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          Enter Giveaway
                        </Button>
                      )}
                      
                      {canCreateGiveaway && giveaway.status === 'active' && (
                        <>
                          <Button 
                            onClick={() => drawWinnersMutation.mutate(giveaway.id)}
                            disabled={drawWinnersMutation.isPending || giveaway.unique_participants === 0}
                            variant="outline"
                            className="border-premium-border hover:bg-premium-surface-elevated"
                            data-testid={`button-draw-winners-${giveaway.id}`}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            Draw Winners
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline"
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                                data-testid={`button-delete-giveaway-${giveaway.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Giveaway?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{giveaway.title}" and all associated entries. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteGiveawayMutation.mutate(giveaway.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="ended" className="space-y-4 mt-6">
          {isLoading ? (
            <p className="text-center text-premium-text-muted py-8">Loading giveaways...</p>
          ) : giveaways.length === 0 ? (
            <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
              <CardContent className="pt-6 text-center py-12">
                <Clock className="h-12 w-12 text-premium-text-muted mx-auto mb-4" />
                <p className="text-premium-text-muted" data-testid="text-no-ended-giveaways">No ended giveaways</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {giveaways.map((giveaway) => (
                <Card 
                  key={giveaway.id} 
                  className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border"
                  data-testid={`card-giveaway-${giveaway.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-premium-text flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-premium-text-muted" />
                          {giveaway.title}
                        </CardTitle>
                        <CardDescription className="text-premium-text-muted mt-1">
                          Prize: {giveaway.prize_title}
                        </CardDescription>
                      </div>
                      {getStatusBadge(giveaway.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {giveaway.winners && giveaway.winners.length > 0 && (
                      <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg p-4 border border-amber-500/20">
                        <h4 className="font-semibold text-premium-text mb-3 flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-amber-500" />
                          Winners
                        </h4>
                        <div className="space-y-2">
                          {giveaway.winners.map((winner) => (
                            <div key={winner.id} className="flex items-center gap-3 p-2 bg-white/5 rounded">
                              {winner.user.profile_image_url ? (
                                <img 
                                  src={winner.user.profile_image_url} 
                                  alt={`${winner.user.first_name} ${winner.user.last_name}`}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-premium-primary/20 flex items-center justify-center">
                                  <span className="text-xs font-medium text-premium-primary">
                                    {winner.user.first_name[0]}{winner.user.last_name[0]}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-premium-text">
                                  {winner.user.first_name} {winner.user.last_name}
                                </p>
                                <p className="text-xs text-premium-text-muted">Position #{winner.position}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-premium-text-muted">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{giveaway.unique_participants} participants</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Ended {format(new Date(giveaway.ends_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    {canCreateGiveaway && (
                      <div className="flex justify-end pt-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline"
                              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                              data-testid={`button-delete-ended-giveaway-${giveaway.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Giveaway
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Giveaway?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{giveaway.title}" and all associated entries and winners. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteGiveawayMutation.mutate(giveaway.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Giveaway Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Giveaway</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="title">Giveaway Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Win a Premium Membership"
                className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                data-testid="input-giveaway-title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your giveaway..."
                rows={3}
                className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                data-testid="input-giveaway-description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="giveawayType">Giveaway Type *</Label>
                <Select value={giveawayType} onValueChange={(v) => setGiveawayType(v as any)}>
                  <SelectTrigger className="bg-card border-border text-card-foreground" data-testid="select-giveaway-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random_draw">Random Draw</SelectItem>
                    <SelectItem value="first_come">First Come First Serve</SelectItem>
                    <SelectItem value="task_based">Task Based</SelectItem>
                    <SelectItem value="points_based">Points Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="numberOfWinners">Number of Winners *</Label>
                <Input
                  id="numberOfWinners"
                  type="number"
                  min={1}
                  value={numberOfWinners}
                  onChange={(e) => setNumberOfWinners(parseInt(e.target.value) || 1)}
                  className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                  data-testid="input-number-of-winners"
                />
              </div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Prize Details
              </h4>
              
              <div>
                <Label htmlFor="prizeTitle">Prize Title *</Label>
                <Input
                  id="prizeTitle"
                  value={prizeTitle}
                  onChange={(e) => setPrizeTitle(e.target.value)}
                  placeholder="e.g., 3-Month Premium Membership"
                  className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                  data-testid="input-prize-title"
                />
              </div>
              
              <div>
                <Label htmlFor="prizeDescription">Prize Description</Label>
                <Textarea
                  id="prizeDescription"
                  value={prizeDescription}
                  onChange={(e) => setPrizeDescription(e.target.value)}
                  placeholder="Describe the prize..."
                  rows={2}
                  className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                  data-testid="input-prize-description"
                />
              </div>
              
              <div>
                <Label htmlFor="prizeValue">Prize Value (optional)</Label>
                <Input
                  id="prizeValue"
                  value={prizeValue}
                  onChange={(e) => setPrizeValue(e.target.value)}
                  placeholder="e.g., $50.00"
                  className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                  data-testid="input-prize-value"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="endsAt">End Date & Time *</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                data-testid="input-ends-at"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGiveaway}
              disabled={createGiveawayMutation.isPending}
              data-testid="button-submit-create"
            >
              {createGiveawayMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Giveaway
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
