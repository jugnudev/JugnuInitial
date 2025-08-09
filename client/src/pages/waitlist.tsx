import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useEvents } from '@/lib/events';

export default function Waitlist() {
  const [location] = useLocation();
  const { data: events = [] } = useEvents();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    honeypot: '' // spam protection
  });

  // Parse URL search params
  const urlParams = new URLSearchParams(window.location.search);
  const eventSlug = urlParams.get('event');
  const source = urlParams.get('source') || '';
  
  // Collect UTM parameters
  const utmParams: Record<string, string> = {};
  urlParams.forEach((value, key) => {
    if (key.startsWith('utm_')) {
      utmParams[key] = value;
    }
  });

  // Find matching event
  const targetEvent = eventSlug ? events.find(event => event.slug === eventSlug) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic spam protection
    if (formData.honeypot) {
      return; // Bot detected
    }

    if (!formData.email) {
      return; // Email required
    }

    // Prepare form data with hidden fields
    const submitData = {
      ...formData,
      interest_event: eventSlug || 'general',
      source,
      ...utmParams
    };

    try {
      // TODO: Replace with your actual email service endpoint
      // This is a Formspree placeholder - swap with Mailchimp/Beehiiv/ConvertKit embed
      const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        // Redirect to thank you page
        window.location.href = '/thank-you';
      } else {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setIsSubmitted(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-fraunces text-4xl font-bold text-primary mb-4">
              Join the Waitlist
            </h1>
            <p className="text-lg text-muted">
              Be first when the frequency hits.
            </p>
            
            {/* Event badge */}
            {targetEvent && (
              <div className="mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20">
                  For: {targetEvent.title}
                </span>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name field (optional) */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
                Name (optional)
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                placeholder="Your name"
                data-testid="input-name"
              />
            </div>

            {/* Email field (required) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                Email <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200"
                placeholder="your@email.com"
                data-testid="input-email"
              />
            </div>

            {/* Honeypot field (hidden) */}
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={handleInputChange}
              style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Submit button */}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow"
              data-testid="button-submit-waitlist"
            >
              Join Waitlist
            </button>
          </form>

          {/* Success message */}
          {isSubmitted && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
              <p className="text-green-400 text-center">
                Thanks for joining! We'll be in touch soon.
              </p>
            </div>
          )}

          {/* Back link */}
          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-muted hover:text-accent transition-colors duration-200"
              data-testid="link-back-home"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}