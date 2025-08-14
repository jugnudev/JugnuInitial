# Events Banner Placement Testing Guide

## Implementation Summary

✅ **Client-Side Updates**
- SponsoredBanner now fetches from `/api/spotlight/active?placement=events_banner`
- Uses `VITE_ENABLE_EVENTS_BANNER` environment variable for client-side gating
- Maintains existing frequency capping and impression tracking
- Removed references to `/api/spotlight/public/active`

✅ **Server-Side Updates**  
- Main endpoint `/api/spotlight/active` now supports both `slots` and `placement` parameters
- Public alias `/api/spotlight/public/active` forwards to main endpoint with format transformation
- Environment gating via `ENABLE_EVENTS_BANNER` (server-side, default: true)
- Both endpoints return proper `Content-Type: application/json` headers

✅ **Dynamic Banner Positioning**
- 0 events: Banner shown in empty state
- 1 event: Banner positioned above first event card  
- 2-3 events: Banner positioned after first event card
- 4+ events: Banner positioned after first row (2 cards)

## Environment Configuration

### Client-Side (Required for Banner Display)
```bash
VITE_ENABLE_EVENTS_BANNER=true  # Default: true (enabled unless 'false')
```

### Server-Side (Controls API Response)
```bash
ENABLE_EVENTS_BANNER=true      # Default: true (enabled unless 'false')
```

**Note**: Both flags must be enabled for banner to appear. Client flag controls rendering, server flag controls API data availability.

## API Endpoint Testing

### 1. Main Endpoint (Used by Frontend)
```bash
curl -X GET "http://localhost:5000/api/spotlight/active?placement=events_banner"

# Expected Response:
{
  "ok": true,
  "spotlights": {
    "events_banner": {
      "campaignId": "uuid",
      "sponsor_name": "Test Sponsor",
      "headline": "Test Headline",
      "subline": "Test Subline", 
      "cta_text": "Learn More",
      "click_url": "https://example.com",
      "is_sponsored": true,
      "tags": [],
      "creative": {
        "image_desktop_url": "...",
        "image_mobile_url": "...",
        "logo_url": "...",
        "alt": "..."
      }
    }
  }
}
```

### 2. Public Alias Endpoint
```bash
curl -X GET "http://localhost:5000/api/spotlight/public/active?placement=events_banner"

# Expected Response (Different Format):
{
  "ok": true,
  "placement": "events_banner",
  "creatives": [
    {
      "campaignId": "uuid",
      "sponsor_name": "Test Sponsor",
      // ... same fields as above
    }
  ]
}
```

## Banner Positioning Logic

The banner position is determined by event count in `EventsExplore.tsx`:

```typescript
const bannerPosition = useMemo(() => {
  if (filteredEvents.length === 0) return 'empty-state';
  if (filteredEvents.length === 1) return 'above-first';
  if (filteredEvents.length <= 3) return 'after-first';
  return 'after-first-row'; // 4+ events
}, [filteredEvents.length]);
```

### Visual Layout Examples

**0 Events (Empty State)**
```
[Banner]
"No events found for your criteria"
```

**1 Event**
```
[Banner]
[Event Card 1]
```

**2-3 Events**
```
[Event Card 1]
[Banner]
[Event Card 2]
[Event Card 3] (if exists)
```

**4+ Events**
```
[Event Card 1] [Event Card 2]
[Banner]
[Event Card 3] [Event Card 4]
[Event Card 5] [Event Card 6]
...
```

## Frequency Capping & Analytics

### User Session Management
- 1 impression per campaign per user per day
- localStorage key: `spotlightSeen:{campaignId}:events_banner:{YYYY-MM-DD}`
- Clearing localStorage re-enables banner display

### Impression Tracking
- Uses IntersectionObserver with 50% viewport threshold
- Tracks when banner is 50%+ visible for meaningful engagement
- Automatically sends impression analytics to `/api/spotlight/admin/metrics/track`

### Click Tracking
- Tracks clicks on banner CTA button
- Opens click_url in new tab with security attributes
- Records click analytics for campaign performance measurement

## QA Test Scenarios

### 1. Event Count Testing
```bash
# Test with different event counts
# Verify banner position changes correctly:
# - 0 events: Empty state
# - 1 event: Above first card  
# - 2-3 events: After first card
# - 4+ events: After first row
```

### 2. Environment Flag Testing  
```bash
# Test client-side gating
VITE_ENABLE_EVENTS_BANNER=false  # Banner should not render

# Test server-side gating
ENABLE_EVENTS_BANNER=false       # API should return empty spotlights
```

### 3. Frequency Capping Testing
```bash
# 1. Load page with banner - should show
# 2. Refresh page - should not show (same day)
# 3. Clear localStorage - should show again
# 4. Wait until next day - should show again
```

### 4. Network & API Testing
```bash
# Verify JSON responses
curl -X GET "http://localhost:5000/api/spotlight/active?placement=events_banner"
curl -X GET "http://localhost:5000/api/spotlight/public/active?placement=events_banner"

# Check response headers
curl -I "http://localhost:5000/api/spotlight/active?placement=events_banner"
# Should include: Content-Type: application/json
# Should include: Cache-Control: public, s-maxage=300, max-age=300
```

## Development Routing

The Vite dev server is configured to proxy `/api/*` requests to the Express server on port 5000, ensuring proper API routing during development. In production, Express serves both the frontend and API on the same port, eliminating routing conflicts.

## Integration Notes

- Banner integrates seamlessly with existing event filtering and search
- Respects user preferences for dark/light themes
- Maintains accessibility standards with proper alt text and ARIA labels
- Uses copper glow styling consistent with Jugnu brand identity
- Mobile-responsive design adapts to different screen sizes