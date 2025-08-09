import { useState } from "react";
import { useLocation } from "wouter";

export default function Join() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const honeypot = formData.get('_gotcha') as string;

    // Honeypot check
    if (honeypot) {
      console.warn('Honeypot triggered - likely spam');
      setIsSubmitting(false);
      return;
    }

    try {
      // TODO: Replace with actual email provider
      // For now, simulate success and redirect
      console.log('TODO: Submit to email provider', { name, email });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to thank you page
      setLocation('/thank-you');
    } catch (error) {
      console.error('Failed to submit form:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <section id="join" className="py-16 lg:py-24 bg-gradient-to-b from-white/5 to-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-fraunces text-4xl lg:text-5xl font-bold tracking-tight text-primary mb-4">
            Join the List
          </h2>
          <p className="text-lg text-muted mb-12">
            Be first to know when the next frequency drops. Exclusive access to tickets and events.
          </p>

          {/* Email Form */}
          <form 
            onSubmit={handleSubmit}
            className="space-y-6"
            data-testid="email-form"
          >
            {/* Honeypot field */}
            <input 
              type="text" 
              name="_gotcha" 
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="sr-only">Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  placeholder="Your name" 
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label htmlFor="email" className="sr-only">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="your@email.com" 
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  data-testid="input-email"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-primary text-black/90 font-medium tracking-wide rounded-2xl hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-all duration-200 shadow-lg hover:shadow-xl btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-submit-email"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Joining...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Join the Frequency
                </>
              )}
            </button>

            <p className="text-sm text-muted">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
