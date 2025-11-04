# Replit.md

## Overview
Jugnu is a cultural events and communities platform for South Asian and global music experiences across Canada. It facilitates event discovery, ticketing, and sponsorship opportunities, with exclusive member spaces. The platform prioritizes performance, security, and growth through features like caching, rate limiting, invite systems, and analytics. The Communities feature is currently in FREE BETA.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The platform uses React 18 with TypeScript and Vite, styled with Tailwind CSS and shadcn/ui components for a mobile-first, responsive design. Typography uses Google Fonts (Fraunces, Inter). Navigation is conditional, featuring streamlined CTAs and fixed bottom action bars for mobile. Accessibility is ensured with ARIA labels, keyboard navigation, and screen reader support. User acquisition prioritizes account creation, followed by event exploration, and newsletter signup. Polls and Giveaways utilize card-based navigation with interactive effects and status filters integrated as pill buttons.

### Technical Implementations
The backend is built with Express.js and TypeScript, utilizing `cookie-parser` and `express-session` for session management. Authentication uses a hybrid middleware supporting both community auth tokens and platform sessions. Drizzle ORM is used for PostgreSQL, and TanStack Query for server state management. Wouter handles client-side routing. Security features include rate limiting, input sanitization, CSRF protection, IP blocking, and environment variables. Performance is optimized with in-memory caching, query optimization, code splitting, lazy loading, and React memoization. SEO is managed with `react-helmet-async` for meta tags and structured data. Data management involves static JSON data, automated Google Calendar ICS feed synchronization, and cleanup jobs. SendGrid is integrated for email communications, including verification, welcome, and notification emails, processed by a cron-based worker.

### Feature Specifications
- **Admin & Sponsorship Systems**: Includes a key-based Admin API, UUID-based portal tokens, lead management (CRUD), multi-part onboarding for campaigns, creative uploads, a sponsor portal with real-time analytics and CSV export, and health monitoring endpoints.
- **Business Signup Flow**: A streamlined single-page process for user registration and organizer application, with form validation and automatic URL prefixing.
- **Careers System**: A "Join the Team" platform for volunteer recruitment, featuring a public-facing careers page with department filtering and job details, and an admin management page for full CRUD operations on job postings and application tracking.
- **Loyalty Program (Coalition Points)**: Features a "Coming Soon" landing page announcing "Jugnu Coalition Points" with a fixed value (1,000 JP = $1 CAD). Includes marketing content, FAQs, cultural design elements, and waitlist integration. Controlled by a `FF_COALITION_LOYALTY` feature flag, but the landing page is always public. The program is in FREE BETA, with auto-provisioning of points for merchants and specific API routes for user wallets and business point issuance.
- **Ticketing System (Stripe Connect)**: Converted to a Stripe Connect Express model for direct-to-business payments with automatic platform fee collection. Includes an onboarding flow for businesses to connect their Stripe accounts, and a payment flow utilizing `on_behalf_of` and `transfer_data.destination` for direct routing. Webhooks handle account updates and payment fulfillment.
- **Communities Platform**: Offers notification preferences (email frequency, digest scheduling), growth features (invite links, member referrals, discovery), and an analytics dashboard. Includes a real-time chat with WebSocket server, online presence, and role-based permissions. Supports post reactions, media uploads (images/videos), and "Post as Business" functionality. The platform is in Free Beta, with visual badges indicating beta status and disabled billing checks. A comprehensive giveaway system is included, with automated winner selection and prize management. An in-app notification system with email delivery, frequency preferences, and a dedicated Notification Center page is also present.

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