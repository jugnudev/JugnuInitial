import { useState } from 'react';
import { useLocation } from 'wouter';
import { useEvents } from '@/lib/events';

export default function Waitlist() {
  const [location] = useLocation();
  const { data: events = [] } = useEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
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
    setError('');
    
    // Basic spam protection
    if (formData.honeypot) {
      return; // Bot detected
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);

    // Prepare submission data
    const submitData = {
      email: formData.email.trim(),
      name: formData.name.trim() || null,
      event_slug: eventSlug,
      source: source || null,
      utm_source: utmParams.utm_source || null,
      utm_medium: utmParams.utm_medium || null,
      utm_campaign: utmParams.utm_campaign || null,
      utm_content: utmParams.utm_content || null,
    };

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        // Redirect to thank you page
        window.location.href = '/thank-you';
      } else {
        // Handle specific error cases
        switch (result.error) {
          case 'invalid_email':
            setError('Please enter a valid email address');
            break;
          case 'rate_limited':
            setError('Too many requests. Please try again in a minute.');
            break;
          case 'db_error':
          case 'server_error':
          default:
            setError('Something went wrong. Please try again.');
            break;
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
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
            <p className="text-lg text-muted">Be first, every time</p>
            
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
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-submit-waitlist"
            >
              {isSubmitting ? 'Joining...' : 'Join Waitlist'}
            </button>
            
            {/* Consent text */}
            <p className="text-sm text-muted text-center">
              By joining, you agree to receive Jugnu event updates. Unsubscribe anytime.
            </p>
          </form>

          {/* Error message */}
          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl" role="alert" aria-live="polite">
              <p className="text-red-400 text-center">
                {error}
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