import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface BetaBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'subtle' | 'prominent';
  showIcon?: boolean;
  className?: string;
}

export function BetaBadge({ 
  size = 'md', 
  variant = 'subtle',
  showIcon = true,
  className = ''
}: BetaBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5'
  };

  const variantClasses = {
    subtle: 'bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40 text-amber-300 border border-amber-500/40 shadow-sm',
    prominent: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-amber-950 border border-amber-300/50 shadow-lg shadow-amber-500/30 font-bold'
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  };

  return (
    <Badge 
      className={`${sizeClasses[size]} ${variantClasses[variant]} font-semibold uppercase tracking-wider ${className}`}
      data-testid="beta-badge"
    >
      {showIcon && <Sparkles className={`${iconSizes[size]} mr-1`} />}
      Beta
    </Badge>
  );
}
