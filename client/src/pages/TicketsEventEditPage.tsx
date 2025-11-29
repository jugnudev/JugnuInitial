import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Ticket,
  Plus,
  Trash2,
  Save,
  Eye,
  Upload,
  ArrowLeft,
  Image as ImageIcon,
  Settings,
  AlertCircle,
  Users
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { ObjectUploader } from "@/components/ObjectUploader";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  startAt: z.string().min(1, "Start date is required"),
  endAt: z.string().optional(),
  venue: z.string().min(1, "Venue is required").max(200),
  address: z.string().max(500).optional(),
  city: z.string().min(1, "City is required").max(100),
  province: z.string().min(1, "Province is required").max(100),
  country: z.string().default("Canada"),
  postalCode: z.string().max(20).optional(),
  coverUrl: z.string().optional(),
  capacity: z.number().min(1).max(100000).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isGstApplied: z.boolean().default(true),
  isPstApplied: z.boolean().default(true),
  gstRate: z.number().min(0).max(100).default(5),
  pstRate: z.number().min(0).max(100).default(7),
  buyerPaysServiceFee: z.boolean().default(true),
  serviceFeeMode: z.enum(['percent', 'flat']).default('percent'),
  serviceFeePercent: z.number().min(0).max(100).default(5),
  serviceFeeAmountCents: z.number().int().min(0).default(0)
});

interface TicketTier {
  id?: string;
  eventId?: string;
  name: string;
  description?: string;
  priceCents: number;
  capacity?: number | null;
  maxPerOrder: number;
  salesStartAt?: string;
  salesEndAt?: string;
  soldCount?: number;
  showRemaining?: boolean;
  tempId?: string;
}

interface Event {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  description?: string;
  startAt: string;
  endAt?: string;
  venue: string;
  address?: string;
  city: string;
  province: string;
  country: string;
  postalCode?: string;
  coverUrl?: string;
  capacity?: number;
  status: 'draft' | 'published' | 'archived';
  organizerId: string;
  isGstApplied: boolean;
  isPstApplied: boolean;
  gstRate: number;
  pstRate: number;
  buyerPaysServiceFee: boolean;
  tiers?: TicketTier[];
  stats?: {
    ticketsSold: number;
    revenue: number;
    views: number;
  };
}

type FormValues = z.infer<typeof eventFormSchema>;

export function TicketsEventEditPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [coverImage, setCoverImage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  // Wait for user session to be ready before fetching organizer data
  const { data: userData, isLoading: isLoadingUser } = useQuery<{ ok: boolean; user: any }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  
  const isUserReady = !isLoadingUser && !!userData?.user;

  // Get organizer data from approved business account
  const { data: organizerData, isLoading: isLoadingOrganizer } = useQuery<{ ok: boolean; organizer: any }>({
    queryKey: ['/api/tickets/organizers/me'],
    enabled: isEnabled && isUserReady,
    retry: false,
  });
  
  const organizer = organizerData?.organizer;
  const organizerId = organizer?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      summary: "",
      description: "",
      startAt: "",
      endAt: "",
      venue: "",
      address: "",
      city: "",
      province: "ON",
      country: "Canada",
      postalCode: "",
      coverUrl: "",
      capacity: 500,
      status: 'draft',
      isGstApplied: true,
      isPstApplied: true,
      gstRate: 5,
      pstRate: 7,
      buyerPaysServiceFee: true,
      serviceFeeMode: 'percent',
      serviceFeePercent: 5,
      serviceFeeAmountCents: 0
    }
  });

  const { data, isLoading, error } = useQuery<{ ok: boolean; event: Event }>({
    queryKey: [`/api/tickets/events/${eventId}`],
    enabled: isEnabled && !!organizerId && !!eventId,
    meta: {
      headers: {
        'x-organizer-id': organizerId || ''
      }
    }
  });

  // Populate form with existing data
  useEffect(() => {
    if (data?.event) {
      const event = data.event;
      
      // Extract tax settings from JSONB field
      const taxSettings = (event as any).taxSettings || { collectTax: true, gstPercent: 5, pstPercent: 7 };
      const feeStructure = (event as any).feeStructure || { type: 'buyer_pays', mode: 'percent', percent: 5 };
      
      // For backwards compatibility, check if flat fields exist (old data)
      const isGstApplied = event.isGstApplied ?? (taxSettings.collectTax ? true : false);
      const isPstApplied = event.isPstApplied ?? (taxSettings.collectTax ? true : false);
      const gstRate = event.gstRate ?? taxSettings.gstPercent ?? 5;
      const pstRate = event.pstRate ?? taxSettings.pstPercent ?? 7;
      const buyerPaysServiceFee = event.buyerPaysServiceFee ?? (feeStructure.type === 'buyer_pays');
      // Handle both new and legacy fee structure formats
      const serviceFeeMode = feeStructure.mode || 'percent';
      const serviceFeePercent = feeStructure.percent ?? feeStructure.serviceFeePercent ?? 5;
      const serviceFeeAmountCents = feeStructure.amountCents ?? 0;
      
      form.reset({
        title: event.title,
        summary: event.summary || "",
        description: event.description || "",
        startAt: event.startAt ? format(new Date(event.startAt), "yyyy-MM-dd'T'HH:mm:ss") : "",
        endAt: event.endAt ? format(new Date(event.endAt), "yyyy-MM-dd'T'HH:mm:ss") : "",
        venue: event.venue,
        address: event.address || "",
        city: event.city,
        province: event.province,
        country: event.country || "Canada",
        postalCode: event.postalCode || "",
        coverUrl: event.coverUrl || "",
        capacity: event.capacity || 500,
        status: event.status,
        isGstApplied,
        isPstApplied,
        gstRate,
        pstRate,
        buyerPaysServiceFee,
        serviceFeeMode: serviceFeeMode as 'percent' | 'flat',
        serviceFeePercent,
        serviceFeeAmountCents
      });
      
      if (event.coverUrl) {
        setCoverImage(event.coverUrl);
      }
      
      if (event.tiers) {
        setTicketTiers(event.tiers);
      }
    }
  }, [data, form]);

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('[Image Upload] Starting upload for file:', file.name);
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/tickets/events/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to upload image');
      const data = await response.json();
      console.log('[Image Upload] Upload successful, image URL:', data.imageUrl);
      
      // Update form and state with the new image URL
      setCoverImage(data.imageUrl);
      form.setValue('coverUrl', data.imageUrl);
      console.log('[Image Upload] Updated coverImage state and form value');
      
      return data.imageUrl;
    },
    onSuccess: (imageUrl) => {
      console.log('[Image Upload] onSuccess called with URL:', imageUrl);
      toast({
        title: "Image uploaded",
        description: "Your cover image has been uploaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async (values: FormValues & { tiers: TicketTier[] }) => {
      setIsSubmitting(true);
      
      // Convert flat tax/fee fields to JSONB objects for database
      const taxSettings = {
        collectTax: values.isGstApplied || values.isPstApplied,
        gstPercent: values.gstRate || 5,
        pstPercent: values.pstRate || 7
      };
      
      const feeStructure = {
        type: values.buyerPaysServiceFee ? 'buyer_pays' : 'organizer_absorbs',
        mode: values.serviceFeeMode || 'percent',
        percent: values.serviceFeePercent || 0,
        amountCents: values.serviceFeeAmountCents || 0
      };
      
      // Only send fields that exist in the database schema
      const payload = {
        title: values.title,
        summary: values.summary,
        description: values.description,
        startAt: values.startAt ? new Date(values.startAt).toISOString() : undefined,
        endAt: values.endAt ? new Date(values.endAt).toISOString() : undefined,
        venue: values.venue,
        city: values.city,
        province: values.province,
        coverUrl: coverImage || values.coverUrl,
        status: values.status,
        taxSettings,
        feeStructure,
        tiers: values.tiers
      };
      
      const response = await apiRequest('PATCH', `/api/tickets/events/${eventId}`, payload);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update event');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/events/${eventId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
      toast({
        title: "Event updated",
        description: "Your event has been updated successfully."
      });
      setIsSubmitting(false);
      
      // Redirect to community manage events tab after successful update
      setTimeout(() => {
        const communitySlug = organizer?.communitySlug;
        if (communitySlug) {
          setLocation(`/communities/${communitySlug}?tab=manage-events`);
        } else {
          setLocation('/tickets/organizer/dashboard');
        }
      }, 1000);
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Failed to update event",
        description: error.message || "An error occurred while updating the event",
        variant: "destructive"
      });
    }
  });

  const addTicketTier = () => {
    const newTier: TicketTier = {
      tempId: `temp-${Date.now()}`,
      name: `Tier ${ticketTiers.length + 1}`,
      description: "",
      priceCents: 0,
      capacity: null,
      maxPerOrder: 10,
      salesStartAt: form.getValues('startAt'),
      salesEndAt: form.getValues('endAt'),
      showRemaining: true
    };
    setTicketTiers([...ticketTiers, newTier]);
  };

  const updateTicketTier = (index: number, updates: Partial<TicketTier>) => {
    const newTiers = [...ticketTiers];
    newTiers[index] = { ...newTiers[index], ...updates };
    setTicketTiers(newTiers);
  };

  const removeTicketTier = (index: number) => {
    setTicketTiers(ticketTiers.filter((_, i) => i !== index));
  };

  const onSubmit = (values: FormValues) => {
    if (ticketTiers.length === 0) {
      toast({
        title: "No ticket tiers",
        description: "Please add at least one ticket tier before saving",
        variant: "destructive"
      });
      return;
    }

    updateEventMutation.mutate({ ...values, tiers: ticketTiers });
  };

  if (isLoadingUser || isLoadingOrganizer) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isEnabled || !organizerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-fraunces mb-4">Access Required</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Please sign in as an organizer to edit events
        </p>
        <Button onClick={() => {
          const communitySlug = organizer?.communitySlug;
          if (communitySlug) {
            setLocation(`/communities/${communitySlug}?tab=manage-events`);
          } else {
            setLocation('/tickets/organizer/dashboard');
          }
        }}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.event) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Event not found</h1>
        <p className="text-muted-foreground mb-4">Unable to load event details</p>
        <Button onClick={() => {
          const communitySlug = organizer?.communitySlug;
          if (communitySlug) {
            setLocation(`/communities/${communitySlug}?tab=manage-events`);
          } else {
            setLocation('/tickets/organizer/dashboard');
          }
        }}>
          Back to Events
        </Button>
      </div>
    );
  }

  const event = data.event;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => {
              const communitySlug = organizer?.communitySlug;
              if (communitySlug) {
                setLocation(`/communities/${communitySlug}?tab=manage-events`);
              } else {
                setLocation('/tickets/organizer/dashboard');
              }
            }}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-fraunces mb-2">Edit Event</h1>
              <p className="text-lg text-muted-foreground">
                Update your event details and ticket tiers
              </p>
            </div>
            
            {event.status === 'published' && (
              <Button
                variant="outline"
                onClick={() => window.open(`/tickets/event/${event.slug}`, '_blank')}
                data-testid="button-preview"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Live Event
              </Button>
            )}
          </div>
        </div>

        {/* Sales Stats Alert */}
        {event.stats && event.stats.ticketsSold > 0 && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Active Event:</strong> This event has sold {event.stats.ticketsSold} tickets 
              generating ${(event.stats.revenue / 100).toFixed(2)} in revenue. 
              Changes to ticket tiers will only affect new purchases.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                    <CardDescription>
                      Basic information about your event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="e.g., Summer Music Festival 2025"
                              data-testid="input-title"
                              className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="summary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Summary</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Brief description for event cards (max 500 chars)"
                              className="resize-none h-20 bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              maxLength={500}
                              data-testid="input-summary"
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/500 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="Detailed event description, lineup, schedule, etc."
                              className="resize-none h-32 bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              maxLength={5000}
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/5000 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Date & Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Clock className="w-5 h-5 inline mr-2" />
                      Date & Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date & Time</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                type="datetime-local"
                                data-testid="input-start-date"
                                className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date & Time (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                type="datetime-local"
                                data-testid="input-end-date"
                                className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <MapPin className="w-5 h-5 inline mr-2" />
                      Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="venue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="e.g., Rogers Centre"
                              data-testid="input-venue"
                              className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="e.g., 1 Blue Jays Way"
                              data-testid="input-address"
                              className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                placeholder="e.g., Toronto"
                                data-testid="input-city"
                                className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province</FormLabel>
                            <Select 
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-province">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="AB">Alberta</SelectItem>
                                <SelectItem value="BC">British Columbia</SelectItem>
                                <SelectItem value="MB">Manitoba</SelectItem>
                                <SelectItem value="NB">New Brunswick</SelectItem>
                                <SelectItem value="NL">Newfoundland and Labrador</SelectItem>
                                <SelectItem value="NT">Northwest Territories</SelectItem>
                                <SelectItem value="NS">Nova Scotia</SelectItem>
                                <SelectItem value="NU">Nunavut</SelectItem>
                                <SelectItem value="ON">Ontario</SelectItem>
                                <SelectItem value="PE">Prince Edward Island</SelectItem>
                                <SelectItem value="QC">Quebec</SelectItem>
                                <SelectItem value="SK">Saskatchewan</SelectItem>
                                <SelectItem value="YT">Yukon</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                placeholder="Canada"
                                data-testid="input-country"
                                className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                placeholder="e.g., M5V 3B3"
                                data-testid="input-postal"
                                className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Tiers */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Ticket className="w-5 h-5 inline mr-2" />
                      Ticket Tiers
                    </CardTitle>
                    <CardDescription>
                      Configure different ticket types and pricing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ticketTiers.map((tier, index) => (
                        <Card key={tier.id || tier.tempId} className="relative">
                          <CardContent className="pt-6">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-2"
                              onClick={() => removeTicketTier(index)}
                              data-testid={`button-remove-tier-${index}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            
                            {tier.soldCount && tier.soldCount > 0 && (
                              <Alert className="mb-4">
                                <Users className="h-4 w-4" />
                                <AlertDescription>
                                  {tier.soldCount} tickets sold in this tier
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Tier Name</label>
                                <Input
                                  value={tier.name}
                                  onChange={(e) => updateTicketTier(index, { name: e.target.value })}
                                  placeholder="e.g., General Admission"
                                  data-testid={`input-tier-name-${index}`}
                                  className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Price (CAD) - Enter $0 for FREE tickets</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={(tier.priceCents ?? 0) / 100}
                                  onChange={(e) => updateTicketTier(index, { 
                                    priceCents: Math.round(parseFloat(e.target.value || '0') * 100)
                                  })}
                                  placeholder="0.00"
                                  data-testid={`input-tier-price-${index}`}
                                  className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <label className="text-sm font-medium">Description (Optional)</label>
                              <Textarea
                                value={tier.description || ''}
                                onChange={(e) => updateTicketTier(index, { description: e.target.value })}
                                placeholder="What's included with this ticket tier?"
                                className="resize-none h-20 bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                                data-testid={`input-tier-description-${index}`}
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div>
                                <label className="text-sm font-medium">Capacity (Optional)</label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={tier.capacity || ''}
                                  onChange={(e) => updateTicketTier(index, { 
                                    capacity: e.target.value ? parseInt(e.target.value) : null
                                  })}
                                  placeholder="Unlimited"
                                  data-testid={`input-tier-capacity-${index}`}
                                  className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                                />
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Max per Order</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={tier.maxPerOrder}
                                  onChange={(e) => updateTicketTier(index, { 
                                    maxPerOrder: parseInt(e.target.value) || 10
                                  })}
                                  placeholder="10"
                                  data-testid={`input-tier-max-${index}`}
                                  className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <label className="text-sm font-medium">Show Remaining Tickets</label>
                              <div className="flex items-center gap-3 mt-2 h-10 px-4 bg-charcoal-900/60 border border-charcoal-700 rounded-md">
                                <Switch
                                  checked={tier.showRemaining !== false}
                                  onCheckedChange={(checked) => updateTicketTier(index, { showRemaining: checked })}
                                  data-testid={`switch-tier-show-remaining-${index}`}
                                />
                                <span className="text-sm text-neutral-400">
                                  {tier.showRemaining !== false ? 'Visible to buyers' : 'Hidden from buyers'}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">
                                {tier.showRemaining !== false 
                                  ? 'Buyers will see how many tickets are left' 
                                  : 'Remaining count hidden on public pages'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={addTicketTier}
                        data-testid="button-add-tier"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Ticket Tier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Status & Publishing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Publishing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Status</FormLabel>
                          <Select 
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === 'draft' && "Event is not visible to customers"}
                            {field.value === 'published' && "Event is live and accepting ticket sales"}
                            {field.value === 'archived' && "Event is hidden from listings"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Capacity</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              min="1"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-capacity"
                              className="bg-charcoal-900/60 border-charcoal-700 focus:border-copper-500 text-white placeholder:text-neutral-500"
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum total attendees across all tiers
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Cover Image */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cover Image</CardTitle>
                    <CardDescription>
                      Upload an image for your event listing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {coverImage ? (
                      <div className="space-y-4">
                        <img 
                          src={coverImage}
                          alt="Event cover"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCoverImage("")}
                          className="w-full"
                          data-testid="button-remove-image"
                        >
                          Remove Image
                        </Button>
                      </div>
                    ) : (
                      <ObjectUploader
                        onUpload={uploadImageMutation.mutateAsync}
                        accept="image/*"
                        maxSizeMB={5}
                        placeholder="Drop image here or click to upload"
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Tax & Fees */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <DollarSign className="w-5 h-5 inline mr-2" />
                      Tax & Fees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isGstApplied"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Apply GST</FormLabel>
                            <FormDescription>
                              {form.watch('gstRate')}% federal tax
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-gst"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isPstApplied"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <div>
                            <FormLabel>Apply PST</FormLabel>
                            <FormDescription>
                              {form.watch('pstRate')}% provincial tax
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-pst"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <FormField
                      control={form.control}
                      name="buyerPaysServiceFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Fee</FormLabel>
                          <Select 
                            value={field.value ? "buyer" : "organizer"}
                            onValueChange={(v) => field.onChange(v === "buyer")}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-fee">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="buyer">Buyer pays fee</SelectItem>
                              <SelectItem value="organizer">Absorb fee (you pay)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Optional service fee you can charge (goes to you, not Jugnu)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="serviceFeeMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fee Type</FormLabel>
                          <Select 
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-fee-mode">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percent">Percentage of ticket price</SelectItem>
                              <SelectItem value="flat">Fixed dollar amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch('serviceFeeMode') === 'percent' ? (
                      <FormField
                        control={form.control}
                        name="serviceFeePercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Fee Percentage</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="5.0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  data-testid="input-service-fee-percent"
                                  className="pr-10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Percentage of ticket price to charge as a service fee (0-100%)
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="serviceFeeAmountCents"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Fee Amount</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="text"
                                  min="0"
                                  step="0.01"
                                  placeholder="2.50"
                                  defaultValue={(field.value / 100).toString()}
                                  onBlur={(e) => {
                                    const dollars = parseFloat(e.target.value);
                                    if (!isNaN(dollars) && dollars >= 0) {
                                      field.onChange(Math.round(dollars * 100));
                                      e.target.value = (Math.round(dollars * 100) / 100).toString();
                                    } else {
                                      field.onChange(0);
                                      e.target.value = "0";
                                    }
                                  }}
                                  data-testid="input-service-fee-amount"
                                  className="pl-7"
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Fixed dollar amount to charge per order as a service fee
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardContent className="pt-6 space-y-2">
                    <Button 
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                      data-testid="button-save"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        const communitySlug = organizer?.communitySlug;
                        if (communitySlug) {
                          setLocation(`/communities/${communitySlug}?tab=manage-events`);
                        } else {
                          setLocation('/tickets/organizer/dashboard');
                        }
                      }}
                      disabled={isSubmitting}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}