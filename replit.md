# Replit.md

## Overview
Jugnu is a cultural events and communities platform for South Asian and global music experiences across Canada. It offers exclusive member spaces, event discovery, ticketing, and sponsorship opportunities. The platform prioritizes performance, security, and growth, featuring caching, rate limiting, invite systems, and analytics. Communities feature is currently in FREE BETA.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript and Vite.
- **Styling**: Tailwind CSS, shadcn/ui components, and custom variables for a mobile-first responsive design.
- **Typography**: Google Fonts (Fraunces, Inter).
- **Navigation**: Conditional display with streamlined CTAs in hero sections and fixed bottom action bars for mobile.
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support.
- **User Acquisition Hierarchy**: Account creation (primary) > Event exploration (secondary) > Newsletter signup (tertiary, homepage bottom only). Authenticated users manage newsletter preferences in account settings.
- **Polls & Giveaways UI**: Card-based navigation with interactive hover effects and scale animations for primary type selection. Status filters (Active/Closed/Ended) integrated as pill buttons with gradient highlights in action bar, eliminating stacked tab bars for cleaner UX.

### Technical Implementations
- **Backend Framework**: Express.js with TypeScript.
- **Middleware**: cookie-parser for cookie handling (required for community auth tokens), express-session for platform sessions.
- **Authentication**: Hybrid middleware (`requireAuthOrSession`) supports both community auth tokens (Bearer/cookie) and platform sessions for seamless user experience across community portals and main platform.
- **Database ORM**: Drizzle ORM for PostgreSQL.
- **State Management**: TanStack Query for server state, React hooks for local state.
- **Routing**: Wouter for client-side navigation.
- **Session Management**: Connect-pg-simple with 24-hour timeout.
- **API**: RESTful with comprehensive error handling.
- **Security**: Rate limiting, input sanitization, CSRF protection, IP blocking, and environment variables for sensitive data.
- **Performance**: In-memory caching with TTL, query optimization, code splitting, lazy/progressive image loading, and React memoization.
- **SEO**: Meta tags, Open Graph, Twitter Cards, and JSON-LD via react-helmet-async (wrapped with HelmetProvider in App.tsx).
- **Data Management**: Static data from local JSON, automated import and bidirectional sync of community events from Google Calendar ICS feeds, and automated cleanup jobs.
- **Email System**: SendGrid integration with premium-designed templates for verification codes, welcome emails (separate for user/business accounts), and notifications. Sender address is relations@jugnucanada.com with environment variable precedence: EMAIL_FROM_ADDRESS → SENDGRID_FROM_EMAIL → default. Welcome emails automatically sent after first account verification. All emails feature modern gradients, accessible design, and Canada-wide branding. Email worker runs every minute via cron when Communities enabled, processing immediate notifications and scheduled daily/weekly digests from community_email_queue table.

### Feature Specifications
- **Admin & Sponsorship Systems**: Key-based Admin API, portal token system (UUID-based), lead management (CRUD), multi-part onboarding for campaigns, creative upload (banners), sponsor portal with real-time analytics and CSV export, and health monitoring endpoints.
- **Business Signup Flow**: Streamlined single-page signup combining user registration and organizer application submission. Includes CTAs in hero section and regular signup page. Form validation handles optional numeric fields (NaN → undefined). Backend conditionally inserts optional Supabase fields to prevent schema mismatch errors. Supports "0 years" experience properly using typeof checks. Website field automatically adds "https://" prefix to URLs without protocol for improved UX.
- **Careers System**: "Join the Team" recruitment platform for volunteer opportunities. Public-facing careers page (/careers) with premium dark gradient hero, SEO optimization, department filtering, and job details. Admin management page (/admin/careers) with full CRUD for job postings and application tracking. Database uses snake_case field names to match Supabase conventions. Application data stored with status workflow (pending → reviewing → interviewed → accepted/rejected).
- **Communities Platform**:
    - **Notification Preferences**: Email frequency settings (immediate/daily/weekly), digest time scheduling, timezone configuration. UI integrated in Account Settings > Schedule tab. Requires manual Supabase table setup (see SETUP_NOTIFICATION_PREFS.md).
    - **Growth Features**: Invite links with copy functionality for owners/moderators, member referrals, community discovery, social sharing.
    - **Join Link Management**: Owners and moderators can access permanent invite links from Settings tab with one-click copy, usage tracking, and automatic link generation.
    - **Analytics Dashboard**: Real-time insights including best time to post, engagement metrics, member metrics, and post performance.
    - **Real-Time Chat**: WebSocket server with Supabase persistence, online presence, typing indicators, role-based permissions, auto-moderation, and message management.
    - **Moderator & Permissions**: Role management (owner, moderator, member) with granular permissions. Moderators have access to Settings tab including invite link management.
    - **Post Reactions**: Atomic upsert operations with optimistic UI updates.
    - **Media Upload**: Supports images (JPG/PNG/WebP, max 10MB) and MP4 videos (max 50MB) with drag-and-drop.
    - **Post as Business**: Toggle to post announcements as the community/business or as an individual user.
    - **Free Beta Access**: Communities are FREE for all business accounts during the beta period. No billing enforcement, subscription checks, or payment requirements. Billing routes and Stripe initialization disabled. Visual beta badges displayed on Communities features.
    - **Giveaway System**: Comprehensive functionality including random draw, first-come-first-serve, task-based, points-based with automated winner selection, prize management, winner display with confetti animation, delete capability, and premium mobile-friendly interface. Authors cannot enter their own giveaways to prevent conflicts of interest.
    - **Notification System**: In-app notifications with email delivery, frequency preferences (immediate/daily/weekly), quiet hours support, and real-time WebSocket updates. Database uses `user_id` column for recipient identification (Supabase queries). PATCH endpoint sanitizes communityId parameter (converts "null"/null/undefined to undefined) to prevent UUID parsing errors for global preferences. Email notifications automatically sent when posts are created, members are approved, or roles are updated, respecting user frequency preferences (immediate emails sent right away, daily/weekly queued for digest). Requires manual Supabase table setup for community_email_queue with scheduled_for column (see SETUP_EMAIL_QUEUE.md).

### System Design Choices
- **Mobile-first approach**: Implemented using Tailwind CSS breakpoints.
- **Feature Flags**: `ENABLE_TICKETING` and `ENABLE_COMMUNITIES` control the visibility and functionality of major system components across both server and client, including SEO isolation via `robots.txt` and `sitemap.xml`.
- **Database Design**: Separate tables for community subscriptions, payments, billing events, giveaways, entries, and winners.
- **Timezone Hardening**: All metrics processed and stored in Pacific timezone.

## External Dependencies

### Core
- **@neondatabase/serverless**: Serverless PostgreSQL.
- **drizzle-orm**: Type-safe ORM.
- **@tanstack/react-query**: Server state management.
- **wouter**: React router.
- **express**: Node.js web framework.
- **cookie-parser**: Cookie parsing middleware (critical for community auth).

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