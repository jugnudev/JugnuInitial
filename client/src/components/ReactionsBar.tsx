import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsUp, Flame, Star, Sparkles, PartyPopper } from "lucide-react";

interface Reaction {
  type: string;
  count: number;
  hasReacted?: boolean;
}

interface ReactionsBarProps {
  postId: string;
  reactions?: Reaction[];
  onReaction?: (type: string) => void;
  className?: string;
}

// Define available reactions with icons and colors (match actual database constraint)
const REACTION_TYPES = [
  { 
    type: 'heart',
    emoji: '❤️',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20',
    bgColorActive: 'bg-red-500/20 dark:bg-red-500/20',
    borderColor: 'border-red-500/30',
    borderColorActive: 'border-red-500 dark:border-red-500'
  },
  { 
    type: 'fire',
    emoji: '🔥',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    bgColorActive: 'bg-orange-500/20 dark:bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    borderColorActive: 'border-orange-500 dark:border-orange-500'
  },
  { 
    type: 'like',
    emoji: '👍',
    icon: ThumbsUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    bgColorActive: 'bg-blue-500/20 dark:bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    borderColorActive: 'border-blue-500 dark:border-blue-500'
  },
  { 
    type: 'celebrate',
    emoji: '🎉',
    icon: PartyPopper,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    bgColorActive: 'bg-purple-500/20 dark:bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    borderColorActive: 'border-purple-500 dark:border-purple-500'
  },
  { 
    type: 'star',
    emoji: '⭐',
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    bgColorActive: 'bg-yellow-500/20 dark:bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    borderColorActive: 'border-yellow-500 dark:border-yellow-500'
  }
];

// Simple animation variants (no floating)
const reactionAnimation = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.15
    }
  }
};

export function ReactionsBar({ 
  postId, 
  reactions = [], 
  onReaction,
  className = ""
}: ReactionsBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Get reaction counts
  const getReactionCount = (type: string) => {
    const reaction = reactions.find(r => r.type === type);
    return reaction?.count || 0;
  };
  
  const hasReacted = (type: string) => {
    const reaction = reactions.find(r => r.type === type);
    return reaction?.hasReacted || false;
  };
  
  const handleReaction = (type: string) => {
    // Call the reaction handler - backend will toggle the reaction
    if (onReaction) {
      onReaction(type);
    }
    
    // Close picker
    setShowPicker(false);
  };
  
  // Get reactions that have counts
  const activeReactions = REACTION_TYPES.filter(r => getReactionCount(r.type) > 0);
  
  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Active Reactions Display */}
      {activeReactions.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {activeReactions.map((reaction, idx) => (
            <button
              key={reaction.type}
              onClick={() => handleReaction(reaction.type)}
              className={`
                relative flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full
                border transition-all duration-150
                ${hasReacted(reaction.type) 
                  ? `${reaction.bgColorActive} ${reaction.borderColorActive} ${reaction.color}` 
                  : 'bg-premium-surface/50 border-premium-border hover:border-premium-border-hover text-premium-text-muted'
                }
                hover:scale-105 active:scale-95
              `}
              data-testid={`reaction-${reaction.type}-${postId}`}
            >
              <span className="text-base sm:text-lg">{reaction.emoji}</span>
              <span className="text-xs font-medium min-w-[12px] text-center">{getReactionCount(reaction.type)}</span>
              
            </button>
          ))}
        </div>
      )}
      
      {/* Add Reaction Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
          className="h-8 px-3 text-premium-text-muted hover:text-accent hover:bg-accent/10 transition-all duration-200 whitespace-nowrap"
          data-testid={`add-reaction-${postId}`}
        >
          <Sparkles className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">React</span>
        </Button>
        
        {/* Reaction Picker */}
        <AnimatePresence>
          {showPicker && (
            <>
              {/* Backdrop - instant appearance, no delay */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPicker(false)}
              />
              
              {/* Picker Popup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute bottom-full left-0 mb-2 z-50"
              >
                <div className="bg-premium-surface-elevated border border-premium-border rounded-xl p-2 shadow-glow backdrop-blur-md">
                  <div className="flex items-center gap-1">
                    {REACTION_TYPES.map((reaction) => (
                      <button
                        key={reaction.type}
                        onClick={() => handleReaction(reaction.type)}
                        className={`
                          relative p-2 rounded-lg transition-all duration-150
                          hover:${reaction.bgColor} hover:scale-110 active:scale-95
                          group
                        `}
                        data-testid={`reaction-picker-${reaction.type}-${postId}`}
                        title={reaction.type}
                      >
                        <span className="text-2xl">{reaction.emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}