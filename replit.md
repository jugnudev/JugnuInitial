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

### Current State (Promote v2.3 + MVP Frequency Capping Policy - COMPLETE ✓)
- **Promote v2 - OPERATIONAL**: Comprehensive conversion-first sales page with real analytics, sponsor portal, premium design, and lead management system
- **Database Infrastructure**: Full Supabase schema operational - sponsor_campaigns, sponsor_creatives, sponsor_metrics_daily, sponsor_leads tables initialized and functioning
- **Admin API System**: Secure server-side admin endpoints for campaign management, creative uploads, metrics tracking, and lead management with environment-based admin key authentication
- **Public API System**: /api/spotlight/active endpoint with placement-based targeting, frequency capping, round-robin delivery, and 5-minute caching for optimal performance
- **HomeMidSpotlight Component**: Optional below-the-fold home placement with "Partner Spotlight" heading, controlled by ENABLE_HOME_MID environment flag (default: false)
- **SponsoredBanner Component**: Events page banner placement with frequency capping (1x per user per day), impression/click analytics, localStorage-based user session management
- **Revenue Generation Page**: /promote public page with three monetization packages (Spotlight Banner $500+/week, Homepage Hero $1500+/week, Full Feature $3000+/campaign)
- **Lead Capture System**: Complete application form with business information, campaign objectives, budget ranges, placement selection, and secure lead storage
- **Navigation Transformation**: Places completely removed from all navigation (desktop/mobile), replaced with /promote link, /places routes redirect to /explore
- **Security Architecture**: All admin operations use server-side routes with environment-based authentication, zero client-side secret exposure, protected dev console
- **Analytics & Tracking**: Comprehensive impression/click tracking with daily aggregation, campaign performance metrics, CTR calculations, and admin dashboard ready
- **Environment Controls**: ENABLE_HOME_MID=false, ENABLE_EVENTS_BANNER=true, home_hero permanently disabled to preserve Jugnu brand integrity
- **Content Delivery System**: Smart placement targeting (home_mid, events_banner), creative management for desktop/mobile assets, logo support, and alt text accessibility
- **Business Model Integration**: Three-tier sponsorship packages with detailed specifications, asset requirements, pricing structure, and professional application workflow
- **Places Legacy Protection**: Dev tools remain accessible via secure admin routes, no public indexing, complete architectural separation from public-facing sponsorship system
- **Promote v2 Sales Page**: Premium conversion-first design with hero section, social proof band, value pillars, detailed packages (CA$50-300), live preview module, how-it-works flow, analytics teaser, add-ons strip, comprehensive application form, and FAQ section with JSON-LD SEO schemas
- **Sponsor Portal System**: Token-based analytics portal (/sponsor/:token) with real-time metrics, interactive charts (impressions, clicks, CTR), 7-day summary table, CSV export functionality, and secure token management with expiration
- **Enhanced Lead Management**: Comprehensive application form with business details, placement selection, campaign objectives, creative links, honeypot spam protection, and admin status management endpoints
- **Advanced Analytics Backend**: sponsor_portal_tokens table, metrics summary API, portal creation API, real campaign tracking with daily aggregation, and comprehensive performance reporting
- **SEO Optimization**: Complete meta tags, Open Graph cards, JSON-LD schemas (Organization, Offers, FAQPage, BreadcrumbList), internal linking strategy, and performance optimization for Core Web Vitals
- **Promote v2.3 Enhancements**: Daily/weekly pricing switches with CA$15-175 range, comprehensive add-ons system (IG Story Boost, Creative Design, etc.), auto-calculated quotes with early partner discounts, enhanced creative specifications (1600×400, 1080×600 for banners), improved tracking with viewability thresholds and frequency capping
- **Enhanced Database Schema**: sponsor_metrics_daily table with generated CTR column, row-level security policies for data protection, upsert API for real-time metrics aggregation, and comprehensive tracking infrastructure
- **Advanced Pricing System**: Multi-week discounts (10% for 2+ weeks, 15% for 4+ weeks), early partner 20% discount configuration, auto-calculation engine with real-time quote summaries, and persistent add-ons storage in lead records
- **Hardened Analytics**: Viewable impressions tracking with IntersectionObserver 50% threshold, 1-per-session frequency capping via localStorage, server-side event aggregation, and enhanced sponsor portal with date filtering and CSV export
- **MVP Frequency Capping Policy**: Default freq_cap_per_user_per_day = 0 (no cap) for launch simplicity, dual analytics counters (raw_views and billable_impressions) increment identically when cap=0, frequency cap mentions removed from public /promote page, admin-only frequency controls with FREQ_CAP_ENABLED environment flag for future activation, comprehensive backend infrastructure ready for advanced capping when needed
- **Sponsor Portal Onboarding System**: One-click "Send onboarding email" feature with professional template explaining portal usage, analytics metrics (impressions, clicks, CTR, CSV export), contact information, portal link and expiry date inclusion, complete audit logging to admin_audit_log table for compliance and tracking

### Active Integrations
- **Supabase**: Full database backend with community_events table and RLS
- **Google Calendar**: ICS feed parsing with structured description support
- **Calendar Export**: Google Calendar and ICS file generation for event adds

### Planned Integrations
- **Eventbrite API**: For event ticket sales and management
- **Ticket Tailor API**: Alternative ticketing platform integration
- **Email service providers**: Mailchimp, Beehiiv, or ConvertKit for newsletter management
- **Analytics platforms**: Google Analytics 4 or Plausible for user tracking