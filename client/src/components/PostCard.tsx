import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Pin, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreVertical,
  ExternalLink,
  Calendar,
  Eye,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Link as LinkIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ReactionsBar } from "./ReactionsBar";
import { CommentsSection } from "./CommentsSection";
import Lightbox from "@/components/Lightbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  linkText?: string;
  linkDescription?: string;
  tags?: string[];
  metadata?: any;
  postType: 'announcement' | 'update' | 'event';
  isPinned: boolean;
  createdAt: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: 'owner' | 'moderator' | 'member';
  viewCount?: number;
  reactions?: {
    type: string;
    count: number;
    hasReacted?: boolean;
  }[];
  comments?: any[];
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReaction?: (type: string) => void;
  onComment?: (comment: string, parentId?: string) => void;
  onShare?: () => void;
}

const postAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.3
    }
  }
};

export function PostCard({
  id,
  title,
  content,
  imageUrl,
  linkUrl,
  linkText,
  linkDescription,
  tags,
  metadata,
  postType,
  isPinned,
  createdAt,
  authorId,
  authorName = "Community Member",
  authorAvatar,
  authorRole = 'member',
  viewCount = 0,
  reactions = [],
  comments = [],
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
  onReaction,
  onComment,
  onShare
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  
  // Calculate total reactions
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  
  // Get post type badge color
  const getPostTypeBadge = () => {
    switch (postType) {
      case 'announcement':
        return {
          color: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-yellow-400 border-yellow-500/30',
          icon: Sparkles,
          label: 'Announcement'
        };
      case 'event':
        return {
          color: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
          icon: Calendar,
          label: 'Event'
        };
      case 'update':
        return {
          color: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30',
          icon: TrendingUp,
          label: 'Update'
        };
    }
  };
  
  const postTypeBadge = getPostTypeBadge();
  const isLongContent = content.length > 300;
  const displayContent = expanded || !isLongContent ? content : content.substring(0, 300) + '...';
  
  // Format markdown-style content (basic support)
  const renderContent = (text: string) => {
    // Basic markdown rendering - you could enhance this with a proper markdown library
    return text.split('\n').map((paragraph, idx) => (
      <p key={idx} className="mb-3 last:mb-0 leading-relaxed">
        {paragraph}
      </p>
    ));
  };

  return (
    <>
      <motion.div
        variants={postAnimation}
        initial="initial"
        animate="animate"
        exit="exit"
        layout
      >
        <Card 
          className={`
            relative overflow-hidden
            bg-gradient-to-b from-premium-surface to-premium-surface-elevated 
            border-premium-border hover:border-premium-border-hover
            transition-all duration-300 hover:shadow-glow
            ${isPinned ? 'ring-2 ring-accent/20 ring-offset-2 ring-offset-bg' : ''}
          `}
          data-testid={`post-card-${id}`}
        >
          {/* Pinned Badge */}
          {isPinned && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
          )}
          
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              {/* Author Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-premium-border">
                  <AvatarImage src={authorAvatar} alt={authorName} />
                  <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white">
                    {authorName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-premium-text-primary">
                      {authorName}
                    </span>
                    {authorRole === 'owner' && (
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                        Owner
                      </Badge>
                    )}
                    {authorRole === 'moderator' && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                        Moderator
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-premium-text-muted">
                    <span>{formatDistanceToNow(new Date(createdAt))} ago</span>
                    {viewCount > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{viewCount} views</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Actions Menu */}
              <div className="flex items-center gap-2">
                {isPinned && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                    <Pin className="h-3 w-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                
                <Badge className={`${postTypeBadge.color} backdrop-blur-sm`}>
                  <postTypeBadge.icon className="h-3 w-3 mr-1" />
                  {postTypeBadge.label}
                </Badge>
                
                {(canEdit || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        data-testid={`post-menu-${id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit && (
                        <DropdownMenuItem 
                          onClick={onEdit}
                          data-testid={`edit-post-${id}`}
                        >
                          Edit Post
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem 
                          onClick={onDelete}
                          className="text-red-400"
                          data-testid={`delete-post-${id}`}
                        >
                          Delete Post
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Title */}
            <h3 className="font-fraunces text-2xl font-bold text-premium-text-primary">
              {title}
            </h3>
            
            {/* Content */}
            <div className="text-premium-text-secondary">
              {renderContent(displayContent)}
              
              {isLongContent && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 text-accent hover:text-accent/80"
                  data-testid={`expand-post-${id}`}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Read More
                    </>
                  )}
                </Button>
              )}
            </div>
            
            {/* Image */}
            {imageUrl && (
              <motion.div 
                className="relative rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setShowLightbox(true)}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
                data-testid={`post-image-${id}`}
              >
                <img 
                  src={imageUrl} 
                  alt={title}
                  className="w-full h-auto max-h-96 object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-black/60 backdrop-blur-sm rounded-full p-3">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Link Preview */}
            {linkUrl && (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                data-testid={`post-link-${id}`}
              >
                <Card className="bg-premium-surface/50 border-premium-border hover:border-accent/50 transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <LinkIcon className="h-4 w-4 text-accent" />
                          <span className="font-semibold text-premium-text-primary group-hover:text-accent transition-colors">
                            {linkText || 'View Link'}
                          </span>
                        </div>
                        {linkDescription && (
                          <p className="text-sm text-premium-text-muted line-clamp-2">
                            {linkDescription}
                          </p>
                        )}
                      </div>
                      <ExternalLink className="h-4 w-4 text-premium-text-muted group-hover:text-accent transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </a>
            )}
            
            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <Badge 
                    key={idx}
                    variant="outline" 
                    className="text-xs bg-copper-500/10 text-copper-400 border-copper-500/30"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Reactions Bar */}
            <ReactionsBar
              postId={id}
              reactions={reactions}
              onReaction={onReaction}
            />
            
            {/* Interaction Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-premium-border">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-premium-text-muted hover:text-accent"
                  data-testid={`toggle-comments-${id}`}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShare}
                  className="text-premium-text-muted hover:text-accent"
                  data-testid={`share-post-${id}`}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              
              {totalReactions > 0 && (
                <div className="text-sm text-premium-text-muted">
                  {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
                </div>
              )}
            </div>
            
            {/* Comments Section */}
            <AnimatePresence>
              {showComments && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <CommentsSection
                    postId={id}
                    comments={comments}
                    onComment={onComment}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Image Lightbox */}
      {imageUrl && showLightbox && (
        <Lightbox
          images={[{ src: imageUrl, alt: title }]}
          currentIndex={0}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}