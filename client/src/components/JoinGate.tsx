import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  Users, 
  Crown, 
  Star, 
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Info
} from "lucide-react";

interface JoinGateProps {
  communityName: string;
  description?: string;
  memberCount?: number;
  isPrivate: boolean;
  membershipPolicy: 'open' | 'approval_required' | 'closed';
  isPending?: boolean;
  isDeclined?: boolean;
  coverUrl?: string;
  onJoinRequest?: () => void;
  onSignIn?: () => void;
  isAuthenticated?: boolean;
}

const gateAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const floatingAnimation = {
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export function JoinGate({
  communityName,
  description,
  memberCount = 0,
  isPrivate,
  membershipPolicy,
  isPending = false,
  isDeclined = false,
  coverUrl,
  onJoinRequest,
  onSignIn,
  isAuthenticated = false
}: JoinGateProps) {
  // Determine gate state
  const getGateContent = () => {
    if (!isAuthenticated) {
      return {
        icon: Lock,
        title: "Sign in to continue",
        description: "Create a free account or sign in to view this community's exclusive content.",
        primaryAction: {
          label: "Sign In",
          onClick: onSignIn
        },
        showStats: true
      };
    }
    
    if (isDeclined) {
      return {
        icon: X,
        title: "Request declined",
        description: "Your request to join this community was declined. You can try again later or contact the community owner.",
        primaryAction: null,
        showStats: false
      };
    }
    
    if (isPending) {
      return {
        icon: Shield,
        title: "Request pending",
        description: "Your request to join this community is being reviewed. You'll be notified once it's approved.",
        primaryAction: null,
        showStats: true
      };
    }
    
    if (membershipPolicy === 'closed') {
      return {
        icon: Lock,
        title: "Invite-only community",
        description: "This is a closed community. You need an invitation from the community owner to join.",
        primaryAction: null,
        showStats: false
      };
    }
    
    if (membershipPolicy === 'approval_required') {
      return {
        icon: Shield,
        title: "Request to join",
        description: `${communityName} is a private community. Request access to view exclusive content and connect with members.`,
        primaryAction: {
          label: "Request to Join",
          onClick: onJoinRequest
        },
        showStats: true
      };
    }
    
    // Open community
    return {
      icon: Users,
      title: "Join this community",
      description: `Become a member of ${communityName} to access exclusive content and connect with the community.`,
      primaryAction: {
        label: "Join Community",
        onClick: onJoinRequest
      },
      showStats: true
    };
  };
  
  const gateContent = getGateContent();
  const IconComponent = gateContent.icon;
  
  return (
    <motion.div
      variants={gateAnimation}
      initial="initial"
      animate="animate"
      className="relative min-h-[60vh] flex items-center justify-center p-6"
    >
      {/* Background with Cover Image */}
      {coverUrl && (
        <div className="absolute inset-0">
          <img 
            src={coverUrl} 
            alt={communityName}
            className="w-full h-full object-cover opacity-20 blur-xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/80 via-bg/90 to-bg" />
        </div>
      )}
      
      {/* Gate Card */}
      <Card className="relative max-w-2xl w-full bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border shadow-glow">
        <CardHeader className="text-center pb-6">
          {/* Icon Badge */}
          <motion.div
            variants={floatingAnimation}
            animate="animate"
            className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-copper-500/20 to-copper-900/20 border border-copper-500/30 mx-auto mb-6"
          >
            <div className="absolute inset-0 bg-gradient-radial from-glow/30 via-transparent to-transparent rounded-full animate-pulse" />
            <IconComponent className="h-10 w-10 text-accent relative z-10" />
          </motion.div>
          
          {/* Title */}
          <CardTitle className="font-fraunces text-3xl font-bold text-premium-text-primary mb-3">
            {gateContent.title}
          </CardTitle>
          
          {/* Description */}
          <CardDescription className="text-lg text-premium-text-secondary max-w-md mx-auto">
            {gateContent.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Community Stats */}
          {gateContent.showStats && (
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center gap-2 text-premium-text-muted mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Members</span>
                </div>
                <p className="text-2xl font-bold text-premium-text-primary">
                  {memberCount.toLocaleString()}
                </p>
              </div>
              
              {isPrivate && (
                <div className="text-center">
                  <div className="flex items-center gap-2 text-premium-text-muted mb-1">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">Privacy</span>
                  </div>
                  <p className="text-2xl font-bold text-premium-text-primary">
                    Private
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Benefits List */}
          {!isPending && !isDeclined && membershipPolicy !== 'closed' && (
            <div className="bg-premium-surface/50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-premium-text-primary mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Member Benefits
              </h3>
              <div className="space-y-2">
                {[
                  "Access exclusive announcements and updates",
                  "Connect with community members",
                  "Participate in discussions and events",
                  "Get early access to special content"
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-premium-text-secondary">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {gateContent.primaryAction && (
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={gateContent.primaryAction.onClick}
                className="w-full bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700 text-white font-semibold transition-all duration-300 hover:shadow-glow"
                data-testid="join-gate-action"
              >
                {gateContent.primaryAction.label}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              {!isAuthenticated && (
                <p className="text-center text-sm text-premium-text-muted">
                  Already have an account?{" "}
                  <button 
                    onClick={onSignIn}
                    className="text-accent hover:underline"
                    data-testid="sign-in-link"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
          
          {/* Pending Status */}
          {isPending && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                We'll notify you by email once your request has been reviewed.
              </p>
            </div>
          )}
          
          {/* Closed Community Info */}
          {membershipPolicy === 'closed' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200">
                This community is not accepting new members at this time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}