import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

interface EventCreateForm {
  title: string;
  description: string;
  startAt: string;
  venue: string;
  city: string;
  province: string;
  country: string;
  capacity: number;
}

export function TicketsEventCreatePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Check if ticketing is enabled
  const isEnabled = import.meta.env.VITE_ENABLE_TICKETING === 'true';
  
  // For MVP, get organizer ID from localStorage
  const organizerId = localStorage.getItem('ticketsOrganizerId');
  
  const [form, setForm] = useState<EventCreateForm>({
    title: '',
    description: '',
    startAt: '',
    venue: '',
    city: 'Vancouver',
    province: 'BC',
    country: 'CA',
    capacity: 100
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventCreateForm) => {
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
          description: "Your event has been created. You can now add ticket tiers.",
        });
        
        // Invalidate organizer dashboard data
        queryClient.invalidateQueries({ queryKey: ['/api/tickets/organizers/me'] });
        
        // Redirect to dashboard
        setLocation('/tickets/organizer/dashboard');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title || !form.startAt || !form.venue) {
      toast({
        title: "Please fill in required fields",
        description: "Title, date/time, and venue are required",
        variant: "destructive",
      });
      return;
    }
    
    createEventMutation.mutate(form);
  };

  const handleInputChange = (field: keyof EventCreateForm, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!isEnabled || !organizerId) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-fraunces mb-4">Access Denied</h1>
        <p className="text-muted-foreground">Please log in as an organizer to create events.</p>
        <Link href="/tickets/organizer/signup">
          <Button className="mt-4">Sign Up as Organizer</Button>
        </Link>
      </div>
    );
  }

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
            Set up your event details and start selling tickets
          </p>
        </div>

        {/* Event Creation Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Event Information
            </CardTitle>
            <CardDescription>
              Enter your event details below. You can add ticket tiers after creating the event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  data-testid="input-event-title"
                  placeholder="Enter event title"
                  value={form.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              {/* Event Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  data-testid="input-event-description"
                  placeholder="Describe your event"
                  value={form.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                />
              </div>

              {/* Date and Time */}
              <div className="space-y-2">
                <Label htmlFor="startAt">Date & Time *</Label>
                <Input
                  id="startAt"
                  data-testid="input-event-datetime"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => {
                    // Convert datetime-local to ISO format
                    const isoDateTime = e.target.value ? new Date(e.target.value).toISOString() : '';
                    handleInputChange('startAt', isoDateTime);
                  }}
                  required
                />
              </div>

              {/* Venue */}
              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input
                  id="venue"
                  data-testid="input-event-venue"
                  placeholder="Enter venue name"
                  value={form.venue}
                  onChange={(e) => handleInputChange('venue', e.target.value)}
                  required
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    data-testid="input-event-city"
                    placeholder="City"
                    value={form.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={form.country} onValueChange={(value) => handleInputChange('country', value)}>
                    <SelectTrigger data-testid="select-event-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Capacity */}
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  data-testid="input-event-capacity"
                  type="number"
                  min="1"
                  placeholder="Maximum attendees"
                  value={form.capacity}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="flex-1"
                  data-testid="button-create-event-submit"
                >
                  {createEventMutation.isPending ? (
                    <>Creating...</>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Event
                    </>
                  )}
                </Button>
                <Link href="/tickets/organizer/dashboard">
                  <Button variant="outline" data-testid="button-cancel-create">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}