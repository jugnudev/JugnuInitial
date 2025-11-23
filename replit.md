# Replit.md

## Overview
Jugnu is a cultural events and communities platform for South Asian and global music experiences across Canada. It offers event discovery, ticketing, and sponsorship opportunities, alongside exclusive member spaces. The platform operates Canada-wide with support for Metro Vancouver, GTA, Greater Montreal, and Calgary. The platform aims for high performance, security, and growth, featuring caching, rate limiting, invite systems, and analytics. The Communities feature is currently in FREE BETA.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React 18 with TypeScript and Vite, styled with Tailwind CSS and shadcn/ui for a mobile-first, responsive design. It employs a premium Copper-Charcoal aesthetic with specific color palettes, glassmorphism effects, and a unified button system (Copper for edit/view, Jade for check-in, Crimson for destructive actions). Mobile optimization includes 48px+ touch targets, gesture-friendly interactions, and compact component layouts (e.g., post cards, community navigation). Accessibility is ensured with ARIA labels and keyboard navigation. A "View as Member" mode allows owners/moderators to experience communities from a member's perspective. **Community Navigation Tabs** use premium glassmorphism design (layered backgrounds, copper gradients, subtle glow) with identical styling between owner and member views. Member tabs feature dynamic grid layout (grid-cols-6 with Events tab, grid-cols-5 without) to prevent empty gutters. Tab styling includes full-height triggers (h-full py-3 px-3), refined typography (text-[0.95rem] leading-tight), active state with ring + shadow (ring-1 ring-copper-400/60, shadow-xl shadow-copper-500/40), and premium inactive glass effects (bg-white/[0.03], hover:bg-white/[0.06]). **Events Page Navigation** uses responsive design: desktop (lg+) shows full toolbar with category segments and area filter pills; mobile/tablet uses premium glassmorphism dropdowns for area and category selection with copper-accented active states, eliminating horizontal scrolling while maintaining 48px touch targets and accessibility standards.

### Technical Implementations
The backend uses Express.js and TypeScript with Drizzle ORM for PostgreSQL. Authentication is managed via a hybrid middleware. Server state is handled by TanStack Query, and client-side routing by Wouter. Security features include rate limiting, input sanitization, CSRF protection, and IP blocking. Performance is optimized with in-memory caching, query optimization, code splitting, and lazy loading. SEO is managed with `react-helmet-async`.

Key features include:
- **Admin & Sponsorship Systems**: Key-based API, UUID portal tokens, lead management, multi-part campaign onboarding, creative uploads, real-time analytics, and health monitoring.
- **Business Signup Flow**: Streamlined single-page registration for organizers with form validation.
- **Careers System**: "Join the Team" platform for volunteer recruitment with CRUD operations for job postings.
- **Loyalty Program (Coalition Points)**: A "Coming Soon" page for "Jugnu Coalition Points" (1,000 JP = $1 CAD), currently in FREE BETA, with merchant auto-provisioning and API routes for user wallets.
- **Ticketing System (Stripe Connect)**: Integrated into Community Settings, using Stripe Connect Express for direct-to-business payments. Jugnu operates on a subscription model, with businesses keeping 100% of ticket revenue. Features a single signup flow, organizer dashboard, event creation, image uploads (Supabase), atomic event/tier creation, "My Orders" for ticket purchasers, a premium QR scanner check-in dashboard with audit logging, and SendGrid-powered email confirmations. The "Manage Events" tab within communities provides a rich interface for owners/moderators. The attendee management page includes bulk messaging capabilities with checkbox selection and accessible dialog components for sending custom emails to selected attendees. **Event Analytics** uses performance-optimized bulk queries (getOrderItemsByIds, getOrdersByIds) to fetch ticket data efficiently, reducing database round trips from O(n) to O(1) for large events. The analytics UI features a copper-themed design (#c0580f) with tabs for Overview, Sales Chart, Top Buyers, Attendees, and Export functionality. All ticketing sub-pages (check-in, attendees, analytics) feature smart back buttons with history detection (window.history.back() when available, fallback to /tickets/organizer/dashboard for direct URL access) and ARIA labels for accessibility.
- **Communities Platform**: Offers notification preferences, growth features (invite links, referrals), analytics, real-time chat with WebSockets, post reactions, media uploads, and "Post as Business" functionality. Includes a comprehensive giveaway system and a full-featured polling system with voter visibility for owners/moderators on non-anonymous polls. Owners/moderators can toggle the visibility of the Events tab to members. Database denormalization for `total_members` and `total_posts` ensures efficient count synchronization.
- **Canada-wide Event Discovery**: Multi-area event system with location-based filtering and dynamic timezone support. Events page features area filter pills (All Areas, Metro Vancouver, GTA, Greater Montreal, Calgary) with premium glassmorphism design. **Timezone System**: Each area maps to its local timezone (Metro Vancouver→PT, GTA→ET, Greater Montreal→ET, Calgary→MT) via shared/timezones.ts utility. Event cards display both area badges and timezone abbreviations (e.g., "7:30 PM PT"). ICS import parser extracts "Area: [location]" from Google Calendar event descriptions, normalizes to canonical area names, and automatically assigns the correct timezone. Featured event placement form includes area selector with dynamic timezone information banner showing which timezone will be used. Backend API (`/api/community/weekly`) supports area parameter for precise filtering. Events without area metadata are backward-compatible and display under "All Areas". Area values and timezones are normalized at import time to ensure consistency.

### System Design Choices
A mobile-first approach is implemented using Tailwind CSS. Feature flags (`ENABLE_TICKETING`, `ENABLE_COMMUNITIES`, `FF_COALITION_LOYALTY`) control major component visibility. Database design includes separate tables for community subscriptions, payments, billing, giveaways, entries, and winners. All metrics are processed and stored in the Pacific timezone.

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
- **SendGrid**: Email communications (verification, welcome, notifications).