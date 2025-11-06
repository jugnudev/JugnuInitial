import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Redirect component that sends organizers to their community's manage-events tab
 * or shows an error if they don't have a community
 */
export function TicketsOrganizerDashboard() {
  const [, setLocation] = useLocation();
  
  console.log('[Dashboard Redirect] Component mounted');
  
  // Fetch user's communities
  const { data: userCommunitiesData, isLoading, error } = useQuery<{ ok: boolean; communities: any[] }>({
    queryKey: ['/api/user/communities'],
    retry: 1
  });
  
  console.log('[Dashboard Redirect] User communities data:', userCommunitiesData);
  console.log('[Dashboard Redirect] Loading:', isLoading, 'Error:', error);
  
  useEffect(() => {
    if (isLoading) {
      console.log('[Dashboard Redirect] Still loading communities...');
      return;
    }
    
    if (error) {
      console.error('[Dashboard Redirect] Error loading communities:', error);
      return;
    }
    
    if (!userCommunitiesData?.ok || !userCommunitiesData?.communities) {
      console.log('[Dashboard Redirect] No valid communities data');
      return;
    }
    
    const communities = userCommunitiesData.communities;
    console.log('[Dashboard Redirect] Found', communities.length, 'communities');
    
    // Find first community where user is owner or moderator
    // Note: role is nested in membership object
    const manageableCommunity = communities.find((c: any) => 
      c.membership?.role === 'owner' || c.membership?.role === 'moderator'
    );
    
    console.log('[Dashboard Redirect] Manageable community:', manageableCommunity);
    
    if (manageableCommunity) {
      // Use slug if available, otherwise use ID (backend supports both)
      const identifier = manageableCommunity.slug || manageableCommunity.id;
      const redirectUrl = `/communities/${identifier}?tab=manage-events`;
      console.log('[Dashboard Redirect] Redirecting to:', redirectUrl);
      setLocation(redirectUrl);
    } else {
      // No manageable community - redirect to public tickets page
      console.log('[Dashboard Redirect] No manageable community found, redirecting to /tickets');
      setLocation('/tickets');
    }
  }, [userCommunitiesData, isLoading, error, setLocation]);
  
  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-copper-500 mx-auto mb-4" />
        <p className="text-neutral-400">Redirecting to your events...</p>
      </div>
    </div>
  );
}
