# Jugnu - Find Your Frequency

A cultural events platform focused on South Asian and global music experiences across Canada. Built with React, TypeScript, and Supabase.

## Features

- **Event Discovery**: Curated South Asian & global culture events across Canada
- **Community Events**: Weekly calendar of upcoming events from community organizers
- **Waitlist Management**: User registration with comprehensive tracking and analytics
- **Responsive Design**: Mobile-first experience with smooth navigation
- **Admin Tools**: Event management and waitlist export capabilities

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account

### Environment Variables

Set these in Replit Secrets or your environment:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE=your_service_role_key
EXPORT_ADMIN_KEY=your_admin_key_for_protected_endpoints
COMMUNITY_ICS_URLS=comma_separated_ics_urls
CITY_TZ=America/Vancouver
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up the database by running the SQL migrations in Supabase:
```sql
-- See server setup section below for complete schema
```

3. Start the development server:
```bash
npm run dev
```

## Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Community events table
CREATE TABLE IF NOT EXISTS public.community_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Vancouver',
  venue text,
  address text,
  neighborhood text,
  city text NOT NULL DEFAULT 'Vancouver, BC',
  organizer text,
  tickets_url text,
  source_url text,
  image_url text,
  price_from numeric,
  tags text[],
  status text NOT NULL DEFAULT 'upcoming',
  featured boolean NOT NULL DEFAULT false,
  source_hash text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ce_start ON public.community_events (start_at);
CREATE INDEX IF NOT EXISTS idx_ce_status ON public.community_events (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ce_sourcehash ON public.community_events (source_hash);

-- Enable RLS
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
```

## How to add events via Google Calendar

To import events from Google Calendar into the community section:

1. **Get the ICS feed URL**: 
   - Open your Google Calendar
   - Go to Settings → Settings for my calendars → [Your Calendar]
   - Scroll to "Integrate calendar" 
   - Copy the "Secret address in iCal format" URL

2. **Add ICS URLs to environment**:
   Set `COMMUNITY_ICS_URLS` with comma-separated ICS URLs

3. **Format event descriptions**:
   When creating calendar events, use this template in the event description:

   ```
   Tickets: https://example.com/buy
   Source: https://instagram.com/organizer_post
   Image: https://your-cdn.com/posters/event-image.jpg
   Tags: concert, bollywood
   Organizer: XYZ Events
   PriceFrom: 35
   ```

4. **Import events**:
   Call the import endpoint (requires admin key):
   ```
   GET /api/community/cron/import-ics
   Headers: x-admin-key: YOUR_EXPORT_ADMIN_KEY
   ```

### Description Field Guidelines

- **Tickets**: Direct link to purchase tickets (becomes the main CTA button)
- **Source**: Link to social media post or organizer page (shows as small link)
- **Image**: Direct URL to event poster/image (displays as card image)
- **Tags**: Comma-separated keywords for filtering (concert, club, comedy, festival)
- **Organizer**: Event organizer name (overrides calendar organizer)
- **PriceFrom**: Starting price for tickets (shows as "from $X" chip)

If no "Tickets" field is provided but other URLs exist in the description, the first URL found will be used as the tickets URL.

## API Endpoints

### Community Events

- `GET /api/community/weekly` - Get events for the next 7 days
- `GET /api/community/cron/import-ics` - Import events from ICS feeds (requires admin key)
- `POST /api/community/admin/upsert` - Manual event management (requires admin key)

### Waitlist

- `POST /api/waitlist` - Submit waitlist registration
- `GET /api/waitlist/export` - Export waitlist data as CSV (requires admin key)

## Project Structure

```
├── client/src/           # React frontend
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── lib/             # Utility functions
│   └── hooks/           # Custom React hooks
├── server/              # Express backend
│   ├── routes.ts        # API route definitions
│   └── supabaseAdmin.ts # Database client
└── shared/              # Shared TypeScript types
    └── schema.ts        # Database schema definitions
```

## Development

- The app runs on port 5000 in development
- Frontend and backend are served from the same port via Vite middleware
- Hot reload is enabled for both frontend and backend changes
- TypeScript is used throughout for type safety

## Deployment

The app is designed to work seamlessly with Replit Deployments:

1. Set all required environment variables in Replit Secrets
2. Run the database setup SQL in Supabase
3. Click Deploy in Replit

## Contributing

1. Follow the existing code style and patterns
2. Update replit.md with any architectural changes
3. Test both waitlist and community event flows
4. Ensure mobile responsiveness

## License

MIT License - see LICENSE file for details