import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Award
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
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'giveaways'] });
      toast({
        title: "Winners drawn",
        description: "Giveaway winners have been selected!"
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
    <div className="space-y-4">
      {/* Giveaways Section */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-premium-primary" />
          <h3 className="text-lg font-semibold">Giveaways</h3>
        </div>
        {canCreateGiveaway && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-premium-primary to-purple-600 hover:from-premium-primary/90 hover:to-purple-600/90"
            data-testid="button-create-giveaway"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Giveaway
          </Button>
        )}
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'ended')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-900 dark:bg-gray-800">
          <TabsTrigger 
            value="active" 
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300" 
            data-testid="tab-active-giveaways"
          >
            Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger 
            value="ended" 
            className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300" 
            data-testid="tab-ended-giveaways"
          >
            Ended ({endedCount})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4 mt-6">
          {isLoading ? (
            <p className="text-center text-premium-text-muted py-8">Loading giveaways...</p>
          ) : giveaways.length === 0 ? (
            <Card className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border">
              <CardContent className="pt-6 text-center py-12">
                <Gift className="h-12 w-12 text-premium-text-muted mx-auto mb-4" />
                <p className="text-premium-text-muted" data-testid="text-no-active-giveaways">No active giveaways</p>
                {canCreateGiveaway && (
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    variant="outline"
                    className="mt-4 border-premium-border hover:bg-premium-surface-elevated"
                  >
                    Create the first giveaway
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {giveaways.map((giveaway) => (
                <Card 
                  key={giveaway.id} 
                  className="bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border hover:shadow-lg transition-shadow"
                  data-testid={`card-giveaway-${giveaway.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-premium-text flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-premium-primary" />
                          {giveaway.title}
                        </CardTitle>
                        <CardDescription className="text-premium-text-muted mt-1">
                          {giveaway.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(giveaway.status)}
                        <Badge variant="secondary" data-testid={`badge-type-${giveaway.id}`}>
                          {getGiveawayTypeLabel(giveaway.giveaway_type)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
                      <div className="flex items-start gap-3">
                        <Award className="h-6 w-6 text-premium-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-premium-text">{giveaway.prize_title}</h4>
                          {giveaway.prize_description && (
                            <p className="text-sm text-premium-text-muted mt-1">{giveaway.prize_description}</p>
                          )}
                          {giveaway.prize_value && (
                            <p className="text-sm font-medium text-premium-primary mt-1">Value: ${giveaway.prize_value}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-premium-text-muted">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-participants-${giveaway.id}`}>{giveaway.unique_participants} participants</span>
                      </div>
                      <div className="flex items-center gap-2 text-premium-text-muted">
                        <Trophy className="h-4 w-4" />
                        <span data-testid={`text-winners-${giveaway.id}`}>{giveaway.number_of_winners} winner{giveaway.number_of_winners > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-premium-text-muted">
                        <Calendar className="h-4 w-4" />
                        <span>Ends {format(new Date(giveaway.ends_at), 'MMM d')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-premium-text-muted">
                        <Sparkles className="h-4 w-4" />
                        <span>{giveaway.total_entries} entries</span>
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
