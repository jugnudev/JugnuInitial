import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar, 
  ArrowLeft, 
  Plus, 
  Save,
  Trash2,
  DollarSign,
  Users,
  Settings,
  Upload,
  Image,
  Ticket,
  Clock,
  MapPin,
  Info,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

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
  
  // Check if ticketing is enabled
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

  // Get organizer data from approved business account (not localStorage)
  const { data: organizerData, isLoading: isLoadingOrganizer } = useQuery<{ ok: boolean; organizer: any }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: isEnabled,
    retry: false,
  });
  
  const organizer = organizerData?.organizer;
  const organizerId = organizer?.id;

  // Upload image mutation
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
    mutationFn: async (data: { event: EventCreateForm; tiers: TicketTier[] }) => {
      const response = await fetch('/api/tickets/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organizer-id': organizerId || ''
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create event');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "Event created successfully!",
          description: form.status === 'published' 
            ? "Your event is now live and accepting tickets."
            : "Your event has been saved as a draft.",
        });
        
        // Invalidate organizer dashboard data
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
        
        // Redirect to event manage page
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
    // Validate required fields
    if (!form.title || !form.startAt || !form.venue) {
      toast({
        title: "Please fill in required fields",
        description: "Title, date/time, and venue are required",
        variant: "destructive",
      });
      setActiveTab("details");
      return;
    }

    // Validate ticket tiers
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

    // Check Stripe onboarding for published events
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
      }))
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

  // Show loading state while checking for organizer account
  if (isLoadingOrganizer) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Check if ticketing is enabled and user has approved business account
  if (!isEnabled || !organizer) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-fraunces mb-4">Business Account Required</h1>
        <p className="text-muted-foreground mb-6">You need an approved business account to create events.</p>
        <Link href="/business-signup">
          <Button className="mt-4">Apply for Business Account</Button>
        </Link>
      </div>
    );
  }

  // Calculate total capacity
  const totalCapacity = ticketTiers.reduce((sum, tier) => 
    sum + (tier.capacity || 0), 0
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/tickets/organizer/dashboard">
            <Button variant="ghost" className="mb-4" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-fraunces mb-2">Create New Event</h1>
          <p className="text-lg text-muted-foreground">
            Set up your event details, configure tickets, and start selling
          </p>
        </div>

        {/* Stripe Connect Warning */}
        {!organizerData?.organizer?.stripeOnboardingComplete && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Complete Stripe setup to publish events</p>
                  <p className="text-sm text-orange-700 mt-1">
                    You can create and save events as drafts, but you'll need to connect your Stripe account before publishing.
                  </p>
                  <Link href="/tickets/organizer/dashboard">
                    <Button size="sm" className="mt-3">Complete Setup</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event Creation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="details" data-testid="tab-event-details">
              <Info className="w-4 h-4 mr-2" />
              Event Details
            </TabsTrigger>
            <TabsTrigger value="tickets" data-testid="tab-ticket-tiers">
              <Ticket className="w-4 h-4 mr-2" />
              Ticket Tiers
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-fee-settings">
              <Settings className="w-4 h-4 mr-2" />
              Fees & Taxes
            </TabsTrigger>
          </TabsList>

          {/* Event Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
                <CardDescription>
                  Basic details about your event that attendees will see
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    data-testid="input-event-title"
                    placeholder="e.g., Summer Music Festival 2025"
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>

                {/* Event Summary */}
                <div className="space-y-2">
                  <Label htmlFor="summary">Short Summary</Label>
                  <Input
                    id="summary"
                    data-testid="input-event-summary"
                    placeholder="Brief one-line description"
                    value={form.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Displayed in event cards and search results
                  </p>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    data-testid="input-event-description"
                    placeholder="Detailed information about your event..."
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={6}
                  />
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    {form.coverUrl ? (
                      <div className="space-y-4">
                        <img
                          src={form.coverUrl}
                          alt="Event cover"
                          className="w-full max-w-md mx-auto rounded-lg"
                        />
                        <div className="flex justify-center gap-2">
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
                            data-testid="button-remove-image"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <ObjectUploader
                        onUpload={uploadImageMutation.mutateAsync}
                        accept="image/*"
                        maxSizeMB={5}
                        placeholder="Upload event cover image (recommended: 1920x1080)"
                        className="w-full"
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Recommended size: 1920x1080px. Max 5MB.
                  </p>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimePicker
                    label="Start Date & Time *"
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
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location Details
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue Name *</Label>
                    <Input
                      id="venue"
                      data-testid="input-event-venue"
                      placeholder="e.g., Rogers Arena"
                      value={form.venue}
                      onChange={(e) => handleInputChange('venue', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      data-testid="input-event-address"
                      placeholder="e.g., 800 Griffiths Way"
                      value={form.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        data-testid="input-event-city"
                        placeholder="Vancouver"
                        value={form.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Province *</Label>
                      <Select value={form.province} onValueChange={(value) => handleInputChange('province', value)}>
                        <SelectTrigger data-testid="select-event-province">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ticket Tiers Tab */}
          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Tiers</CardTitle>
                <CardDescription>
                  Configure different ticket types and pricing for your event
                </CardDescription>
                {totalCapacity > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Total capacity: {totalCapacity} tickets
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketTiers.map((tier, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="pt-6">
                      {ticketTiers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeTier(index)}
                          data-testid={`button-remove-tier-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tier Name *</Label>
                            <Input
                              placeholder="e.g., General Admission, VIP, Early Bird"
                              value={tier.name}
                              onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                              data-testid={`input-tier-name-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Price (CAD)</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-9"
                                placeholder="0.00"
                                value={tier.priceCents / 100 || ''}
                                onChange={(e) => handleTierChange(index, 'priceCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                                data-testid={`input-tier-price-${index}`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="What's included with this ticket?"
                            value={tier.description}
                            onChange={(e) => handleTierChange(index, 'description', e.target.value)}
                            rows={2}
                            data-testid={`input-tier-description-${index}`}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Capacity</Label>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Unlimited"
                              value={tier.capacity || ''}
                              onChange={(e) => handleTierChange(index, 'capacity', e.target.value ? parseInt(e.target.value) : null)}
                              data-testid={`input-tier-capacity-${index}`}
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave blank for unlimited
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Max per Order</Label>
                            <Input
                              type="number"
                              min="1"
                              value={tier.maxPerOrder}
                              onChange={(e) => handleTierChange(index, 'maxPerOrder', parseInt(e.target.value) || 10)}
                              data-testid={`input-tier-max-per-order-${index}`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DateTimePicker
                            label="Sales Start (Optional)"
                            value={tier.salesStartAt}
                            onChange={(value) => handleTierChange(index, 'salesStartAt', value)}
                            placeholder="Immediately"
                            testId={`tier-sales-start-${index}`}
                          />
                          <DateTimePicker
                            label="Sales End (Optional)"
                            value={tier.salesEndAt}
                            onChange={(value) => handleTierChange(index, 'salesEndAt', value)}
                            placeholder="At event start"
                            testId={`tier-sales-end-${index}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  variant="outline"
                  onClick={addTier}
                  className="w-full"
                  data-testid="button-add-tier"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Ticket Tier
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fees & Taxes Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Fees & Tax Settings</CardTitle>
                <CardDescription>
                  Configure how service fees and taxes are handled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Fee Structure */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Service Fee Structure
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="feeStructure"
                        className="mt-1"
                        checked={form.feeStructure.type === 'buyer_pays'}
                        onChange={() => handleInputChange('feeStructure', { ...form.feeStructure, type: 'buyer_pays' })}
                        data-testid="radio-buyer-pays"
                      />
                      <div>
                        <p className="font-medium">Buyer Pays Fees (Recommended)</p>
                        <p className="text-sm text-muted-foreground">
                          Service fees are added to the ticket price at checkout. You receive the full ticket price.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="feeStructure"
                        className="mt-1"
                        checked={form.feeStructure.type === 'organizer_absorbs'}
                        onChange={() => handleInputChange('feeStructure', { ...form.feeStructure, type: 'organizer_absorbs' })}
                        data-testid="radio-organizer-absorbs"
                      />
                      <div>
                        <p className="font-medium">Organizer Absorbs Fees</p>
                        <p className="text-sm text-muted-foreground">
                          Service fees are deducted from your payout. Buyers see the exact ticket price.
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Service Fee: {form.feeStructure.serviceFeePercent}%</p>
                    <p className="text-xs text-muted-foreground">
                      This covers payment processing and platform features
                    </p>
                  </div>
                </div>

                {/* Tax Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Tax Collection
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="collectTax">Collect Taxes</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically calculate and collect applicable taxes
                      </p>
                    </div>
                    <Switch
                      id="collectTax"
                      checked={form.taxSettings.collectTax}
                      onCheckedChange={(checked) => 
                        handleInputChange('taxSettings', { ...form.taxSettings, collectTax: checked })
                      }
                      data-testid="switch-collect-tax"
                    />
                  </div>

                  {form.taxSettings.collectTax && (
                    <div className="space-y-3 pl-4 border-l-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>GST Rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={form.taxSettings.gstPercent}
                            onChange={(e) => 
                              handleInputChange('taxSettings', { 
                                ...form.taxSettings, 
                                gstPercent: parseFloat(e.target.value) || 0 
                              })
                            }
                            data-testid="input-gst-percent"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>PST Rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={form.taxSettings.pstPercent}
                            onChange={(e) => 
                              handleInputChange('taxSettings', { 
                                ...form.taxSettings, 
                                pstPercent: parseFloat(e.target.value) || 0 
                              })
                            }
                            data-testid="input-pst-percent"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Default rates for British Columbia. Adjust based on your event location.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button
            onClick={() => handleSubmit('draft')}
            variant="outline"
            disabled={createEventMutation.isPending}
            className="flex-1"
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit('published')}
            disabled={createEventMutation.isPending || !organizerData?.organizer?.stripeOnboardingComplete}
            className="flex-1"
            data-testid="button-publish-event"
          >
            {createEventMutation.isPending ? (
              <>Creating...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Publish Event
              </>
            )}
          </Button>
        </div>

        {/* Cancel Link */}
        <div className="text-center mt-4">
          <Link href="/tickets/organizer/dashboard">
            <Button variant="ghost" data-testid="button-cancel">
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}