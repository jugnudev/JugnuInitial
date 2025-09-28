import { useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface AnalyticsEvent {
  eventName: string;
  eventData?: Record<string, any>;
  communityId?: string;
  userId?: string;
  timestamp?: string;
}

/**
 * Custom hook for tracking community analytics events
 * Handles user engagement metrics and conversion funnel tracking
 */
export function useCommunityAnalytics(communityId?: string) {
  /**
   * Track a page view
   */
  const trackPageView = useCallback((page: string, title?: string) => {
    const event: AnalyticsEvent = {
      eventName: 'page_view',
      eventData: {
        page_path: page,
        page_title: title || document.title,
        page_location: window.location.href,
        referrer: document.referrer
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    // Send to analytics endpoint
    sendAnalytics(event);

    // Also send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: page,
        page_title: title,
        custom_dimension_1: communityId
      });
    }
  }, [communityId]);

  /**
   * Track user engagement events
   */
  const trackEngagement = useCallback((action: string, label?: string, value?: number) => {
    const event: AnalyticsEvent = {
      eventName: 'user_engagement',
      eventData: {
        action,
        label,
        value,
        engagement_time_msec: value
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'engagement', {
        action,
        label,
        value,
        custom_dimension_1: communityId
      });
    }
  }, [communityId]);

  /**
   * Track conversion events
   */
  const trackConversion = useCallback((conversionType: string, metadata?: Record<string, any>) => {
    const event: AnalyticsEvent = {
      eventName: 'conversion',
      eventData: {
        conversion_type: conversionType,
        ...metadata
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);

    // Track conversions in Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        conversion_type: conversionType,
        value: metadata?.value,
        currency: metadata?.currency || 'USD',
        custom_dimension_1: communityId
      });
    }
  }, [communityId]);

  /**
   * Track feature usage
   */
  const trackFeatureUsage = useCallback((featureName: string, action: string, metadata?: Record<string, any>) => {
    const event: AnalyticsEvent = {
      eventName: 'feature_usage',
      eventData: {
        feature_name: featureName,
        action,
        ...metadata
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);
  }, [communityId]);

  /**
   * Track funnel steps
   */
  const trackFunnelStep = useCallback((funnelName: string, step: number, stepName: string) => {
    const event: AnalyticsEvent = {
      eventName: 'funnel_step',
      eventData: {
        funnel_name: funnelName,
        step_number: step,
        step_name: stepName
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);
  }, [communityId]);

  /**
   * Track social shares
   */
  const trackShare = useCallback((platform: string, contentType: string, contentId?: string) => {
    const event: AnalyticsEvent = {
      eventName: 'share',
      eventData: {
        platform,
        content_type: contentType,
        content_id: contentId
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'share', {
        method: platform,
        content_type: contentType,
        content_id: contentId
      });
    }
  }, [communityId]);

  /**
   * Track errors
   */
  const trackError = useCallback((errorMessage: string, errorType?: string, fatal?: boolean) => {
    const event: AnalyticsEvent = {
      eventName: 'error',
      eventData: {
        error_message: errorMessage,
        error_type: errorType,
        fatal,
        page_url: window.location.href,
        user_agent: navigator.userAgent
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: errorMessage,
        fatal
      });
    }
  }, [communityId]);

  /**
   * Track timing metrics
   */
  const trackTiming = useCallback((category: string, variable: string, value: number, label?: string) => {
    const event: AnalyticsEvent = {
      eventName: 'timing',
      eventData: {
        timing_category: category,
        timing_variable: variable,
        timing_value: value,
        timing_label: label
      },
      communityId,
      timestamp: new Date().toISOString()
    };

    sendAnalytics(event);

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        event_category: category,
        name: variable,
        value,
        event_label: label
      });
    }
  }, [communityId]);

  // Track page view on mount
  useEffect(() => {
    trackPageView(window.location.pathname, document.title);
  }, [trackPageView]);

  return {
    trackPageView,
    trackEngagement,
    trackConversion,
    trackFeatureUsage,
    trackFunnelStep,
    trackShare,
    trackError,
    trackTiming
  };
}

/**
 * Send analytics event to backend
 */
async function sendAnalytics(event: AnalyticsEvent) {
  try {
    // Batch events for efficiency
    const queue = getAnalyticsQueue();
    queue.push(event);

    // Send immediately if queue is large enough or use debouncing
    if (queue.length >= 10) {
      await flushAnalytics();
    } else {
      scheduleFlush();
    }
  } catch (error) {
    console.error('Failed to send analytics:', error);
  }
}

// Analytics queue management
let analyticsQueue: AnalyticsEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

function getAnalyticsQueue() {
  return analyticsQueue;
}

function scheduleFlush() {
  if (flushTimeout) return;
  
  flushTimeout = setTimeout(() => {
    flushAnalytics();
    flushTimeout = null;
  }, 5000); // Flush every 5 seconds
}

async function flushAnalytics() {
  if (analyticsQueue.length === 0) return;
  
  const events = [...analyticsQueue];
  analyticsQueue = [];
  
  try {
    await apiRequest('POST', '/api/analytics/events', { events });
  } catch (error) {
    console.error('Failed to flush analytics:', error);
    // Re-add events to queue on failure
    analyticsQueue.unshift(...events);
  }
}

// Flush analytics before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliability
    if (navigator.sendBeacon && analyticsQueue.length > 0) {
      const data = JSON.stringify({ events: analyticsQueue });
      navigator.sendBeacon('/api/analytics/events', data);
      analyticsQueue = [];
    }
  });
}