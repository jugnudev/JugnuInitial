import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Heart,
  MoreVertical,
  Reply,
  Edit2,
  Trash2,
  Crown,
  Shield
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: 'owner' | 'moderator' | 'member';
  createdAt: string;
  likes: number;
  hasLiked?: boolean;
  replies?: Comment[];
  parentId?: string;
  isEdited?: boolean;
  // New fields for flattened reply structure
  parentAuthorName?: string;
  parentAuthorId?: string;
}

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
  currentUserId?: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  canModerate?: boolean;
  onComment?: (content: string, parentId?: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
}

// Utility function to extract initials from full name
function getInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  // First letter of first name + first letter of last name
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const commentAnimation = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: {
      duration: 0.2
    }
  }
};

function CommentItem({
  comment,
  currentUserId,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onLike
}: {
  comment: Comment;
  currentUserId?: string;
  canModerate?: boolean;
  onReply?: (parentId: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [optimisticLiked, setOptimisticLiked] = useState(comment.hasLiked);
  const [optimisticLikes, setOptimisticLikes] = useState(comment.likes);
  
  const isAuthor = currentUserId === comment.authorId;
  const canEdit = isAuthor;
  const canDelete = isAuthor || canModerate;
  
  const handleLike = () => {
    if (!onLike) return;
    
    // Optimistic update for smooth UX
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticLikes(prev => wasLiked ? prev - 1 : prev + 1);
    
    // Call the actual API
    onLike(comment.id);
  };
  
  const handleEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };
  
  return (
    <motion.div
      variants={commentAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      className=""
      data-testid={`comment-${comment.id}`}
    >
      <div className="flex gap-3 mb-4">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={comment.authorAvatar} alt={comment.authorName || 'User'} />
          <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-xs">
            {getInitials(comment.authorName || 'User')}
          </AvatarFallback>
        </Avatar>
        
        {/* Comment Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-premium-text-primary">
                {comment.parentAuthorName ? (
                  <>
                    {comment.authorName || 'Unknown User'} 
                    <span className="text-premium-text-muted font-normal"> &gt; </span>
                    {comment.parentAuthorName}
                  </>
                ) : (
                  comment.authorName || 'Unknown User'
                )}
              </span>
              
              {comment.authorRole === 'owner' && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30 px-1.5 py-0">
                  <Crown className="h-3 w-3" />
                </Badge>
              )}
              
              {comment.authorRole === 'moderator' && (
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30 px-1.5 py-0">
                  <Shield className="h-3 w-3" />
                </Badge>
              )}
              
              <span className="text-xs text-premium-text-muted">
                {(() => {
                  try {
                    if (!comment.createdAt) return 'Unknown time';
                    const date = new Date(comment.createdAt);
                    if (isNaN(date.getTime())) return 'Invalid date';
                    return formatDistanceToNow(date);
                  } catch (error) {
                    return 'Date error';
                  }
                })()} ago
              </span>
              
              {comment.isEdited && (
                <span className="text-xs text-premium-text-muted italic">
                  (edited)
                </span>
              )}
            </div>
            
            {/* Actions Menu */}
            {(canEdit || canDelete) && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 w-6 p-0 text-premium-text-muted hover:text-premium-text-primary"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem 
                      onClick={() => setIsEditing(true)}
                      data-testid={`edit-comment-${comment.id}`}
                    >
                      <Edit2 className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete && onDelete(comment.id)}
                      className="text-red-400"
                      data-testid={`delete-comment-${comment.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] bg-premium-surface border-premium-border text-premium-text-primary"
                data-testid={`edit-comment-input-${comment.id}`}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEdit}
                  className="bg-accent hover:bg-accent/80"
                  data-testid={`save-comment-${comment.id}`}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  data-testid={`cancel-edit-${comment.id}`}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-premium-text-secondary mb-2">
              {comment.content}
            </p>
          )}
          
          {/* Interaction Buttons */}
          {!isEditing && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`
                  h-7 px-2 text-xs transition-colors
                  ${optimisticLiked 
                    ? 'text-red-500 hover:text-red-400' 
                    : 'text-premium-text-muted hover:text-premium-text-primary'
                  }
                `}
                data-testid={`like-comment-${comment.id}`}
              >
                <motion.div
                  animate={{ scale: optimisticLiked ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart className={`h-3 w-3 mr-1 ${optimisticLiked ? 'fill-current' : ''}`} />
                </motion.div>
                {optimisticLikes > 0 && optimisticLikes}
              </Button>
              
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id)}
                  className="h-7 px-2 text-xs text-premium-text-muted hover:text-premium-text-primary"
                  data-testid={`reply-comment-${comment.id}`}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              )}
              
            </div>
          )}
          
        </div>
      </div>
    </motion.div>
  );
}

export function CommentsSection({
  postId,
  comments,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  canModerate = false,
  onComment,
  onEdit,
  onDelete,
  onLike
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  const handleSubmitComment = () => {
    if (newComment.trim() && onComment) {
      onComment(newComment);
      setNewComment('');
    }
  };
  
  const handleSubmitReply = () => {
    if (replyContent.trim() && replyingTo && onComment) {
      onComment(replyContent, replyingTo);
      setReplyContent('');
      setReplyingTo(null);
    }
  };
  
  // Backend now provides parent author metadata directly
  // Comments are already sorted chronologically by the backend
  const flattenedComments = comments;
  
  return (
    <div className="pt-4 border-t border-premium-border">
      {/* Comment Input */}
      <div className="mb-6">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={currentUserAvatar} alt={currentUserName || 'You'} />
            <AvatarFallback className="bg-gradient-to-br from-copper-500 to-copper-900 text-white text-xs">
              {getInitials(currentUserName || 'You')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[80px] resize-none"
              data-testid={`new-comment-${postId}`}
            />
            
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="bg-accent hover:bg-accent/80 text-white"
                data-testid={`submit-comment-${postId}`}
              >
                <Send className="h-4 w-4 mr-2" />
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments List - Flattened */}
      <div className="space-y-2">
        <AnimatePresence>
          {flattenedComments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                canModerate={canModerate}
                onReply={(parentId) => setReplyingTo(parentId)}
                onEdit={onEdit}
                onDelete={onDelete}
                onLike={onLike}
              />
              
              {/* Reply Input */}
              <AnimatePresence>
                {replyingTo === comment.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-11 mb-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="min-h-[60px]"
                          autoFocus
                          data-testid={`reply-input-${comment.id}`}
                        />
                        
                        <div className="flex justify-end gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                            data-testid={`cancel-reply-${comment.id}`}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSubmitReply}
                            disabled={!replyContent.trim()}
                            className="bg-accent hover:bg-accent/80"
                            data-testid={`submit-reply-${comment.id}`}
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>
        
        {comments.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-premium-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-premium-text-muted text-sm">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}