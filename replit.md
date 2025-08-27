# Replit.md

## Overview
Jugnu is a cultural events platform, primarily focused on South Asian and global music experiences in Vancouver. It currently operates in a "Waitlist Mode" to capture user interest, with event-aware UI designed to activate full functionality upon the addition of real events. The platform's vision is to become a central hub for community events, offering robust event discovery, ticketing integrations, and sponsorship opportunities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite for building.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack Query for server state; React hooks for local state.
- **Styling**: Tailwind CSS with custom variables and shadcn/ui components.
- **Typography**: Google Fonts (Fraunces for headings, Inter for body).
- **Component Structure**: Organized into pages, components, and UI components for clear separation.

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Database ORM**: Drizzle ORM for PostgreSQL with Neon Database.
- **Session Management**: Connect-pg-simple for PostgreSQL session storage.
- **API Structure**: RESTful endpoints (`/api` prefix) with comprehensive error handling.

### Data Management
- **Static Data**: Events and gallery images served from local JSON files.
- **Event Logic**: UI conditionally renders based on purchasable events.
- **Community Events System**: Automated import from Google Calendar ICS feeds, parsing structured descriptions for event details. Includes category filtering, monthly feed display, and featured event handling.
- **Waitlist Mode**: Single TBA event routes to a dedicated `/waitlist` page.

### Responsive Design & Mobile Experience
- **Mobile-First**: Tailwind CSS breakpoints for mobile-optimized layouts.
- **Smart Navigation**: Conditional display of navigation items based on content.
- **Single CTA Flow**: Streamlined call-to-action in hero and mobile bars.
- **Mobile CTA Bar**: Fixed bottom action bar with safe-area support.

### Performance & SEO
- **Build Optimization**: Vite for fast development and optimized production builds.
- **Code Splitting**: Dynamic imports for route-based code splitting.
- **SEO**: Meta tags, Open Graph, Twitter Cards, and JSON-LD structured data.
- **Images**: Lazy loading with lightbox functionality.
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support.

### Admin & Sponsorship Systems
- **Admin API**: Key-based system for managing campaigns, portal tokens, and onboarding.
- **Portal Token System**: UUID-based secure tokens with legacy hex token support for backward compatibility. Tokens are created in Supabase with 90-day expiration and validated via `/api/spotlight/portal/:tokenId` endpoint.
- **Admin Authentication**: `x-admin-key` header authentication with audit logging.
- **Onboarding Flow**: Multi-part form submission at `/api/onboard/:token` creates campaigns, uploads creatives, and generates portal tokens automatically.
- **Health Monitoring**: `/api/health` endpoint with database connectivity checks, table status, and response time metrics.
- **Promote v2 Sales Page**: Premium sales page for sponsorship packages with detailed pricing, add-ons, and application forms.
- **Sponsor Portal System**: Token-based analytics portal (`/sponsor/:tokenId`) with real-time metrics (impressions, clicks, CTR), charts, and CSV export.
- **CSV Export**: `/api/spotlight/portal/:tokenId/export.csv` endpoint for downloading campaign metrics.
- **Advanced Analytics Backend**: `sponsor_metrics_daily` table with day (Pacific timezone), raw_views, billable_impressions, clicks, unique_users columns.
- **Frequency Capping**: Infrastructure for viewable impression tracking with IntersectionObserver and session-based frequency capping (defaults to unlimited for better visibility).
- **Sponsor Onboarding**: One-click email feature for new sponsors with portal details.
- **Self-test System**: Comprehensive `/api/admin/selftest` endpoint for validating system health and functionality.
- **Mobile-First Admin Console**: Responsive redesign for `/admin/promote` for various screen sizes.
- **Timezone Hardening**: All metrics writes use Pacific timezone ((now() at time zone 'America/Vancouver')::date) for consistency.
- **Enhanced Logging**: Metrics test endpoint provides before→after count logging for verification.
- **Schema Robustness**: All operations use 'day' column only, with safe schema cleanup approach.
- **Security Hardening**: Test scripts sanitized to use environment variables; no hardcoded secrets in repository.
- **Frequency Cap Support**: Full CRUD support for frequency capping with proper 0-value handling (0 = unlimited).

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection.
- **drizzle-orm**: Type-safe ORM for database operations.
- **@tanstack/react-query**: Server state management and caching.
- **wouter**: Lightweight React router.
- **express**: Node.js web framework for backend API.

### UI and Styling
- **@radix-ui/react-***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant API for component styling.
- **clsx**: Conditional className utility.

### Form and Validation
- **react-hook-form**: Performant forms.
- **@hookform/resolvers**: Validation resolvers for react-hook-form.
- **zod**: TypeScript-first schema validation.
- **drizzle-zod**: Zod schema generation from Drizzle schemas.

### Development Tools
- **vite**: Fast build tool and development server.
- **typescript**: Static type checking.
- **tsx**: TypeScript execution environment.
- **esbuild**: Fast JavaScript bundler for production.

### Active Integrations
- **Supabase**: Database backend with RLS for `community_events`.
- **Google Calendar**: ICS feed parsing for community events.
- **Calendar Export**: Google Calendar and ICS file generation for event adds.