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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Users,
  Eye,
  EyeOff,
  Vote,
  XCircle,
  Crown,
  Shield
} from 'lucide-react';

interface PollOption {
  id?: string;
  text: string;
  vote_count?: number;
  vote_percentage?: number;
}

interface Poll {
  id: string;
  question: string;
  description?: string;
  poll_type: 'single' | 'multiple';
  options: PollOption[];
  allow_multiple_votes: boolean;
  show_results_before_vote: boolean;
  anonymous_voting: boolean;
  is_closed: boolean;
  closes_at?: string;
  created_at: string;
  total_votes: number;
  unique_voters: number;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
  userVotes?: string[];
}

interface CommunityPollsProps {
  communityId: string;
  currentMember?: {
    role: 'owner' | 'moderator' | 'member';
    userId: string;
  };
}

export default function CommunityPolls({ communityId, currentMember }: CommunityPollsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  // Poll creation form state
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<'single' | 'multiple'>('single');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(true);
  const [anonymousVoting, setAnonymousVoting] = useState(false);
  const [closesAt, setClosesAt] = useState('');
  
  const { toast } = useToast();
  
  // Load polls
  const { data: pollsData, isLoading } = useQuery<{ polls: Poll[] }>({
    queryKey: ['/api/communities', communityId, 'polls'],
    enabled: !!currentMember,
  });
  
  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/communities/${communityId}/polls`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'polls'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast({
        title: "Poll created",
        description: "Your poll has been created successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create poll",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIds }: { pollId: string; optionIds: string[] }) => {
      return apiRequest('POST', `/api/communities/${communityId}/polls/${pollId}/vote`, { optionIds });
    },
    onSuccess: (_, { pollId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'polls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'polls', pollId] });
      setSelectedOptions([]);
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to vote",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });
  
  // Remove vote mutation
  const removeVoteMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return apiRequest('DELETE', `/api/communities/${communityId}/polls/${pollId}/vote`);
    },
    onSuccess: (_, pollId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'polls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'polls', pollId] });
      toast({
        title: "Vote removed",
        description: "Your vote has been removed."
      });
    }
  });
  
  // Close poll mutation
  const closePollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return apiRequest('PATCH', `/api/communities/${communityId}/polls/${pollId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/communities', communityId, 'polls'] });
      toast({
        title: "Poll closed",
        description: "The poll has been closed."
      });
    }
  });
  
  const resetForm = () => {
    setQuestion('');
    setDescription('');
    setPollType('single');
    setOptions(['', '']);
    setAllowMultipleVotes(false);
    setShowResultsBeforeVote(true);
    setAnonymousVoting(false);
    setClosesAt('');
  };
  
  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };
  
  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleCreatePoll = () => {
    const validOptions = options.filter(opt => opt.trim());
    
    if (!question.trim() || validOptions.length < 2) {
      toast({
        title: "Invalid poll",
        description: "Please provide a question and at least 2 options.",
        variant: "destructive"
      });
      return;
    }
    
    createPollMutation.mutate({
      question: question.trim(),
      description: description.trim() || undefined,
      pollType,
      options: validOptions,
      allowMultipleVotes: pollType === 'multiple' ? allowMultipleVotes : false,
      showResultsBeforeVote,
      anonymousVoting,
      closesAt: closesAt || undefined
    });
  };
  
  const handleVote = (poll: Poll) => {
    if (selectedOptions.length === 0) {
      toast({
        title: "No option selected",
        description: "Please select at least one option to vote.",
        variant: "destructive"
      });
      return;
    }
    
    voteMutation.mutate({ pollId: poll.id, optionIds: selectedOptions });
  };
  
  const handleOptionSelect = (poll: Poll, optionId: string, checked: boolean) => {
    if (poll.poll_type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      if (checked) {
        setSelectedOptions([...selectedOptions, optionId]);
      } else {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId));
      }
    }
  };
  
  const canManagePolls = currentMember?.role === 'owner' || currentMember?.role === 'moderator';
  const hasVoted = (poll: Poll) => poll.userVotes && poll.userVotes.length > 0;
  const canViewResults = (poll: Poll) => poll.show_results_before_vote || hasVoted(poll) || poll.is_closed;
  
  const activePollsCount = pollsData?.polls?.filter((p: Poll) => !p.is_closed).length || 0;
  const closedPollsCount = pollsData?.polls?.filter((p: Poll) => p.is_closed).length || 0;
  
  if (!currentMember) {
    return (
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">You must be a member to view polls</p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-fraunces">Community Polls</h2>
          <p className="text-muted-foreground">
            {activePollsCount} active {activePollsCount === 1 ? 'poll' : 'polls'}
            {closedPollsCount > 0 && ` · ${closedPollsCount} closed`}
          </p>
        </div>
        {canManagePolls && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-poll-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Poll
          </Button>
        )}
      </div>
      
      {/* Polls Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" data-testid="active-polls-tab">
            Active Polls ({activePollsCount})
          </TabsTrigger>
          <TabsTrigger value="closed" data-testid="closed-polls-tab">
            Closed Polls ({closedPollsCount})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading polls...</p>
            </Card>
          ) : activePollsCount === 0 ? (
            <Card className="p-8 text-center">
              <Vote className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active polls</p>
            </Card>
          ) : (
            pollsData?.polls?.filter((p: Poll) => !p.is_closed).map((poll: Poll) => (
              <Card key={poll.id} data-testid={`poll-${poll.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="font-fraunces">{poll.question}</CardTitle>
                      {poll.description && (
                        <CardDescription className="mt-2">{poll.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {poll.anonymous_voting && (
                        <Badge variant="outline">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Anonymous
                        </Badge>
                      )}
                      {poll.poll_type === 'multiple' && (
                        <Badge variant="outline">Multiple Choice</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {poll.unique_voters} {poll.unique_voters === 1 ? 'voter' : 'voters'}
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
                    </span>
                    {poll.closes_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Closes {format(new Date(poll.closes_at), 'PPp')}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Poll Options */}
                  {poll.poll_type === 'single' ? (
                    <RadioGroup
                      value={selectedOptions[0] || ''}
                      onValueChange={(value) => setSelectedOptions([value])}
                      disabled={hasVoted(poll)}
                    >
                      {poll.options.map((option) => (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value={option.id || ''} 
                              id={option.id}
                              data-testid={`poll-option-${option.id}`}
                            />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                              {option.text}
                            </Label>
                          </div>
                          {canViewResults(poll) && (
                            <div className="ml-6">
                              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                <span>{option.vote_count || 0} votes</span>
                                <span>{option.vote_percentage || 0}%</span>
                              </div>
                              <Progress 
                                value={parseFloat(String(option.vote_percentage || 0))} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-3">
                      {poll.options.map((option) => (
                        <div key={option.id} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={option.id}
                              checked={selectedOptions.includes(option.id || '')}
                              onCheckedChange={(checked) => 
                                handleOptionSelect(poll, option.id || '', checked as boolean)
                              }
                              disabled={hasVoted(poll)}
                              data-testid={`poll-option-${option.id}`}
                            />
                            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                              {option.text}
                            </Label>
                          </div>
                          {canViewResults(poll) && (
                            <div className="ml-6">
                              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                <span>{option.vote_count || 0} votes</span>
                                <span>{option.vote_percentage || 0}%</span>
                              </div>
                              <Progress 
                                value={parseFloat(String(option.vote_percentage || 0))} 
                                className="h-2"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    {!hasVoted(poll) ? (
                      <Button 
                        onClick={() => handleVote(poll)}
                        disabled={selectedOptions.length === 0 || voteMutation.isPending}
                        data-testid={`vote-button-${poll.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Vote
                      </Button>
                    ) : (
                      <>
                        <Badge variant="secondary">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          You voted
                        </Badge>
                        {!poll.anonymous_voting && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeVoteMutation.mutate(poll.id)}
                            disabled={removeVoteMutation.isPending}
                            data-testid={`remove-vote-button-${poll.id}`}
                          >
                            Remove Vote
                          </Button>
                        )}
                      </>
                    )}
                    {currentMember.role === 'owner' && !poll.is_closed && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => closePollMutation.mutate(poll.id)}
                        disabled={closePollMutation.isPending}
                        data-testid={`close-poll-button-${poll.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Close Poll
                      </Button>
                    )}
                  </div>
                  
                  {!canViewResults(poll) && !hasVoted(poll) && (
                    <p className="text-sm text-muted-foreground">
                      Results will be visible after you vote
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-4">
          {closedPollsCount === 0 ? (
            <Card className="p-8 text-center">
              <XCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No closed polls</p>
            </Card>
          ) : (
            pollsData?.polls?.filter((p: Poll) => p.is_closed).map((poll: Poll) => (
              <Card key={poll.id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-fraunces">{poll.question}</CardTitle>
                      {poll.description && (
                        <CardDescription className="mt-2">{poll.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary">Closed</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>Final Results: {poll.unique_voters} voters · {poll.total_votes} votes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Show final results */}
                  <div className="space-y-3">
                    {poll.options.map((option) => (
                      <div key={option.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{option.text}</span>
                          <span className="text-muted-foreground">
                            {option.vote_count || 0} votes ({option.vote_percentage || 0}%)
                          </span>
                        </div>
                        <Progress 
                          value={parseFloat(String(option.vote_percentage || 0))} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create Poll Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div>
              <Label htmlFor="question">Question *</Label>
              <Input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to ask?"
                className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                data-testid="poll-question-input"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more context to your poll..."
                rows={3}
                className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                data-testid="poll-description-input"
              />
            </div>
            
            <div>
              <Label>Poll Type</Label>
              <RadioGroup value={pollType} onValueChange={(v) => setPollType(v as 'single' | 'multiple')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="cursor-pointer">
                    Single Choice (one answer only)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="multiple" id="multiple" />
                  <Label htmlFor="multiple" className="cursor-pointer">
                    Multiple Choice (allow multiple answers)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div>
              <Label>Options *</Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                      data-testid={`poll-option-input-${index}`}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        data-testid={`remove-option-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddOption}
                    data-testid="add-option-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-results">Show results before voting</Label>
                <Switch
                  id="show-results"
                  checked={showResultsBeforeVote}
                  onCheckedChange={setShowResultsBeforeVote}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="anonymous">Anonymous voting</Label>
                <Switch
                  id="anonymous"
                  checked={anonymousVoting}
                  onCheckedChange={setAnonymousVoting}
                />
              </div>
              
              {pollType === 'multiple' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-multiple">Allow multiple votes per option</Label>
                  <Switch
                    id="allow-multiple"
                    checked={allowMultipleVotes}
                    onCheckedChange={setAllowMultipleVotes}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="closes-at">Close date (optional)</Label>
              <Input
                id="closes-at"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="bg-card border-border text-card-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePoll}
              disabled={createPollMutation.isPending}
              data-testid="create-poll-submit-button"
            >
              Create Poll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}