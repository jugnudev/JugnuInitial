import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Mail } from "lucide-react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Check authentication state
  const { data: authData } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
  });
  const isAuthenticated = !!(authData as any)?.user;
  
  // Newsletter signup mutation
  const newsletterMutation = useMutation({
    mutationFn: (email: string) => apiRequest('POST', '/api/waitlist', {
      email,
      first_name: '',
      last_name: '',
      consent: true,
      source: 'homepage'
    }),
    onSuccess: () => {
      setEmail('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  });
  
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && !newsletterMutation.isPending) {
      newsletterMutation.mutate(email);
    }
  };
  
  // Don't show if user is authenticated
  if (isAuthenticated) {
    return null;
  }
  
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text mb-4">Stay Updated</h2>
          <p className="text-base sm:text-lg text-muted mb-8">Get the latest events and deals delivered to your inbox</p>
          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={newsletterMutation.isPending}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  data-testid="input-newsletter"
                />
              </div>
              <button
                type="submit"
                disabled={newsletterMutation.isPending || !email}
                className="px-6 py-3 bg-accent hover:bg-accent/90 text-black font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-newsletter"
              >
                {newsletterMutation.isPending ? 'Subscribing...' : showSuccess ? 'Subscribed!' : 'Subscribe'}
              </button>
            </div>
            {newsletterMutation.isError && (
              <p className="text-sm text-red-500 mt-2">Failed to subscribe. Please try again.</p>
            )}
            {showSuccess && (
              <p className="text-sm text-green-500 mt-2">Successfully subscribed!</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
