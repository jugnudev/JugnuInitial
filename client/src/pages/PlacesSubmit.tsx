import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, MapPin, Globe, Instagram, Image, Tag, CheckCircle, Plus } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.string().min(1, "Please select a type"),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  website_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  instagram: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url("Please enter a valid image URL").optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  honeypot: z.string().max(0, "Bot detected") // Hidden field for spam prevention
});

type FormData = z.infer<typeof schema>;

const typeOptions = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "dessert", label: "Dessert Shop" },
  { value: "grocer", label: "Grocery Store" },
  { value: "fashion", label: "Fashion/Clothing" },
  { value: "beauty", label: "Beauty/Salon" },
  { value: "dance", label: "Dance Studio" },
  { value: "temple", label: "Temple" },
  { value: "gurdwara", label: "Gurdwara" },
  { value: "mosque", label: "Mosque" },
  { value: "gallery", label: "Art Gallery" },
  { value: "org", label: "Organization" },
  { value: "other", label: "Other" },
];

const neighborhoodOptions = [
  { value: "", label: "Select area (optional)" },
  { value: "Downtown", label: "Downtown" },
  { value: "Gastown", label: "Gastown" },
  { value: "Kitsilano", label: "Kitsilano" },
  { value: "Burnaby", label: "Burnaby" },
  { value: "Surrey", label: "Surrey" },
  { value: "Richmond", label: "Richmond" },
  { value: "North Vancouver", label: "North Vancouver" },
  { value: "West Vancouver", label: "West Vancouver" },
  { value: "New Westminster", label: "New Westminster" },
];

export default function PlacesSubmit() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      honeypot: ""
    }
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Parse tags from comma-separated string
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      const response = await fetch("/api/places/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          neighborhood: data.neighborhood || null,
          address: data.address || null,
          website_url: data.website_url || null,
          instagram: data.instagram || null,
          description: data.description || null,
          image_url: data.image_url || null,
          tags: tags,
          honeypot: data.honeypot
        })
      });

      if (!response.ok) throw new Error("Failed to submit place");

      setIsSubmitted(true);
      toast({
        title: "Place submitted!",
        description: "We'll review your submission and add it to our directory soon."
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
      <Layout>
        <div className="min-h-screen bg-bg text-text py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h1 className="font-fraunces text-3xl font-bold text-primary">
                Place Submitted!
              </h1>
              <p className="text-lg text-muted">
                Thank you for submitting your place. We'll review it and add it to our directory within 2-3 business days.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/places")}
                  className="bg-primary hover:bg-primary-700 text-black font-medium"
                >
                  Browse Places
                </Button>
                <p className="text-sm text-muted/80">
                  Questions? Email us at hello@jugnu.events
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-bg text-text py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-fraunces text-4xl font-bold text-primary mb-4">
              List Your Place
            </h1>
            <p className="text-lg text-muted mb-6">
              Add your South Asian business or cultural spot to our directory
            </p>
            
            {/* Guidelines */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left space-y-4">
              <h2 className="font-semibold text-white">Submission Guidelines</h2>
              <ul className="space-y-2 text-sm text-muted">
                <li>• Must be a South Asian business or cultural location in Vancouver area</li>
                <li>• Provide accurate and up-to-date information</li>
                <li>• Include high-quality photos when possible</li>
                <li>• All submissions are reviewed before being published</li>
                <li>• Free to list, premium featured placement available</li>
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

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Store className="w-5 h-5" />
                Basic Information
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Your business name"
                    data-testid="input-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-400">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select onValueChange={(value) => form.setValue("type", value)}>
                    <SelectTrigger data-testid="select-type">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.type && (
                    <p className="text-sm text-red-400">{form.formState.errors.type.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Neighborhood</Label>
                  <Select onValueChange={(value) => form.setValue("neighborhood", value)}>
                    <SelectTrigger data-testid="select-neighborhood">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {neighborhoodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="123 Main St, Vancouver, BC"
                    data-testid="input-address"
                  />
                </div>
              </div>
            </div>

            {/* Online Presence */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Online Presence
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="website_url">Website</Label>
                  <Input
                    id="website_url"
                    type="url"
                    {...form.register("website_url")}
                    placeholder="https://yourwebsite.com"
                    data-testid="input-website"
                  />
                  {form.formState.errors.website_url && (
                    <p className="text-sm text-red-400">{form.formState.errors.website_url.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...form.register("instagram")}
                    placeholder="@yourbusiness or full URL"
                    data-testid="input-instagram"
                  />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Image className="w-5 h-5" />
                Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Tell us about your business, what makes it special, your specialties..."
                  rows={4}
                  data-testid="textarea-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Photo URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  {...form.register("image_url")}
                  placeholder="https://... (direct link to a photo of your business)"
                  data-testid="input-image"
                />
                <p className="text-xs text-muted/80">
                  Link to a high-quality photo of your business (exterior, interior, or food)
                </p>
                {form.formState.errors.image_url && (
                  <p className="text-sm text-red-400">{form.formState.errors.image_url.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Specialties/Tags</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="biryani, south indian, vegan, halal, catering..."
                  data-testid="input-tags"
                />
                <p className="text-xs text-muted/80">
                  Comma-separated tags describing your specialties, cuisine type, etc.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary-700 text-black font-semibold py-3 text-lg min-h-12"
                data-testid="button-submit"
              >
                {isSubmitting ? "Submitting..." : "Submit Place"}
              </Button>
              <p className="text-sm text-muted/80 text-center mt-3">
                We'll review your submission and add it to our directory within 2-3 business days
              </p>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}