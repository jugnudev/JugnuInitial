import { useEffect } from 'react';

export default function CommunityRedirect() {
  useEffect(() => {
    // Handle different community redirects
    const path = window.location.pathname;
    if (path === '/community/feature') {
      window.location.replace('/events/feature');
    } else {
      window.location.replace('/events');
    }
  }, []);

  // Show minimal loading state during redirect
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-copper-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted">Redirecting...</p>
      </div>
    </div>
  );
}