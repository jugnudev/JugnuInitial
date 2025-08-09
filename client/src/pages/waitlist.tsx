import { useState } from 'react';
import { useLocation } from 'wouter';
import { useEvents } from '@/lib/events';

export default function Waitlist() {
  const [location] = useLocation();
  const { data: events = [] } = useEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    consent: false,
    honeypot: '' // spam protection
  });
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

    // Validate all required fields
    const newFieldErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newFieldErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length > 80) {
      newFieldErrors.firstName = 'First name must be 80 characters or less';
    }
    
    if (!formData.lastName.trim()) {
      newFieldErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length > 80) {
      newFieldErrors.lastName = 'Last name must be 80 characters or less';
    }
    
    if (!formData.email.trim()) {
      newFieldErrors.email = 'Email is required';
    }
    
    if (!formData.consent) {
      newFieldErrors.consent = 'You must agree to receive updates';
    }
    
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError('Please fix the errors above');
      return;
    }
    
    setFieldErrors({});

    setIsSubmitting(true);

    // Prepare submission data
    const submitData = {
      first_name: formData.firstName.trim(),
      last_name: formData.lastName.trim(),
      email: formData.email.trim(),
      consent: formData.consent,
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
          case 'invalid_first_name':
            setFieldErrors({ firstName: 'Please enter a valid first name' });
            setError('Please fix the errors above');
            break;
          case 'invalid_last_name':
            setFieldErrors({ lastName: 'Please enter a valid last name' });
            setError('Please fix the errors above');
            break;
          case 'invalid_email':
            setFieldErrors({ email: 'Please enter a valid email address' });
            setError('Please fix the errors above');
            break;
          case 'consent_required':
            setFieldErrors({ consent: 'You must agree to receive updates' });
            setError('Please fix the errors above');
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-fraunces text-4xl font-bold mb-4 text-[#c05a0e]">
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
            {/* First Name field (required) */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-text mb-2">
                First Name <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                autoComplete="given-name"
                maxLength={80}
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  fieldErrors.firstName 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-white/10 focus:ring-accent'
                }`}
                placeholder="First name"
                aria-invalid={!!fieldErrors.firstName}
                aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                data-testid="input-first-name"
              />
              {fieldErrors.firstName && (
                <p id="firstName-error" className="mt-1 text-sm text-red-400" role="alert">
                  {fieldErrors.firstName}
                </p>
              )}
            </div>

            {/* Last Name field (required) */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-text mb-2">
                Last Name <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                autoComplete="family-name"
                maxLength={80}
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  fieldErrors.lastName 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-white/10 focus:ring-accent'
                }`}
                placeholder="Last name"
                aria-invalid={!!fieldErrors.lastName}
                aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                data-testid="input-last-name"
              />
              {fieldErrors.lastName && (
                <p id="lastName-error" className="mt-1 text-sm text-red-400" role="alert">
                  {fieldErrors.lastName}
                </p>
              )}
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
                autoComplete="email"
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  fieldErrors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-white/10 focus:ring-accent'
                }`}
                placeholder="your@email.com"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                data-testid="input-email"
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-400" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Consent Checkbox */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleInputChange}
                  required
                  className={`mt-1 h-4 w-4 rounded border-2 bg-white/5 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0 ${
                    fieldErrors.consent ? 'border-red-500' : 'border-white/10'
                  }`}
                  aria-invalid={!!fieldErrors.consent}
                  aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
                  data-testid="checkbox-consent"
                />
                <span className="text-sm text-text">
                  I agree to receive updates about Jugnu events. Unsubscribe anytime. <span className="text-accent">*</span>
                </span>
              </label>
              {fieldErrors.consent && (
                <p id="consent-error" className="mt-1 text-sm text-red-400" role="alert">
                  {fieldErrors.consent}
                </p>
              )}
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