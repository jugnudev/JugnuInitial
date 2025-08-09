# Replit.md

## Overview

Jugnu is a cultural events platform focused on South Asian and global music experiences in Vancouver. The application is a single-page landing site that showcases upcoming events, allows email list signups, and provides a gallery of past experiences. Built as a modern web application with React frontend and Express backend, it's designed to be fast, mobile-first, and ready for integration with ticketing platforms like Eventbrite and Ticket Tailor.

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
- **Database Schema**: User management system with username/password authentication
- **Query Management**: TanStack Query for caching and synchronization of server state
- **Form Handling**: React Hook Form with Zod validation schemas

### Responsive Design & Mobile Experience
- **Mobile-First**: Tailwind breakpoints with mobile-optimized layouts
- **Sticky Navigation**: Context-aware CTAs that adapt based on available events
- **Mobile CTA Bar**: Fixed bottom action bar on mobile devices that hides when join section is visible
- **Touch Interactions**: Optimized for mobile gestures and safe area insets

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

### Planned Integrations
- **Eventbrite API**: For event ticket sales and management
- **Ticket Tailor API**: Alternative ticketing platform integration
- **Email service providers**: Mailchimp, Beehiiv, or ConvertKit for newsletter management
- **Analytics platforms**: Google Analytics 4 or Plausible for user tracking