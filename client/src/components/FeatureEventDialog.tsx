import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Calendar, TrendingUp, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, differenceInDays } from "date-fns";

interface FeatureEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizerId: string;
  currentCredits: number;
  selectedEventId?: string | null;
  selectedEventData?: {
    id: string;
    title: string;
    startAt: string;
    venue: string;
  } | null;
  creditsLoading?: boolean;
}

interface Event {
  id: string;
  title: string;
  startAt: string;
  venue: string;
}

export function FeatureEventDialog({ open, onOpenChange, organizerId, currentCredits, selectedEventId: preselectedEventId, selectedEventData: preselectedEventData, creditsLoading = false }: FeatureEventDialogProps) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [placementType, setPlacementType] = useState<"events_banner" | "home_mid">("events_banner");
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [creditsNeeded, setCreditsNeeded] = useState<number>(0);

  // Pre-select event if provided from parent
  useEffect(() => {
    if (preselectedEventId) {
      setSelectedEventId(preselectedEventId);
    }
  }, [preselectedEventId]);

  // Only fetch organizer's events if no event is pre-selected
  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ ok: boolean; events: Event[] }>({
    queryKey: ["/api/tickets/organizers/me/events"],
    enabled: open && !preselectedEventId, // Don't fetch if event is pre-selected
  });

  const events = eventsData?.events || [];
  
  // Use pre-selected event data if provided, otherwise find from events list
  const hasPreselectedEvent = !!preselectedEventId;

  // Calculate credits needed whenever dates or placement type changes
  useEffect(() => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = differenceInDays(end, start) + 1; // +1 to include both start and end dates

    // 1 credit = 1 placement type for 1 day
    const credits = days * 1;
    setCreditsNeeded(Math.max(0, credits));
  }, [startDate, endDate, placementType]);

  const featureEventMutation = useMutation({
    mutationFn: async (data: {
      eventId: string;
      placement: string;
      startDate: string;
      endDate: string;
      creditsToDeduct: number;
    }) => {
      const response = await apiRequest("POST", "/api/billing/credits/spend", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Event featured successfully",
        description: `Your event will be promoted from ${format(new Date(startDate), "MMM d")} to ${format(new Date(endDate), "MMM d")}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/credits/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/credits/usage"] });
      onOpenChange(false);
      // Reset form
      setSelectedEventId("");
      setPlacementType("events_banner");
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setEndDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    },
    onError: (error: any) => {
      // Parse error message - it may contain JSON from the API response
      let errorMessage = "An error occurred while featuring your event.";
      try {
        const errorStr = error.message || "";
        // Check if the error message contains JSON (e.g., "409: {json}")
        const jsonMatch = errorStr.match(/\d+:\s*(\{.*\})/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[1]);
          if (errorData.error === "Placement slot already booked for selected dates") {
            errorMessage = "These dates are already booked. Please select different dates for your featured placement.";
          } else {
            errorMessage = errorData.error || errorMessage;
          }
        } else {
          errorMessage = errorStr || errorMessage;
        }
      } catch {
        // If parsing fails, use the raw message
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: "Failed to feature event",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedEventId) {
      toast({
        title: "Event required",
        description: "Please select an event to feature.",
        variant: "destructive",
      });
      return;
    }

    if (creditsNeeded > currentCredits) {
      toast({
        title: "Insufficient credits",
        description: `You need ${creditsNeeded} credits but only have ${currentCredits} available.`,
        variant: "destructive",
      });
      return;
    }

    featureEventMutation.mutate({
      eventId: selectedEventId,
      placement: placementType,
      startDate,
      endDate,
      creditsToDeduct: creditsNeeded,
    });
  };

  // Get selected event - use preselected data if available, otherwise find from events list
  const selectedEvent = preselectedEventData || events.find((e) => e.id === selectedEventId);
  const insufficientCredits = creditsNeeded > currentCredits;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-gradient-to-b from-charcoal-900/95 to-charcoal-950/95 backdrop-blur-xl border-2 border-copper-500/30 shadow-2xl shadow-copper-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-copper-500" />
            Feature Your Event
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Use your monthly placement credits to promote your event on Jugnu's homepage or events page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Credit Balance Display */}
          <div className="bg-gradient-to-r from-copper-500/10 to-copper-600/10 backdrop-blur-sm border border-copper-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-400">Available Credits</p>
                <p className="text-2xl font-bold text-copper-500">{currentCredits}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-400">Credits Needed</p>
                <p className={`text-2xl font-bold ${insufficientCredits ? "text-red-500" : "text-jade-500"}`}>
                  {creditsNeeded}
                </p>
              </div>
            </div>
          </div>

          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="event" className="text-white font-medium">
              {hasPreselectedEvent ? "Selected Event" : "Select Event"}
            </Label>
            {hasPreselectedEvent && selectedEvent ? (
              // Show the pre-selected event as a confirmation
              <div className="bg-jade-500/10 border border-jade-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-jade-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{selectedEvent.title}</p>
                    <p className="text-sm text-neutral-400">
                      {selectedEvent.venue} • {format(new Date(selectedEvent.startAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            ) : eventsLoading ? (
              <div className="flex items-center gap-2 text-neutral-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading events...</span>
              </div>
            ) : events.length === 0 ? (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200">
                  You don't have any events yet. Create an event first to feature it.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger
                    id="event"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                    data-testid="select-event"
                  >
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent className="bg-charcoal-950/98 border-copper-500/30">
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id} className="text-white hover:bg-copper-500/20">
                        {event.title} - {format(new Date(event.startAt), "MMM d, yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedEvent && (
                  <p className="text-sm text-neutral-400 mt-1">
                    {selectedEvent.venue} • {format(new Date(selectedEvent.startAt), "MMMM d, yyyy")}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Placement Type */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Placement Location</Label>
            <RadioGroup value={placementType} onValueChange={(value: any) => setPlacementType(value)}>
              <div className="flex items-center space-x-3 bg-white/5 border border-white/20 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <RadioGroupItem value="events_banner" id="events_banner" data-testid="radio-events-banner" />
                <Label htmlFor="events_banner" className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Events Page Banner</p>
                    <p className="text-sm text-neutral-400">Featured placement on /events page</p>
                  </div>
                </Label>
                <Calendar className="h-5 w-5 text-copper-500" />
              </div>
              <div className="flex items-center space-x-3 bg-white/5 border border-white/20 rounded-lg p-4 hover:bg-white/10 transition-colors">
                <RadioGroupItem value="home_mid" id="home_mid" data-testid="radio-home-mid" />
                <Label htmlFor="home_mid" className="flex-1 cursor-pointer">
                  <div>
                    <p className="text-white font-medium">Homepage Featured</p>
                    <p className="text-sm text-neutral-400">Premium placement on homepage</p>
                  </div>
                </Label>
                <TrendingUp className="h-5 w-5 text-copper-500" />
              </div>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-white font-medium">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="bg-white/5 border-white/20 text-white"
                data-testid="input-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-white font-medium">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="bg-white/5 border-white/20 text-white"
                data-testid="input-end-date"
              />
            </div>
          </div>

          {/* Credit Calculation Info */}
          <div className="bg-white/5 border border-white/20 rounded-lg p-4">
            <p className="text-sm text-neutral-300">
              <span className="font-medium text-white">Calculation:</span>{" "}
              {differenceInDays(new Date(endDate), new Date(startDate)) + 1} days × 1 credit per day = {creditsNeeded} credits
            </p>
          </div>

          {/* Insufficient Credits Warning */}
          {insufficientCredits && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-200">
                You need {creditsNeeded - currentCredits} more credits. Your subscription includes 2 credits per month.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/20 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEventId || insufficientCredits || featureEventMutation.isPending || creditsLoading}
            className="bg-gradient-to-r from-copper-500 to-copper-600 text-white hover:from-copper-600 hover:to-copper-700"
            data-testid="button-feature-event"
          >
            {creditsLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading credits...
              </>
            ) : featureEventMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Featuring...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Feature Event ({creditsNeeded} credits)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
