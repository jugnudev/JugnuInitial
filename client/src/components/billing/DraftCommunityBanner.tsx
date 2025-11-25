import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Lock } from "lucide-react";
import { Link } from "wouter";

interface DraftCommunityBannerProps {
  communityId: string;
  communityName?: string;
}

export function DraftCommunityBanner({ communityId, communityName }: DraftCommunityBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 shadow-lg" data-testid="banner-draft-community">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-full">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">
                Your community is currently hidden
              </p>
              <p className="text-white/90 text-xs sm:text-sm">
                {communityName ? `"${communityName}" is` : "This community is"} in draft mode and not visible to others. Subscribe to make it public again.
              </p>
            </div>
          </div>
          
          <Link href={`/subscribe/${communityId}`}>
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-white text-red-600 hover:bg-white/90 font-semibold whitespace-nowrap"
              data-testid="button-subscribe-from-banner"
            >
              Subscribe Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DraftCommunityInlineBanner({ communityId, communityName }: DraftCommunityBannerProps) {
  return (
    <Alert className="mb-6 border-red-500/50 bg-gradient-to-r from-red-500/10 to-orange-500/10" data-testid="alert-draft-community">
      <AlertTriangle className="h-5 w-5 text-red-500" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-semibold text-red-400">
            Community Hidden from Public
          </p>
          <p className="text-white/70 text-sm mt-1">
            Your subscription has expired. {communityName ? `"${communityName}"` : "Your community"} is in draft mode and not visible to members or the public. Subscribe to restore access.
          </p>
        </div>
        
        <Link href={`/subscribe/${communityId}`}>
          <Button 
            variant="default" 
            size="sm"
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold whitespace-nowrap"
            data-testid="button-subscribe-inline"
          >
            Subscribe Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
