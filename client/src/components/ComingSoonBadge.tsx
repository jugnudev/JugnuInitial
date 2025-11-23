import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface ComingSoonBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'prominent';
  showIcon?: boolean;
  className?: string;
}

export function ComingSoonBadge({ 
  size = 'md', 
  variant = 'subtle',
  showIcon = true,
  className = ''
}: ComingSoonBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const variantClasses = {
    subtle: 'bg-gradient-to-r from-purple-950/40 via-violet-950/30 to-purple-950/40 text-purple-300 border border-purple-500/40 shadow-sm',
    prominent: 'bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 text-purple-950 border border-purple-300/50 shadow-lg shadow-purple-500/30 font-bold'
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  };

  return (
    <Badge 
      className={`${sizeClasses[size]} ${variantClasses[variant]} font-semibold uppercase tracking-wider ${className}`}
      data-testid="coming-soon-badge"
    >
      {showIcon && <Clock className={`${iconSizes[size]} mr-1`} />}
      Coming Soon
    </Badge>
  );
}
