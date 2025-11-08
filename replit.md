# Replit.md

## Overview
Jugnu is a cultural events and communities platform for South Asian and global music experiences across Canada. It facilitates event discovery, ticketing, and sponsorship opportunities, with exclusive member spaces. The platform prioritizes performance, security, and growth through features like caching, rate limiting, invite systems, and analytics. The Communities feature is currently in FREE BETA.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React 18 with TypeScript and Vite, styled with Tailwind CSS and shadcn/ui components for a mobile-first, responsive design. Typography uses Google Fonts (Fraunces, Inter). Navigation is conditional, featuring streamlined CTAs (minimum 48px touch targets for mobile) and fixed bottom action bars for mobile. Accessibility is ensured with ARIA labels, keyboard navigation, and screen reader support. User acquisition prioritizes account creation, followed by event exploration, and newsletter signup. Polls and Giveaways utilize card-based navigation with interactive effects and status filters integrated as pill buttons.

**Premium Design System (Copper-Charcoal Aesthetic):**
- Color palette: Copper gradient (#c0580f→#d3541e), Charcoal (#0B0B0F with variants), Jade accent (#17C0A9)
- Glassmorphism utilities: `.glass-card`, `.glass-elevated` with backdrop blur and semi-transparent backgrounds
- Mobile-first optimization: Touch targets ≥48px (`.touch-target` class), gesture-friendly interactions, bottom sticky action bars
- Animation system: Fade-in, slide-up, hover-lift effects with staggered transitions
- Applied to: Ticketing system (organizer dashboard, event creation, event listings, check-in QR scanner), Communities navigation

**Mobile-Optimized Post Cards:**
- **Compact Header**: 32px avatar on mobile (vs 40px desktop), single-line layout with inline badges, copper separators (•), smaller text (text-sm for name, text-[10px] for badges, text-[11px] for timestamp)
- **Horizontal-Scroll Reactions**: ReactionsBar uses flex-nowrap with overflow-x-auto, px-0.5 padding for breathing room, smaller sizing on mobile (text-sm emoji, text-[10px] count)
- **Compact Interaction Bar**: Mobile-specific layout with h-8 buttons, 3.5px icons, text-xs labels, gap-1.5 spacing
- **Tighter Spacing**: Mobile uses space-y-3, px-4, py-3 (vs desktop space-y-4, px-6, py-6)
- **Glassmorphism**: backdrop-blur-sm on cards for premium frosted glass effect
- **Responsive Typography**: Mobile text-xl titles (vs desktop text-2xl)
- **Test IDs**: All interactive elements have data-testid attributes (reaction-button-{type}-{postId})

**Community Navigation System:**
- Mobile: Select dropdown navigation (eliminates horizontal scroll) with glassmorphism and copper gradient styling
- Desktop Owner/Moderator: 2-row grid layout (Row 1: Posts/Chat/Polls/Giveaways/Events, Row 2: Manage Events/Members/Analytics/Settings/Billing) for optimal spacing
- Desktop Member: Single-row grid (Posts/Chat/Polls/Giveaways/Events/Settings)
- Active tabs: Copper gradient highlight with shadow effects
- Consistent premium styling across all views

### Technical Implementations
The backend is built with Express.js and TypeScript, utilizing `cookie-parser` and `express-session` for session management. Authentication uses a hybrid middleware supporting both community auth tokens and platform sessions. Drizzle ORM is used for PostgreSQL, and TanStack Query for server state management. Wouter handles client-side routing. Security features include rate limiting, input sanitization, CSRF protection, IP blocking, and environment variables. Performance is optimized with in-memory caching, query optimization, code splitting, lazy loading, and React memoization. SEO is managed with `react-helmet-async` for meta tags and structured data. Data management involves static JSON data, automated Google Calendar ICS feed synchronization, and cleanup jobs. SendGrid is integrated for email communications, including verification, welcome, and notification emails, processed by a cron-based worker.

### Feature Specifications
- **Admin & Sponsorship Systems**: Includes a key-based Admin API, UUID-based portal tokens, lead management (CRUD), multi-part onboarding for campaigns, creative uploads, a sponsor portal with real-time analytics and CSV export, and health monitoring endpoints.
- **Business Signup Flow**: A streamlined single-page process for user registration and organizer application, with form validation and automatic URL prefixing.
- **Careers System**: A "Join the Team" platform for volunteer recruitment, featuring a public-facing careers page with department filtering and job details, and an admin management page for full CRUD operations on job postings and application tracking.
- **Loyalty Program (Coalition Points)**: Features a "Coming Soon" landing page announcing "Jugnu Coalition Points" with a fixed value (1,000 JP = $1 CAD). Includes marketing content, FAQs, cultural design elements, and waitlist integration. Controlled by a `FF_COALITION_LOYALTY` feature flag, but the landing page is always public. The program is in FREE BETA, with auto-provisioning of points for merchants and specific API routes for user wallets and business point issuance.
- **Ticketing System (Stripe Connect)**: Fully integrated into Communities Settings tab with consolidated single signup flow and premium copper-charcoal design. Uses Stripe Connect Express model for direct-to-business payments with automatic platform fee collection (15% = 1500 basis points). **Single Signup Flow**: Users must apply for a business account via `/business-signup`, get admin approval, then can enable ticketing. No separate organizer signup exists. Stripe Connect columns (`stripe_account_id`, `stripe_onboarding_complete`, `stripe_charges_enabled`, `stripe_payouts_enabled`, `stripe_details_submitted`, `platform_fee_bps`) are stored directly in the `organizers` table (consolidated from previous duplicate tickets_organizers system). **Authentication**: All ticketing endpoints use `communitiesStorage.getOrganizerByUserId()` to look up approved business accounts via session userId. Legacy localStorage and header-based auth removed. **Frontend Pages**: `/tickets/organizer/dashboard` features a tabbed interface with "Events" (public-facing view) and "Manage Events" (management tools) tabs. `/tickets/organizer/events/new` fetches organizer data from `/api/tickets/organizers/me` endpoint, shows loading states, and displays "Business Account Required" message with CTA to `/business-signup` when no approved account exists. **Onboarding flow**: Checks for active organizer status, creates Stripe Connect account with slug-based return URLs (`/communities/:slug?tab=settings&ticketing=success`). **Payment flow**: Uses `on_behalf_of` and `transfer_data.destination` for direct routing to connected accounts. Webhooks handle account updates and payment fulfillment. **TicketingSettingsCard**: Displays blue "Apply for Business Account" CTA when no organizer account exists, orange "Enable Ticketing" when approved but not connected to Stripe, and green status card showing platform fee percentage and quick actions when connected. Status refresh checks `charges_enabled` instead of requirements count to avoid infinite loading. **Image Upload**: Multer-based endpoint at `/api/tickets/events/upload-image` handles event cover images with 5MB limit and MIME validation, uploading to Supabase storage bucket `ticket-event-images`. **Event Creation**: Backend accepts nested `{event, tiers}` payload structure, creating events and ticket tiers atomically in single transaction. **My Orders**: Accessible via user profile dropdown (Receipt icon), displays purchased tickets grouped by organizer/community with premium copper-charcoal design. Backend endpoint `/api/tickets/my-tickets` returns tickets pre-grouped into upcoming/past arrays with full organizer metadata. Frontend features mobile-optimized layout with search functionality, tab navigation, and comprehensive error handling with inline retry actions. **Check-in Dashboard**: Premium QR scanner with mobile-optimized design featuring copper gradient buttons, animated camera icon, scanning frame with corner indicators, jade accent success cards, and glassmorphism effects. Manual check-in table with real-time search (name/email/serial), status filtering, and working check-in buttons. Premium copper-charcoal tab navigation with 56px+ touch targets. Audit logging is best-effort (non-blocking) to prevent check-in failures.
- **Communities Platform**: Offers notification preferences (email frequency, digest scheduling), growth features (invite links, member referrals, discovery), and an analytics dashboard. Includes a real-time chat with WebSocket server, online presence, and role-based permissions. Supports post reactions, media uploads (images/videos), and "Post as Business" functionality. The platform is in Free Beta, with visual badges indicating beta status and disabled billing checks. A comprehensive giveaway system is included, with automated winner selection and prize management. An in-app notification system with email delivery, frequency preferences, and a dedicated Notification Center page is also present. **Polls**: Full-featured polling system with **voter visibility** for owners/moderators on non-anonymous polls, displaying voter names, avatars, timestamps, and voting choices in a premium copper-charcoal dialog. Security enforced via role-based access control, cross-community validation, and anonymous poll privacy protection. **Navigation**: Premium mobile-optimized tabs on `/communities` index page featuring glassmorphism effects, copper gradient active states, and proper 48px touch targets for mobile usability. **Database Count Synchronization**: Communities table maintains denormalized `total_members` and `total_posts` columns that are automatically synchronized via helper functions (`updateCommunityMemberCount`, `updateCommunityPostCount`) triggered on all membership and post CRUD operations (create/update/delete), ensuring accurate counts without N+1 query overhead on community detail pages.

### System Design Choices
A mobile-first approach is implemented using Tailwind CSS. Feature flags (`ENABLE_TICKETING`, `ENABLE_COMMUNITIES`, `FF_COALITION_LOYALTY`) control the visibility and functionality of major components and SEO. Database design includes separate tables for community subscriptions, payments, billing, giveaways, entries, and winners. All metrics are processed and stored in the Pacific timezone.

## External Dependencies

### Core
- **@neondatabase/serverless**: Serverless PostgreSQL.
- **drizzle-orm**: Type-safe ORM.
- **@tanstack/react-query**: Server state management.
- **wouter**: React router.
- **express**: Node.js web framework.
- **cookie-parser**: Cookie parsing middleware.

### UI and Styling
- **@radix-ui/react-***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS.

### Form and Validation
- **react-hook-form**: Forms.
- **zod**: TypeScript schema validation.

### Development Tools
- **vite**: Build tool and dev server.
- **typescript**: Static type checking.

### Active Integrations
- **Supabase**: Database backend (for community events, sponsor management, ticketing, and communities).
- **Google Calendar**: ICS feed parsing for community events.
- **Stripe**: Payment processing for ticketing and subscriptions.