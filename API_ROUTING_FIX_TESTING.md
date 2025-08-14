# API Routing Fix Testing Guide

## Implementation Summary

✅ **Health Endpoint Added**
- `GET /api/health` returns `{ "ok": true }`
- Sets `Content-Type: application/json`
- No authentication required

✅ **Public Spotlight Endpoint**
- `GET /api/spotlight/public/active` with different response format
- Query parameter: `placement` (defaults to 'events_banner')
- Response format: `{ "ok": true, "placement": "events_banner", "creatives": [...] }`
- Sets proper `Content-Type: application/json`
- No authentication required

✅ **Environment Gating**
- Respects ENABLE_EVENTS_BANNER, ENABLE_HOME_MID, ENABLE_HOME_HERO flags
- Returns empty creatives array if placement is disabled

## API Endpoint Testing

### 1. Health Check
```bash
curl -X GET http://localhost:5000/api/health

# Expected Response:
{
  "ok": true
}
```

### 2. Public Spotlight Active
```bash
# Default placement (events_banner)
curl -X GET http://localhost:5000/api/spotlight/public/active

# Specific placement
curl -X GET "http://localhost:5000/api/spotlight/public/active?placement=events_banner"

# Expected Response (with active campaign):
{
  "ok": true,
  "placement": "events_banner",
  "creatives": [
    {
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
  ]
}

# Expected Response (no active campaigns or disabled):
{
  "ok": true,
  "placement": "events_banner",
  "creatives": []
}
```

### 3. Original Spotlight Active (maintained compatibility)
```bash
curl -X GET "http://localhost:5000/api/spotlight/active?route=/events&slots=events_banner"

# Expected Response (existing format):
{
  "ok": true,
  "spotlights": {
    "events_banner": {
      "campaignId": "uuid",
      "sponsor_name": "Test Sponsor",
      // ... other fields
    }
  }
}
```

## Key Differences Between Endpoints

### `/api/spotlight/active` (existing)
- Supports multiple slots via `slots` parameter
- Returns `spotlights` object with slot keys
- Complex round-robin selection logic
- Route-aware filtering

### `/api/spotlight/public/active` (new)
- Single placement per request
- Returns `creatives` array
- Simple format for external integrations
- Same environment gating and caching

## Response Headers

Both endpoints set:
- `Content-Type: application/json`
- `Cache-Control: public, s-maxage=300, max-age=300` (5-minute cache)

## Environment Configuration

Control placement availability:
```bash
ENABLE_EVENTS_BANNER=true  # Default: true (enabled unless 'false')
ENABLE_HOME_MID=false     # Default: false 
ENABLE_HOME_HERO=false    # Permanently disabled
```

## Vite Configuration

The Vite config was not modified (protected file). The current setup already properly handles API routing since the Express server serves both frontend and backend on the same port (5000), eliminating the need for additional proxy configuration.

## Frontend Integration

Frontend components can continue using existing endpoints:
- SponsoredBanner uses `/api/spotlight/active`
- External integrations can use `/api/spotlight/public/active`
- Health checks via `/api/health`

Both endpoints share the same database queries and environment gating logic, ensuring consistency across the application.