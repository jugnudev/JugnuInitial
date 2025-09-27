// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Prevent double initialization (especially in dev mode with React StrictMode)
  if (window.dataLayer || document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`)) {
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Get dynamic page title based on route
export const getPageTitle = (path: string): string => {
  const baseBrand = 'Jugnu';
  
  // Route to title mapping
  const routeTitles: { [key: string]: string } = {
    '/': `${baseBrand} - Find Your Frequency | South Asian Cultural Events Vancouver`,
    '/events': `Events - ${baseBrand} | Vancouver South Asian Cultural Events`,
    '/deals': `Deals - ${baseBrand} | Special Offers & Discounts`,
    '/promote': `Promote Your Event - ${baseBrand} | Event Marketing Vancouver`,
    '/story': `Our Story - ${baseBrand} | About Vancouver's Premier Cultural Events`,
    '/saved': `Saved Events - ${baseBrand} | Your Bookmarked Events`,
    '/waitlist': `Join Waitlist - ${baseBrand} | Be First to Know About Events`,
    '/thank-you': `Thank You - ${baseBrand} | Registration Confirmed`,
    '/privacy': `Privacy Policy - ${baseBrand}`,
    '/terms': `Terms of Service - ${baseBrand}`,
    '/admin/promote': `Admin Portal - ${baseBrand} | Promote Management`,
    '/admin/leads': `Admin Portal - ${baseBrand} | Leads Management`, 
    '/admin/analytics': `Admin Portal - ${baseBrand} | Analytics Dashboard`,
    // Communities SEO-optimized titles for conversion funnel
    '/communities': `Premium Communities - ${baseBrand} | Create & Join Cultural Communities Vancouver`,
    '/account/signin': `Sign In - ${baseBrand} | Access Your Community Account`,
    '/account/signup': `Join ${baseBrand} - Create Your Premium Community Account`,
    '/account/profile': `My Profile - ${baseBrand} | Account Settings & Community Management`,
    '/account/apply-organizer': `Become an Organizer - ${baseBrand} | Apply for Business Community Account`,
    '/admin/organizers': `Admin Portal - ${baseBrand} | Organizer Applications Management`
  };

  // Check for dynamic routes
  if (path.startsWith('/sponsor/')) {
    return `Sponsor Portal - ${baseBrand} | Campaign Management`;
  }
  if (path.startsWith('/onboard/')) {
    return `Onboarding - ${baseBrand} | Welcome to Our Platform`;
  }
  if (path.includes('/feature')) {
    return `Feature Request - ${baseBrand} | Submit Your Event`;
  }

  // Return matched title or default
  return routeTitles[path] || `${baseBrand} - Find Your Frequency | Vancouver South Asian Events`;
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  // Use provided title or generate dynamic title
  const pageTitle = title || getPageTitle(url);
  
  window.gtag('event', 'page_view', {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};