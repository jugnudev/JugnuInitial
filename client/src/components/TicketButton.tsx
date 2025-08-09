import { openEventbriteCheckout, openTicketTailorCheckout } from "@/lib/ticketing";
import { cn } from "@/lib/utils";

interface TicketButtonProps {
  buyUrl?: string;
  eventbriteId?: string;
  ticketTailorId?: string;
  waitlistUrl?: string;
  soldOut?: boolean;
  label?: string;
  className?: string;
  size?: "md" | "lg";
}

export default function TicketButton({
  buyUrl,
  eventbriteId,
  ticketTailorId,
  waitlistUrl,
  soldOut = false,
  label = "Get Tickets",
  className,
  size = "md",
}: TicketButtonProps) {
  // Determine state
  const hasDirectBuy = Boolean(buyUrl);
  const hasEmbedId = Boolean(eventbriteId || ticketTailorId);

  let state: "buy" | "soldout" | "comingsoon" = "comingsoon";
  if (soldOut) state = "soldout";
  else if (hasDirectBuy || hasEmbedId) state = "buy";

  const btnBase =
    "inline-flex items-center justify-center rounded-2xl px-5 font-medium transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const sizes = size === "lg" ? "h-12 text-base" : "h-10 text-sm";

  const primary =
    "bg-primary text-black/90 hover:bg-primary-700 ring-offset-bg shadow-sm btn-glow";

  const ghost =
    "border border-primary/55 text-text hover:bg-white/5 ring-offset-bg";

  async function handleClick() {
    if (state !== "buy") return;

    // 1) Simple link-out now
    if (hasDirectBuy && typeof window !== "undefined") {
      window.open(buyUrl!, "_blank", "noopener,noreferrer");
      return;
    }

    // 2) Future: open vendor modal
    if (eventbriteId) {
      await openEventbriteCheckout(eventbriteId);
      return;
    }
    if (ticketTailorId) {
      await openTicketTailorCheckout(ticketTailorId);
      return;
    }
  }

  // Render
  if (state === "soldout") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <button
          type="button"
          className={cn(btnBase, sizes, ghost)}
          aria-disabled
          title="Sold Out"
          data-testid="button-sold-out"
        >
          Sold Out
        </button>
        {waitlistUrl && (
          <a
            className={cn(btnBase, sizes, primary)}
            href={waitlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-waitlist"
          >
            Join Waitlist
          </a>
        )}
      </div>
    );
  }

  if (state === "comingsoon") {
    // Show waitlist button if available
    if (waitlistUrl) {
      const handleWaitlistClick = () => {
        if (waitlistUrl.startsWith('#')) {
          // Smooth scroll to section
          const element = document.getElementById(waitlistUrl.slice(1));
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        } else if (waitlistUrl.startsWith('/')) {
          // Client-side navigation
          window.location.href = waitlistUrl;
        } else {
          // External URL - open in new tab
          window.open(waitlistUrl, '_blank', 'noopener,noreferrer');
        }
      };

      return (
        <button
          type="button"
          onClick={handleWaitlistClick}
          className={cn(btnBase, sizes, primary, className)}
          data-testid="button-join-waitlist"
        >
          Join Waitlist
        </button>
      );
    }

    return (
      <button
        type="button"
        className={cn(btnBase, sizes, ghost, className)}
        aria-disabled
        title="Tickets coming soon"
        data-testid="button-coming-soon"
      >
        Tickets Coming Soon
      </button>
    );
  }

  // state === "buy"
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(btnBase, sizes, primary, className)}
      data-testid="button-get-tickets"
    >
      {label}
    </button>
  );
}
