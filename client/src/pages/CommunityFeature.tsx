import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Image, MapPin, Mail, User, Link as LinkIcon, MessageSquare, CheckCircle, Upload, Ticket } from "lucide-react";
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
  eventUrl: z.string().url("Please enter a valid URL").or(z.string().startsWith("https://", "URL must start with https://")),
  category: z.string().min(1, "Please select a category"),
  title: z.string().min(1, "Event name is required"),
  startIso: z.string().min(1, "Start date and time is required"),
  endIso: z.string().min(1, "End date and time is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(1, "City is required"),
  ticketLink: z.union([
    z.literal("https://"),
    z.literal(""),
    z.string().url("Please enter a valid ticket URL")
  ]).optional(),
  imageUrl: z.union([
    z.literal("https://"),
    z.literal(""),
    z.string().url("Please enter a valid image URL")
  ]).optional(),
  message: z.string().optional(),
  rightsConfirmed: z.boolean().refine(val => val === true, "You must confirm you have rights to the imagery"),
  honeypot: z.string().max(0, "Bot detected") // Hidden field for spam prevention
});

type FormData = z.infer<typeof schema>;

export default function CommunityFeature() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      city: "",
      rightsConfirmed: false,
      honeypot: "",
      eventUrl: "https://",
      ticketLink: "https://",
      imageUrl: "https://"
    }
  });

  const validateImageAspectRatio = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const targetRatio = 16 / 9;
        const tolerance = 0.1;
        
        URL.revokeObjectURL(url);
        
        if (Math.abs(aspectRatio - targetRatio) <= tolerance) {
          resolve(true);
        } else {
          resolve(false);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };
      
      img.src = url;
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    const isValidAspectRatio = await validateImageAspectRatio(file);
    if (!isValidAspectRatio) {
      toast({
        title: "Invalid aspect ratio",
        description: "Please upload an image with 16:9 aspect ratio",
        variant: "destructive"
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleImageUpload(e.target.files[0]);
    }
  };

  const uploadImageToServer = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/community/feature/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Image upload failed');
      
      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      let uploadedImageUrl = null;
      
      if (imageFile) {
        uploadedImageUrl = await uploadImageToServer(imageFile);
        if (!uploadedImageUrl) {
          throw new Error("Failed to upload image");
        }
      }

      const response = await fetch("/api/community/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_name: data.organizerName,
          email: data.email.toLowerCase().trim(),
          event_url: data.eventUrl,
          category: data.category,
          title: data.title,
          start_iso: data.startIso,
          end_iso: data.endIso,
          address: data.address,
          city: data.city,
          ticket_link: data.ticketLink || null,
          image_url: data.imageUrl || null,
          uploaded_image_url: uploadedImageUrl,
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
                Questions? Email us at relations@thehouseofjugnu.com
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
                <Label htmlFor="title">Event Name *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter event name"
                  data-testid="input-title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-400">{form.formState.errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventUrl">Event Link *</Label>
                <Input
                  id="eventUrl"
                  type="url"
                  {...form.register("eventUrl")}
                  placeholder="eventbrite.com/... or Instagram/website link"
                  data-testid="input-event-url"
                />
                <p className="text-xs text-muted/80">Eventbrite, official website, or social media link</p>
                {form.formState.errors.eventUrl && (
                  <p className="text-sm text-red-400">{form.formState.errors.eventUrl.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketLink">Ticket Link</Label>
                <Input
                  id="ticketLink"
                  type="url"
                  {...form.register("ticketLink")}
                  placeholder="example.com/tickets (optional)"
                  data-testid="input-ticket-link"
                />
                <p className="text-xs text-muted/80">Direct link to purchase tickets</p>
                {form.formState.errors.ticketLink && (
                  <p className="text-sm text-red-400">{form.formState.errors.ticketLink.message}</p>
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
                    <SelectItem value="parties">Parties</SelectItem>
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
                  <Label htmlFor="startIso">Start Date & Time *</Label>
                  <Input
                    id="startIso"
                    type="datetime-local"
                    {...form.register("startIso")}
                    data-testid="input-start-date"
                  />
                  <p className="text-xs text-muted/80">Vancouver timezone - Select date, time, and AM/PM</p>
                  {form.formState.errors.startIso && (
                    <p className="text-sm text-red-400">{form.formState.errors.startIso.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endIso">End Date & Time *</Label>
                  <Input
                    id="endIso"
                    type="datetime-local"
                    {...form.register("endIso")}
                    data-testid="input-end-date"
                  />
                  <p className="text-xs text-muted/80">Vancouver timezone - Select date, time, and AM/PM</p>
                  {form.formState.errors.endIso && (
                    <p className="text-sm text-red-400">{form.formState.errors.endIso.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="Venue address"
                    data-testid="input-address"
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-400">{form.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    placeholder="Enter city"
                    data-testid="input-city"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-red-400">{form.formState.errors.city.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Image className="w-5 h-5" />
                Event Poster/Image
              </h3>

              <div className="space-y-4">
                {/* Drag and Drop Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-primary bg-primary/10' : 'border-white/20 hover:border-white/40'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img 
                        src={imagePreview} 
                        alt="Event preview" 
                        className="max-w-full h-48 object-contain mx-auto rounded"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Image
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted" />
                      <p className="text-white mb-2">Drag & drop your event poster here</p>
                      <p className="text-sm text-muted mb-4">or</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select Image
                      </Button>
                      <p className="text-xs text-muted mt-4">
                        16:9 aspect ratio required • Max 5MB • JPG, PNG, or WebP
                      </p>
                    </>
                  )}
                </div>

                {/* OR divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-bg px-2 text-muted">Or provide URL</span>
                  </div>
                </div>

                {/* Image URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Poster/Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    {...form.register("imageUrl")}
                    placeholder="example.com/image.jpg (optional if uploading image)"
                    disabled={!!imageFile}
                    data-testid="input-image-url"
                  />
                  <p className="text-xs text-muted/80">Direct link to your event poster (16:9 aspect ratio preferred)</p>
                  {form.formState.errors.imageUrl && (
                    <p className="text-sm text-red-400">{form.formState.errors.imageUrl.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Additional Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="message">Tell us more about this event</Label>
                <Textarea
                  id="message"
                  {...form.register("message")}
                  placeholder="Describe your event, what makes it special, expected attendance, etc. (optional)"
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