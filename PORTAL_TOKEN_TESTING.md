# Portal Token Endpoint Testing Guide

## Implementation Summary

✅ **Portal Token Endpoints**
- POST /api/spotlight/admin/portal-token - Create portal token from request body
- GET /api/spotlight/admin/portal-token - Convenience alias for curl testing
- Both require x-admin-key header authentication
- Generate UUID tokens stored in sponsor_portal_tokens table
- Return portal_url, token, campaign_id, and expires_at

✅ **Campaign List Endpoint**
- GET /api/spotlight/admin/campaign/list - Simplified campaigns list for sanity checks
- Returns basic campaign info: id, name, sponsor_name, is_active, dates, placements
- Requires x-admin-key header authentication

✅ **API Fallback Guardrail**
- All /api/* routes return JSON responses with proper Content-Type headers
- Unknown /api/* routes return 404 JSON: { "ok": false, "error": "Not found" }
- Unauthorized admin routes return 401 JSON: { "ok": false, "error": "Unauthorized - invalid admin key" }
- No /api/* route ever returns index.html

✅ **Debug Sponsor Functionality**
- URL parameter ?debugSponsor=1 bypasses frequency capping (dev only)
- Console logs debug message when activated
- Only works in development environment

## Database Schema

### sponsor_portal_tokens Table
```sql
CREATE TABLE IF NOT EXISTS public.sponsor_portal_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sponsor_campaigns(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz,
  disabled boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_spt_campaign ON public.sponsor_portal_tokens (campaign_id);
ALTER TABLE public.sponsor_portal_tokens ENABLE ROW LEVEL SECURITY;
```

## API Endpoint Testing

### 1. Health Check
```bash
curl -sS http://localhost:5000/api/health
# Expected: {"ok":true}
```

### 2. Spotlight Active
```bash
curl -sS "http://localhost:5000/api/spotlight/active?placement=events_banner"
# Expected: {"ok":true,"spotlights":{"events_banner":{...}}}
```

### 3. Campaign List (Admin)
```bash
curl -sS "http://localhost:5000/api/spotlight/admin/campaign/list" -H "x-admin-key: $EXPORT_ADMIN_KEY"
# Expected: {"ok":true,"campaigns":[...]}
```

### 4. Portal Token Creation (POST)
```bash
curl -sS -X POST http://localhost:5000/api/spotlight/admin/portal-token \
  -H "x-admin-key: $EXPORT_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"campaign_id":"a04d54c9-6826-45fc-aa82-71b2c59b3f86","expires_in_hours":72}'

# Expected Response:
{
  "ok": true,
  "token": "uuid-token-string",
  "portal_url": "/sponsor/uuid-token-string",
  "campaign_id": "a04d54c9-6826-45fc-aa82-71b2c59b3f86",
  "expires_at": "2025-08-17T00:30:00.000Z"
}
```

### 5. Portal Token Creation (GET Convenience)
```bash
curl -sS "http://localhost:5000/api/spotlight/admin/portal-token?campaign_id=a04d54c9-6826-45fc-aa82-71b2c59b3f86&expires_in_hours=72" \
  -H "x-admin-key: $EXPORT_ADMIN_KEY"

# Expected: Same response format as POST
```

### 6. API Fallback Guardrail Tests
```bash
# Test unknown API route
curl -sS "http://localhost:5000/api/nonexistent"
# Expected: {"ok":false,"error":"Not found"}

# Test unauthorized admin route
curl -sS "http://localhost:5000/api/spotlight/admin/campaign/list" -H "x-admin-key: wrong-key"
# Expected: {"ok":false,"error":"Unauthorized - invalid admin key"}
```

## Debug Sponsor Testing

1. Navigate to Events page with debug parameter:
   ```
   http://localhost:5000/events?debugSponsor=1
   ```

2. Check browser console for debug message:
   ```
   🔧 Debug mode: Bypassing frequency capping for sponsor banner
   ```

3. Banner should appear even if frequency cap was previously triggered

4. Only works in development environment (import.meta.env.DEV = true)

## Authentication

All admin endpoints use the same authentication middleware:
- Header: `x-admin-key: $EXPORT_ADMIN_KEY`
- Environment variable: `EXPORT_ADMIN_KEY` (currently: d1c8923b9902048e185dbd06099f8aea5d00e1a77aabf3ddb89226cbab1e62f7)
- Dev fallback: "dev-key-placeholder"

## Response Headers

All endpoints set proper headers:
- `Content-Type: application/json`
- Cache headers for public endpoints: `Cache-Control: public, s-maxage=300, max-age=300`

## Error Handling

### Portal Token Errors
- 400: Missing campaign_id
- 404: Campaign not found or inactive
- 500: Database or token creation failure

### Development Error Details
In development mode (NODE_ENV !== 'production'), error responses include additional debug information:
```json
{
  "ok": false,
  "error": "Failed to create portal token",
  "detail": "Could not find the table 'public.sponsor_portal_tokens' in the schema cache",
  "code": "PGRST205"
}
```

### Campaign Validation
- Checks campaign exists in database
- Validates campaign.is_active = true
- Uses SUPABASE_SERVICE_ROLE for secure admin operations

### Authentication Errors
- 401: Invalid or missing x-admin-key header

### General API Errors
- 404: Unknown /api/* route
- 500: Internal server errors with descriptive messages

## Integration Notes

- Portal tokens are UUIDs stored in database with expiration dates
- Tokens reference campaign_id with CASCADE delete
- Portal URLs follow format: `/sponsor/{token}`
- Debug functionality only affects client-side frequency capping
- All admin operations are server-side protected with environment-based keys
- API routes registered before SPA fallback to prevent HTML responses