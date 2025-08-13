import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Image, MapPin, Mail, User, Link as LinkIcon, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const schema = z.object({
  organizerName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  eventUrl: z.string().url("Please enter a valid URL"),
  category: z.string().min(1, "Please select a category"),
  title: z.string().optional(),
  startIso: z.string().optional(),
  venue: z.string().optional(),
  city: z.string().default("Vancouver, BC"),
  imageUrl: z.string().url("Please enter a valid image URL").optional().or(z.literal("")),
  message: z.string().optional(),
  rightsConfirmed: z.boolean().refine(val => val === true, "You must confirm you have rights to the imagery"),
  honeypot: z.string().max(0, "Bot detected") // Hidden field for spam prevention
});

type FormData = z.infer<typeof schema>;

export default function CommunityFeature() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      city: "Vancouver, BC",
      rightsConfirmed: false,
      honeypot: ""
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/community/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_name: data.organizerName,
          email: data.email.toLowerCase().trim(),
          event_url: data.eventUrl,
          category: data.category,
          title: data.title || null,
          start_iso: data.startIso || null,
          venue: data.venue || null,
          city: data.city,
          image_url: data.imageUrl || null,
          message: data.message || null,
          rights_confirmed: data.rightsConfirmed,
          honeypot: data.honeypot
        })
      });

      if (!response.ok) throw new Error("Failed to submit request");

      setIsSubmitted(true);
      toast({
        title: "Request submitted!",
        description: "We'll review your featured placement request and get back to you soon."
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bg text-text py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          <div className="text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h1 className="font-fraunces text-3xl font-bold text-primary">
              Request Submitted!
            </h1>
            <p className="text-lg text-muted">
              Thank you for your featured placement request. We'll review it and get back to you within 2-3 business days.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate("/events")}
                className="bg-primary hover:bg-primary-700 text-black font-medium focus-ring"
              >
                Back to Events
              </Button>
              <p className="text-sm text-muted/80">
                Questions? Email us at hello@jugnu.events
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-fraunces text-4xl font-bold text-primary mb-4">
            Request Featured Placement
          </h1>
          <p className="text-lg text-muted mb-6">
            Get your South Asian event featured prominently on our events calendar
          </p>
          
          {/* Guidelines */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left space-y-4">
            <h2 className="font-semibold text-white">Guidelines for Featured Events</h2>
            <ul className="space-y-2 text-sm text-muted">
              <li>• Events must be South Asian cultural events in Vancouver</li>
              <li>• High-quality poster/image required (16:9 aspect ratio preferred)</li>
              <li>• Event details should be finalized (date, venue, tickets)</li>
              <li>• You must have rights to use the imagery and event information</li>
              <li>• Featured placement is subject to approval and availability</li>
            </ul>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Honeypot field */}
          <input
            type="text"
            {...form.register("honeypot")}
            style={{ display: "none" }}
            tabIndex={-1}
            autoComplete="off"
          />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Contact Information
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organizerName">Organizer Name *</Label>
                  <Input
                    id="organizerName"
                    {...form.register("organizerName")}
                    placeholder="Your name or organization"
                    data-testid="input-organizer-name"
                  />
                  {form.formState.errors.organizerName && (
                    <p className="text-sm text-red-400">{form.formState.errors.organizerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="your@email.com"
                    data-testid="input-email"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-400">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Event Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="eventUrl">Event Link *</Label>
                <Input
                  id="eventUrl"
                  type="url"
                  {...form.register("eventUrl")}
                  placeholder="https://eventbrite.com/... or Instagram/website link"
                  data-testid="input-event-url"
                />
                <p className="text-xs text-muted/80">Eventbrite, official website, or social media link</p>
                {form.formState.errors.eventUrl && (
                  <p className="text-sm text-red-400">{form.formState.errors.eventUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(value) => form.setValue("category", value)}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concert">Concert</SelectItem>
                    <SelectItem value="club">Club Night</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.category && (
                  <p className="text-sm text-red-400">{form.formState.errors.category.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Event name (optional)"
                    data-testid="input-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startIso">Event Date & Time</Label>
                  <Input
                    id="startIso"
                    type="datetime-local"
                    {...form.register("startIso")}
                    data-testid="input-start-date"
                  />
                  <p className="text-xs text-muted/80">Vancouver timezone</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    {...form.register("venue")}
                    placeholder="Venue name (optional)"
                    data-testid="input-venue"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    placeholder="Vancouver, BC"
                    data-testid="input-city"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Poster/Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  {...form.register("imageUrl")}
                  placeholder="https://... (optional but recommended)"
                  data-testid="input-image-url"
                />
                <p className="text-xs text-muted/80">Direct link to your event poster (16:9 aspect ratio preferred)</p>
                {form.formState.errors.imageUrl && (
                  <p className="text-sm text-red-400">{form.formState.errors.imageUrl.message}</p>
                )}
              </div>
            </div>

            {/* Message */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Additional Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="message">Why should this event be featured?</Label>
                <Textarea
                  id="message"
                  {...form.register("message")}
                  placeholder="Tell us what makes this event special... (optional)"
                  rows={4}
                  data-testid="textarea-message"
                />
              </div>
            </div>

            {/* Rights Confirmation */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="rightsConfirmed"
                  checked={form.watch("rightsConfirmed")}
                  onCheckedChange={(checked) => form.setValue("rightsConfirmed", checked as boolean)}
                  data-testid="checkbox-rights"
                />
                <div className="space-y-1">
                  <Label htmlFor="rightsConfirmed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I confirm I have rights to the poster/image and event information *
                  </Label>
                  <p className="text-xs text-muted/80">
                    You must own or have permission to use all images and event details provided
                  </p>
                </div>
              </div>
              {form.formState.errors.rightsConfirmed && (
                <p className="text-sm text-red-400">{form.formState.errors.rightsConfirmed.message}</p>
              )}
            </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-700 text-black font-semibold py-3 text-lg min-h-12 focus-ring"
              data-testid="button-submit"
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
            <p className="text-sm text-muted/80 text-center mt-3">
              We'll review your request and contact you within 2-3 business days
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}