import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageView, getPageTitle } from '../lib/analytics';

export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      // Get dynamic page title
      const pageTitle = getPageTitle(location);
      
      // Update browser tab title
      document.title = pageTitle;
      
      // Track page view with the dynamic title
      trackPageView(location, pageTitle);
      
      prevLocationRef.current = location;
    }
  }, [location]);
};