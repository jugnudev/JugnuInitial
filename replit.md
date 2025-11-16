# Replit.md

## Overview
Jugnu is a cultural events and communities platform for South Asian and global music experiences across Canada. It offers event discovery, ticketing, and sponsorship opportunities, alongside exclusive member spaces. The platform aims for high performance, security, and growth, featuring caching, rate limiting, invite systems, and analytics. The Communities feature is currently in FREE BETA.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React 18 with TypeScript and Vite, styled with Tailwind CSS and shadcn/ui for a mobile-first, responsive design. It employs a premium Copper-Charcoal aesthetic with specific color palettes, glassmorphism effects, and a unified button system (Copper for edit/view, Jade for check-in, Crimson for destructive actions). Mobile optimization includes 48px+ touch targets, gesture-friendly interactions, and compact component layouts (e.g., post cards, community navigation). Accessibility is ensured with ARIA labels and keyboard navigation. A "View as Member" mode allows owners/moderators to experience communities from a member's perspective.

### Technical Implementations
The backend uses Express.js and TypeScript with Drizzle ORM for PostgreSQL. Authentication is managed via a hybrid middleware. Server state is handled by TanStack Query, and client-side routing by Wouter. Security features include rate limiting, input sanitization, CSRF protection, and IP blocking. Performance is optimized with in-memory caching, query optimization, code splitting, and lazy loading. SEO is managed with `react-helmet-async`.

Key features include:
- **Admin & Sponsorship Systems**: Key-based API, UUID portal tokens, lead management, multi-part campaign onboarding, creative uploads, real-time analytics, and health monitoring.
- **Business Signup Flow**: Streamlined single-page registration for organizers with form validation.
- **Careers System**: "Join the Team" platform for volunteer recruitment with CRUD operations for job postings.
- **Loyalty Program (Coalition Points)**: A "Coming Soon" page for "Jugnu Coalition Points" (1,000 JP = $1 CAD), currently in FREE BETA, with merchant auto-provisioning and API routes for user wallets.
- **Ticketing System (Stripe Connect)**: Integrated into Community Settings, using Stripe Connect Express for direct-to-business payments. Jugnu operates on a subscription model, with businesses keeping 100% of ticket revenue. Features a single signup flow, organizer dashboard, event creation, image uploads (Supabase), atomic event/tier creation, "My Orders" for ticket purchasers, a premium QR scanner check-in dashboard with audit logging, and SendGrid-powered email confirmations. The "Manage Events" tab within communities provides a rich interface for owners/moderators.
- **Communities Platform**: Offers notification preferences, growth features (invite links, referrals), analytics, real-time chat with WebSockets, post reactions, media uploads, and "Post as Business" functionality. Includes a comprehensive giveaway system and a full-featured polling system with voter visibility for owners/moderators on non-anonymous polls. Owners/moderators can toggle the visibility of the Events tab to members. Database denormalization for `total_members` and `total_posts` ensures efficient count synchronization.

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