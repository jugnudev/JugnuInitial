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

### Community Events System (Added v2.4)
- **ICS Calendar Import**: Automated import from Google Calendar ICS feeds with structured description parsing
- **Event Data Parsing**: Extracts Tickets, Source, Image, Tags, Organizer, PriceFrom from event descriptions
- **Weekly Events Feed**: Shows upcoming South Asian events in Vancouver for next 7 days
- **Admin Management**: Manual event upsert endpoint for corrections and additions
- **UI Integration**: Dedicated /community page with filtering, calendar integration, and responsive cards

### Current State (Waitlist Mode v2.3 + Community v2.4)
- **Dual Purpose**: Waitlist mode for Jugnu events + Community calendar for broader ecosystem
- **Smart Navigation**: Community link always visible, Events/Gallery conditionally shown
- **Enhanced Cards**: Remote image support, price chips, tag filtering, calendar integration
- **Admin Tools**: ICS import cron job + manual event management via API

### Active Integrations
- **Supabase**: Full database backend with community_events table and RLS
- **Google Calendar**: ICS feed parsing with structured description support
- **Calendar Export**: Google Calendar and ICS file generation for event adds

### Planned Integrations
- **Eventbrite API**: For event ticket sales and management
- **Ticket Tailor API**: Alternative ticketing platform integration
- **Email service providers**: Mailchimp, Beehiiv, or ConvertKit for newsletter management
- **Analytics platforms**: Google Analytics 4 or Plausible for user tracking