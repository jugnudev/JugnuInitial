import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Plus, 
  Save,
  Trash2,
  DollarSign,
  Users,
  Settings,
  Image as ImageIcon,
  Ticket,
  MapPin,
  Info,
  Loader2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface EventCreateForm {
  title: string;
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  venue: string;
  address: string;
  city: string;
  province: string;
  status: 'draft' | 'published' | 'archived';
  coverUrl: string;
  feeStructure: {
    type: 'buyer_pays' | 'organizer_absorbs';
    serviceFeePercent: number;
  };
  taxSettings: {
    collectTax: boolean;
    gstPercent: number;
    pstPercent: number;
  };
}

interface TicketTier {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  capacity: number | null;
  maxPerOrder: number;
  salesStartAt: string;
  salesEndAt: string;
  sortOrder: number;
}

export function TicketsEventCreatePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm] = useState<EventCreateForm>({
    title: '',
    summary: '',
    description: '',
    startAt: '',
    endAt: '',
    venue: '',
    address: '',
    city: 'Vancouver',
    province: 'BC',
    status: 'draft',
    coverUrl: '',
    feeStructure: {
      type: 'buyer_pays',
      serviceFeePercent: 5
    },
    taxSettings: {
      collectTax: true,
      gstPercent: 5,
      pstPercent: 7
    }
  });

  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    {
      name: 'General Admission',
      description: '',
      priceCents: 0,
      capacity: null,
      maxPerOrder: 10,
      salesStartAt: '',
      salesEndAt: '',
      sortOrder: 0
    }
  ]);

  const { data: organizerData, isLoading: isLoadingOrganizer } = useQuery<{ ok: boolean; organizer: any }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: isEnabled,
    retry: false,
  });
  
  const organizer = organizerData?.organizer;
  const organizerId = organizer?.id;

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/tickets/events/upload-image', {
        method: 'POST',
        headers: {
          'x-organizer-id': organizerId || ''
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      return data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      setForm(prev => ({ ...prev, coverUrl: imageUrl }));
      toast({
        title: "Image uploaded successfully",
        description: "Your event cover image has been uploaded."
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Failed to upload image",
        description: "Please try again with a different image.",
        variant: "destructive"
      });
    }
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: { event: EventCreateForm; tiers: TicketTier[]; requestedStatus: 'draft' | 'published' }) => {
      const response = await fetch('/api/tickets/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-id': organizerId || ''
        },
        body: JSON.stringify({ event: data.event, tiers: data.tiers })
      });
      if (!response.ok) throw new Error('Failed to create event');
      const result = await response.json();
      return { ...result, requestedStatus: data.requestedStatus };
    },
    onSuccess: (data) => {
      if (data.ok) {
        const eventStatus = data.event?.status || data.requestedStatus || 'draft';
        toast({
          title: "Event created successfully!",
          description: eventStatus === 'published' 
            ? "Your event is now live and accepting tickets."
            : "Your event has been saved as a draft.",
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
        
        if (data.event?.id) {
          setLocation(`/tickets/organizer/events/${data.event.id}/edit`);
        } else {
          setLocation('/tickets/organizer/dashboard');
        }
      } else {
        toast({
          title: "Failed to create event",
          description: data.error || "An error occurred",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Create event error:', error);
      toast({
        title: "Failed to create event",
        description: "An error occurred while creating the event",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (status: 'draft' | 'published') => {
    if (!form.title || !form.startAt || !form.venue) {
      toast({
        title: "Please fill in required fields",
        description: "Title, date/time, and venue are required",
        variant: "destructive",
      });
      setActiveTab("details");
      return;
    }

    const validTiers = ticketTiers.filter(tier => tier.name);
    if (validTiers.length === 0) {
      toast({
        title: "At least one ticket tier is required",
        description: "Please add at least one ticket tier",
        variant: "destructive",
      });
      setActiveTab("tickets");
      return;
    }

    if (status === 'published' && !organizerData?.organizer?.stripeOnboardingComplete) {
      toast({
        title: "Complete Stripe setup first",
        description: "You need to connect your Stripe account before publishing events",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      event: {
        ...form,
        status
      },
      tiers: validTiers.map((tier, index) => ({
        ...tier,
        sortOrder: index
      })),
      requestedStatus: status
    };

    createEventMutation.mutate(submitData);
  };

  const handleInputChange = (field: keyof EventCreateForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTierChange = (index: number, field: keyof TicketTier, value: any) => {
    setTicketTiers(prev => {
      const newTiers = [...prev];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return newTiers;
    });
  };

  const addTier = () => {
    setTicketTiers(prev => [...prev, {
      name: '',
      description: '',
      priceCents: 0,
      capacity: null,
      maxPerOrder: 10,
      salesStartAt: '',
      salesEndAt: '',
      sortOrder: prev.length
    }]);
  };

  const removeTier = (index: number) => {
    if (ticketTiers.length === 1) {
      toast({
        title: "Cannot remove last tier",
        description: "At least one ticket tier is required",
        variant: "destructive"
      });
      return;
    }
    setTicketTiers(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoadingOrganizer) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-copper-500" />
          <p className="text-neutral-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!isEnabled || !organizer) {
    return (
      <div className="min-h-screen bg-charcoal-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md glass-elevated rounded-2xl p-8">
          <AlertCircle className="h-16 w-16 text-copper-500 mx-auto mb-4" />
          <h1 className="text-2xl font-fraunces font-bold mb-3 text-neutral-50">Business Account Required</h1>
          <p className="text-neutral-400 mb-6">You need an approved business account to create and manage events.</p>
          <Link href="/business-signup">
            <Button className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target">
              Apply for Business Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalCapacity = ticketTiers.reduce((sum, tier) => sum + (tier.capacity || 0), 0);

  return (
    <div className="min-h-screen bg-charcoal-950">
      <div className="container mx-auto px-4 py-6 md:py-12 max-w-5xl">
        {/* Premium Header */}
        <div className="mb-8 animate-fadeIn">
          <Link href="/tickets/organizer/dashboard">
            <Button 
              variant="ghost" 
              className="mb-6 text-neutral-300 hover:text-copper-500 transition-colors -ml-3"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="w-1.5 h-16 bg-copper-gradient rounded-full flex-shrink-0" />
            <div>
              <h1 className="text-4xl md:text-5xl font-fraunces font-bold text-neutral-50 mb-3">
                Create New Event
              </h1>
              <p className="text-lg text-neutral-400">
                Set up your event and start selling tickets
              </p>
            </div>
          </div>
        </div>

        {/* Stripe Connect Warning */}
        {!organizerData?.organizer?.stripeOnboardingComplete && (
          <div className="mb-8 glass-card rounded-xl p-5 border-2 border-copper-500/30 bg-copper-500/5 animate-slideUp">
            <div className="flex items-start gap-4">
              <Info className="w-5 h-5 mt-0.5 text-copper-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-50 mb-2">
                  Complete Stripe setup to publish events
                </p>
                <p className="text-sm text-neutral-300 mb-4">
                  You can create and save drafts, but you'll need to connect Stripe before publishing.
                </p>
                <Link href="/tickets/organizer/dashboard">
                  <Button size="sm" className="bg-copper-gradient hover:shadow-glow-copper text-white font-semibold touch-target">
                    Complete Setup
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile-optimized tab navigation */}
          <TabsList className="grid grid-cols-3 gap-2 bg-charcoal-900/40 p-1.5 rounded-xl h-auto">
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:bg-copper-gradient data-[state=active]:text-white 
                       text-neutral-400 font-medium py-3 rounded-lg transition-all
                       data-[state=active]:shadow-glow-copper touch-target"
              data-testid="tab-event-details"
            >
              <Info className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Event</span> Details
            </TabsTrigger>
            <TabsTrigger 
              value="tickets" 
              className="data-[state=active]:bg-copper-gradient data-[state=active]:text-white 
                       text-neutral-400 font-medium py-3 rounded-lg transition-all
                       data-[state=active]:shadow-glow-copper touch-target"
              data-testid="tab-ticket-tiers"
            >
              <Ticket className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ticket</span> Tiers
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-copper-gradient data-[state=active]:text-white 
                       text-neutral-400 font-medium py-3 rounded-lg transition-all
                       data-[state=active]:shadow-glow-copper touch-target"
              data-testid="tab-fee-settings"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Fees &</span> Taxes
            </TabsTrigger>
          </TabsList>

          {/* Event Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="glass-elevated rounded-2xl p-6 md:p-8 animate-slideUp">
              <div className="mb-8">
                <h2 className="text-2xl font-fraunces font-bold text-neutral-50 mb-2">
                  Event Information
                </h2>
                <p className="text-neutral-400">
                  Basic details about your event that attendees will see
                </p>
              </div>

              <div className="space-y-8">
                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-neutral-200 font-medium">
                    Event Title <span className="text-copper-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    data-testid="input-event-title"
                    placeholder="e.g., Summer Music Festival 2025"
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="h-12 bg-charcoal-900/40 border-charcoal-700 
                             focus:border-copper-500 text-neutral-100 placeholder:text-neutral-500
                             text-lg"
                    required
                  />
                </div>

                {/* Event Summary */}
                <div className="space-y-2">
                  <Label htmlFor="summary" className="text-neutral-200 font-medium">
                    Short Summary
                  </Label>
                  <Input
                    id="summary"
                    data-testid="input-event-summary"
                    placeholder="Brief one-line description"
                    value={form.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    className="h-12 bg-charcoal-900/40 border-charcoal-700 
                             focus:border-copper-500 text-neutral-100 placeholder:text-neutral-500"
                  />
                  <p className="text-sm text-neutral-500">
                    Displayed in event cards and search results
                  </p>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-neutral-200 font-medium">
                    Full Description
                  </Label>
                  <Textarea
                    id="description"
                    data-testid="input-event-description"
                    placeholder="Tell attendees what makes your event special..."
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                    className="bg-charcoal-900/40 border-charcoal-700 
                             focus:border-copper-500 text-neutral-100 placeholder:text-neutral-500
                             resize-none"
                  />
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-3">
                  <Label className="text-neutral-200 font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-copper-500" />
                    Cover Image
                  </Label>
                  <div className="border-2 border-dashed border-charcoal-700 rounded-xl p-6 bg-charcoal-900/20
                               hover:border-copper-500/50 transition-colors">
                    {form.coverUrl ? (
                      <div className="space-y-4">
                        <img
                          src={form.coverUrl}
                          alt="Event cover"
                          className="w-full max-w-2xl mx-auto rounded-lg shadow-xl"
                        />
                        <div className="flex justify-center gap-3">
                          <ObjectUploader
                            onUpload={uploadImageMutation.mutateAsync}
                            accept="image/*"
                            maxSizeMB={5}
                            placeholder="Replace image"
                            existingUrl={form.coverUrl}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInputChange('coverUrl', '')}
                            className="border-charcoal-700 hover:border-red-500 hover:text-red-500 touch-target"
                            data-testid="button-remove-image"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <ObjectUploader
                          onUpload={uploadImageMutation.mutateAsync}
                          accept="image/*"
                          maxSizeMB={5}
                          placeholder="Upload event cover (1920x1080 recommended)"
                          className="w-full max-w-md mx-auto"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Recommended size: 1920x1080px. Max 5MB. JPG or PNG.
                  </p>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 gap-6">
                  <DateTimePicker
                    label="Start Date & Time"
                    value={form.startAt}
                    onChange={(value) => handleInputChange('startAt', value)}
                    required
                    minDate={new Date()}
                    placeholder="Select start date and time"
                    testId="event-start-datetime"
                  />
                  <DateTimePicker
                    label="End Date & Time (Optional)"
                    value={form.endAt}
                    onChange={(value) => handleInputChange('endAt', value)}
                    minDate={form.startAt ? new Date(form.startAt) : new Date()}
                    placeholder="Select end date and time"
                    testId="event-end-datetime"
                  />
                </div>

                {/* Location Details */}
                <div className="space-y-6 pt-6 border-t border-charcoal-800">
                  <h3 className="text-xl font-fraunces font-bold text-neutral-50 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-copper-500" />
                    Location Details
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="venue" className="text-neutral-200 font-medium">
                      Venue Name <span className="text-copper-500">*</span>
                    </Label>
                    <Input
                      id="venue"
                      data-testid="input-event-venue"
                      placeholder="e.g., Rogers Arena"
                      value={form.venue}
                      onChange={(e) => handleInputChange('venue', e.target.value)}
                      className="h-12 bg-charcoal-900/40 border-charcoal-700 
                               focus:border-copper-500 text-neutral-100 placeholder:text-neutral-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-neutral-200 font-medium">
                      Street Address
                    </Label>
                    <Input
                      id="address"
                      data-testid="input-event-address"
                      placeholder="e.g., 800 Griffiths Way"
                      value={form.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="h-12 bg-charcoal-900/40 border-charcoal-700 
                               focus:border-copper-500 text-neutral-100 placeholder:text-neutral-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-neutral-200 font-medium">
                        City <span className="text-copper-500">*</span>
                      </Label>
                      <Input
                        id="city"
                        data-testid="input-event-city"
                        placeholder="Vancouver"
                        value={form.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="h-12 bg-charcoal-900/40 border-charcoal-700 
                                 focus:border-copper-500 text-neutral-100 placeholder:text-neutral-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province" className="text-neutral-200 font-medium">
                        Province <span className="text-copper-500">*</span>
                      </Label>
                      <Select value={form.province} onValueChange={(value) => handleInputChange('province', value)}>
                        <SelectTrigger 
                          className="h-12 bg-charcoal-900/40 border-charcoal-700 
                                   focus:border-copper-500 text-neutral-100"
                          data-testid="select-event-province"
                        >
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent className="bg-charcoal-900 border-charcoal-700">
                          <SelectItem value="BC">British Columbia</SelectItem>
                          <SelectItem value="AB">Alberta</SelectItem>
                          <SelectItem value="ON">Ontario</SelectItem>
                          <SelectItem value="QC">Quebec</SelectItem>
                          <SelectItem value="MB">Manitoba</SelectItem>
                          <SelectItem value="SK">Saskatchewan</SelectItem>
                          <SelectItem value="NS">Nova Scotia</SelectItem>
                          <SelectItem value="NB">New Brunswick</SelectItem>
                          <SelectItem value="PE">Prince Edward Island</SelectItem>
                          <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                          <SelectItem value="NT">Northwest Territories</SelectItem>
                          <SelectItem value="NU">Nunavut</SelectItem>
                          <SelectItem value="YT">Yukon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Ticket Tiers Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <div className="glass-elevated rounded-2xl p-6 md:p-8 animate-slideUp">
              <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-fraunces font-bold text-neutral-50 mb-2">
                      Ticket Tiers
                    </h2>
                    <p className="text-neutral-400">
                      Configure different ticket types and pricing
                    </p>
                  </div>
                  {totalCapacity > 0 && (
                    <div className="glass-card rounded-lg px-4 py-2.5 flex items-center gap-2">
                      <Users className="w-5 h-5 text-copper-500" />
                      <span className="text-sm font-semibold text-neutral-200">
                        Total: {totalCapacity} tickets
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {ticketTiers.map((tier, index) => (
                  <Card key={index} className="glass-card border-charcoal-700 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-copper-gradient flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-neutral-50">
                              Tier {index + 1}
                            </h3>
                            <p className="text-xs text-neutral-500">
                              {tier.name || 'Unnamed tier'}
                            </p>
                          </div>
                        </div>
                        {ticketTiers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTier(index)}
                            className="text-neutral-400 hover:text-red-500 hover:bg-red-500/10 touch-target"
                            data-testid={`button-remove-tier-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tier Name */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-neutral-200 font-medium">
                            Tier Name <span className="text-copper-500">*</span>
                          </Label>
                          <Input
                            placeholder="e.g., General Admission, VIP, Early Bird"
                            value={tier.name}
                            onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                            className="h-12 bg-charcoal-900/40 border-charcoal-700 
                                     focus:border-copper-500 text-neutral-100"
                            data-testid={`input-tier-name-${index}`}
                          />
                        </div>

                        {/* Tier Description */}
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-neutral-200 font-medium">
                            Description
                          </Label>
                          <Textarea
                            placeholder="What's included in this tier?"
                            value={tier.description}
                            onChange={(e) => handleTierChange(index, 'description', e.target.value)}
                            rows={3}
                            className="bg-charcoal-900/40 border-charcoal-700 
                                     focus:border-copper-500 text-neutral-100"
                            data-testid={`input-tier-description-${index}`}
                          />
                        </div>

                        {/* Price */}
                        <div className="space-y-2">
                          <Label className="text-neutral-200 font-medium flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-copper-500" />
                            Price (CAD) <span className="text-copper-500">*</span>
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={(tier.priceCents / 100).toFixed(2)}
                              onChange={(e) => handleTierChange(index, 'priceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                              className="h-12 pl-8 bg-charcoal-900/40 border-charcoal-700 
                                       focus:border-copper-500 text-neutral-100"
                              data-testid={`input-tier-price-${index}`}
                            />
                          </div>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-2">
                          <Label className="text-neutral-200 font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 text-copper-500" />
                            Capacity
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Unlimited"
                            value={tier.capacity || ''}
                            onChange={(e) => handleTierChange(index, 'capacity', e.target.value ? parseInt(e.target.value) : null)}
                            className="h-12 bg-charcoal-900/40 border-charcoal-700 
                                     focus:border-copper-500 text-neutral-100"
                            data-testid={`input-tier-capacity-${index}`}
                          />
                          <p className="text-xs text-neutral-500">Leave empty for unlimited</p>
                        </div>

                        {/* Max Per Order */}
                        <div className="space-y-2">
                          <Label className="text-neutral-200 font-medium">
                            Max Per Order
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="10"
                            value={tier.maxPerOrder}
                            onChange={(e) => handleTierChange(index, 'maxPerOrder', parseInt(e.target.value) || 1)}
                            className="h-12 bg-charcoal-900/40 border-charcoal-700 
                                     focus:border-copper-500 text-neutral-100"
                            data-testid={`input-tier-max-per-order-${index}`}
                          />
                        </div>

                        {/* Sales Period */}
                        <div className="space-y-2">
                          <DateTimePicker
                            label="Sales Start (Optional)"
                            value={tier.salesStartAt}
                            onChange={(value) => handleTierChange(index, 'salesStartAt', value)}
                            minDate={new Date()}
                            testId={`tier-sales-start-${index}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <DateTimePicker
                            label="Sales End (Optional)"
                            value={tier.salesEndAt}
                            onChange={(value) => handleTierChange(index, 'salesEndAt', value)}
                            minDate={tier.salesStartAt ? new Date(tier.salesStartAt) : new Date()}
                            testId={`tier-sales-end-${index}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add Tier Button */}
                <Button
                  onClick={addTier}
                  variant="outline"
                  className="w-full h-16 border-2 border-dashed border-charcoal-700 
                           hover:border-copper-500 hover:bg-copper-500/5 
                           text-neutral-400 hover:text-copper-500 transition-all
                           touch-target"
                  data-testid="button-add-tier"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Another Ticket Tier
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Fees & Taxes Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="glass-elevated rounded-2xl p-6 md:p-8 animate-slideUp space-y-8">
              {/* Service Fees */}
              <div>
                <h2 className="text-2xl font-fraunces font-bold text-neutral-50 mb-2">
                  Service Fees
                </h2>
                <p className="text-neutral-400 mb-6">
                  Choose how to handle transaction fees
                </p>

                <div className="space-y-4">
                  <Label className="text-neutral-200 font-medium">
                    Fee Structure
                  </Label>
                  <Select 
                    value={form.feeStructure.type} 
                    onValueChange={(value: 'buyer_pays' | 'organizer_absorbs') => 
                      setForm(prev => ({ ...prev, feeStructure: { ...prev.feeStructure, type: value } }))
                    }
                  >
                    <SelectTrigger 
                      className="h-12 bg-charcoal-900/40 border-charcoal-700 
                               focus:border-copper-500 text-neutral-100"
                      data-testid="select-fee-structure"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal-900 border-charcoal-700">
                      <SelectItem value="buyer_pays">
                        <div className="py-1">
                          <div className="font-medium">Buyer Pays Fees</div>
                          <div className="text-xs text-neutral-500">Fees added to ticket price at checkout</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="organizer_absorbs">
                        <div className="py-1">
                          <div className="font-medium">Organizer Absorbs Fees</div>
                          <div className="text-xs text-neutral-500">Fees deducted from your payout</div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="space-y-2">
                    <Label className="text-neutral-200 font-medium">
                      Service Fee Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={form.feeStructure.serviceFeePercent}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          feeStructure: { ...prev.feeStructure, serviceFeePercent: parseFloat(e.target.value) || 0 } 
                        }))}
                        className="h-12 pr-10 bg-charcoal-900/40 border-charcoal-700 
                                 focus:border-copper-500 text-neutral-100"
                        data-testid="input-service-fee"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Settings */}
              <div className="pt-8 border-t border-charcoal-800">
                <h2 className="text-2xl font-fraunces font-bold text-neutral-50 mb-2">
                  Tax Settings
                </h2>
                <p className="text-neutral-400 mb-6">
                  Configure tax collection for your event
                </p>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 glass-card rounded-lg">
                    <div>
                      <Label className="text-neutral-200 font-medium">Collect Tax</Label>
                      <p className="text-sm text-neutral-500">Automatically add taxes to ticket prices</p>
                    </div>
                    <Switch
                      checked={form.taxSettings.collectTax}
                      onCheckedChange={(checked) => setForm(prev => ({ 
                        ...prev, 
                        taxSettings: { ...prev.taxSettings, collectTax: checked } 
                      }))}
                      data-testid="switch-collect-tax"
                    />
                  </div>

                  {form.taxSettings.collectTax && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slideUp">
                      <div className="space-y-2">
                        <Label className="text-neutral-200 font-medium">
                          GST/HST %
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="15"
                            step="0.1"
                            value={form.taxSettings.gstPercent}
                            onChange={(e) => setForm(prev => ({ 
                              ...prev, 
                              taxSettings: { ...prev.taxSettings, gstPercent: parseFloat(e.target.value) || 0 } 
                            }))}
                            className="h-12 pr-10 bg-charcoal-900/40 border-charcoal-700 
                                     focus:border-copper-500 text-neutral-100"
                            data-testid="input-gst"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-neutral-200 font-medium">
                          PST/QST %
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            max="15"
                            step="0.1"
                            value={form.taxSettings.pstPercent}
                            onChange={(e) => setForm(prev => ({ 
                              ...prev, 
                              taxSettings: { ...prev.taxSettings, pstPercent: parseFloat(e.target.value) || 0 } 
                            }))}
                            className="h-12 pr-10 bg-charcoal-900/40 border-charcoal-700 
                                     focus:border-copper-500 text-neutral-100"
                            data-testid="input-pst"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Fixed Bottom Action Bar (Mobile-optimized) */}
        <div className="fixed bottom-0 left-0 right-0 md:relative md:mt-8 
                     glass-elevated border-t border-charcoal-800 md:border-0 md:rounded-xl
                     p-4 md:p-6 z-10">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-sm text-neutral-400 hidden md:block">
                <Sparkles className="w-4 h-4 inline mr-1.5 text-copper-500" />
                All changes are auto-saved
              </div>
              <div className="flex gap-3 flex-col sm:flex-row">
                <Button
                  onClick={() => handleSubmit('draft')}
                  variant="outline"
                  disabled={createEventMutation.isPending}
                  className="h-12 border-charcoal-700 hover:border-copper-500 
                           text-neutral-300 hover:bg-copper-500/5 touch-target order-2 sm:order-1"
                  data-testid="button-save-draft"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createEventMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save as Draft'
                  )}
                </Button>
                <Button
                  onClick={() => handleSubmit('published')}
                  disabled={createEventMutation.isPending || !organizerData?.organizer?.stripeOnboardingComplete}
                  className="h-12 bg-copper-gradient hover:shadow-glow-copper 
                           text-white font-semibold touch-target order-1 sm:order-2"
                  data-testid="button-publish-event"
                >
                  {createEventMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Publish Event
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Spacer for fixed bottom bar on mobile */}
        <div className="h-24 md:hidden" />
      </div>
    </div>
  );
}
