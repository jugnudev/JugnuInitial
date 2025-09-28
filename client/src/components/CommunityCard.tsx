import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock, Globe, Crown, CheckCircle, Clock, Shield } from "lucide-react";
import { Link } from "wouter";

interface CommunityCardProps {
  id: string;
  slug: string;
  name: string;
  description: string;
  coverUrl?: string;
  imageUrl?: string;
  memberCount?: number;
  postCount?: number;
  isPrivate: boolean;
  membershipPolicy: 'open' | 'approval_required' | 'closed';
  membership?: {
    status: 'pending' | 'approved' | 'declined';
    role: 'member' | 'moderator' | 'owner';
  };
  isOwner?: boolean;
  index?: number;
}

const cardAnimation = {
  initial: { opacity: 0, y: 30 },
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: index * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }),
  hover: {
    y: -8,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

export function CommunityCard({
  id,
  slug,
  name,
  description,
  coverUrl,
  imageUrl,
  memberCount = 0,
  postCount = 0,
  isPrivate,
  membershipPolicy,
  membership,
  isOwner,
  index = 0
}: CommunityCardProps) {
  // Determine membership status
  const isMember = membership?.status === 'approved';
  const isPending = membership?.status === 'pending';
  const isDeclined = membership?.status === 'declined';

  // Get status badge info
  const getStatusBadge = () => {
    if (isOwner || membership?.role === 'owner') {
      return {
        icon: Crown,
        text: 'Owner',
        className: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-400 border-yellow-500/30'
      };
    }
    if (membership?.role === 'moderator') {
      return {
        icon: Shield,
        text: 'Moderator',
        className: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30'
      };
    }
    if (isMember) {
      return {
        icon: CheckCircle,
        text: 'Member',
        className: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30'
      };
    }
    if (isPending) {
      return {
        icon: Clock,
        text: 'Pending',
        className: 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30'
      };
    }
    return null;
  };

  const statusBadge = getStatusBadge();

  return (
    <motion.div
      custom={index}
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardAnimation}
      className="group relative"
    >
      <Link href={`/communities/${slug || id}`}>
        <Card 
          className="h-full overflow-hidden bg-gradient-to-b from-premium-surface to-premium-surface-elevated border-premium-border hover:border-premium-border-hover transition-all duration-300 cursor-pointer hover:shadow-glow"
          data-testid={`community-card-${id}`}
        >
          {/* Cover Image Section */}
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-copper-500/20 to-copper-900/30">
            {coverUrl ? (
              <img 
                src={coverUrl} 
                alt={`${name} cover`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-copper-500/30 via-copper-600/20 to-copper-900/30" />
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            
            {/* Status Badge */}
            {statusBadge && (
              <div className="absolute top-4 right-4">
                <Badge 
                  className={`${statusBadge.className} backdrop-blur-md px-3 py-1.5 flex items-center gap-1.5`}
                  data-testid={`community-status-${id}`}
                >
                  <statusBadge.icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">{statusBadge.text}</span>
                </Badge>
              </div>
            )}
            
            {/* Privacy Badge */}
            <div className="absolute top-4 left-4">
              <Badge 
                variant="secondary" 
                className="backdrop-blur-md bg-black/60 text-white/90 px-3 py-1.5"
                data-testid={`community-privacy-${id}`}
              >
                {isPrivate ? (
                  <>
                    <Lock className="h-3 w-3 mr-1.5" />
                    Private
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3 mr-1.5" />
                    Public
                  </>
                )}
              </Badge>
            </div>

            {/* Community Avatar */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-end gap-4">
                <Avatar className="h-16 w-16 border-4 border-premium-surface ring-2 ring-accent/20">
                  <AvatarImage src={imageUrl} alt={name} />
                  <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-lg font-bold">
                    {name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <CardContent className="p-6 space-y-4">
            {/* Title and Description */}
            <div className="space-y-2">
              <h3 className="font-fraunces text-xl font-semibold text-premium-text-primary line-clamp-1">
                {name}
              </h3>
              <p className="text-sm text-premium-text-secondary line-clamp-2 leading-relaxed">
                {description || 'A vibrant community space for members to connect and share.'}
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 pt-2">
              <div 
                className="flex items-center gap-1.5 text-premium-text-muted"
                data-testid={`community-members-${id}`}
              >
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{memberCount}</span>
                <span className="text-xs">members</span>
              </div>
              
              {postCount > 0 && (
                <div className="flex items-center gap-1.5 text-premium-text-muted">
                  <div className="w-1 h-1 rounded-full bg-premium-text-muted/50" />
                  <span className="text-sm font-medium">{postCount}</span>
                  <span className="text-xs">posts</span>
                </div>
              )}
              
              {/* Membership Policy Indicator */}
              <div className="ml-auto">
                {membershipPolicy === 'closed' && (
                  <Badge 
                    variant="outline" 
                    className="text-xs border-red-500/30 text-red-400 bg-red-500/10"
                  >
                    Invite Only
                  </Badge>
                )}
                {membershipPolicy === 'approval_required' && !isMember && !isPending && (
                  <Badge 
                    variant="outline" 
                    className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10"
                  >
                    Request to Join
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {isOwner || membership?.role === 'owner' ? (
                <Button 
                  variant="outline" 
                  className="w-full bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:from-amber-500/20 hover:to-yellow-500/20 transition-all duration-300"
                  data-testid={`manage-community-${id}`}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Manage Community
                </Button>
              ) : isMember ? (
                <Button 
                  variant="outline" 
                  className="w-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-400 hover:from-green-500/20 hover:to-emerald-500/20 transition-all duration-300"
                  data-testid={`view-community-${id}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  View Community
                </Button>
              ) : isPending ? (
                <Button 
                  variant="outline" 
                  className="w-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30 text-orange-400"
                  disabled
                  data-testid={`pending-community-${id}`}
                >
                  <Clock className="h-4 w-4 mr-2 animate-pulse" />
                  Request Pending
                </Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-copper-500 to-accent hover:from-copper-600 hover:to-copper-700 text-white font-semibold transition-all duration-300 hover:shadow-glow"
                  data-testid={`join-community-${id}`}
                >
                  Join Community
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}