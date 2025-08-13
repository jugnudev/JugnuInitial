# Replit.md

## Overview

Jugnu is a cultural events platform focused on South Asian and global music experiences in Vancouver. Currently operating in **Waitlist Mode v2.3** - a friction-free single-CTA experience that drives users to the dedicated waitlist capture page. The application features event-aware UI that conditionally shows content based on ticket availability, with all features preserved for future activation when real events are added.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state and React hooks for local state
- **Styling**: Tailwind CSS with custom CSS variables for brand colors, shadcn/ui components for UI primitives
- **Typography**: Google Fonts integration with Fraunces for headings and Inter for body text
- **Component Structure**: Organized into pages, components, and UI components with clear separation of concerns

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM configured for PostgreSQL with Neon Database
- **Development Setup**: Vite middleware integration for development, esbuild for production builds
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **API Structure**: RESTful endpoints with /api prefix, comprehensive error handling middleware

### Data Management
- **Static Data**: Events and gallery images served from JSON files in the client/src/data directory
- **Waitlist Mode**: Currently shows single TBA event that routes to dedicated /waitlist page
- **Database Schema**: User management system with username/password authentication
- **Query Management**: TanStack Query for caching and synchronization of server state
- **Form Handling**: React Hook Form with Zod validation schemas
- **Event Logic**: UI conditionally renders based on purchasable events (buyUrl/eventbriteId/ticketTailorId)

### Responsive Design & Mobile Experience
- **Mobile-First**: Tailwind breakpoints with mobile-optimized layouts
- **Smart Navigation**: Conditionally shows Events/Gallery nav items based on content availability
- **Single CTA Flow**: Hero and mobile bar show one focused action - either "Get Tickets" or "Join Waitlist"
- **Mobile CTA Bar**: Fixed bottom action with safe-area support, hides on /waitlist and input focus
- **Waitlist Mode**: When no purchasable events exist, entire site flows to /waitlist capture page

### Third-Party Integrations (Planned)
- **Ticketing Platforms**: Stubbed integration for Eventbrite and Ticket Tailor with modal widgets
- **Email Marketing**: Provider-agnostic form setup ready for Mailchimp, Beehiiv, or ConvertKit
- **Calendar Integration**: Google Calendar and ICS file generation for event adds
- **Analytics**: Prepared for Google Analytics 4 and Plausible integration

### Performance & SEO
- **Build Optimization**: Vite for fast development and optimized production builds
- **Code Splitting**: Dynamic imports for route-based code splitting
- **SEO**: Meta tags, Open Graph, Twitter Cards, and JSON-LD structured data
- **Images**: Lazy loading for gallery images with lightbox functionality
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **express**: Node.js web framework for backend API

### UI and Styling
- **@radix-ui/react-***: Accessible UI primitives for components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant API for component styling
- **clsx**: Conditional className utility

### Form and Validation
- **react-hook-form**: Performant forms with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for react-hook-form
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Zod schema generation from Drizzle schemas

### Development Tools
- **vite**: Fast build tool and development server
- **typescript**: Static type checking
- **tsx**: TypeScript execution environment
- **esbuild**: Fast JavaScript bundler for production

### Community Events System (Updated v2.8)
- **ICS Calendar Import**: Automated import from Google Calendar ICS feeds with structured description parsing
- **Event Data Parsing**: Extracts Tickets, Source, Image, Tags, Organizer, PriceFrom, Featured from event descriptions
- **Clean Description Processing**: HTML-to-text conversion, removes structured lines, preserves readable content
- **Monthly Events Feed**: Shows upcoming South Asian events in Vancouver for next 30 days (default changed from 7)
- **Category Filtering**: Smart categorization (concert, club, comedy, festival) with UI filtering
- **Featured Hero System v2.8**: Large 16:9 hero cards for featured events with copper glow styling
- **2-Column Grid Layout**: Desktop 2-per-row (mobile 1-per-row) with consistent 16:9 aspect ratios
- **Enhanced Modal**: Share functionality, "Show more" for long descriptions, improved layout
- **Admin Management**: Manual event upsert endpoint + featured toggle API for corrections and additions
- **UI Integration**: Dedicated /community page with featured/regular separation, filtering, calendar integration
- **Accurate Date/Time (v2.6)**: All-day event detection, timezone extraction from ICS, eliminates "TBA" displays
- **Timezone Support**: Proper Vancouver timezone handling for date ranges and formatting utilities
- **Featured Event Parsing**: Auto-detect "Featured: true|yes|1" from calendar descriptions or use admin API

### Current State (v3.4.2 Stability Refinement + Production Ready + Admin Bulk Import)
- **Premium Explore UI v3.1**: Unified design system with robust date handling, enhanced UX polish, and graceful fallbacks
- **Date Utilities v3.1**: Comprehensive `/lib/dates.ts` with timezone-aware formatting, all-day event detection, NaN/Invalid Date elimination
- **Enhanced UI Polish**: Increased vertical rhythm (mt-10 md:mt-14), enhanced grid spacing (md:gap-8), subtle button glow effects
- **Dual Purpose**: Waitlist mode for Jugnu events + Community calendar + Places directory for South Asian businesses
- **Smart Navigation**: Community and Places always visible, Events/Gallery conditionally shown, consistent menu bar across all pages
- **Unified Components**: Shared PageHero, Toolbar, FilterDrawer, FeaturedHero, Card, EmptyState across Events and Places
- **Places Directory v1**: South Asian restaurants, cafes, shops & cultural spots with featured hero system, 2-column grid, filtering
- **Places Features**: Type filtering (restaurant, cafe, dessert, etc), neighborhood filtering, search, featured hero with copper glow
- **Places Database**: SQL schema ready for Supabase deployment with RLS policies and sample data
- **Places Submission**: Public form at /places/submit for business owners to list their places (requires admin approval)
- **Places API**: Full CRUD endpoints for listing, admin upsert, featuring, and public submissions with status management
- **Featured Hero v2.8**: Large 16:9 hero display for featured places and events with copper glow styling and prominent CTAs
- **2-Column Grid Layout**: Desktop shows 2 items per row (1 on mobile) with 16:9 aspect ratio cards for visual consistency
- **Request Featured System v2.9**: Public forms for both events (/community/feature) and places (/places/submit)
- **Admin Approval Workflow**: Admin endpoints to approve/reject requests with automatic creation and featured assignment
- **Enhanced Modals**: Share with Web Share API + smooth cursor-positioned toast notifications, cleaned descriptions with "Show more"
- **Admin Tools**: ICS import cron job + manual management via API + description cleaning + featured toggle endpoints
- **Robust Date Handling**: Timezone-aware formatting with all-day event detection, eliminates "TBA" displays, graceful fallbacks
- **Solid Deduplication v2.7**: Prevents duplicates using ICS UIDs + canonical keys (title+date+venue), manual dedup at query time
- **Consistent Design Language**: Same copper theming, 16:9 aspect ratios, modal patterns across Events and Places
- **TypeScript Excellence**: All components properly typed, boolean conversions handled, interface consistency maintained
- **Navigation Enhancement v3.1**: Added persistent navigation menu bar to all pages including Community and Places for seamless user navigation
- **Explore v3.3 - Events Rebrand + Clean UX**: Renamed Community to Events, removed noisy Collections carousel, improved UUID-based favorites system, cleaner navigation UX
- **Events Rebranding**: /community redirects to /events, updated navigation, /community/feature redirects to /events/feature
- **UUID-Based Favorites v3.3**: New /api/events/by-ids and /api/places/by-ids endpoints for reliable UUID-based favorites, improved Saved page with direct API calls
- **Simplified UX**: Removed Collections carousel from main pages to reduce noise, cleaner toolbar and navigation experience
- **v3.4.2 Stability Refinement**: Comprehensive API error handling with retry logic, shimmer loading animations, robust image error handling, accessibility enhancements with focus rings and ARIA labels, keyboard navigation support, production-ready error states
- **Layout Bug Fixes**: Fixed duplicate navigation menu issue on privacy/terms pages, enhanced focus management throughout the application
- **Admin Bulk Import v3.4.3**: Secure bulk import endpoint POST /api/places/admin/bulk-upsert with x-admin-key authentication, canonical_key deduplication, field mapping, URL validation, HTML stripping, and comprehensive error reporting

### Active Integrations
- **Supabase**: Full database backend with community_events table and RLS
- **Google Calendar**: ICS feed parsing with structured description support
- **Calendar Export**: Google Calendar and ICS file generation for event adds

### Planned Integrations
- **Eventbrite API**: For event ticket sales and management
- **Ticket Tailor API**: Alternative ticketing platform integration
- **Email service providers**: Mailchimp, Beehiiv, or ConvertKit for newsletter management
- **Analytics platforms**: Google Analytics 4 or Plausible for user tracking