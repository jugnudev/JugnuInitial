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
    type: 'fire',
    emoji: '🔥',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
    bgColorActive: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-orange-500/30',
    borderColorActive: 'border-blue-400 dark:border-blue-600'
  },
  { 
    type: 'like',
    emoji: '👍',
    icon: ThumbsUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20',
    bgColorActive: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-500/30',
    borderColorActive: 'border-blue-400 dark:border-blue-600'
  },
  { 
    type: 'celebrate',
    emoji: '🎉',
    icon: PartyPopper,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    bgColorActive: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-purple-500/30',
    borderColorActive: 'border-blue-400 dark:border-blue-600'
  },
  { 
    type: 'star',
    emoji: '⭐',
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20',
    bgColorActive: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-yellow-500/30',
    borderColorActive: 'border-blue-400 dark:border-blue-600'
  }
];

// Premium animation variants
const reactionAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  },
  exit: { 
    scale: 0, 
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: "easeInOut"
    }
  },
  hover: {
    scale: 1.1,
    y: -2,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: "easeOut"
    }
  }
};

const floatingAnimation = {
  initial: { y: 0, opacity: 0, scale: 0.8 },
  animate: { 
    y: -50,
    opacity: [0, 1, 1, 0],
    scale: [0.8, 1.1, 1, 0.9],
    transition: {
      duration: 1.8,
      times: [0, 0.2, 0.5, 1],
      ease: [0.16, 1, 0.3, 1]
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
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string }[]>([]);
  
  // Get reaction counts
  const getReactionCount = (type: string) => {
    const reaction = reactions.find(r => r.type === type);
    return reaction?.count || 0;
  };
  
  const hasReacted = (type: string) => {
    const reaction = reactions.find(r => r.type === type);
    return reaction?.hasReacted || false;
  };
  
  const handleReaction = (type: string, emoji: string) => {
    // Only add floating animation if not already reacted (i.e., adding new reaction)
    if (!hasReacted(type)) {
      const id = `${Date.now()}-${Math.random()}`;
      setFloatingReactions(prev => [...prev, { id, emoji }]);
      
      // Remove floating reaction after animation
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 1500);
    }
    
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
        <div className="flex items-center gap-1">
          {activeReactions.map((reaction, idx) => (
            <motion.button
              key={reaction.type}
              variants={reactionAnimation}
              initial="initial"
              animate="animate"
              whileHover="hover"
              whileTap="tap"
              onClick={() => handleReaction(reaction.type, reaction.emoji)}
              className={`
                relative flex items-center gap-1 px-2.5 py-1.5 rounded-full
                border transition-all duration-200
                ${hasReacted(reaction.type) 
                  ? `${reaction.bgColorActive} ${reaction.borderColorActive} ${reaction.color}` 
                  : 'bg-premium-surface/50 border-premium-border hover:border-premium-border-hover text-premium-text-muted'
                }
              `}
              data-testid={`reaction-${reaction.type}-${postId}`}
            >
              <span className="text-lg">{reaction.emoji}</span>
              <span className="text-xs font-medium">{getReactionCount(reaction.type)}</span>
              
              {/* Subtle pulse effect for user's reaction */}
              {hasReacted(reaction.type) && (
                <motion.div
                  className={`absolute inset-0 rounded-full ${reaction.bgColor}`}
                  initial={{ scale: 1, opacity: 0.3 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    repeatDelay: 3,
                    ease: "easeOut"
                  }}
                />
              )}
            </motion.button>
          ))}
        </div>
      )}
      
      {/* Add Reaction Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(!showPicker)}
          className="h-8 px-3 text-premium-text-muted hover:text-accent hover:bg-accent/10 transition-all duration-200"
          data-testid={`add-reaction-${postId}`}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          React
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
                      <motion.button
                        key={reaction.type}
                        whileHover={{ scale: 1.3, rotate: 10 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(reaction.type, reaction.emoji)}
                        className={`
                          relative p-2 rounded-lg transition-all duration-200
                          hover:${reaction.bgColor}
                        `}
                        data-testid={`reaction-picker-${reaction.type}-${postId}`}
                      >
                        <span className="text-2xl">{reaction.emoji}</span>
                        
                        {/* Tooltip */}
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          whileHover={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/80 text-white text-xs rounded-md whitespace-nowrap pointer-events-none"
                        >
                          {reaction.type}
                        </motion.div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      
      {/* Floating Reactions */}
      <AnimatePresence>
        {floatingReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            variants={floatingAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute left-0 bottom-0 text-3xl pointer-events-none z-50"
            style={{ transform: 'translateZ(0)' }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}