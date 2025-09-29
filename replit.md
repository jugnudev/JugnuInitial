# Replit.md

## Overview
Jugnu is a cultural events and communities platform focused on South Asian and global music experiences in Vancouver. It offers exclusive member spaces, event discovery, ticketing integrations, and sponsorship opportunities. The platform prioritizes performance, security, and growth, featuring comprehensive caching, rate limiting, invite systems, and analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, Vite.
- **Routing**: Wouter.
- **State Management**: TanStack Query (server state), React hooks (local state).
- **Styling**: Tailwind CSS, shadcn/ui components, custom variables.
- **Typography**: Google Fonts (Fraunces, Inter).
- **Structure**: Pages, components, UI components.

### Backend
- **Framework**: Express.js with TypeScript.
- **Database ORM**: Drizzle ORM for PostgreSQL (Neon Database), Supabase for Communities.
- **Session Management**: Connect-pg-simple for PostgreSQL, 24-hour timeout.
- **API**: RESTful (`/api` prefix), comprehensive error handling.
- **Security**: Rate limiting (5 req/s authenticated, 1 req/s unauthenticated), input sanitization, CSRF protection, IP blocking.
- **Performance**: In-memory caching with TTL, query optimization, background cleanup.
- **Analytics**: Event tracking, engagement, conversion funnels, feature usage.

### Data Management
- **Static Data**: Events and gallery images from local JSON.
- **Event Logic**: UI renders based on purchasable events.
- **Community Events**: Automated import and bidirectional sync from Google Calendar ICS feeds.
- **Waitlist Mode**: Dedicated `/waitlist` page for TBA events.
- **Data Cleanup**: Automated jobs for old notifications, expired sessions, abandoned drafts, inactive communities.
- **Caching**: In-memory cache with configurable TTL (60s, 300s, 900s).

### Responsive Design & Mobile
- **Approach**: Mobile-first with Tailwind CSS breakpoints.
- **Navigation**: Conditional display.
- **CTAs**: Streamlined single CTA in hero and mobile bars, fixed bottom action bar.

### Performance & SEO
- **Build**: Vite for fast development and optimized production.
- **Code Splitting**: Dynamic imports.
- **SEO**: Meta tags, Open Graph, Twitter Cards, JSON-LD via SEOMetaTags component.
- **Images**: Lazy loading, progressive loading, error handling.
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support, `data-testid`.
- **Frontend Optimizations**: Infinite scroll, `React.memo`, loading skeletons.
- **Error Handling**: Global error boundary, retry logic, user-friendly messages.

### Admin & Sponsorship Systems
- **Admin API**: Key-based system for campaigns, portal tokens, onboarding.
- **Refresh Events**: Manual trigger for calendar sync, including deletion of removed events.
- **Portal Token System**: UUID-based secure tokens (90-day expiration) with legacy hex support.
- **Admin Authentication**: `x-admin-key` header with audit logging.
- **Lead Management**: Full CRUD for sponsor leads.
- **Onboarding Flow**: Multi-part form for campaign creation, creative upload, and token generation.
- **Creative Upload**: Supports 4 creatives (desktop/mobile banners) with validation.
- **Health Monitoring**: `/api/health` endpoint with DB checks.
- **Promote v2 Sales Page**: Premium sponsorship sales page.
- **Sponsor Portal**: Token-based analytics (`/sponsor/:tokenId`) with real-time metrics, charts, CSV export.
- **Analytics Backend**: `sponsor_metrics_daily` table (Pacific timezone).
- **Frequency Capping**: Viewable impression tracking with IntersectionObserver and session-based capping.
- **Self-test**: `/api/admin/selftest` endpoint for system validation.
- **Mobile-First Admin Console**: Responsive redesign for `/admin/promote`.
- **Timezone Hardening**: All metrics use Pacific timezone.
- **Security**: Environment variables for sensitive data.

### Communities Platform (Phase 9)
- **Growth Features**: Invite links, member referrals, community discovery (featured, trending, search), social sharing.
- **Security Enhancements**: Configurable rate limiting, input sanitization, session security (24-hour timeout, secure tokens), CSRF protection.
- **Performance**: In-memory database caching, query optimization, frontend optimizations (lazy loading, infinite scroll), background jobs for cleanup.
- **Analytics & Monitoring**: Event tracking, error monitoring, performance metrics, admin reports.
- **Real-Time Chat**: WebSocket server (`/chat`) for instant messaging, bearer token authentication, Supabase persistence, online presence, typing indicators, role-based permissions, slowmode, announcements, message management (pin, delete), standardized protocol, error handling, dev mode compatibility.

### Feature Flags
- **Ticketing System**: Controlled by `ENABLE_TICKETING` (server) and `VITE_ENABLE_TICKETING` (client). Disabling hides routes, APIs, UI, and ensures SEO isolation via `robots.txt` and `sitemap.xml`.
- **Communities System**: Controlled by `ENABLE_COMMUNITIES` (server) and `VITE_ENABLE_COMMUNITIES` (client). Disabling hides routes, APIs, UI, and ensures SEO isolation.

## External Dependencies

### Core
- **@neondatabase/serverless**: Serverless PostgreSQL.
- **drizzle-orm**: Type-safe ORM.
- **@tanstack/react-query**: Server state management.
- **wouter**: React router.
- **express**: Node.js web framework.

### UI and Styling
- **@radix-ui/react-***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS.
- **class-variance-authority**: Component styling.
- **clsx**: Conditional className utility.

### Form and Validation
- **react-hook-form**: Forms.
- **@hookform/resolvers**: Validation resolvers.
- **zod**: TypeScript schema validation.
- **drizzle-zod**: Zod schema generation.

### Development Tools
- **vite**: Build tool and dev server.
- **typescript**: Static type checking.
- **tsx**: TypeScript execution.
- **esbuild**: JavaScript bundler.

### Active Integrations
- **Supabase**: Database backend (RLS for `community_events`, sponsor management, ticketing, communities).
- **Google Calendar**: ICS feed parsing for community events.
- **Calendar Export**: Google Calendar and ICS file generation.
- **Stripe**: Payment processing for ticketing, Connect for multi-vendor.