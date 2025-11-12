import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// Premium glassmorphism card wrapper with copper-charcoal aesthetic
export function GlassCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        "bg-black/60 backdrop-blur-xl",
        "border border-white/10",
        "shadow-[0_20px_60px_-20px_rgba(192,88,15,0.35)]",
        "rounded-3xl",
        "divide-y divide-white/5",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Section header with premium styling
export function SectionHeader({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={cn(
        "flex justify-between items-center gap-3",
        "py-2",
        "text-[hsl(27,72%,72%)]",
        "uppercase tracking-[0.2em]",
        "text-xs font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Premium action pill button
export function ActionPill({
  children,
  className,
  variant = "default",
  ...props
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "success" | "danger" | "secondary";
  [key: string]: any;
}) {
  const variants = {
    default: "from-[#c0580f] via-[#d3541e] to-[#ffb347] text-white shadow-[#c0580f]/40",
    success: "from-emerald-600 via-emerald-500 to-emerald-400 text-white shadow-emerald-500/40",
    danger: "from-red-600 via-red-500 to-red-400 text-white shadow-red-500/40",
    secondary: "from-white/10 to-white/5 text-white border border-white/20 shadow-white/10"
  };

  return (
    <button
      className={cn(
        "h-11 px-4 rounded-full",
        "bg-gradient-to-r",
        variants[variant],
        "shadow-lg",
        "font-medium text-sm",
        "transition-all duration-200",
        "hover:shadow-xl hover:scale-[1.02]",
        "active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Mobile-optimized event card
export function MobileEventCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col gap-4",
        "md:flex-row md:items-stretch",
        "p-4 md:p-6",
        "hover:border-[#c0580f]/50",
        "hover:shadow-[0_20px_45px_-25px_rgba(192,88,15,0.5)]",
        className
      )}
      {...props}
    >
      {children}
    </GlassCard>
  );
}

// Attendee card for check-in interface
export function AttendeeCard({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <GlassCard
      className={cn(
        "p-4",
        "transition-all duration-200",
        "hover:bg-white/5",
        "active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </GlassCard>
  );
}

// Timeline card for recent activity
export function TimelineCard({
  children,
  className,
  isLast = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  isLast?: boolean;
  [key: string]: any;
}) {
  return (
    <div className="relative">
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-5 top-12 bottom-0 w-[2px] bg-gradient-to-b from-[#c0580f]/60 to-transparent"
          aria-hidden="true"
        />
      )}
      
      {/* Timeline dot */}
      <div
        className="absolute left-4 top-5 w-3 h-3 rounded-full bg-gradient-to-r from-[#c0580f] to-[#d3541e] ring-4 ring-black/60"
        aria-hidden="true"
      />
      
      {/* Card content */}
      <GlassCard
        className={cn(
          "ml-10",
          "p-4",
          className
        )}
        {...props}
      >
        {children}
      </GlassCard>
    </div>
  );
}

// Empty state panel
export function EmptyStatePanel({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: {
  icon?: any;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <GlassCard
      className={cn(
        "flex flex-col items-center justify-center",
        "p-8 md:p-12",
        "text-center",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="p-4 rounded-full bg-gradient-to-r from-[#c0580f]/20 to-[#d3541e]/20 mb-4">
          <Icon className="h-8 w-8 text-[#d3541e]" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-white/60 mb-6 max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </GlassCard>
  );
}

// Floating action button
export function FloatingActionButton({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <button
      className={cn(
        "fixed bottom-20 right-5 z-50",
        "md:hidden",
        "h-14 w-14 rounded-full",
        "bg-gradient-to-r from-[#c0580f] to-[#d3541e]",
        "text-white",
        "shadow-lg shadow-[#c0580f]/40",
        "flex items-center justify-center",
        "transition-all duration-200",
        "hover:shadow-xl hover:scale-[1.05]",
        "active:scale-[0.95]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Sticky mobile footer for actions
export function StickyMobileFooter({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <div
      className={cn(
        "md:hidden",
        "fixed bottom-0 inset-x-0",
        "bg-black/80 backdrop-blur-xl",
        "border-t border-white/10",
        "p-4 pb-safe",
        "flex gap-3",
        "z-40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Timestamp pill for timeline events
export function TimestampPill({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        "bg-white/10 text-white",
        "text-xs font-semibold",
        "px-3 py-1 rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Status badge with variants
export function StatusBadge({
  children,
  variant = "default",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
  [key: string]: any;
}) {
  const variants = {
    default: "bg-white/10 text-white",
    success: "bg-emerald-500/20 text-emerald-200",
    warning: "bg-amber-500/20 text-amber-200",
    error: "bg-red-500/20 text-red-200",
    info: "bg-blue-500/20 text-blue-200"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center",
        "text-xs font-medium",
        "px-2.5 py-0.5 rounded-full",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}